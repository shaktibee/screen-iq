/**
 * Seed actual schedule data: 5 auditoriums (Audi 1-5), session times and movie assignments.
 * Run: node src/db/seed-schedule.js (after db:seed and db:seed:movies)
 */
import { pool } from './connection.js';

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Schedule: audi 1-5, time "HH:MM" or "H:MM AM/PM", movie key for lookup (name + language + version hint)
// Movie key maps to: project name, language, versions array (for matching our projects)
const SCHEDULE_SLOTS = [
  // Audi 1 (Junior 3D, cap 142)
  { audi: 1, time: '09:30', name: 'SAIYAARA', language: 'HINDI', versions: ['ATMOS'] },
  { audi: 1, time: '12:40', name: 'SAIYAARA', language: 'HINDI', versions: ['2D'] },
  // Audi 2 (ATMOS 3D, cap 62)
  { audi: 2, time: '10:00', name: 'MAHAVATAR NARSIMHA', language: 'HINDI', versions: ['2D'] },
  { audi: 2, time: '12:45', name: 'JURASSIC WORLD: REBIRTH', language: 'ENGLISH', versions: ['3D'] },
  { audi: 2, time: '15:35', name: 'SMURFS', language: 'HINDI', versions: ['2D'] },
  { audi: 2, time: '17:40', name: 'THE FANTASTIC FOUR: FIRST STEPS', language: 'ENGLISH', versions: ['3D'] },
  { audi: 2, time: '20:15', name: 'SUPERMAN', language: 'ENGLISH', versions: ['3D'] },
  { audi: 2, time: '23:00', name: 'JURASSIC WORLD: REBIRTH', language: 'ENGLISH', versions: ['3D'] },
  // Audi 3 (3D, cap 442)
  { audi: 3, time: '09:50', name: 'SAIYAARA', language: 'HINDI', versions: ['2D'] },
  { audi: 3, time: '13:00', name: 'SAIYAARA', language: 'HINDI', versions: ['ATMOS'] },
  { audi: 3, time: '16:10', name: 'THE FANTASTIC FOUR: FIRST STEPS', language: 'ENGLISH', versions: ['3D', 'ATMOS'] },
  { audi: 3, time: '18:40', name: 'THE FANTASTIC FOUR: FIRST STEPS', language: 'ENGLISH', versions: ['3D'] },
  { audi: 3, time: '21:50', name: 'SAIYAARA', language: 'HINDI', versions: ['ATMOS'] },
  // Audi 4 (cap 117)
  { audi: 4, time: '09:10', name: 'SAIYAARA', language: 'HINDI', versions: ['2D'] },
  { audi: 4, time: '12:20', name: 'THE FANTASTIC FOUR: FIRST STEPS', language: 'ENGLISH', versions: ['3D'] },
  { audi: 4, time: '14:55', name: 'THE FANTASTIC FOUR: FIRST STEPS', language: 'ENGLISH', versions: ['3D'] },
  { audi: 4, time: '17:30', name: 'THE FANTASTIC FOUR: FIRST STEPS', language: 'ENGLISH', versions: ['3D'] },
  { audi: 4, time: '20:05', name: 'THE FANTASTIC FOUR: FIRST STEPS', language: 'ENGLISH', versions: ['3D'] },
  { audi: 4, time: '22:40', name: 'SAIYAARA', language: 'HINDI', versions: ['2D'] },
  // Audi 5 (35 TAT, cap 109)
  { audi: 5, time: '09:10', name: 'SARBALA JI', language: 'PUNJABI', versions: ['2D'] },
  { audi: 5, time: '12:20', name: 'TANVI THE GREAT', language: 'HINDI', versions: ['2D'] },
  { audi: 5, time: '14:55', name: 'JURASSIC WORLD: REBIRTH', language: 'HINDI', versions: ['2D'] },
  { audi: 5, time: '17:30', name: 'JANAKI VS STATE OF KERALA', language: 'MALAYALAM', versions: ['2D'] },
  { audi: 5, time: '20:05', name: 'TANVI THE GREAT', language: 'HINDI', versions: ['2D'] },
];

function buildProjectLookup(rows) {
  const map = new Map();
  for (const p of rows) {
    const v = (p.versions || []).slice().sort().join(',');
    const key = `${(p.name || '').toUpperCase()}|${(p.language || '').toUpperCase()}|${v}`;
    map.set(key, p);
  }
  // Also allow partial match: name|language without version (first match)
  for (const p of rows) {
    const key = `${(p.name || '').toUpperCase()}|${(p.language || '').toUpperCase()}`;
    if (!map.has(key)) map.set(key, p);
  }
  return map;
}

