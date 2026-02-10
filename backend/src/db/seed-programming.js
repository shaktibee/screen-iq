/**
 * Seed programming module: regions, states, locations, theatres, movies.
 * Run after schema and main seed: node src/db/seed-programming.js
 */
import { pool } from './connection.js';

const REGIONS = [
  { name: 'North' },
  { name: 'South' },
  { name: 'East' },
  { name: 'West' },
  { name: 'Central' },
];

const STATE_REGION = [
  { state: 'Delhi', region: 'North' },
  { state: 'Maharashtra', region: 'West' },
  { state: 'Karnataka', region: 'South' },
  { state: 'Tamil Nadu', region: 'South' },
  { state: 'West Bengal', region: 'East' },
  { state: 'Telangana', region: 'South' },
  { state: 'Haryana', region: 'North' },
  { state: 'Uttar Pradesh', region: 'North' },
  { state: 'Chandigarh', region: 'North' },
  { state: 'Gujarat', region: 'West' },
  { state: 'Rajasthan', region: 'North' },
  { state: 'Madhya Pradesh', region: 'Central' },
];

const LOCATION_STATE = [
  { location: 'Mumbai', state: 'Maharashtra' },
  { location: 'Delhi', state: 'Delhi' },
  { location: 'Gurgaon', state: 'Haryana' },
  { location: 'Noida', state: 'Uttar Pradesh' },
  { location: 'Bengaluru', state: 'Karnataka' },
  { location: 'Chennai', state: 'Tamil Nadu' },
  { location: 'Kolkata', state: 'West Bengal' },
  { location: 'Hyderabad', state: 'Telangana' },
  { location: 'Pune', state: 'Maharashtra' },
  { location: 'Chandigarh', state: 'Chandigarh' },
  { location: 'Ahmedabad', state: 'Gujarat' },
  { location: 'Jaipur', state: 'Rajasthan' },
  { location: 'Bhopal', state: 'Madhya Pradesh' },
];

const THEATRES = [
  { name: 'PVR Phoenix Mall', location: 'Mumbai', chain: 'PVR', screens: 6 },
  { name: 'PVR Icon (Oberoi Mall)', location: 'Mumbai', chain: 'PVR', screens: 5 },
  { name: 'INOX R City', location: 'Mumbai', chain: 'INOX', screens: 4 },
  { name: 'Cinepolis Viviana Mall', location: 'Mumbai', chain: 'Cinepolis', screens: 5 },
  { name: 'Carnival Cinemas - Andheri', location: 'Mumbai', chain: 'Carnival', screens: 4 },
  { name: 'PVR Saket', location: 'Delhi', chain: 'PVR', screens: 6 },
  { name: 'PVR Select Citywalk', location: 'Delhi', chain: 'PVR', screens: 5 },
  { name: 'INOX Nehru Place', location: 'Delhi', chain: 'INOX', screens: 4 },
  { name: 'PVR Ambience Mall', location: 'Gurgaon', chain: 'PVR', screens: 6 },
  { name: 'PVR Logix', location: 'Noida', chain: 'PVR', screens: 4 },
  { name: 'PVR Forum Mall', location: 'Bengaluru', chain: 'PVR', screens: 5 },
  { name: 'INOX Mantri Square', location: 'Bengaluru', chain: 'INOX', screens: 5 },
  { name: 'Cinepolis Orion Mall', location: 'Bengaluru', chain: 'Cinepolis', screens: 4 },
  { name: 'PVR Velachery', location: 'Chennai', chain: 'PVR', screens: 4 },
  { name: 'INOX Egmore', location: 'Chennai', chain: 'INOX', screens: 4 },
  { name: 'INOX South City Mall', location: 'Kolkata', chain: 'INOX', screens: 5 },
  { name: 'PVR Avani Mall', location: 'Kolkata', chain: 'PVR', screens: 4 },
  { name: 'PVR Inorbit', location: 'Hyderabad', chain: 'PVR', screens: 5 },
  { name: 'INOX GVK One', location: 'Hyderabad', chain: 'INOX', screens: 4 },
  { name: 'Cinepolis Westend Mall', location: 'Pune', chain: 'Cinepolis', screens: 4 },
  { name: 'PVR Pavilion Mall', location: 'Pune', chain: 'PVR', screens: 4 },
  { name: 'PVR Acropolis', location: 'Ahmedabad', chain: 'PVR', screens: 5 },
  { name: 'INOX R-World', location: 'Ahmedabad', chain: 'INOX', screens: 4 },
  { name: 'INOX Pink Square', location: 'Jaipur', chain: 'INOX', screens: 4 },
  { name: 'PVR World Trade Park', location: 'Jaipur', chain: 'PVR', screens: 5 },
  { name: 'PVR DLF Mall', location: 'Chandigarh', chain: 'PVR', screens: 4 },
  { name: 'Cinepolis DLF Mall', location: 'Chandigarh', chain: 'Cinepolis', screens: 4 },
  { name: 'PVR DB Mall', location: 'Bhopal', chain: 'PVR', screens: 4 },
  { name: 'Cinepolis Bhopal', location: 'Bhopal', chain: 'Cinepolis', screens: 3 },
];

