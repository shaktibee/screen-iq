/**
 * Reports API (stub).
 */
import { Router } from 'express';
import { getReportSummary, getReportBreakdown } from '../data/reportsStore.js';

const router = Router();

router.get('/summary', (req, res) => {
  res.json(getReportSummary(req.query));
});

router.get('/breakdown', (req, res) => {
  res.json(getReportBreakdown(req.query));
});

export default router;