function findProject(lookup, name, language, versions) {
  const n = (name || '').toUpperCase();
  const lang = (language || '').toUpperCase();
  const v = versions.slice().sort().join(',');
  const key = `${n}|${lang}|${v}`;
  let p = lookup.get(key);
  if (p) return p;
  return lookup.get(`${n}|${lang}`) || null;
}

async function seedSchedule() {
  const client = await pool.connect();
  try {
    const orgRes = await client.query(`SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1`);
    if (orgRes.rows.length === 0) {
      console.error('No organization. Run db:seed first.');
      process.exit(1);
    }
    const orgId = orgRes.rows[0].id;

    // Get or create theater + 5 screens (Audi 1-5) — India: PVR/Cinepolis style venue
    let theaterId;
    const venueName = 'PVR Icon (Oberoi Mall)';
    const theaterExists = await client.query(
      `SELECT id FROM theaters WHERE organization_id = $1 AND name = $2 AND deleted_at IS NULL`,
      [orgId, venueName]
    );
    if (theaterExists.rows.length > 0) {
      theaterId = theaterExists.rows[0].id;
    } else {
      const region = await client.query(`SELECT id FROM regions WHERE organization_id = $1 LIMIT 1`, [orgId]);
      const chain = await client.query(`SELECT id FROM cinema_chains WHERE organization_id = $1 LIMIT 1`, [orgId]);
      const ins = await client.query(
        `INSERT INTO theaters (organization_id, cinema_chain_id, region_id, name, city, state, country) VALUES ($1, $2, $3, $4, 'Mumbai', 'Maharashtra', 'India') RETURNING id`,
        [orgId, chain.rows[0]?.id || null, region.rows[0]?.id || null, venueName]
      );
      theaterId = ins.rows[0].id;
    }

    const screenCapacities = { 1: 142, 2: 62, 3: 442, 4: 117, 5: 109 };
    const screenIds = {};
    for (let a = 1; a <= 5; a++) {
      const r = await client.query(
        `SELECT id FROM screens WHERE organization_id = $1 AND theater_id = $2 AND name = $3 AND deleted_at IS NULL`,
        [orgId, theaterId, `Audi ${a}`]
      );
      if (r.rows.length > 0) {
        screenIds[a] = r.rows[0].id;
      } else {
        const ins = await client.query(
          `INSERT INTO screens (organization_id, theater_id, name, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
          [orgId, theaterId, `Audi ${a}`, screenCapacities[a]]
        );
        screenIds[a] = ins.rows[0].id;
      }
    }

    // Load projects and build lookup (name, language, versions)
    const projects = await client.query(
      `SELECT id, name, language, versions, duration_mins FROM projects WHERE organization_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );
    const lookup = buildProjectLookup(projects.rows);

    // Add TANVI THE GREAT if missing (for Audi 5)
    let tanviId = null;
    const tanvi = findProject(lookup, 'TANVI THE GREAT', 'HINDI', ['2D']);
    if (!tanvi) {
      const weekStart = getWeekStart().toISOString().slice(0, 10);
      const ins = await client.query(
        `INSERT INTO projects (organization_id, name, language, versions, week_start, duration_mins, censor_certificate) VALUES ($1, 'TANVI THE GREAT', 'HINDI', ARRAY['2D'], $2, 100, 'U') RETURNING id, duration_mins`,
        [orgId, weekStart]
      );
      tanviId = ins.rows[0].id;
      lookup.set('TANVI THE GREAT|HINDI|2D', { id: tanviId, duration_mins: 100 });
    }

    const baseDate = getWeekStart();
    let inserted = 0;
    let skipped = 0;

    for (const slot of SCHEDULE_SLOTS) {
      const project = findProject(lookup, slot.name, slot.language, slot.versions) || (slot.name === 'TANVI THE GREAT' ? { id: tanviId, duration_mins: 100 } : null);
      if (!project) {
        skipped++;
        continue;
      }
      const [h, m] = slot.time.split(':').map(Number);
      const start = new Date(baseDate);
      start.setHours(h, m, 0, 0);
      const duration = project.duration_mins || 120;
      const end = new Date(start.getTime() + duration * 60 * 1000);

      await client.query(
        `INSERT INTO shows (organization_id, project_id, screen_id, name, start_time, end_time, capacity) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          orgId,
          project.id,
          screenIds[slot.audi],
          `${slot.name} (${slot.versions.join(' ')})`,
          start.toISOString(),
          end.toISOString(),
          screenCapacities[slot.audi],
        ]
      );
      inserted++;
    }

    console.log(`Seed schedule: ${inserted} shows added across Audi 1-5. Skipped ${skipped} (no matching project).`);
    console.log('View on Dashboard → Schedule overview.');
  } finally {
    client.release();
    await pool.end();
  }
}

seedSchedule().catch((err) => {
  console.error('Seed schedule failed:', err);
  process.exit(1);
});
