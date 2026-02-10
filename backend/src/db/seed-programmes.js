/**
 * Seed sample programmes for schedule/calendar overview.
 * Run after: npm run db:migrate, db:seed, db:seed-programming (from backend/)
 * Run: node src/db/seed-programmes.js
 */
import { pool } from './connection.js';

async function seedProgrammes() {
  const client = await pool.connect();
  try {
    const orgRes = await client.query(`SELECT id FROM organizations LIMIT 1`);
    const orgId = orgRes.rows[0]?.id || null;
    const userRes = await client.query(`SELECT id FROM users LIMIT 1`);
    const userId = userRes.rows[0]?.id || null;

    const movies = await client.query(
      `SELECT id, title FROM movies ORDER BY release_date DESC NULLS LAST LIMIT 12`
    );
    const theatres = await client.query(
      `SELECT t.id, t.name, t.screen_count, l.name AS location_name, s.name AS state_name, r.name AS region_name
       FROM theatres t
       JOIN locations l ON l.id = t.location_id
       JOIN states s ON s.id = l.state_id
       JOIN regions r ON r.id = s.region_id
       ORDER BY r.name, l.name, t.name
       LIMIT 20`
    );
    if (movies.rows.length < 3 || theatres.rows.length < 3) {
      console.log('Need at least 3 movies and 3 theatres. Run db:seed-programming first.');
      return;
    }

    const countRes = await client.query(`SELECT COUNT(*)::int AS c FROM programmes`);
    if (countRes.rows[0].c > 0) {
      console.log('Programmes already seeded. Skip.');
      return;
    }

    const today = new Date();
    const addDays = (d, n) => {
      const x = new Date(d);
      x.setDate(x.getDate() + n);
      return x.toISOString().slice(0, 10);
    };

    // Create 6–8 programmes across this week and next (varied theatres/locations)
    const programmes = [
      { movieIdx: 0, start: 0, end: 6, theatreIdxs: [0, 1, 2] },           // Pushpa/Stree etc – 3 theatres, 1 week
      { movieIdx: 1, start: 0, end: 13, theatreIdxs: [0, 3, 4] },          // 2 weeks, different theatres
      { movieIdx: 2, start: 2, end: 9, theatreIdxs: [1, 5] },             // starts in 2 days
      { movieIdx: 3, start: 5, end: 12, theatreIdxs: [2, 6, 7] },         // starts later in week
      { movieIdx: 4, start: 7, end: 14, theatreIdxs: [8, 9] },            // next week
      { movieIdx: 5, start: -1, end: 5, theatreIdxs: [0, 1] },            // started yesterday
    ];

    for (const p of programmes) {
      const startDate = addDays(today, p.start);
      const endDate = addDays(today, p.end);
      const movieId = movies.rows[p.movieIdx % movies.rows.length].id;
      const progRes = await client.query(
        `INSERT INTO programmes (organization_id, created_by, movie_id, start_date, end_date, time_slot_pattern, tat_mins)
         VALUES ($1, $2, $3, $4, $5, 'linear', 50) RETURNING id`,
        [orgId, userId, movieId, startDate, endDate]
      );
      const programmeId = progRes.rows[0].id;
      for (const ti of p.theatreIdxs) {
        const theatreId = theatres.rows[ti % theatres.rows.length].id;
        await client.query(
          `INSERT INTO programme_theatres (programme_id, theatre_id, shows_per_theatre, shows_per_screen, capacity_utilization, version_ratio_2d, version_ratio_3d, version_ratio_imax, languages)
           VALUES ($1, $2, 4, 2, 'moderate', 70, 20, 10, ARRAY['Hindi'])`,
          [programmeId, theatreId]
        );
      }
    }

    console.log(`Seeded ${programmes.length} programmes with theatre allocations.`);
  } finally {
    client.release();
    await pool.end();
  }
}

seedProgrammes().catch((err) => {
  console.error('Seed programmes failed:', err);
  process.exit(1);
});

