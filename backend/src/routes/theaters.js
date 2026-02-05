/**
 * Theaters (locations) CRUD. Auth + org; write requires Admin/Analyst.
 */
import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, requireOrgSafe } from '../middleware/auth.js';
import { requireWrite } from '../middleware/roleGuard.js';
import * as theaterService from '../services/theaterService.js';

const router = Router();
router.use(requireAuth);
router.use(requireOrgSafe);

router.get('/', async (req, res, next) => {
  try {
    const result = await theaterService.list(req.organizationId, {
      limit: parseInt(req.query.limit, 10) || 200,
      offset: parseInt(req.query.offset, 10) || 0,
      chainId: req.query.cinema_chain_id,
      regionId: req.query.region_id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', param('id').isUUID(), async (req, res, next) => {
  try {
    const row = await theaterService.getById(req.organizationId, req.params.id);
    if (!row) return res.status(404).json({ error: true, message: 'Theater not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

const createBody = [
  body('name').trim().notEmpty(),
  body('cinema_chain_id').optional().isUUID(),
  body('region_id').optional().isUUID(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('country').optional().trim(),
];

router.post('/', requireWrite, createBody, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: true, message: errors.array()[0].msg });
    const row = await theaterService.create(req.organizationId, req.body);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireWrite, param('id').isUUID(), async (req, res, next) => {
  try {
    const row = await theaterService.update(req.organizationId, req.params.id, req.body);
    if (!row) return res.status(404).json({ error: true, message: 'Theater not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireWrite, param('id').isUUID(), async (req, res, next) => {
  try {
    const ok = await theaterService.softDelete(req.organizationId, req.params.id);
    if (!ok) return res.status(404).json({ error: true, message: 'Theater not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
