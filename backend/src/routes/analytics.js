/**
 * Dashboard analytics API. Filter by project, date range, region.
 */
import { Router } from 'express';
import { query } from 'express-validator';
import { requireAuth, requireOrgSafe } from '../middleware/auth.js';
import * as analyticsService from '../services/analyticsService.js';

const router = Router();
router.use(requireAuth);
router.use(requireOrgSafe);

router.get(
  '/dashboard',
  query('projectId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('region').optional().trim(),
  async (req, res, next) => {
    try {
      const metrics = await analyticsService.getDashboardMetrics(req.organizationId, {
        projectId: req.query.projectId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        region: req.query.region,
      });
      res.json(metrics);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
