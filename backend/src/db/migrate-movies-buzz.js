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
          CREATE TABLE movies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(500),
            created_at TIMESTAMPTZ DEFAULT now()
          );
        END IF;
      END $$;
    `);

    // Add missing columns if they do not exist
    await client.query(`
      ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS release_date DATE,
      ADD COLUMN IF NOT EXISTS budget NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS sentiment VARCHAR(20),
      ADD COLUMN IF NOT EXISTS overview TEXT,
      ADD COLUMN IF NOT EXISTS language VARCHAR(100),
      ADD COLUMN IF NOT EXISTS duration_mins INT,
      ADD COLUMN IF NOT EXISTS version VARCHAR(50),
      ADD COLUMN IF NOT EXISTS genre VARCHAR(100);
    `);

    console.log('Movies buzz migration completed.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
