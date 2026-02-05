/**
 * Theaters (locations) CRUD. Org-scoped; optional chain and region.
 */
import { pool } from '../db/connection.js';

export async function list(organizationId, options = {}) {
  const { limit = 200, offset = 0, chainId, regionId } = options;
  let q = `SELECT t.id, t.organization_id, t.cinema_chain_id, t.region_id, t.name, t.address, t.city, t.state, t.country, t.created_at, t.updated_at,
           c.name AS chain_name, r.name AS region_name
           FROM theaters t
           LEFT JOIN cinema_chains c ON c.id = t.cinema_chain_id AND c.deleted_at IS NULL
           LEFT JOIN regions r ON r.id = t.region_id AND r.deleted_at IS NULL
           WHERE t.organization_id = $1 AND t.deleted_at IS NULL`;
  const params = [organizationId];
  if (chainId) { params.push(chainId); q += ` AND t.cinema_chain_id = $${params.length}`; }
  if (regionId) { params.push(regionId); q += ` AND t.region_id = $${params.length}`; }
  q += ` ORDER BY t.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  const r = await pool.query(q, params);
  let countQ = `SELECT COUNT(*) FROM theaters WHERE organization_id = $1 AND deleted_at IS NULL`;
  const countParams = [organizationId];
  if (chainId) { countParams.push(chainId); countQ += ` AND cinema_chain_id = $2`; }
  if (regionId) { countParams.push(regionId); countQ += ` AND region_id = $${countParams.length}`; }
  const count = await pool.query(countQ, countParams);
  return { data: r.rows, total: parseInt(count.rows[0].count, 10) };
}

export async function getById(organizationId, id) {
  const r = await pool.query(
    `SELECT t.*, c.name AS chain_name, r.name AS region_name
     FROM theaters t
     LEFT JOIN cinema_chains c ON c.id = t.cinema_chain_id AND c.deleted_at IS NULL
     LEFT JOIN regions r ON r.id = t.region_id AND r.deleted_at IS NULL
     WHERE t.id = $1 AND t.organization_id = $2 AND t.deleted_at IS NULL`,
    [id, organizationId]
  );
  return r.rows[0] || null;
}

export async function create(organizationId, data) {
  const r = await pool.query(
    `INSERT INTO theaters (organization_id, cinema_chain_id, region_id, name, address, city, state, country)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, organization_id, cinema_chain_id, region_id, name, address, city, state, country, created_at, updated_at`,
    [
      organizationId,
      data.cinema_chain_id || null,
      data.region_id || null,
      data.name,
      data.address || null,
      data.city || null,
      data.state || null,
      data.country || null,
    ]
  );
  return r.rows[0];
}

export async function update(organizationId, id, data) {
  const existing = await getById(organizationId, id);
  if (!existing) return null;
  const cinema_chain_id = data.cinema_chain_id !== undefined ? data.cinema_chain_id : existing.cinema_chain_id;
  const region_id = data.region_id !== undefined ? data.region_id : existing.region_id;
  const name = data.name !== undefined ? data.name : existing.name;
  const address = data.address !== undefined ? data.address : existing.address;
  const city = data.city !== undefined ? data.city : existing.city;
  const state = data.state !== undefined ? data.state : existing.state;
  const country = data.country !== undefined ? data.country : existing.country;
  const r = await pool.query(
    `UPDATE theaters SET cinema_chain_id = $3, region_id = $4, name = $5, address = $6, city = $7, state = $8, country = $9
     WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [id, organizationId, cinema_chain_id, region_id, name, address, city, state, country]
  );
  return r.rows[0] || null;
}

export async function softDelete(organizationId, id) {
  const r = await pool.query(
    `UPDATE theaters SET deleted_at = now() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL RETURNING id`,
    [id, organizationId]
  );
  return r.rowCount > 0;
}
