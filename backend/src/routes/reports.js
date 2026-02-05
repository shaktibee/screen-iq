/**
 * Reports: create, list, export PDF/Excel, share by token (read-only).
 */
import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { requireAuth, requireOrgSafe } from '../middleware/auth.js';
import { requireWrite } from '../middleware/roleGuard.js';
import * as reportService from '../services/reportService.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireOrgSafe,
  requireWrite,
  body('title').trim().notEmpty(),
  body('type').optional().trim(),
  body('projectId').optional().isUUID(),
  async (req, res, next) => {
    try {
      const report = await reportService.createReport(req.organizationId, req.user.id, req.body);
      res.status(201).json(report);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/', requireAuth, requireOrgSafe, async (req, res, next) => {
  try {
    const list = await reportService.listReports(req.organizationId, req.query.projectId || null);
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, requireOrgSafe, param('id').isUUID(), async (req, res, next) => {
  try {
    const report = await reportService.getReportById(req.organizationId, req.params.id);
    if (!report) return res.status(404).json({ error: true, message: 'Report not found' });
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// Public share by token (read-only, no auth)
router.get('/share/:token', param('token').isLength({ min: 32 }), async (req, res, next) => {
  try {
    const report = await reportService.getReportByToken(req.params.token);
    if (!report) return res.status(404).json({ error: true, message: 'Report not found' });
    const summary = await reportService.getSummaryData(report.organization_id, report.project_id);
    res.json({ report, summary });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/:id/export',
  requireAuth,
  requireOrgSafe,
  param('id').isUUID(),
  query('format').isIn(['pdf', 'xlsx']),
  async (req, res, next) => {
    try {
      const report = await reportService.getReportById(req.organizationId, req.params.id);
      if (!report) return res.status(404).json({ error: true, message: 'Report not found' });
      const summary = await reportService.getSummaryData(req.organizationId, report.project_id);
      const format = req.query.format;
      if (format === 'pdf') {
        const buf = await reportService.generatePdf(summary);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${report.title}.pdf"`);
        res.send(buf);
      } else {
        const buf = reportService.generateExcel(summary);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${report.title}.xlsx"`);
        res.send(buf);
      }
    } catch (err) {
      next(err);
    }
  }
);

export default router;
