/**
 * Auth: signup, login, JWT issue. Passwords hashed with bcrypt.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/connection.js';
import { config } from '../config/index.js';

const SALT_ROUNDS = 10;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

/** Get user with orgs and roles. */
export async function findUserByEmail(email) {
  const r = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.full_name,
            uo.organization_id, uo.role_id, r.name AS role_name
     FROM users u
     LEFT JOIN user_organizations uo ON uo.user_id = u.id
     LEFT JOIN roles r ON r.id = uo.role_id
     WHERE u.email = $1 AND u.deleted_at IS NULL`,
    [email]
  );
  if (r.rows.length === 0) return null;
  const first = r.rows[0];
  const user = {
    id: first.id,
    email: first.email,
    password_hash: first.password_hash,
    full_name: first.full_name,
    organizations: [],
  };
  r.rows.forEach((row) => {
    if (row.organization_id && !user.organizations.some((o) => o.organization_id === row.organization_id)) {
      user.organizations.push({
        organization_id: row.organization_id,
        role_id: row.role_id,
        role_name: row.role_name,
      });
    }
  });
  return user;
}

export async function createUser(email, passwordHash, fullName) {
  const r = await pool.query(
    `INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3)
     RETURNING id, email, full_name, created_at`,
    [email, passwordHash, fullName || null]
  );
  return r.rows[0];
}

/** Create org and assign user as Admin. */
export async function createOrganizationAndAssignAdmin(userId, orgName, slug) {
  const client = await pool.connect();
  try {
    const roleRow = await client.query(`SELECT id FROM roles WHERE name = 'Admin' LIMIT 1`);
    const roleId = roleRow.rows[0]?.id;
    if (!roleId) throw new Error('Admin role not found');

    const orgRow = await client.query(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
      [orgName, slug || orgName.toLowerCase().replace(/\s+/g, '-')]
    );
    const orgId = orgRow.rows[0].id;
    await client.query(
      `INSERT INTO user_organizations (user_id, organization_id, role_id) VALUES ($1, $2, $3)`,
      [userId, orgId, roleId]
    );
    return orgId;
  } finally {
    client.release();
  }
}

export async function addUserToOrganization(userId, organizationId, roleName = 'Viewer') {
  const r = await pool.query(`SELECT id FROM roles WHERE name = $1 LIMIT 1`, [roleName]);
  const roleId = r.rows[0]?.id;
  if (!roleId) throw new Error(`Role ${roleName} not found`);
  await pool.query(
    `INSERT INTO user_organizations (user_id, organization_id, role_id) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, organization_id) DO UPDATE SET role_id = $3`,
    [userId, organizationId, roleId]
  );
}
