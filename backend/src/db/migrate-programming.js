/**
 * Runs schema-programming.sql to add Movie Programming columns and title_factors table.
 * Safe to run multiple times (idempotent).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const schemaPath = path.join(__dirname, 'schema-programming.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Programming migration completed.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Programming migration failed:', err);
  process.exit(1);
});
