/**
 * Generate unique invoice number
 * Format: INV-YYYYMMDD-XXXX (sequential per day)
 * @param {import('mysql2/promise').Pool} pool - MySQL connection pool
 * @returns {Promise<string>} Generated invoice number
 */
async function generateInvoiceNumber(pool) {
  const today = new Date();
  const dateStr = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');

  const prefix = `INV-${dateStr}-`;

  const [rows] = await pool.query(
    `SELECT invoice_number FROM sales 
     WHERE invoice_number LIKE ? 
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let seq = 1;
  if (rows.length > 0) {
    const lastNum = rows[0].invoice_number;
    const lastSeq = parseInt(lastNum.split('-').pop(), 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * Generate unique purchase number
 * Format: PUR-YYYYMMDD-XXXX
 */
async function generatePurchaseNumber(pool) {
  const today = new Date();
  const dateStr = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');

  const prefix = `PUR-${dateStr}-`;

  const [rows] = await pool.query(
    `SELECT purchase_number FROM purchases 
     WHERE purchase_number LIKE ? 
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let seq = 1;
  if (rows.length > 0) {
    const lastNum = rows[0].purchase_number;
    const lastSeq = parseInt(lastNum.split('-').pop(), 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * Generate unique return number
 * Format: RET-YYYYMMDD-XXXX
 */
async function generateReturnNumber(pool) {
  const today = new Date();
  const dateStr = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');

  const prefix = `RET-${dateStr}-`;

  const [rows] = await pool.query(
    `SELECT return_number FROM returns 
     WHERE return_number LIKE ? 
     ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let seq = 1;
  if (rows.length > 0) {
    const lastNum = rows[0].return_number;
    const lastSeq = parseInt(lastNum.split('-').pop(), 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

module.exports = {
  generateInvoiceNumber,
  generatePurchaseNumber,
  generateReturnNumber,
};