const MOVIES = [
  { title: 'Stree 2', release_date: '2025-08-15', language: 'Hindi', duration_mins: 139, version: '2D', genre: 'Horror Comedy' },
  { title: 'Bhool Bhulaiyaa 3', release_date: '2025-07-18', language: 'Hindi', duration_mins: 148, version: '2D', genre: 'Horror Comedy' },
  { title: 'Jigra', release_date: '2024-09-27', language: 'Hindi', duration_mins: 132, version: '2D', genre: 'Drama' },
  { title: 'Pushpa 2: The Rule', release_date: '2024-12-06', language: 'Telugu', duration_mins: 182, version: '2D', genre: 'Action' },
  { title: 'Kalki 2898 AD', release_date: '2024-06-27', language: 'Hindi', duration_mins: 181, version: '2D', genre: 'Sci-Fi' },
  { title: 'Singham Again', release_date: '2024-10-02', language: 'Hindi', duration_mins: 169, version: '2D', genre: 'Action' },
  { title: 'Jawan', release_date: '2023-09-07', language: 'Hindi', duration_mins: 169, version: '2D', genre: 'Action' },
  { title: 'Animal', release_date: '2023-12-01', language: 'Hindi', duration_mins: 201, version: '2D', genre: 'Action' },
  { title: 'Pathaan', release_date: '2023-01-25', language: 'Hindi', duration_mins: 146, version: '2D', genre: 'Action' },
  { title: 'Gadar 2', release_date: '2023-08-11', language: 'Hindi', duration_mins: 170, version: '2D', genre: 'Action' },
  { title: 'RRR', release_date: '2022-03-25', language: 'Telugu', duration_mins: 182, version: '2D', genre: 'Action' },
  { title: 'KGF Chapter 2', release_date: '2022-04-14', language: 'Kannada', duration_mins: 168, version: '2D', genre: 'Action' },
  { title: 'Brahmastra', release_date: '2022-09-09', language: 'Hindi', duration_mins: 167, version: '2D', genre: 'Fantasy' },
  { title: 'Kantara', release_date: '2022-09-30', language: 'Kannada', duration_mins: 148, version: '2D', genre: 'Thriller' },
  { title: 'Drishyam 2', release_date: '2022-11-18', language: 'Hindi', duration_mins: 152, version: '2D', genre: 'Thriller' },
  { title: 'Sooryavanshi', release_date: '2021-11-05', language: 'Hindi', duration_mins: 145, version: '2D', genre: 'Action' },
  { title: 'Saathi', release_date: '2025-02-14', language: 'Hindi', duration_mins: 125, version: '2D', genre: 'Romance' },
  { title: 'Metro... In Dino', release_date: '2024-11-29', language: 'Hindi', duration_mins: 138, version: '2D', genre: 'Drama' },
  { title: 'Saiyaara', release_date: '2024-10-11', language: 'Hindi', duration_mins: 130, version: '2D', genre: 'Romance' },
  { title: 'The Fantastic Four: First Steps', release_date: '2025-07-25', language: 'Hindi', duration_mins: 120, version: '2D', genre: 'Sci-Fi' },
];

