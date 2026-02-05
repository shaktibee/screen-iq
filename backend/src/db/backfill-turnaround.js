/**
 * Backfill Turn Around Time for existing projects (duration_mins + HK = total, in hrs).
 * Run: node src/db/backfill-turnaround.js
 */
import { pool } from './connection.js';

function minsToHrs(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${String(min).padStart(2, '0')}`;
}

async function backfill() {
  const hasCol = await pool.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'turnaround_total_mins'
  `).then(r => r.rows.length > 0);
  if (!hasCol) {
    console.log('Run db:migrate:programming first.');
    process.exit(1);
  }
  const r = await pool.query(
    `SELECT id, duration_mins FROM projects WHERE deleted_at IS NULL AND turnaround_total_mins IS NULL AND duration_mins IS NOT NULL`
  );
  const HK_DEFAULT = 35;
  for (const row of r.rows) {
    const total = (row.duration_mins || 0) + HK_DEFAULT;
    await pool.query(
      `UPDATE projects SET entry_mins = COALESCE(entry_mins, 0), ent_com_mins = COALESCE(ent_com_mins, 0), ent_trl_mins = COALESCE(ent_trl_mins, 0),
        int_com_mins = COALESCE(int_com_mins, 0), int_slides_mins = COALESCE(int_slides_mins, 0), int_trl_mins = COALESCE(int_trl_mins, 0),
        hk_mins = COALESCE(hk_mins, $2), turnaround_total_mins = $3, turnaround_in_hrs = $4 WHERE id = $1`,
      [row.id, HK_DEFAULT, total, minsToHrs(total)]
    );
  }
  console.log(`Backfilled turnaround time for ${r.rows.length} project(s).`);
  await pool.end();
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
