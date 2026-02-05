/**
 * Project (movie/event) CRUD. All queries scoped by organization_id.
 */
import { pool } from '../db/connection.js';

export async function list(organizationId, options = {}) {
  const { limit = 100, offset = 0 } = options;
  const r = await pool.query(
    `SELECT id, organization_id, name, release_date, language, regions, duration_mins, genre, versions, week_start, censor_certificate,
            entry_mins, ent_com_mins, ent_trl_mins, int_com_mins, int_slides_mins, int_trl_mins, hk_mins, turnaround_total_mins, turnaround_in_hrs,
            created_at, updated_at
     FROM projects WHERE organization_id = $1 AND deleted_at IS NULL
     ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
    [organizationId, limit, offset]
  );
  const count = await pool.query(
    `SELECT COUNT(*) FROM projects WHERE organization_id = $1 AND deleted_at IS NULL`,
    [organizationId]
  );
  return { data: r.rows, total: parseInt(count.rows[0].count, 10) };
}

export async function getById(organizationId, projectId) {
  const r = await pool.query(
    `SELECT id, organization_id, name, release_date, language, regions, duration_mins, genre, versions, week_start, censor_certificate,
            entry_mins, ent_com_mins, ent_trl_mins, int_com_mins, int_slides_mins, int_trl_mins, hk_mins, turnaround_total_mins, turnaround_in_hrs,
            created_at, updated_at
     FROM projects WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [projectId, organizationId]
  );
  return r.rows[0] || null;
}

export async function create(organizationId, data) {
  const r = await pool.query(
    `INSERT INTO projects (organization_id, name, release_date, language, regions, duration_mins, genre, versions, week_start, censor_certificate,
      entry_mins, ent_com_mins, ent_trl_mins, int_com_mins, int_slides_mins, int_trl_mins, hk_mins, turnaround_total_mins, turnaround_in_hrs)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     RETURNING *`,
    [
      organizationId,
      data.name,
      data.release_date || null,
      data.language || null,
      data.regions ? (Array.isArray(data.regions) ? data.regions : [data.regions]) : [],
      data.duration_mins ?? null,
      data.genre || null,
      data.versions ? (Array.isArray(data.versions) ? data.versions : [data.versions]) : null,
      data.week_start || null,
      data.censor_certificate || null,
      data.entry_mins ?? 0,
      data.ent_com_mins ?? 0,
      data.ent_trl_mins ?? 0,
      data.int_com_mins ?? 0,
      data.int_slides_mins ?? 0,
      data.int_trl_mins ?? 0,
      data.hk_mins ?? 0,
      data.turnaround_total_mins ?? null,
      data.turnaround_in_hrs ?? null,
    ]
  );
  return r.rows[0];
}

export async function update(organizationId, projectId, data) {
  const r = await pool.query(
    `UPDATE projects SET
      name = COALESCE($3, name), release_date = COALESCE($4, release_date), language = COALESCE($5, language), regions = COALESCE($6, regions),
      duration_mins = COALESCE($7, duration_mins), genre = COALESCE($8, genre), versions = COALESCE($9, versions), week_start = COALESCE($10, week_start), censor_certificate = COALESCE($11, censor_certificate),
      entry_mins = COALESCE($12, entry_mins), ent_com_mins = COALESCE($13, ent_com_mins), ent_trl_mins = COALESCE($14, ent_trl_mins),
      int_com_mins = COALESCE($15, int_com_mins), int_slides_mins = COALESCE($16, int_slides_mins), int_trl_mins = COALESCE($17, int_trl_mins),
      hk_mins = COALESCE($18, hk_mins), turnaround_total_mins = COALESCE($19, turnaround_total_mins), turnaround_in_hrs = COALESCE($20, turnaround_in_hrs)
     WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [
      projectId,
      organizationId,
      data.name,
      data.release_date,
      data.language,
      data.regions ? (Array.isArray(data.regions) ? data.regions : [data.regions]) : undefined,
      data.duration_mins,
      data.genre,
      data.versions ? (Array.isArray(data.versions) ? data.versions : [data.versions]) : undefined,
      data.week_start,
      data.censor_certificate,
      data.entry_mins,
      data.ent_com_mins,
      data.ent_trl_mins,
      data.int_com_mins,
      data.int_slides_mins,
      data.int_trl_mins,
      data.hk_mins,
      data.turnaround_total_mins,
      data.turnaround_in_hrs,
    ]
  );
  return r.rows[0] || null;
}

export async function softDelete(organizationId, projectId) {
  const r = await pool.query(
    `UPDATE projects SET deleted_at = now() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL RETURNING id`,
    [projectId, organizationId]
  );
  return r.rowCount > 0;
}
