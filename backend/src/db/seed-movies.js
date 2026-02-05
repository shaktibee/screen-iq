/**
 * Seed movie data with Turn Around Time (Entry, Ent.Com., Film, Int.com., Int.slides, Int.Trl., HK, Total, In Hrs).
 * Run: node src/db/seed-movies.js (from backend/)
 */
import { pool } from './connection.js';

// Helper: total mins -> "H:MM"
function minsToHrs(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${String(min).padStart(2, '0')}`;
}

// Movie data: name, language, versions, duration_mins (Film), censor, and Turn Around Time fields
// Entry, Ent.Com., Ent.Trl., Int com., Int. slides, Int. Trl. = 0; HK = 35 or 25; Total = Film + HK
const MOVIES = [
  { name: 'JURASSIC WORLD: REBIRTH', language: 'ENGLISH', versions: ['2D'], duration_mins: 135, censor: 'U/A', hk_mins: 35 },
  { name: 'JURASSIC WORLD: REBIRTH', language: 'ENGLISH', versions: ['3D', 'ATMOS'], duration_mins: 135, censor: 'U/A', hk_mins: 35 },
  { name: 'JURASSIC WORLD: REBIRTH', language: 'HINDI', versions: ['3D'], duration_mins: 135, censor: 'U/A', hk_mins: 35 },
  { name: 'JURASSIC WORLD: REBIRTH', language: 'ENGLISH', versions: ['3D'], duration_mins: 135, censor: 'U/A', hk_mins: 35 },
  { name: 'JURASSIC WORLD: REBIRTH', language: 'HINDI', versions: ['2D'], duration_mins: 135, censor: 'U/A', hk_mins: 35 },
  { name: 'JURASSIC WORLD: REBIRTH', language: 'HINDI', versions: ['3D', 'ATMOS'], duration_mins: 135, censor: 'U/A', hk_mins: 35 },
  { name: 'JURASSIC WORLD: REBIRTH', language: 'ENGLISH', versions: ['3D', 'W/A', 'ATMOS'], duration_mins: 135, censor: 'U/A', hk_mins: 35 },
  { name: 'JURASSIC WORLD: REBIRTH', language: 'HINDI', versions: ['3D', 'W/A'], duration_mins: 135, censor: 'U/A', hk_mins: 35 },
  { name: 'SARBALA JI', language: 'PUNJABI', versions: ['2D'], duration_mins: 140, censor: 'U/A', hk_mins: 35 },
  { name: 'SITAARE ZAMEEN PAR', language: 'HINDI', versions: ['2D'], duration_mins: 160, censor: 'U/A', hk_mins: 35 },
  { name: 'F1 THE MOVIE', language: 'ENGLISH', versions: ['2D'], duration_mins: 155, censor: 'U/A', hk_mins: 35 },
  { name: 'F1 THE MOVIE', language: 'ENGLISH', versions: ['ATMOS'], duration_mins: 155, censor: 'U/A', hk_mins: 35 },
  { name: 'I KNOW WHAT YOU DID LAST SUMMER', language: 'ENGLISH', versions: ['2D'], duration_mins: 115, censor: 'A', hk_mins: 35 },
  { name: 'THE FANTASTIC FOUR: FIRST STEPS', language: 'ENGLISH', versions: ['3D', 'ATMOS'], duration_mins: 115, censor: 'U/A', hk_mins: 35 },
  { name: 'THE FANTASTIC FOUR: FIRST STEPS', language: 'ENGLISH', versions: ['2D'], duration_mins: 120, censor: 'U/A', hk_mins: 35 },
  { name: 'THE FANTASTIC FOUR: FIRST STEPS', language: 'HINDI', versions: ['2D'], duration_mins: 120, censor: 'U/A', hk_mins: 35 },
  { name: 'THE FANTASTIC FOUR: FIRST STEPS', language: 'ENGLISH', versions: ['3D'], duration_mins: 120, censor: 'U/A', hk_mins: 35 },
  { name: 'SUPERMAN', language: 'HINDI', versions: ['2D'], duration_mins: 130, censor: 'U/A', hk_mins: 35 },
  { name: 'SUPERMAN', language: 'ENGLISH', versions: ['3D'], duration_mins: 130, censor: 'U/A', hk_mins: 35 },
  { name: 'SUPERMAN', language: 'HINDI', versions: ['3D'], duration_mins: 130, censor: 'U/A', hk_mins: 35 },
  { name: 'SUPERMAN', language: 'ENGLISH', versions: ['3D', 'ATMOS'], duration_mins: 130, censor: 'U/A', hk_mins: 35 },
  { name: 'SUPERMAN', language: 'HINDI', versions: ['3D', 'ATMOS'], duration_mins: 130, censor: 'U/A', hk_mins: 35 },
  { name: 'JANAKI VS STATE OF KERALA', language: 'MALAYALAM', versions: ['2D'], duration_mins: 135, censor: 'U/A', hk_mins: 35 },
  { name: 'METRO.... IN DINO', language: 'HINDI', versions: ['2D'], duration_mins: 140, censor: 'U/A', hk_mins: 35 },
  { name: 'SAIYAARA', language: 'HINDI', versions: ['ATMOS'], duration_mins: 130, censor: 'U/A', hk_mins: 35 },
  { name: 'SAIYAARA', language: 'HINDI', versions: ['2D'], duration_mins: 130, censor: 'U/A', hk_mins: 35 },
  { name: 'MAHAVATAR NARSIMHA', language: 'HINDI', versions: ['2D'], duration_mins: 165, censor: 'U/A', hk_mins: 35 },
  { name: 'SMURFS', language: 'ENGLISH', versions: ['2D'], duration_mins: 90, censor: 'U', hk_mins: 25 },
  { name: 'SMURFS', language: 'HINDI', versions: ['2D'], duration_mins: 90, censor: 'U', hk_mins: 25 },
  { name: 'HARI HARA VEERA MALLU', language: 'HINDI', versions: ['2D'], duration_mins: 160, censor: 'U/A', hk_mins: 35 },
];

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

async function seedMovies() {
  const client = await pool.connect();
  try {
    const orgRes = await client.query(
      `SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1`
    );
    if (orgRes.rows.length === 0) {
      console.error('No organization found. Run db:seed first.');
      process.exit(1);
    }
    const orgId = orgRes.rows[0].id;
    const weekStart = getWeekStart();

    const hasCensor = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'projects' AND column_name = 'censor_certificate'
    `).then(r => r.rows.length > 0);
    const hasTurnaround = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'projects' AND column_name = 'turnaround_total_mins'
    `).then(r => r.rows.length > 0);

    let inserted = 0;
    for (const m of MOVIES) {
      const hk = m.hk_mins ?? 35;
      const total = m.duration_mins + hk;
      const inHrs = minsToHrs(total);
      if (hasTurnaround && hasCensor) {
        await client.query(
          `INSERT INTO projects (organization_id, name, language, duration_mins, versions, week_start, censor_certificate,
            entry_mins, ent_com_mins, ent_trl_mins, int_com_mins, int_slides_mins, int_trl_mins, hk_mins, turnaround_total_mins, turnaround_in_hrs)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, 0, 0, 0, $8, $9, $10)`,
          [orgId, m.name, m.language, m.duration_mins, m.versions, weekStart, m.censor, hk, total, inHrs]
        );
      } else if (hasCensor) {
        await client.query(
          `INSERT INTO projects (organization_id, name, language, duration_mins, versions, week_start, censor_certificate)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [orgId, m.name, m.language, m.duration_mins, m.versions, weekStart, m.censor]
        );
      } else {
        await client.query(
          `INSERT INTO projects (organization_id, name, language, duration_mins, versions, week_start)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orgId, m.name, m.language, m.duration_mins, m.versions, weekStart]
        );
      }
      inserted += 1;
    }

    // Backfill turnaround time for existing projects that have duration_mins but no turnaround_total_mins
    if (hasTurnaround) {
      const existing = await client.query(
        `SELECT id, duration_mins FROM projects WHERE organization_id = $1 AND deleted_at IS NULL AND turnaround_total_mins IS NULL AND duration_mins IS NOT NULL`,
        [orgId]
      );
      for (const row of existing.rows) {
        const hk = 35;
        const total = (row.duration_mins || 0) + hk;
        const inHrs = minsToHrs(total);
        await client.query(
          `UPDATE projects SET entry_mins = 0, ent_com_mins = 0, ent_trl_mins = 0, int_com_mins = 0, int_slides_mins = 0, int_trl_mins = 0, hk_mins = $2, turnaround_total_mins = $3, turnaround_in_hrs = $4 WHERE id = $1`,
          [row.id, hk, total, inHrs]
        );
      }
      if (existing.rows.length > 0) {
        console.log(`Backfilled turnaround time for ${existing.rows.length} existing project(s).`);
      }
    }

    console.log(`Seed movies: ${inserted} movies added for organization ${orgId.slice(0, 8)}…`);
    console.log(`Week start: ${weekStart}. View them on the dashboard slate.`);
  } finally {
    client.release();
    await pool.end();
  }
}

seedMovies().catch((err) => {
  console.error('Seed movies failed:', err);
  process.exit(1);
});
