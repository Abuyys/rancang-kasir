const pool = require('../../config/database');
const purchaseRepository = require('./purchase.repository');
const { generatePurchaseNumber } = require('../../utils/invoice-number');

class PurchaseService {
  async getAll(options) { return await purchaseRepository.findAll(options); }

  async getById(id) {
    const purchase = await purchaseRepository.findById(id);
    if (!purchase) throw Object.assign(new Error('Pembelian tidak ditemukan.'), { statusCode: 404 });
    return purchase;
  }

  async create(data, userId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const purchaseNumber = await generatePurchaseNumber(pool);

      // Calculate totals
      let subtotal = 0;
      const items = data.items.filter(item => item.product_id && item.quantity > 0);
      if (items.length === 0) throw Object.assign(new Error('Minimal satu item produk.'), { statusCode: 422 });

      for (const item of items) {
        item.quantity = parseFloat(item.quantity);
        item.unit_cost = parseFloat(item.unit_cost);
        subtotal += item.quantity * item.unit_cost;
      }

      const discount = parseFloat(data.discount) || 0;
      const total = subtotal - discount;

      const purchaseId = await purchaseRepository.create(conn, {
        purchase_number: purchaseNumber,
        supplier_id: data.supplier_id,
        user_id: userId,
        supplier_invoice_number: data.supplier_invoice_number,
        subtotal, discount, total,
        notes: data.notes,
      });

      await purchaseRepository.createItems(conn, purchaseId, items);
      await conn.commit();
      return await purchaseRepository.findById(purchaseId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async receive(id, userId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock purchase row
      const purchase = await purchaseRepository.findByIdForUpdate(conn, id);
      if (!purchase) throw Object.assign(new Error('Pembelian tidak ditemukan.'), { statusCode: 404 });
      if (purchase.status !== 'draft') throw Object.assign(new Error('Pembelian ini sudah diterima atau dibatalkan.'), { statusCode: 422 });

      // Get items
      const items = await purchaseRepository.getItemsByPurchaseId(conn, id);

      // Update stock for each item
      for (const item of items) {
        // Lock product row
        const [productRows] = await conn.execute(
          'SELECT id, stock, name FROM products WHERE id = ? FOR UPDATE', [item.product_id]
        );
        if (productRows.length === 0) throw new Error(`Produk ID ${item.product_id} tidak ditemukan.`);

        const product = productRows[0];
        const stockBefore = parseFloat(product.stock);
        const quantityChange = parseFloat(item.quantity);
        const stockAfter = stockBefore + quantityChange;

        // Update product stock
        await conn.execute('UPDATE products SET stock = ?, cost_price = ? WHERE id = ?',
          [stockAfter, item.unit_cost, item.product_id]);

        // Record stock movement
        await conn.execute(
          `INSERT INTO stock_movements (product_id, user_id, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, note, created_at)
           VALUES (?, ?, 'purchase', ?, ?, ?, 'purchase', ?, ?, NOW())`,
          [item.product_id, userId, quantityChange, stockBefore, stockAfter, id, `Penerimaan ${purchase.purchase_number}`]
        );
      }

      // Update purchase status
      await purchaseRepository.updateStatus(conn, id, 'received', { received_at: new Date() });
      await conn.commit();
      return await purchaseRepository.findById(id);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async cancel(id) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const purchase = await purchaseRepository.findByIdForUpdate(conn, id);
      if (!purchase) throw Object.assign(new Error('Pembelian tidak ditemukan.'), { statusCode: 404 });
      if (purchase.status !== 'draft') throw Object.assign(new Error('Hanya pembelian draft yang bisa dibatalkan.'), { statusCode: 422 });
      await purchaseRepository.updateStatus(conn, id, 'cancelled');
      await conn.commit();
      return await purchaseRepository.findById(id);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new PurchaseService();
