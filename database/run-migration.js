const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const dbName = process.env.DB_NAME || 'minimarket_pos';
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };

  let connection;
  try {
    // Try connecting directly to specified database
    connection = await mysql.createConnection({
      ...dbConfig,
      database: dbName,
      multipleStatements: true,
    });
  } catch (connectErr) {
    // If database doesn't exist (local dev error ER_BAD_DB_ERROR), create it
    if (connectErr.code === 'ER_BAD_DB_ERROR') {
      console.log(`Database '${dbName}' belum ada, membuat database...`);
      const rootConn = await mysql.createConnection({
        ...dbConfig,
      });
      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await rootConn.end();

      connection = await mysql.createConnection({
        ...dbConfig,
        database: dbName,
        multipleStatements: true,
      });
    } else {
      throw connectErr;
    }
  }

  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`🔄 Running ${files.length} migration(s) on database '${dbName}'...`);
    for (const file of files) {
      console.log(`   Executing ${file}...`);
      let sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      // Strip CREATE DATABASE and USE statements so migrations work seamlessly
      // on hosted databases (like DOM Cloud, AWS RDS, PlanetScale)
      sql = sql.replace(/CREATE DATABASE\s+IF NOT EXISTS\s+[`\w]+[^;]*;/gi, '');
      sql = sql.replace(/USE\s+[`\w]+;/gi, '');

      await connection.query(sql);
    }
    console.log('✅ All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
