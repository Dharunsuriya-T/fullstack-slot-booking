const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Listen for unexpected errors on idle clients to avoid crashing the process
pool.on('error', (err, client) => {
  console.error('[PG_POOL_ERROR] Unexpected error on idle client', err);
});

module.exports = pool;
