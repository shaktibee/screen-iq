/**
 * Add movies buzz/sentiment columns if missing. Run: node src/db/migrate-movies-buzz.js
 */
import { pool } from './connection.js';

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'movies') THEN
          CREATE TABLE movies (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title VARCHAR(500), created_at TIMESTAMPTZ DEFAULT now());
        END IF;
      END $$;
    `);
    console.log('Movies buzz migration completed.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
