/**
 * Seed screens (audis) for each theatre: "Audi 1", "Audi 2", ... up to screen_count.
 * Run after: db:migrate-programme, db:seed-programming, db:migrate-screens
 */
import { pool } from './connection.js';

async function seedScreens() {
  const client = await pool.connect();
  try {
    const theatres = await client.query(
      `SELECT id, name, screen_count FROM theatres ORDER BY name`
    );
    for (const t of theatres.rows) {
      const existing = await client.query(
        `SELECT COUNT(*)::int AS c FROM theatre_screens WHERE theatre_id = $1`,
        [t.id]
      );
      if (existing.rows[0].c > 0) continue;

      for (let i = 1; i <= t.screen_count; i++) {
        await client.query(
          `INSERT INTO theatre_screens (theatre_id, name, display_order) VALUES ($1, $2, $3)
           ON CONFLICT (theatre_id, name) DO NOTHING`,
          [t.id, `Audi ${i}`, i]
        );
      }
    }
    console.log('Screens (audis) seed completed.');
  } finally {
    client.release();
    await pool.end();
  }
}

seedScreens().catch((err) => {
  console.error('Seed screens failed:', err);
  process.exit(1);
});
