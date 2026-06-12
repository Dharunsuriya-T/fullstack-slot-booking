require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('[MIGRATION] Starting database migrations...');

    // 1. Create a tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Read migration files
    const migrationsDir = path.join(__dirname, 'src', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('[MIGRATION] Migrations directory not found. Skipping.');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // 3. Execute new migrations
    for (const file of migrationFiles) {
      // Check if already executed
      const check = await client.query(
        'SELECT 1 FROM schema_migrations WHERE name = $1',
        [file]
      );

      if (check.rows.length === 0) {
        console.log(`[MIGRATION] Running migration: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO schema_migrations (name) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          console.log(`[MIGRATION] ✓ ${file} completed successfully.`);
        } catch (err) {
          await client.query('ROLLBACK');
          
          // Self-heal: If the error is because a column, table, index, or extension already exists,
          // we assume it was previously applied manually and mark it as applied.
          const duplicateErrors = ['42701', '42P07', '42710'];
          if (err.code && duplicateErrors.includes(err.code)) {
            console.log(`[MIGRATION] ⚠ Migration element already exists in database (${err.code}: ${err.message}). Marking ${file} as applied.`);
            await client.query(
              'INSERT INTO schema_migrations (name) VALUES ($1)',
              [file]
            );
            console.log(`[MIGRATION] ✓ ${file} marked as applied.`);
          } else {
            throw err;
          }
        }
      } else {
        console.log(`[MIGRATION] Skipping already applied migration: ${file}`);
      }
    }

    console.log('[MIGRATION] All migrations completed successfully.');
  } catch (error) {
    console.error('[MIGRATION] Migration failed:', error.message || error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
