const pool = require('../../config/database');
const inventoryRepository = require('./inventory.repository');

class InventoryService {
  async getStockSummary(options) {
    return await inventoryRepository.getStockSummary(options);
  }

  async getMovements(options) {
    return await inventoryRepository.getMovements(options);
  }

  async createAdjustment({ product_id, type, quantity, reason, user_id }) {
    if (!reason || reason.trim() === '') {
      throw Object.assign(new Error('Alasan penyesuaian stok wajib diisi.'), { statusCode: 422 });
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      throw Object.assign(new Error('Jumlah harus lebih dari 0.'), { statusCode: 422 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const product = await inventoryRepository.getProductForUpdate(conn, product_id);
      if (!product) throw Object.assign(new Error('Produk tidak ditemukan.'), { statusCode: 404 });

      const stockBefore = parseFloat(product.stock);
      let quantityChange, movementType;

      if (type === 'in') {
        quantityChange = qty;
        movementType = 'adjustment_in';
      } else {
        quantityChange = -qty;
        movementType = 'adjustment_out';
      }

      const stockAfter = stockBefore + quantityChange;

      if (stockAfter < 0) {
        throw Object.assign(
          new Error(`Stok tidak boleh negatif. Stok saat ini: ${stockBefore}, pengurangan: ${qty}.`),
          { statusCode: 422 }
        );
      }

      await inventoryRepository.updateStock(conn, product_id, stockAfter);
      await inventoryRepository.createMovement(conn, {
        product_id, user_id, movement_type: movementType,
        quantity_change: quantityChange, stock_before: stockBefore, stock_after: stockAfter,
        reference_type: 'adjustment', note: reason,
      });

      await conn.commit();
      return { product_name: product.name, stockBefore, stockAfter, quantityChange };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new InventoryService();
