/**
 * Role guard: restrict by role. Use after requireOrg. Allowed roles: ['Admin', 'Analyst'] for write, ['Viewer'] for read-only.
 */
export function requireRoles(allowedRoles) {
  return (req, res, next) => {
    if (!req.role) {
      return res.status(403).json({ error: true, message: 'Organization context required' });
    }
    if (!allowedRoles.includes(req.role)) {
      return res.status(403).json({ error: true, message: 'Insufficient permissions' });
    }
    next();
  };
}

/** Only Admin and Analyst can create/edit. */
export const requireWrite = requireRoles(['Admin', 'Analyst']);
/** Only Admin (e.g. for user management). */
export const requireAdmin = requireRoles(['Admin']);
