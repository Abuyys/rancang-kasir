const pool = require('../config/database');

/**
 * Record a sensitive or important activity in the audit log
 * @param {number|null} userId - ID of user performing the action
 * @param {string} action - Action name (e.g., 'user_create', 'price_change', 'sale_cancel')
 * @param {string} entityType - Target entity type (e.g., 'user', 'product', 'sale', 'setting')
 * @param {string|number|null} entityId - Target entity ID
 * @param {string} description - Human-readable details
 * @param {string|null} ipAddress - Client IP address
 */
async function logActivity(userId, action, entityType, entityId = null, description = null, ipAddress = null) {
  try {
    await pool.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId || null, action, entityType, entityId ? String(entityId) : null, description || null, ipAddress || null]
    );
  } catch (err) {
    // Non-blocking log failure
    console.error('Audit Log Error:', err.message);
  }
}

module.exports = { logActivity };
