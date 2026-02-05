/**
 * Screens CRUD. Org-scoped; belong to a theater. Capacity for occupancy.
 */
import { pool } from '../db/connection.js';

export async function list(organizationId, options = {}) {
  const { limit = 200, offset = 0, theaterId } = options;
  let q = `SELECT s.id, s.organization_id, s.theater_id, s.name, s.capacity, s.created_at, s.updated_at,
           t.name AS theater_name
           FROM screens s
           JOIN theaters t ON t.id = s.theater_id AND t.deleted_at IS NULL
           WHERE s.organization_id = $1 AND s.deleted_at IS NULL`;
  const params = [organizationId];
  if (theaterId) { params.push(theaterId); q += ` AND s.theater_id = $${params.length}`; }
  q += ` ORDER BY t.name, s.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  const r = await pool.query(q, params);
  let countQ = `SELECT COUNT(*) FROM screens WHERE organization_id = $1 AND deleted_at IS NULL`;
  const countParams = [organizationId];
  if (theaterId) { countParams.push(theaterId); countQ += ` AND theater_id = $2`; }
  const count = await pool.query(countQ, countParams);
  return { data: r.rows, total: parseInt(count.rows[0].count, 10) };
}

export async function getById(organizationId, id) {
  const r = await pool.query(
    `SELECT s.*, t.name AS theater_name, t.cinema_chain_id, t.region_id
     FROM screens s
     JOIN theaters t ON t.id = s.theater_id AND t.deleted_at IS NULL
     WHERE s.id = $1 AND s.organization_id = $2 AND s.deleted_at IS NULL`,
    [id, organizationId]
  );
  return r.rows[0] || null;
}

export async function create(organizationId, data) {
  const r = await pool.query(
    `INSERT INTO screens (organization_id, theater_id, name, capacity)
     VALUES ($1, $2, $3, $4)
     RETURNING id, organization_id, theater_id, name, capacity, created_at, updated_at`,
    [organizationId, data.theater_id, data.name, data.capacity ?? null]
  );
  return r.rows[0];
}

export async function update(organizationId, id, data) {
  const r = await pool.query(
    `UPDATE screens SET theater_id = COALESCE($3, theater_id), name = COALESCE($4, name), capacity = COALESCE($5, capacity)
     WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [id, organizationId, data.theater_id, data.name, data.capacity]
  );
  return r.rows[0] || null;
}

export async function softDelete(organizationId, id) {
  const r = await pool.query(
    `UPDATE screens SET deleted_at = now() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL RETURNING id`,
    [id, organizationId]
  );
  return r.rowCount > 0;
}
