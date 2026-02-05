/**
 * JWT auth middleware. Expects Authorization: Bearer <token>. Sets req.user and req.organizationId/role when in org context.
 */
import { verifyToken } from '../services/authService.js';
import { pool } from '../db/connection.js';

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: true, message: 'Invalid or expired token' });
  }
}

/** Require auth and resolve organization + role from X-Organization-Id or first org. */
export async function requireOrg(req, res, next) {
  if (!req.user) return res.status(401).json({ error: true, message: 'Authentication required' });
  const orgIdHeader = req.headers['x-organization-id'];
  const r = await pool.query(
    `SELECT uo.organization_id, r.name AS role_name
     FROM user_organizations uo
     JOIN roles r ON r.id = uo.role_id
     WHERE uo.user_id = $1`,
    [req.user.id]
  );
  const orgs = r.rows;
  if (orgs.length === 0) {
    return res.status(403).json({ error: true, message: 'No organization assigned' });
  }
  const orgId = orgIdHeader || orgs[0].organization_id;
  const membership = orgs.find((o) => o.organization_id === orgId);
  if (!membership) {
    return res.status(403).json({ error: true, message: 'Not a member of this organization' });
  }
  req.organizationId = membership.organization_id;
  req.role = membership.role_name;
  next();
}

/** Wrap async middleware so errors are passed to errorHandler. */
export const requireOrgSafe = (req, res, next) => requireOrg(req, res, next).catch(next);
