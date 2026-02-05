/**
 * Movie Programming API: slate, factors, schedule, alerts, re-release, export.
 */
import { Router } from 'express';
import { query, param, body, validationResult } from 'express-validator';
import { requireAuth, requireOrgSafe } from '../middleware/auth.js';
import { requireWrite } from '../middleware/roleGuard.js';
import * as programmingService from '../services/programmingService.js';
import * as projectService from '../services/projectService.js';

const router = Router();
router.use(requireAuth);
router.use(requireOrgSafe);

const weekQuery = query('weekStart').optional().isDate();
const theaterQuery = query('theaterId').optional().isUUID();

router.get('/slate', weekQuery, async (req, res, next) => {
  try {
    const data = await programmingService.getSlate(req.organizationId, req.query.weekStart);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/kpis', weekQuery, async (req, res, next) => {
  try {
    const data = await programmingService.getProgrammingKpis(req.organizationId, req.query.weekStart);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/schedule', weekQuery, theaterQuery, async (req, res, next) => {
  try {
    const data = await programmingService.getSchedule(req.organizationId, req.query.weekStart, req.query.theaterId || null);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/alerts', weekQuery, async (req, res, next) => {
  try {
    const data = await programmingService.getAlerts(req.organizationId, req.query.weekStart);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/re-release', async (req, res, next) => {
  try {
    const data = await programmingService.getReReleaseRecommendations(req.organizationId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/genre-breakdown', weekQuery, async (req, res, next) => {
  try {
    const data = await programmingService.getGenreBreakdown(req.organizationId, req.query.weekStart);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/show-distribution', weekQuery, async (req, res, next) => {
  try {
    const data = await programmingService.getShowDistribution(req.organizationId, req.query.weekStart);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/top-titles', weekQuery, async (req, res, next) => {
  try {
    const data = await programmingService.getTopTitles(req.organizationId, req.query.weekStart);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/capacity-allocation', weekQuery, theaterQuery, async (req, res, next) => {
  try {
    const data = await programmingService.getCapacityAllocation(req.organizationId, req.query.weekStart, req.query.theaterId || null);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/movies-by-locations', weekQuery, theaterQuery, async (req, res, next) => {
  try {
    const data = await programmingService.getMoviesByLocations(req.organizationId, req.query.weekStart, req.query.theaterId || null);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/export', weekQuery, query('format').optional().isIn(['xlsx', 'csv']), async (req, res, next) => {
  try {
    const format = req.query.format || 'xlsx';
    const buffer = await programmingService.exportSchedule(req.organizationId, req.query.weekStart, format);
    const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const ext = format;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="schedule.${ext}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.get('/factors', query('projectId').optional().isUUID(), async (req, res, next) => {
  try {
    const data = await programmingService.getFactors(req.organizationId, req.query.projectId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.put('/factors/:projectId', requireWrite, param('projectId').isUUID(), async (req, res, next) => {
  try {
    const project = await projectService.getById(req.organizationId, req.params.projectId);
    if (!project) return res.status(404).json({ error: true, message: 'Project not found' });
    const data = await programmingService.upsertFactors(req.organizationId, req.params.projectId, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
