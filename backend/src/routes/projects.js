/**
 * Projects CRUD. Only Admin & Analyst can create/edit; Viewer read-only. Org-scoped via middleware.
 */
import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, requireOrgSafe } from '../middleware/auth.js';
import { requireWrite } from '../middleware/roleGuard.js';
import * as projectService from '../services/projectService.js';

const router = Router();
router.use(requireAuth);
router.use(requireOrgSafe);

const createValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('release_date').optional().isISO8601().toDate(),
  body('language').optional().trim(),
  body('regions').optional().isArray(),
  body('duration_mins').optional().isInt({ min: 1 }),
  body('genre').optional().trim(),
  body('versions').optional().isArray(),
  body('week_start').optional().isISO8601().toDate(),
  body('censor_certificate').optional().trim(),
  body('entry_mins').optional().isInt({ min: 0 }),
  body('ent_com_mins').optional().isInt({ min: 0 }),
  body('ent_trl_mins').optional().isInt({ min: 0 }),
  body('int_com_mins').optional().isInt({ min: 0 }),
  body('int_slides_mins').optional().isInt({ min: 0 }),
  body('int_trl_mins').optional().isInt({ min: 0 }),
  body('hk_mins').optional().isInt({ min: 0 }),
  body('turnaround_total_mins').optional().isInt({ min: 0 }),
  body('turnaround_in_hrs').optional().trim(),
];

const updateValidation = [
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('release_date').optional().isISO8601().toDate(),
  body('language').optional().trim(),
  body('regions').optional().isArray(),
  body('duration_mins').optional().isInt({ min: 1 }),
  body('genre').optional().trim(),
  body('versions').optional().isArray(),
  body('week_start').optional().isISO8601().toDate(),
  body('censor_certificate').optional().trim(),
  body('entry_mins').optional().isInt({ min: 0 }),
  body('ent_com_mins').optional().isInt({ min: 0 }),
  body('ent_trl_mins').optional().isInt({ min: 0 }),
  body('int_com_mins').optional().isInt({ min: 0 }),
  body('int_slides_mins').optional().isInt({ min: 0 }),
  body('int_trl_mins').optional().isInt({ min: 0 }),
  body('hk_mins').optional().isInt({ min: 0 }),
  body('turnaround_total_mins').optional().isInt({ min: 0 }),
  body('turnaround_in_hrs').optional().trim(),
];

router.get('/', async (req, res, next) => {
  try {
    const result = await projectService.list(req.organizationId, {
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', param('id').isUUID(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: true, message: 'Invalid id' });
    const project = await projectService.getById(req.organizationId, req.params.id);
    if (!project) return res.status(404).json({ error: true, message: 'Project not found' });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireWrite, createValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: true, message: errors.array()[0].msg });
    const project = await projectService.create(req.organizationId, req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireWrite, updateValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: true, message: 'Invalid input' });
    const project = await projectService.update(req.organizationId, req.params.id, req.body);
    if (!project) return res.status(404).json({ error: true, message: 'Project not found' });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireWrite, param('id').isUUID(), async (req, res, next) => {
  try {
    const ok = await projectService.softDelete(req.organizationId, req.params.id);
    if (!ok) return res.status(404).json({ error: true, message: 'Project not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
