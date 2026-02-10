/**
 * Seed: roles (in schema), one demo org + user for testing login.
 * Run: npm run db:seed (from backend/)
 */
import bcrypt from 'bcryptjs';
import { pool } from './connection.js';

const SALT_ROUNDS = 10;

async function seed() {
  const client = await pool.connect();
  try {
    const rolesRes = await client.query(`SELECT id, name FROM roles`);
    const roles = Object.fromEntries(rolesRes.rows.map((r) => [r.name, r.id]));

    const orgRes = await client.query(
      `INSERT INTO organizations (name, slug) VALUES ('Demo Org', 'demo-org')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );
    const orgId = orgRes.rows[0].id;

    const passwordHash = await bcrypt.hash('password123', SALT_ROUNDS);
    const usersRes = await client.query(
      `INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name
       RETURNING id`,
      ['admin@demo.com', passwordHash, 'Demo User']
    );
    const userId = usersRes.rows[0].id;

    await client.query(
      `INSERT INTO user_organizations (user_id, organization_id, role_id) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, organization_id) DO UPDATE SET role_id = EXCLUDED.role_id`,
      [userId, orgId, roles['Admin']]
    );

    // Seed movies (for Movies screen: budget, sentiment, released vs upcoming)
    const countRes = await client.query('SELECT COUNT(*)::int AS c FROM movies');
    if (countRes.rows[0].c === 0) {
      const movies = [
        ['Stree 2', '2025-08-15', 'Hindi', 138, 'Horror Comedy', 85000000, 'positive', 'Sequel to the hit horror comedy Stree.'],
        ['Bhool Bhulaiyaa 3', '2025-10-17', 'Hindi', 150, 'Horror Comedy', 120000000, 'positive', 'Third installment of the Bhool Bhulaiyaa franchise.'],
        ['Jigra', '2024-09-27', 'Hindi', 132, 'Drama', 45000000, 'neutral', 'A story of resilience and bond between siblings.'],
        ['Pushpa 2: The Rule', '2024-12-06', 'Telugu', 175, 'Action', 350000000, 'positive', 'Sequel to Pushpa: The Rise.'],
        ['Kalki 2898 AD', '2024-06-27', 'Hindi', 181, 'Sci-Fi', 600000000, 'positive', 'Epic sci-fi set in the year 2898 AD.'],
        ['Singham Again', '2024-10-02', 'Hindi', 158, 'Action', 200000000, 'positive', 'Latest in the Singham cop franchise.'],
        ['Jawan', '2023-09-07', 'Hindi', 169, 'Action', 300000000, 'positive', 'A man fights for social justice.'],
        ['Animal', '2023-12-01', 'Hindi', 201, 'Action Drama', 100000000, 'mixed', 'A father-son story with intense drama.'],
        ['Pathaan', '2023-01-25', 'Hindi', 146, 'Action', 250000000, 'positive', 'Spy thriller in the YRF spy universe.'],
        ['RRR', '2022-03-25', 'Telugu', 182, 'Action', 550000000, 'positive', 'Fictional tale of two Indian revolutionaries.'],
        ['KGF Chapter 2', '2022-04-14', 'Kannada', 168, 'Action', 100000000, 'positive', 'Sequel to KGF, Rocky battles Adheera.'],
        ['Brahmastra', '2022-09-09', 'Hindi', 167, 'Fantasy', 410000000, 'mixed', 'Superhero fantasy rooted in Indian mythology.'],
        ['Kantara', '2022-09-30', 'Kannada', 148, 'Thriller', 16000000, 'positive', 'Folklore thriller set in coastal Karnataka.'],
        ['Drishyam 2', '2022-11-18', 'Hindi', 140, 'Thriller', 50000000, 'positive', 'Sequel to Drishyam.'],
        ['Saathi', '2025-11-07', 'Hindi', null, 'Drama', 60000000, 'neutral', 'Upcoming drama film.'],
        ['Metro... In Dino', '2024-11-29', 'Hindi', 132, 'Romance', 55000000, 'neutral', 'Anthology of love stories.'],
        ['The Fantastic Four: First Steps', '2025-07-25', 'Hindi', null, 'Sci-Fi', 280000000, 'positive', 'Marvel reboot of Fantastic Four.'],
      ];
      for (const m of movies) {
        await client.query(
          `INSERT INTO movies (title, release_date, language, duration_mins, genre, budget, sentiment, overview)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          m
        );
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
