/**
 * User management: list users in org, invite (create user + assign role), assign role. Admin only.
 */
import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, requireOrgSafe } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleGuard.js';
import { pool } from '../db/connection.js';
import * as authService from '../services/authService.js';

const router = Router();
router.use(requireAuth);
router.use(requireOrgSafe);
router.use(requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.created_at, r.name AS role_name
       FROM user_organizations uo
       JOIN users u ON u.id = uo.user_id AND u.deleted_at IS NULL
       JOIN roles r ON r.id = uo.role_id
       WHERE uo.organization_id = $1
       ORDER BY u.email`,
      [req.organizationId]
    );
    res.json({ data: r.rows });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/invite',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('fullName').optional().trim(),
  body('role').isIn(['Admin', 'Analyst', 'Viewer']),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: true, message: errors.array()[0].msg });
      const { email, password, fullName, role } = req.body;
      let user = await authService.findUserByEmail(email);
      if (!user) {
        const passwordHash = await authService.hashPassword(password);
        const created = await authService.createUser(email, passwordHash, fullName);
        user = { id: created.id, email: created.email, organizations: [] };
      }
      await authService.addUserToOrganization(user.id, req.organizationId, role);
      const list = await pool.query(
        `SELECT u.id, u.email, u.full_name, r.name AS role_name FROM user_organizations uo JOIN users u ON u.id = uo.user_id JOIN roles r ON r.id = uo.role_id WHERE uo.organization_id = $1 AND u.id = $2`,
        [req.organizationId, user.id]
      );
      res.status(201).json(list.rows[0] || { id: user.id, email: user.email, full_name: fullName, role_name: role });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:userId/role',
  param('userId').isUUID(),
  body('role').isIn(['Admin', 'Analyst', 'Viewer']),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: true, message: 'Invalid input' });
      await authService.addUserToOrganization(req.params.userId, req.organizationId, req.body.role);
      res.json({ success: true, role: req.body.role });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
