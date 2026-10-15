const pool = require('../../config/database');
const saleRepository = require('./sale.repository');
const { generateInvoiceNumber } = require('../../utils/invoice-number');

class SaleService {
  async getAll(options) {
    return await saleRepository.findAll(options);
  }

  async getById(id) {
    const sale = await saleRepository.findById(id);
    if (!sale) throw Object.assign(new Error('Transaksi tidak ditemukan.'), { statusCode: 404 });
    return sale;
  }

  /**
   * Process checkout - ATOMIC TRANSACTION
   * Validates stock, saves sale + items + payment + stock movements in ONE transaction
   */
  async checkout({ items, payment_method, paid_amount, discount = 0, reference_number }, userId, shiftId) {
    if (!items || items.length === 0) {
      throw Object.assign(new Error('Keranjang kosong.'), { statusCode: 422 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Verify shift is open
      const [shiftRows] = await conn.execute(
        'SELECT * FROM cashier_shifts WHERE id = ? AND user_id = ? AND status = "open" FOR UPDATE',
        [shiftId, userId]
      );
      if (shiftRows.length === 0) {
        throw Object.assign(new Error('Shift tidak ditemukan atau sudah ditutup. Buka shift terlebih dahulu.'), { statusCode: 422 });
      }

      // 2. Generate invoice number
      const invoiceNumber = await generateInvoiceNumber(pool);

      // 3. Process each item - validate stock with row locking
      let subtotal = 0;
      const saleItems = [];

      for (const item of items) {
        const qty = parseFloat(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          throw Object.assign(new Error('Kuantitas tidak valid.'), { statusCode: 422 });
        }

        // Lock product row - prevent concurrent overselling
        const [productRows] = await conn.execute(
          'SELECT * FROM products WHERE id = ? AND is_active = TRUE FOR UPDATE',
          [item.product_id]
        );
        if (productRows.length === 0) {
          throw Object.assign(new Error(`Produk ID ${item.product_id} tidak ditemukan atau nonaktif.`), { statusCode: 422 });
        }

        const product = productRows[0];

        // Check stock
        if (parseFloat(product.stock) < qty) {
          throw Object.assign(new Error(`Stok "${product.name}" tidak cukup. Tersedia: ${product.stock}, diminta: ${qty}`), { statusCode: 422 });
        }

        // Use backend price (NEVER trust frontend price)
        const unitPrice = parseFloat(product.selling_price);
        const unitCost = parseFloat(product.cost_price);
        const itemSubtotal = unitPrice * qty;
        subtotal += itemSubtotal;

        saleItems.push({
          product_id: product.id,
          product_name_snapshot: product.name,
          sku_snapshot: product.sku,
          quantity: qty,
          unit_price: unitPrice,
          unit_cost: unitCost,
          discount: 0,
          subtotal: itemSubtotal,
        });

        // Update stock
        const stockBefore = parseFloat(product.stock);
        const stockAfter = stockBefore - qty;
        await conn.execute('UPDATE products SET stock = ? WHERE id = ?', [stockAfter, product.id]);

        // Record stock movement
        await conn.execute(
          `INSERT INTO stock_movements (product_id, user_id, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, note, created_at)
           VALUES (?, ?, 'sale', ?, ?, ?, 'sale', NULL, ?, NOW())`,
          [product.id, userId, -qty, stockBefore, stockAfter, `Penjualan ${invoiceNumber}`]
        );
      }

      // 4. Calculate totals
      const discountAmount = parseFloat(discount) || 0;
      if (discountAmount > 0) {
        // Enforce max cashier discount limit for cashier role
        const [userRows] = await conn.execute('SELECT role FROM users WHERE id = ?', [userId]);
        if (userRows.length > 0 && userRows[0].role !== 'admin') {
          const [settingRows] = await conn.execute("SELECT setting_value FROM settings WHERE setting_key = 'max_cashier_discount'");
          const maxPercent = settingRows.length > 0 ? parseFloat(settingRows[0].setting_value) || 10 : 10;
          const maxAllowedDiscount = (subtotal * maxPercent) / 100;
          if (discountAmount > maxAllowedDiscount) {
            throw Object.assign(
              new Error(`Diskon (Rp ${new Intl.NumberFormat('id-ID').format(discountAmount)}) melebihi batas maksimum kasir (${maxPercent}% = Rp ${new Intl.NumberFormat('id-ID').format(maxAllowedDiscount)}).`),
              { statusCode: 422 }
            );
          }
        }
      }
      const total = subtotal - discountAmount;
      if (total <= 0) throw Object.assign(new Error('Total transaksi harus lebih dari 0.'), { statusCode: 422 });

      // 5. Validate payment
      const paidAmt = parseFloat(paid_amount);
      if (payment_method === 'cash') {
        if (isNaN(paidAmt) || paidAmt < total) {
          throw Object.assign(new Error(`Pembayaran tunai kurang. Total: ${total}, dibayar: ${paidAmt}`), { statusCode: 422 });
        }
      }
      const changeAmount = payment_method === 'cash' ? paidAmt - total : 0;
      const actualPaid = payment_method === 'cash' ? paidAmt : total;

      // 6. Create sale record
      const saleId = await saleRepository.createSale(conn, {
        invoice_number: invoiceNumber,
        user_id: userId,
        shift_id: shiftId,
        subtotal,
        discount: discountAmount,
        total,
        paid_amount: actualPaid,
        change_amount: changeAmount,
        payment_method,
      });

      // 7. Create sale items
      for (const item of saleItems) {
        await saleRepository.createSaleItem(conn, saleId, item);
      }

      // 8. Create payment record
      await saleRepository.createPayment(conn, {
        sale_id: saleId,
        method: payment_method,
        amount: payment_method === 'cash' ? total : actualPaid,
        reference_number: reference_number || null,
      });

      // Update reference_id in stock_movements for this sale
      await conn.execute(
        'UPDATE stock_movements SET reference_id = ? WHERE reference_type = "sale" AND note = ?',
        [saleId, `Penjualan ${invoiceNumber}`]
      );

      await conn.commit();
      return await saleRepository.findById(saleId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Cancel / Void a completed transaction
   * Restores inventory atomically, records stock_movements, and marks sale cancelled
   */
  async cancel(saleId, userId, reason) {
    if (!reason || reason.trim() === '') {
      throw Object.assign(new Error('Alasan pembatalan wajib diisi.'), { statusCode: 422 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Lock sale record
      const [saleRows] = await conn.execute(
        'SELECT * FROM sales WHERE id = ? FOR UPDATE',
        [saleId]
      );
      if (saleRows.length === 0) {
        throw Object.assign(new Error('Transaksi tidak ditemukan.'), { statusCode: 404 });
      }

      const sale = saleRows[0];
      if (sale.status === 'cancelled') {
        throw Object.assign(new Error('Transaksi sudah dibatalkan sebelumnya.'), { statusCode: 422 });
      }

      // 2. Check if there are any active/completed returns on this sale
      const [returnRows] = await conn.execute(
        "SELECT COUNT(*) as count FROM returns WHERE sale_id = ? AND status IN ('requested', 'approved', 'completed')",
        [sale.id]
      );
      if (returnRows[0].count > 0) {
        throw Object.assign(new Error('Transaksi tidak dapat dibatalkan karena memiliki riwayat retur.'), { statusCode: 422 });
      }

      // 3. Fetch sale items to restore stock
      const [items] = await conn.execute(
        'SELECT * FROM sale_items WHERE sale_id = ?',
        [sale.id]
      );

      for (const item of items) {
        const qty = parseFloat(item.quantity);

        // Lock product row
        const [productRows] = await conn.execute(
          'SELECT * FROM products WHERE id = ? FOR UPDATE',
          [item.product_id]
        );

        if (productRows.length > 0) {
          const product = productRows[0];
          const stockBefore = parseFloat(product.stock);
          const stockAfter = stockBefore + qty;

          // Restore product stock
          await conn.execute('UPDATE products SET stock = ? WHERE id = ?', [stockAfter, product.id]);

          // Record stock movement
          await conn.execute(
            `INSERT INTO stock_movements (product_id, user_id, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, note, created_at)
             VALUES (?, ?, 'cancellation', ?, ?, ?, 'sale', ?, ?, NOW())`,
            [product.id, userId, qty, stockBefore, stockAfter, sale.id, `Pembatalan ${sale.invoice_number}: ${reason.trim()}`]
          );
        }
      }

      // 4. Update sale record status to cancelled
      await conn.execute(
        `UPDATE sales
         SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = ?, cancel_reason = ?
         WHERE id = ?`,
        [userId, reason.trim(), sale.id]
      );

      await conn.commit();
      return await saleRepository.findById(sale.id);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new SaleService();
