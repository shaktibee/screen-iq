/**
 * Screens CRUD. Auth + org; write requires Admin/Analyst.
 */
import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, requireOrgSafe } from '../middleware/auth.js';
import { requireWrite } from '../middleware/roleGuard.js';
import * as screenService from '../services/screenService.js';

const router = Router();
router.use(requireAuth);
router.use(requireOrgSafe);

router.get('/', async (req, res, next) => {
  try {
    const result = await screenService.list(req.organizationId, {
      limit: parseInt(req.query.limit, 10) || 200,
      offset: parseInt(req.query.offset, 10) || 0,
      theaterId: req.query.theater_id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', param('id').isUUID(), async (req, res, next) => {
  try {
    const row = await screenService.getById(req.organizationId, req.params.id);
    if (!row) return res.status(404).json({ error: true, message: 'Screen not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireWrite, body('theater_id').isUUID(), body('name').trim().notEmpty(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: true, message: errors.array()[0].msg });
    const row = await screenService.create(req.organizationId, {
      theater_id: req.body.theater_id,
      name: req.body.name,
      capacity: req.body.capacity,
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireWrite, param('id').isUUID(), async (req, res, next) => {
  try {
    const row = await screenService.update(req.organizationId, req.params.id, req.body);
    if (!row) return res.status(404).json({ error: true, message: 'Screen not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireWrite, param('id').isUUID(), async (req, res, next) => {
  try {
    const ok = await screenService.softDelete(req.organizationId, req.params.id);
    if (!ok) return res.status(404).json({ error: true, message: 'Screen not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