async function seedProgramming() {
  const client = await pool.connect();
  try {
    const orgRes = await client.query(`SELECT id FROM organizations LIMIT 1`);
    const orgId = orgRes.rows[0]?.id;
    if (!orgId) {
      throw new Error('No organization found. Run db:seed first to create a demo organization.');
    }

    const regionIds = {};
    const regionColumns = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'organization_id'`
    );
    const hasOrgId = regionColumns.rows.length > 0;

    for (const r of REGIONS) {
      const selectParams = hasOrgId ? [r.name, orgId] : [r.name];
      const selectWhere = hasOrgId ? 'WHERE name = $1 AND organization_id = $2' : 'WHERE name = $1';
      const exists = await client.query(`SELECT id FROM regions ${selectWhere}`, selectParams);
      if (exists.rows.length === 0) {
        if (hasOrgId) {
          await client.query(`INSERT INTO regions (name, organization_id) VALUES ($1, $2)`, [r.name, orgId]);
        } else {
          await client.query(`INSERT INTO regions (name) VALUES ($1)`, [r.name]);
        }
      }
      const res = await client.query(`SELECT id FROM regions ${selectWhere}`, selectParams);
      regionIds[r.name] = res.rows[0]?.id;
    }

    const stateIds = {};
    for (const s of STATE_REGION) {
      const regionId = regionIds[s.region];
      const exists = await client.query(`SELECT id FROM states WHERE region_id = $1 AND name = $2`, [regionId, s.state]);
      if (exists.rows.length === 0) {
        await client.query(`INSERT INTO states (name, region_id) VALUES ($1, $2)`, [s.state, regionId]);
      }
      const res = await client.query(`SELECT id FROM states WHERE region_id = $1 AND name = $2`, [regionId, s.state]);
      stateIds[s.state] = res.rows[0]?.id;
    }

    const locationIds = {};
    for (const l of LOCATION_STATE) {
      const stateId = stateIds[l.state];
      const exists = await client.query(`SELECT id FROM locations WHERE state_id = $1 AND name = $2`, [stateId, l.location]);
      if (exists.rows.length === 0) {
        await client.query(`INSERT INTO locations (name, state_id) VALUES ($1, $2)`, [l.location, stateId]);
      }
      const res = await client.query(`SELECT id FROM locations WHERE state_id = $1 AND name = $2`, [stateId, l.location]);
      locationIds[l.location] = res.rows[0]?.id;
    }

    for (const t of THEATRES) {
      const locId = locationIds[t.location];
      const exists = await client.query(`SELECT id FROM theatres WHERE location_id = $1 AND name = $2`, [locId, t.name]);
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO theatres (name, location_id, chain, screen_count, capabilities)
           VALUES ($1, $2, $3, $4, '{"2D": true, "3D": true, "IMAX": false}'::jsonb)`,
          [t.name, locId, t.chain, t.screens]
        );
      }
    }

    for (const m of MOVIES) {
      const exists = await client.query(`SELECT id FROM movies WHERE title = $1`, [m.title]);
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO movies (title, release_date, language, duration_mins, version, genre)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [m.title, m.release_date, m.language, m.duration_mins, m.version, m.genre]
        );
      }
    }

    console.log('Programming seed completed: regions, states, locations, theatres, movies.');
  } finally {
    client.release();
    await pool.end();
  }
}

seedProgramming().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

