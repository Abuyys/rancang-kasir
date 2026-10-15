const pool = require('../../config/database');
const returnRepository = require('./return.repository');
const saleRepository = require('../sales/sale.repository');
const { generateReturnNumber } = require('../../utils/invoice-number');

class ReturnService {
  async getAll(options) {
    return await returnRepository.findAll(options);
  }

  async getById(id) {
    const ret = await returnRepository.findById(id);
    if (!ret) throw Object.assign(new Error('Data retur tidak ditemukan.'), { statusCode: 404 });
    return ret;
  }

  /**
   * Get sale data prepared for return form
   * Computes available returnable quantity per item
   */
  async getSaleForReturn(saleIdOrInvoice) {
    const sale = await saleRepository.findById(saleIdOrInvoice);
    if (!sale) throw Object.assign(new Error('Transaksi tidak ditemukan.'), { statusCode: 404 });

    if (sale.status === 'cancelled') {
      throw Object.assign(new Error('Transaksi sudah dibatalkan, tidak dapat diretur.'), { statusCode: 422 });
    }

    const alreadyReturnedMap = await returnRepository.getAlreadyReturnedQuantities(sale.id);

    // Attach returnable quantities to each item
    sale.items = sale.items.map(item => {
      const alreadyReturned = alreadyReturnedMap[item.id] || 0;
      const originalQty = parseFloat(item.quantity);
      const remainingQty = Math.max(0, originalQty - alreadyReturned);

      return {
        ...item,
        already_returned_qty: alreadyReturned,
        remaining_qty: remainingQty,
      };
    });

    return sale;
  }

