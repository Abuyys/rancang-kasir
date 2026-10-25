const pool = require('../../config/database');

class BarcodeRepository {
  /**
   * Find product by ID
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find active product by barcode for POS scanning
   */
  async findActiveByBarcode(barcode) {
    const cleaned = String(barcode || '').trim();
    const [rows] = await pool.execute(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.barcode = ? AND p.is_active = 1`,
      [cleaned]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Check if barcode is used by another product
   */
  async findByBarcode(barcode, excludeId = null) {
    const cleaned = String(barcode || '').trim();
    let sql = 'SELECT id, sku, name, barcode, is_active FROM products WHERE barcode = ?';
    const params = [cleaned];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await pool.execute(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find all products without a barcode
   */
  async findProductsWithoutBarcode() {
    const [rows] = await pool.execute(
      `SELECT id, sku, name, selling_price, cost_price, stock
       FROM products
       WHERE barcode IS NULL OR TRIM(barcode) = ''
       ORDER BY id ASC`
    );
    return rows;
  }

  /**
   * Find products by an array of IDs for label printing
   */
  async findByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    
    // Sanitize integers
    const cleanIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0);
    if (cleanIds.length === 0) return [];

    const placeholders = cleanIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id IN (${placeholders})
       ORDER BY p.name ASC`,
      cleanIds
    );
    return rows;
  }

  /**
   * Get next auto-increment product ID
   */
  async getNextProductId() {
    const [rows] = await pool.query(
      `SELECT AUTO_INCREMENT 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'`
    );
    if (rows.length > 0 && rows[0].AUTO_INCREMENT) {
      return parseInt(rows[0].AUTO_INCREMENT, 10);
    }
    const [maxRows] = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM products');
    return parseInt(maxRows[0].next_id, 10);
  }

  /**
   * Find all active products that have a valid barcode
   */
  async findAllWithBarcode() {
    const [rows] = await pool.execute(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.barcode IS NOT NULL AND TRIM(p.barcode) != '' AND p.is_active = 1
       ORDER BY p.name ASC`
    );
    return rows;
  }

  /**
   * Find all active products for label picker modal
   */
  async findAllForPicker() {
    const [rows] = await pool.execute(
      `SELECT p.id, p.sku, p.name, p.barcode, p.barcode_type, p.selling_price, p.stock, p.is_active, p.category_id, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = 1
       ORDER BY p.name ASC`
    );
    return rows;
  }

  /**
   * Find all categories for filtering in picker
   */
  async findAllCategories() {
    const [rows] = await pool.execute(
      `SELECT id, name FROM categories ORDER BY name ASC`
    );
    return rows;
  }

  /**
   * Update barcode and metadata for a product
   */
  async updateBarcode(id, { barcode, barcode_type, barcode_source, barcode_generated_at }) {
    const [result] = await pool.execute(
      `UPDATE products
       SET barcode = ?,
           barcode_type = ?,
           barcode_source = ?,
           barcode_generated_at = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        barcode,
        barcode_type,
        barcode_source,
        barcode_generated_at || null,
        id
      ]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new BarcodeRepository();
