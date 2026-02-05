/**
 * Runs schema.sql to create/update database. Idempotent (IF NOT EXISTS).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  // Split by statement; filter empty and comments for a simple run (full file run is ok for pg)
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Migrations completed.');
  } finally {
    client.release();
  }
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
