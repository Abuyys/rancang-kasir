const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function seedAdmin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'minimarket_pos',
  });

  try {
    const passwordHash = await bcrypt.hash('admin123', 10);

    await connection.execute(
      `INSERT INTO users (name, username, password_hash, role, is_active)
       VALUES (?, ?, ?, 'admin', TRUE)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      ['Administrator', 'admin', passwordHash]
    );

    console.log('✅ Admin user seeded successfully!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   ⚠️  Ganti password ini segera di production!');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedAdmin();
