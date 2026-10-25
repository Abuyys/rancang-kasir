const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
  charset: 'utf8mb4',
  decimalNumbers: true,
  // Return dates as strings to avoid timezone conversion issues
  dateStrings: true,
});

// Test connection on startup (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  pool.getConnection()
    .then(conn => {
      console.log('✅ Database connected successfully');
      conn.release();
    })
    .catch(err => {
      console.error('❌ Database connection failed:', err.message);
    });
}

module.exports = pool;
