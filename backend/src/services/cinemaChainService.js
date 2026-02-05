/**
 * Cinema chains CRUD. Org-scoped.
 */
import { pool } from '../db/connection.js';

export async function list(organizationId, options = {}) {
  const { limit = 200, offset = 0 } = options;
  const r = await pool.query(
    `SELECT id, organization_id, name, created_at, updated_at
     FROM cinema_chains WHERE organization_id = $1 AND deleted_at IS NULL
     ORDER BY name ASC LIMIT $2 OFFSET $3`,
    [organizationId, limit, offset]
  );
  const count = await pool.query(
    `SELECT COUNT(*) FROM cinema_chains WHERE organization_id = $1 AND deleted_at IS NULL`,
    [organizationId]
  );
  return { data: r.rows, total: parseInt(count.rows[0].count, 10) };
}

export async function getById(organizationId, id) {
  const r = await pool.query(
    `SELECT * FROM cinema_chains WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [id, organizationId]
  );
  return r.rows[0] || null;
}

export async function create(organizationId, data) {
  const r = await pool.query(
    `INSERT INTO cinema_chains (organization_id, name)
     VALUES ($1, $2)
     RETURNING id, organization_id, name, created_at, updated_at`,
    [organizationId, data.name]
  );
  return r.rows[0];
}

export async function update(organizationId, id, data) {
  const r = await pool.query(
    `UPDATE cinema_chains SET name = COALESCE($3, name)
     WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [id, organizationId, data.name]
  );
  return r.rows[0] || null;
}

export async function softDelete(organizationId, id) {
  const r = await pool.query(
    `UPDATE cinema_chains SET deleted_at = now() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL RETURNING id`,
    [id, organizationId]
  );
  return r.rowCount > 0;
}
