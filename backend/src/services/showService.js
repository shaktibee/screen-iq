/**
 * Shows and allocations. Overlap detection for start_time/end_time per project/screen/region.
 */
import { pool } from '../db/connection.js';

export async function list(organizationId, filters = {}) {
  const { projectId, limit = 200, offset = 0 } = filters;
  let q = `SELECT s.id, s.organization_id, s.project_id, s.screen_id, s.name, s.screen_name, s.region, s.start_time, s.end_time, s.capacity, s.ticket_price, s.sold_count, s.metadata, s.created_at,
           sc.name AS screen_name_resolved, t.name AS theater_name
           FROM shows s
           LEFT JOIN screens sc ON sc.id = s.screen_id AND sc.deleted_at IS NULL
           LEFT JOIN theaters t ON t.id = sc.theater_id AND t.deleted_at IS NULL
           WHERE s.organization_id = $1 AND s.deleted_at IS NULL`;
  const params = [organizationId];
  if (projectId) {
    params.push(projectId);
    q += ` AND s.project_id = $${params.length}`;
  }
  q += ` ORDER BY s.start_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  const r = await pool.query(q, params);
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM shows WHERE organization_id = $1 AND deleted_at IS NULL ${projectId ? 'AND project_id = $2' : ''}`,
    projectId ? [organizationId, projectId] : [organizationId]
  );
  return { data: r.rows, total: parseInt(countResult.rows[0].count, 10) };
}

export async function getById(organizationId, showId) {
  const r = await pool.query(
    `SELECT * FROM shows WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [showId, organizationId]
  );
  return r.rows[0] || null;
}

/** Detect overlapping shows (same screen_id when set, else same project; overlapping time). */
export async function findOverlaps(organizationId, projectId, startTime, endTime, excludeShowId = null, screenId = null) {
  let q = `SELECT id, name, screen_name, screen_id, region, start_time, end_time
           FROM shows
           WHERE organization_id = $1 AND deleted_at IS NULL
           AND (start_time, end_time) OVERLAPS ($2::timestamptz, $3::timestamptz)`;
  const params = [organizationId, startTime, endTime];
  if (screenId) {
    params.push(screenId);
    q += ` AND screen_id = $${params.length}`;
  } else {
    params.push(projectId);
    q += ` AND project_id = $${params.length}`;
  }
  if (excludeShowId) {
    params.push(excludeShowId);
    q += ` AND id != $${params.length}`;
  }
  const r = await pool.query(q, params);
  return r.rows;
}

export async function createShow(organizationId, data) {
  const r = await pool.query(
    `INSERT INTO shows (organization_id, project_id, screen_id, name, screen_name, region, start_time, end_time, capacity, ticket_price, sold_count, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, organization_id, project_id, screen_id, name, screen_name, region, start_time, end_time, capacity, ticket_price, sold_count, metadata, created_at`,
    [
      organizationId,
      data.project_id,
      data.screen_id || null,
      data.name,
      data.screen_name || null,
      data.region || null,
      data.start_time,
      data.end_time,
      data.capacity ?? null,
      data.ticket_price ?? null,
      data.sold_count ?? 0,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]
  );
  return r.rows[0];
}

export async function update(organizationId, showId, data) {
  const r = await pool.query(
    `UPDATE shows SET screen_id = COALESCE($3, screen_id), name = COALESCE($4, name), screen_name = COALESCE($5, screen_name), region = COALESCE($6, region),
      start_time = COALESCE($7, start_time), end_time = COALESCE($8, end_time), capacity = COALESCE($9, capacity),
      ticket_price = COALESCE($10, ticket_price), sold_count = COALESCE($11, sold_count), metadata = COALESCE($12, metadata)
     WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [
      showId,
      organizationId,
      data.screen_id,
      data.name,
      data.screen_name,
      data.region,
      data.start_time,
      data.end_time,
      data.capacity,
      data.ticket_price,
      data.sold_count,
      data.metadata ? JSON.stringify(data.metadata) : undefined,
    ]
  );
  return r.rows[0] || null;
}

export async function softDelete(organizationId, showId) {
  const r = await pool.query(
    `UPDATE shows SET deleted_at = now() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL RETURNING id`,
    [showId, organizationId]
  );
  return r.rowCount > 0;
}

/** Bulk create shows; returns created count and any overlap warnings. */
export async function bulkCreate(organizationId, shows) {
  const created = [];
  const overlaps = [];
  for (const s of shows) {
    const existing = await findOverlaps(
      organizationId,
      s.project_id,
      s.start_time,
      s.end_time,
      null,
      s.screen_id || null
    );
    if (existing.length) overlaps.push({ show: s, existing });
    const row = await createShow(organizationId, s);
    created.push(row);
  }
  return { created, overlaps };
}

export async function create(organizationId, data) {
  return createShow(organizationId, data);
}