  /**
   * Create a return request (Atomic)
   */
  async createReturn({ sale_id, items, reason }, userId) {
    if (!reason || reason.trim() === '') {
      throw Object.assign(new Error('Alasan retur wajib diisi.'), { statusCode: 422 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw Object.assign(new Error('Pilih minimal satu item untuk diretur.'), { statusCode: 422 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Lock sale
      const [saleRows] = await conn.execute(
        'SELECT * FROM sales WHERE id = ? FOR UPDATE',
        [sale_id]
      );
      if (saleRows.length === 0) {
        throw Object.assign(new Error('Transaksi tidak ditemukan.'), { statusCode: 404 });
      }

      const sale = saleRows[0];
      if (sale.status === 'cancelled') {
        throw Object.assign(new Error('Transaksi sudah dibatalkan.'), { statusCode: 422 });
      }

      // 2. Fetch sale items to validate quantities
      const [saleItems] = await conn.execute(
        'SELECT * FROM sale_items WHERE sale_id = ?',
        [sale.id]
      );
      const saleItemMap = {};
      saleItems.forEach(si => { saleItemMap[si.id] = si; });

      // 3. Get already returned quantities
      const [returnedRows] = await conn.execute(
        `SELECT ri.sale_item_id, SUM(ri.quantity) as returned_qty
         FROM return_items ri
         JOIN returns r ON r.id = ri.return_id
         WHERE r.sale_id = ? AND r.status IN ('requested', 'approved', 'completed')
         GROUP BY ri.sale_item_id`,
        [sale.id]
      );
      const returnedMap = {};
      returnedRows.forEach(r => { returnedMap[r.sale_item_id] = parseFloat(r.returned_qty); });

      // 4. Validate each return item
      let totalRefund = 0;
      const validReturnItems = [];

      for (const item of items) {
        const saleItemId = parseInt(item.sale_item_id);
        const qty = parseFloat(item.quantity);

        if (!saleItemMap[saleItemId]) {
          throw Object.assign(new Error(`Item transaksi ID ${saleItemId} tidak valid.`), { statusCode: 422 });
        }
        if (isNaN(qty) || qty <= 0) continue; // Skip items not being returned

        const originalItem = saleItemMap[saleItemId];
        const alreadyReturned = returnedMap[saleItemId] || 0;
        const maxReturnable = parseFloat(originalItem.quantity) - alreadyReturned;

        if (qty > maxReturnable) {
          throw Object.assign(
            new Error(`Kuantitas retur "${originalItem.product_name_snapshot}" (${qty}) melebihi sisa yang dapat diretur (${maxReturnable}).`),
            { statusCode: 422 }
          );
        }

        // Calculate refund amount: (effective unit price) * qty
        const itemDiscountPerUnit = parseFloat(originalItem.discount || 0) / parseFloat(originalItem.quantity);
        const effectiveUnitPrice = parseFloat(originalItem.unit_price) - itemDiscountPerUnit;
        const refundAmount = Math.max(0, effectiveUnitPrice * qty);

        totalRefund += refundAmount;
        validReturnItems.push({
          sale_item_id: saleItemId,
          quantity: qty,
          refund_amount: refundAmount,
          restock: !!item.restock,
        });
      }

      if (validReturnItems.length === 0) {
        throw Object.assign(new Error('Kuantitas retur harus lebih dari 0 untuk minimal satu item.'), { statusCode: 422 });
      }

      // 5. Generate return number
      const returnNumber = await generateReturnNumber(pool);

      // 6. Create return record
      const returnId = await returnRepository.createReturn(conn, {
        return_number: returnNumber,
        sale_id: sale.id,
        user_id: userId,
        total_refund: totalRefund,
        reason: reason.trim(),
        status: 'requested',
      });

      // 7. Create return items
      for (const item of validReturnItems) {
        await returnRepository.createReturnItem(conn, returnId, item);
      }

      await conn.commit();
      return await returnRepository.findById(returnId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Approve and complete a return
   * Atomically refunds, restores stock (if restock=true), and updates sales status
   */
  async approveAndComplete(returnId, adminId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Lock return record
      const [returnRows] = await conn.execute(
        'SELECT * FROM returns WHERE id = ? FOR UPDATE',
        [returnId]
      );
      if (returnRows.length === 0) {
        throw Object.assign(new Error('Data retur tidak ditemukan.'), { statusCode: 404 });
      }

      const ret = returnRows[0];
      if (ret.status === 'completed') {
        throw Object.assign(new Error('Retur ini sudah diselesaikan sebelumnya.'), { statusCode: 422 });
      }
      if (ret.status === 'rejected') {
        throw Object.assign(new Error('Retur ini telah ditolak.'), { statusCode: 422 });
      }

      // 2. Lock sale record
      const [saleRows] = await conn.execute(
        'SELECT * FROM sales WHERE id = ? FOR UPDATE',
        [ret.sale_id]
      );
      const sale = saleRows[0];

      // 3. Fetch return items
      const [returnItems] = await conn.execute(
        `SELECT ri.*, si.product_id, si.product_name_snapshot
         FROM return_items ri
         JOIN sale_items si ON si.id = ri.sale_item_id
         WHERE ri.return_id = ?`,
        [ret.id]
      );

      // 4. Process stock restoration for items with restock = true
      for (const item of returnItems) {
        if (item.restock) {
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

            await conn.execute('UPDATE products SET stock = ? WHERE id = ?', [stockAfter, product.id]);

            await conn.execute(
              `INSERT INTO stock_movements (product_id, user_id, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, note, created_at)
               VALUES (?, ?, 'sale_return', ?, ?, ?, 'return', ?, ?, NOW())`,
              [
                product.id,
                adminId,
                qty,
                stockBefore,
                stockAfter,
                ret.id,
                `Retur ${ret.return_number} (${sale.invoice_number})`,
              ]
            );
          }
        }
      }

      // 5. Update return status to completed
      await conn.execute(
        `UPDATE returns
         SET status = 'completed', approved_by = ?, updated_at = NOW()
         WHERE id = ?`,
        [adminId, ret.id]
      );

      // 6. Check total return coverage on the sale to update sale.status
      const [saleItems] = await conn.execute(
        'SELECT SUM(quantity) as total_sold FROM sale_items WHERE sale_id = ?',
        [sale.id]
      );
      const [completedReturns] = await conn.execute(
        `SELECT SUM(ri.quantity) as total_returned
         FROM return_items ri
         JOIN returns r ON r.id = ri.return_id
         WHERE r.sale_id = ? AND r.status = 'completed'`,
        [sale.id]
      );

      const totalSold = parseFloat(saleItems[0].total_sold) || 0;
      const totalReturned = parseFloat(completedReturns[0].total_returned) || 0;

      let newSaleStatus = 'partially_returned';
      if (totalReturned >= totalSold) {
        newSaleStatus = 'returned';
      }

      await conn.execute(
        'UPDATE sales SET status = ? WHERE id = ?',
        [newSaleStatus, sale.id]
      );

      await conn.commit();
      return await returnRepository.findById(ret.id);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Reject a return request
   */
  async reject(returnId, adminId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [returnRows] = await conn.execute(
        'SELECT * FROM returns WHERE id = ? FOR UPDATE',
        [returnId]
      );
      if (returnRows.length === 0) {
        throw Object.assign(new Error('Data retur tidak ditemukan.'), { statusCode: 404 });
      }

      const ret = returnRows[0];
      if (ret.status === 'completed') {
        throw Object.assign(new Error('Retur ini sudah diselesaikan, tidak dapat ditolak.'), { statusCode: 422 });
      }

      await conn.execute(
        `UPDATE returns
         SET status = 'rejected', approved_by = ?, updated_at = NOW()
         WHERE id = ?`,
        [adminId, ret.id]
      );

      await conn.commit();
      return await returnRepository.findById(ret.id);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new ReturnService();
