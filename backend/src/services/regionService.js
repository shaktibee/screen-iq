/**
 * Regions CRUD. Org-scoped.
 */
import { pool } from '../db/connection.js';

export async function list(organizationId, options = {}) {
  const { limit = 200, offset = 0 } = options;
  const r = await pool.query(
    `SELECT id, organization_id, name, code, created_at, updated_at
     FROM regions WHERE organization_id = $1 AND deleted_at IS NULL
     ORDER BY name ASC LIMIT $2 OFFSET $3`,
    [organizationId, limit, offset]
  );
  const count = await pool.query(
    `SELECT COUNT(*) FROM regions WHERE organization_id = $1 AND deleted_at IS NULL`,
    [organizationId]
  );
  return { data: r.rows, total: parseInt(count.rows[0].count, 10) };
}

export async function getById(organizationId, id) {
  const r = await pool.query(
    `SELECT * FROM regions WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [id, organizationId]
  );
  return r.rows[0] || null;
}

export async function create(organizationId, data) {
  const r = await pool.query(
    `INSERT INTO regions (organization_id, name, code)
     VALUES ($1, $2, $3)
     RETURNING id, organization_id, name, code, created_at, updated_at`,
    [organizationId, data.name, data.code || null]
  );
  return r.rows[0];
}

export async function update(organizationId, id, data) {
  const r = await pool.query(
    `UPDATE regions SET name = COALESCE($3, name), code = COALESCE($4, code)
     WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [id, organizationId, data.name, data.code]
  );
  return r.rows[0] || null;
}

export async function softDelete(organizationId, id) {
  const r = await pool.query(
    `UPDATE regions SET deleted_at = now() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL RETURNING id`,
    [id, organizationId]
  );
  return r.rowCount > 0;
}
