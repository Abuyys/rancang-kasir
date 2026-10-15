const pool = require('../../config/database');

class SettingRepository {
  async getAll() {
    const [rows] = await pool.execute('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    rows.forEach(r => {
      settings[r.setting_key] = r.setting_value;
    });
    return settings;
  }

  async get(key) {
    const [rows] = await pool.execute(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      [key]
    );
    return rows.length > 0 ? rows[0].setting_value : null;
  }

  async updateMany(settingsObj) {
    for (const [key, value] of Object.entries(settingsObj)) {
      await pool.execute(
        `INSERT INTO settings (setting_key, setting_value, updated_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
        [key, value !== undefined ? String(value) : null, value !== undefined ? String(value) : null]
      );
    }
  }

  async getAuditLogs({ action = null, entityType = null, startDate = null, endDate = null, page = 1, limit = 25 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (action) {
      where += ' AND l.action = ?';
      params.push(action);
    }
    if (entityType) {
      where += ' AND l.entity_type = ?';
      params.push(entityType);
    }
    if (startDate) {
      where += ' AND DATE(l.created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND DATE(l.created_at) <= ?';
      params.push(endDate);
    }

    const [countResult] = await pool.execute(`SELECT COUNT(*) as total FROM activity_logs l ${where}`, params);
    const total = countResult[0].total;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT l.*, u.name as user_name, u.role as user_role
       FROM activity_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

module.exports = new SettingRepository();
