/**
 * PostgreSQL connection pool. Single pool per process; reuse for all queries.
 */
import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Optional: log pool errors in dev
pool.on('error', (err) => {
  console.error('DB pool error:', err.message);
});
