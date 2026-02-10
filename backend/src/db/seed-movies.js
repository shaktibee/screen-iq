/**
 * Seed movies if table exists and is empty. Run after schema-programme / seed-programming.
 */
import { pool } from './connection.js';

async function run() {
  const client = await pool.connect();
  try {
    const r = await client.query(`SELECT COUNT(*)::int AS c FROM movies`);
    if (r.rows[0].c > 0) {
      console.log('Movies already seeded. Skip.');
      return;
    }
    await client.query(`
      INSERT INTO movies (title, release_date, language, duration_mins, version, genre)
      VALUES ('Sample Movie', CURRENT_DATE, 'Hindi', 120, '2D', 'Drama')
      ON CONFLICT DO NOTHING
    `).catch(() => {});
    console.log('Seed movies completed.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
