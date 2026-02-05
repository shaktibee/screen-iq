/**
 * Seed script: inserts dummy data for development.
 * Run: npm run db:seed (from backend/)
 */
import bcrypt from 'bcryptjs';
import { pool } from './connection.js';

const SALT_ROUNDS = 10;

async function seed() {
  const client = await pool.connect();
  try {
    // Get role IDs
    const rolesRes = await client.query(`SELECT id, name FROM roles`);
    const roles = Object.fromEntries(rolesRes.rows.map((r) => [r.name, r.id]));

    // 1. Organizations (India-focused)
    const orgRes = await client.query(
      `INSERT INTO organizations (name, slug) VALUES 
        ('ScreenIQ India', 'screeniq-india'),
        ('Metro Cinemas India', 'metro-cinemas-india')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, slug`
    );
    const orgBySlug = Object.fromEntries(orgRes.rows.map((r) => [r.slug, r.id]));
    const org1 = orgBySlug['screeniq-india'];
    const org2 = orgBySlug['metro-cinemas-india'];

    // 2. Users (password: password123)
    const passwordHash = await bcrypt.hash('password123', SALT_ROUNDS);
    const usersRes = await client.query(
      `INSERT INTO users (email, password_hash, full_name) VALUES 
        ('admin@demo.com', $1, 'Demo Admin'),
        ('analyst@demo.com', $1, 'Demo Analyst'),
        ('viewer@demo.com', $1, 'Demo Viewer')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name
       RETURNING id, email`,
      [passwordHash]
    );
    const userByEmail = Object.fromEntries(usersRes.rows.map((r) => [r.email, r.id]));

    // 3. User-Organization-Role
    await client.query(
      `INSERT INTO user_organizations (user_id, organization_id, role_id) VALUES 
        ($1, $2, $3), ($4, $2, $5), ($6, $2, $7),
        ($1, $8, $3), ($4, $8, $5)
       ON CONFLICT (user_id, organization_id) DO UPDATE SET role_id = EXCLUDED.role_id`,
      [
        userByEmail['admin@demo.com'],
        org1,
        roles['Admin'],
        userByEmail['analyst@demo.com'],
        roles['Analyst'],
        userByEmail['viewer@demo.com'],
        roles['Viewer'],
        org2,
      ]
    );

    // 4. Regions (India: state/regional groupings)
    const regionsRes = await client.query(
      `INSERT INTO regions (organization_id, name, code) VALUES 
        ($1, 'North India (NCR)', 'NCR'), ($1, 'East Punjab', 'PB'), ($1, 'Maharashtra', 'MH'),
        ($1, 'Karnataka', 'KA'), ($1, 'Tamil Nadu', 'TN'), ($1, 'West Bengal', 'WB')
       RETURNING id`,
      [org1]
    );
    const [regionNCR, regionPB, regionMH, regionKA, regionTN, regionWB] = regionsRes.rows.map((r) => r.id);

    // 5. Cinema chains (India)
    const chainsRes = await client.query(
      `INSERT INTO cinema_chains (organization_id, name) VALUES 
        ($1, 'PVR Cinemas'), ($1, 'Cinepolis India'), ($1, 'INOX')
       RETURNING id`,
      [org1]
    );
    const [chainPVR, chainCinepolis, chainINOX] = chainsRes.rows.map((r) => r.id);

    // 6. Theaters (PVR & Cinepolis in Indian cities)
    const theatersRes = await client.query(
      `INSERT INTO theaters (organization_id, cinema_chain_id, region_id, name, address, city, state, country) VALUES 
        ($1, $2, $3, 'PVR Saket', 'Select Citywalk Mall, Saket', 'Delhi', 'Delhi', 'India'),
        ($1, $2, $4, 'PVR Phoenix Mall', 'Phoenix Mall, Lower Parel', 'Mumbai', 'Maharashtra', 'India'),
        ($1, $2, $5, 'PVR Forum Mall', 'Forum Mall, Koramangala', 'Bengaluru', 'Karnataka', 'India'),
        ($1, $6, $4, 'Cinepolis Westend Mall', 'Westend Mall, Aundh', 'Pune', 'Maharashtra', 'India'),
        ($1, $6, $4, 'Cinepolis Viviana Mall', 'Viviana Mall, Thane', 'Mumbai', 'Maharashtra', 'India'),
        ($1, $6, $7, 'Cinepolis DLF Mall', 'DLF Mall, Chandigarh', 'Chandigarh', 'Punjab', 'India'),
        ($1, $8, $9, 'INOX South City', 'South City Mall', 'Kolkata', 'West Bengal', 'India')
       RETURNING id`,
      [org1, chainPVR, regionNCR, regionMH, regionKA, chainCinepolis, regionPB, chainINOX, regionWB]
    );
    const theaterIds = theatersRes.rows.map((r) => r.id);

    // 7. Screens (Audi-style naming common in India)
    const screensRes = await client.query(
      `INSERT INTO screens (organization_id, theater_id, name, capacity) VALUES 
        ($1, $2, 'Audi 1', 200), ($1, $2, 'Audi 2', 180), ($1, $2, 'Audi 3', 150),
        ($1, $3, 'Audi 1', 220), ($1, $3, 'Audi 2', 190), ($1, $3, 'Audi 3', 120),
        ($1, $4, 'Audi 1', 200), ($1, $4, 'Audi 2', 160),
        ($1, $5, 'Screen 1', 180), ($1, $5, 'Screen 2', 140),
        ($1, $6, 'Audi 1', 210), ($1, $6, 'Audi 2', 170),
        ($1, $7, 'Audi 1', 190), ($1, $7, 'Audi 2', 150),
        ($1, $8, 'Audi 1', 200), ($1, $8, 'Audi 2', 180)
       RETURNING id`,
      [org1, theaterIds[0], theaterIds[1], theaterIds[2], theaterIds[3], theaterIds[4], theaterIds[5], theaterIds[6]]
    );
    const screenIds = screensRes.rows.map((r) => r.id);

    // 8. Projects (titles: name, language, versions, duration, genre, week_start)
    const thisMonday = new Date();
    thisMonday.setDate(thisMonday.getDate() - thisMonday.getDay() + (thisMonday.getDay() === 0 ? -6 : 1));
    const weekStartStr = thisMonday.toISOString().slice(0, 10);
    let projectIds = [];
    const existingProjects = await client.query(
      `SELECT id FROM projects WHERE organization_id = $1 AND deleted_at IS NULL`,
      [org1]
    );
    if (existingProjects.rows.length >= 2) {
      projectIds = existingProjects.rows.slice(0, 2).map((r) => r.id);
      await client.query(
        `UPDATE projects SET week_start = $1, duration_mins = COALESCE(duration_mins, 120), genre = COALESCE(genre, 'Drama'), versions = COALESCE(versions, ARRAY['2D']) WHERE organization_id = $2 AND deleted_at IS NULL`,
        [weekStartStr, org1]
      );
    } else {
      const projectsRes = await client.query(
        `INSERT INTO projects (organization_id, name, release_date, language, regions, duration_mins, genre, versions, week_start) VALUES 
          ($1, 'Stree 2', '2025-08-15', 'Hindi', ARRAY['IN'], 138, 'Horror Comedy', ARRAY['2D','3D'], $2),
          ($1, 'Bhool Bhulaiyaa 3', '2025-10-02', 'Hindi', ARRAY['IN'], 150, 'Comedy Thriller', ARRAY['2D'], $2)
         RETURNING id`,
        [org1, weekStartStr]
      );
      projectIds = projectsRes.rows.map((r) => r.id);
    }

    // 9. Shows (screenings) — only insert if no shows this week (avoid duplicates on re-seed)
    const weekEnd = new Date(weekStartStr);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);
    const existingShows = await client.query(
      `SELECT 1 FROM shows WHERE organization_id = $1 AND deleted_at IS NULL AND start_time >= $2::date AND start_time < $3 LIMIT 1`,
      [org1, weekStartStr, weekEndStr]
    );
    if (existingShows.rows.length === 0) {
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStartStr);
        day.setDate(day.getDate() + d);
        day.setHours(14, 0, 0, 0);
        const start = new Date(day);
        const end = new Date(day);
        end.setHours(end.getHours() + 2);
        await client.query(
          `INSERT INTO shows (organization_id, project_id, name, screen_name, region, start_time, end_time, capacity, screen_id, ticket_price, sold_count) VALUES 
            ($1, $2, 'Matinee', 'Audi 1', 'IN', $3, $4, 200, $5, 250, $6),
            ($1, $2, 'Evening', 'Audi 2', 'IN', $7, $8, 180, $9, 300, $10)`,
          [
            org1,
            projectIds[0],
            start,
            end,
            screenIds[0],
            Math.floor(Math.random() * 120) + 30,
            new Date(day.getTime() + 4 * 3600000),
            new Date(day.getTime() + 6 * 3600000),
            screenIds[1],
            Math.floor(Math.random() * 100) + 40,
          ]
        );
      }
    }

    // 10. Uploaded file (placeholder)
    const fileRes = await client.query(
      `INSERT INTO uploaded_files (organization_id, project_id, filename, original_name, mime_type, size_bytes, row_count, status, uploaded_by) VALUES 
        ($1, $2, 'sample_import.xlsx', 'sample_import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 45000, 150, 'completed', $3)
       RETURNING id`,
      [org1, projectIds[0], userByEmail['admin@demo.com']]
    );
    const fileId = fileRes.rows[0]?.id;

    // 11. Data records (sample payloads)
    if (fileId) {
      for (let i = 0; i < 20; i++) {
        await client.query(
          `INSERT INTO data_records (organization_id, project_id, uploaded_file_id, payload) VALUES ($1, $2, $3, $4)`,
          [
            org1,
            projectIds[0],
            fileId,
            JSON.stringify({
              screen: `Audi ${(i % 5) + 1}`,
              date: new Date().toISOString().slice(0, 10),
              sold: Math.floor(Math.random() * 150) + 20,
              revenue: (Math.random() * 2000 + 500).toFixed(2),
              region: ['NCR', 'MH', 'KA', 'PB', 'WB'][i % 5],
            }),
          ]
        );
      }
    }

    // 12. Reports
    await client.query(
      `INSERT INTO reports (organization_id, project_id, title, type, share_token, created_by) VALUES 
        ($1, $2, 'Weekly Summary Q1', 'summary', 'share-demo-' || substr(md5(random()::text), 1, 12), $3),
        ($1, $2, 'Allocation Report', 'allocation', NULL, $3)
       ON CONFLICT DO NOTHING`,
      [org1, projectIds[0], userByEmail['admin@demo.com']]
    );

    console.log('Seed completed.');
    console.log('Demo users (password: password123):');
    console.log('  admin@demo.com   (Admin)');
    console.log('  analyst@demo.com (Analyst)');
    console.log('  viewer@demo.com  (Viewer)');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
