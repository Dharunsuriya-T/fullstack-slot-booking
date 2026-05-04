const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 20),
  idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(
    process.env.PG_POOL_CONN_TIMEOUT_MS || 10000
  ),
  keepAlive: true
});

// Listen for unexpected errors on idle clients to avoid crashing the process
pool.on('error', (err, client) => {
  console.error('[PG_POOL_ERROR] Unexpected error on idle client', err);
});

module.exports = pool;
