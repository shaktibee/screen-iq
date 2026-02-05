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

    console.log('Seed completed.');
    console.log('Demo login: admin@demo.com / password123');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