/**
 * Seed sample programmes for schedule/calendar overview.
 * Run after: npm run db:migrate, db:seed, db:seed-programming (from backend/)
 * Run: node src/db/seed-programmes.js
 */
import { pool } from './connection.js';

async function seedProgrammes() {
  const client = await pool.connect();
  try {
    const orgRes = await client.query(`SELECT id FROM organizations LIMIT 1`);
    const orgId = orgRes.rows[0]?.id || null;
    const userRes = await client.query(`SELECT id FROM users LIMIT 1`);
    const userId = userRes.rows[0]?.id || null;

    const movies = await client.query(
      `SELECT id, title FROM movies ORDER BY release_date DESC NULLS LAST LIMIT 12`
    );
    const theatres = await client.query(
      `SELECT t.id, t.name, t.screen_count, l.name AS location_name, s.name AS state_name, r.name AS region_name
       FROM theatres t
       JOIN locations l ON l.id = t.location_id
       JOIN states s ON s.id = l.state_id
       JOIN regions r ON r.id = s.region_id
       ORDER BY r.name, l.name, t.name
       LIMIT 20`
    );
    if (movies.rows.length < 3 || theatres.rows.length < 3) {
      console.log('Need at least 3 movies and 3 theatres. Run db:seed-programming first.');
      return;
    }

    const countRes = await client.query(`SELECT COUNT(*)::int AS c FROM programmes`);
    if (countRes.rows[0].c > 0) {
      console.log('Programmes already seeded. Skip.');
      return;
    }

    const today = new Date();
    const addDays = (d, n) => {
      const x = new Date(d);
      x.setDate(x.getDate() + n);
      return x.toISOString().slice(0, 10);
    };

    // Create 6–8 programmes across this week and next (varied theatres/locations)
    const programmes = [
      { movieIdx: 0, start: 0, end: 6, theatreIdxs: [0, 1, 2] },           // Pushpa/Stree etc – 3 theatres, 1 week
      { movieIdx: 1, start: 0, end: 13, theatreIdxs: [0, 3, 4] },          // 2 weeks, different theatres
      { movieIdx: 2, start: 2, end: 9, theatreIdxs: [1, 5] },             // starts in 2 days
      { movieIdx: 3, start: 5, end: 12, theatreIdxs: [2, 6, 7] },         // starts later in week
      { movieIdx: 4, start: 7, end: 14, theatreIdxs: [8, 9] },            // next week
      { movieIdx: 5, start: -1, end: 5, theatreIdxs: [0, 1] },            // started yesterday
    ];

    for (const p of programmes) {
      const startDate = addDays(today, p.start);
      const endDate = addDays(today, p.end);
      const movieId = movies.rows[p.movieIdx % movies.rows.length].id;
      const progRes = await client.query(
        `INSERT INTO programmes (organization_id, created_by, movie_id, start_date, end_date, time_slot_pattern, tat_mins)
         VALUES ($1, $2, $3, $4, $5, 'linear', 50) RETURNING id`,
        [orgId, userId, movieId, startDate, endDate]
      );
      const programmeId = progRes.rows[0].id;
      for (const ti of p.theatreIdxs) {
        const theatreId = theatres.rows[ti % theatres.rows.length].id;
        await client.query(
          `INSERT INTO programme_theatres (programme_id, theatre_id, shows_per_theatre, shows_per_screen, capacity_utilization, version_ratio_2d, version_ratio_3d, version_ratio_imax, languages)
           VALUES ($1, $2, 4, 2, 'moderate', 70, 20, 10, ARRAY['Hindi'])`,
          [programmeId, theatreId]
        );
      }
    }

    console.log(`Seeded ${programmes.length} programmes with theatre allocations.`);
  } finally {
    client.release();
    await pool.end();
  }
}

seedProgrammes().catch((err) => {
  console.error('Seed programmes failed:', err);
  process.exit(1);
});
