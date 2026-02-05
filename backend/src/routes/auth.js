/**
 * Auth routes: signup, login. JWT returned on success.
 */
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import {
  hashPassword,
  verifyPassword,
  signToken,
  findUserByEmail,
  createUser,
  createOrganizationAndAssignAdmin,
} from '../services/authService.js';

/** Return user shape with organizations for frontend (login/signup). */
async function userWithOrgs(userId, email, fullName) {
  const user = await findUserByEmail(email);
  return user ? { id: user.id, email: user.email, full_name: user.full_name, organizations: user.organizations } : null;
}
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const signupValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').optional().trim(),
  body('organizationName').optional().trim(),
];

router.post('/signup', signupValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, errors: errors.array() });
    }
    const { email, password, fullName, organizationName } = req.body;
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: true, message: 'Email already registered' });
    }
    const passwordHash = await hashPassword(password);
    const user = await createUser(email, passwordHash, fullName);
    const orgName = organizationName || 'My Organization';
    await createOrganizationAndAssignAdmin(user.id, orgName);
    const token = signToken({ userId: user.id, email: user.email });
    const userWithOrganizations = await userWithOrgs(user.id, user.email, user.full_name);
    res.status(201).json({
      user: userWithOrganizations || { id: user.id, email: user.email, full_name: user.full_name, organizations: [] },
      token,
    });
  } catch (err) {
    next(err);
  }
});

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: 'Invalid email or password' });
    }
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: true, message: 'Invalid email or password' });
    }
    const token = signToken({ userId: user.id, email: user.email });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        organizations: user.organizations,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await findUserByEmail(req.user.email);
    if (!user) return res.status(401).json({ error: true, message: 'User not found' });
    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      organizations: user.organizations,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
