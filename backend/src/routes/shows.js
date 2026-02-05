/**
 * Shows CRUD + bulk create. Overlap detection on create/update. Admin & Analyst write; Viewer read.
 */
import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { requireAuth, requireOrgSafe } from '../middleware/auth.js';
import { requireWrite } from '../middleware/roleGuard.js';
import * as showService from '../services/showService.js';

const router = Router();
router.use(requireAuth);
router.use(requireOrgSafe);

router.get('/', query('projectId').optional().isUUID(), async (req, res, next) => {
  try {
    const result = await showService.list(req.organizationId, {
      projectId: req.query.projectId,
      limit: parseInt(req.query.limit, 10) || 200,
      offset: parseInt(req.query.offset, 10) || 0,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', param('id').isUUID(), async (req, res, next) => {
  try {
    const show = await showService.getById(req.organizationId, req.params.id);
    if (!show) return res.status(404).json({ error: true, message: 'Show not found' });
    res.json(show);
  } catch (err) {
    next(err);
  }
});

const showBody = [
  body('project_id').isUUID(),
  body('name').trim().notEmpty(),
  body('screen_id').optional().isUUID(),
  body('screen_name').optional().trim(),
  body('region').optional().trim(),
  body('start_time').isISO8601(),
  body('end_time').isISO8601(),
  body('capacity').optional().isInt({ min: 0 }),
  body('ticket_price').optional().isFloat({ min: 0 }),
  body('sold_count').optional().isInt({ min: 0 }),
  body('metadata').optional().isObject(),
];

router.post('/', requireWrite, showBody, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: true, message: errors.array()[0].msg });
    const overlaps = await showService.findOverlaps(
      req.organizationId,
      req.body.project_id,
      req.body.start_time,
      req.body.end_time,
      null,
      req.body.screen_id || null
    );
    if (overlaps.length) {
      return res.status(409).json({
        error: true,
        message: 'Overlapping show detected',
        overlaps,
      });
    }
    const show = await showService.create(req.organizationId, req.body);
    res.status(201).json(show);
  } catch (err) {
    next(err);
  }
});

router.post('/bulk', requireWrite, body('shows').isArray(), body('shows.*.project_id').isUUID(), body('shows.*.name').notEmpty(), body('shows.*.start_time').isISO8601(), body('shows.*.end_time').isISO8601(), async (req, res, next) => {
  try {
    const { created, overlaps } = await showService.bulkCreate(req.organizationId, req.body.shows);
    res.status(201).json({ created: created.length, overlaps, data: created });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireWrite, param('id').isUUID(), async (req, res, next) => {
  try {
    const show = await showService.getById(req.organizationId, req.params.id);
    if (!show) return res.status(404).json({ error: true, message: 'Show not found' });
    if (req.body.start_time || req.body.end_time) {
      const start = req.body.start_time || show.start_time;
      const end = req.body.end_time || show.end_time;
      const screenId = req.body.screen_id !== undefined ? req.body.screen_id : show.screen_id;
      const overlaps = await showService.findOverlaps(req.organizationId, show.project_id, start, end, req.params.id, screenId);
      if (overlaps.length) {
        return res.status(409).json({ error: true, message: 'Overlapping show detected', overlaps });
      }
    }
    const updated = await showService.update(req.organizationId, req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireWrite, param('id').isUUID(), async (req, res, next) => {
  try {
    const ok = await showService.softDelete(req.organizationId, req.params.id);
    if (!ok) return res.status(404).json({ error: true, message: 'Show not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
