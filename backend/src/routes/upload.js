/**
 * File upload: multipart .xlsx/.csv, preview, column mapping, validation, async ingest.
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { body, param, validationResult } from 'express-validator';
import { requireAuth, requireOrgSafe } from '../middleware/auth.js';
import { requireWrite } from '../middleware/roleGuard.js';
import { config } from '../config/index.js';
import * as uploadService from '../services/uploadService.js';
import fs from 'fs';

const router = Router();
router.use(requireAuth);
router.use(requireOrgSafe);
router.use(requireWrite);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = config.uploadDir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype === 'text/csv' ? '.csv' : '.xlsx');
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype === 'text/csv') return cb(null, true);
    cb(new Error('Only Excel and CSV files are allowed'));
  },
});

// Upload file -> create record, return preview (first N rows) + column names
router.post('/file', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: 'No file uploaded' });
    const projectId = req.body.projectId || null;
    const record = await uploadService.createUploadRecord(
      req.organizationId,
      projectId,
      req.file,
      req.user.id
    );
    let rows = [];
    try {
      rows = uploadService.parseFile(req.file.path, req.file.mimetype);
    } catch (e) {
      await uploadService.updateUploadStatus(record.id, 'failed');
      return res.status(400).json({ error: true, message: 'Failed to parse file: ' + e.message });
    }
    const preview = rows.slice(0, 10);
    const columns = rows.length ? Object.keys(rows[0]) : [];
    res.status(201).json({
      upload: record,
      preview,
      columns,
      totalRows: rows.length,
    });
  } catch (err) {
    next(err);
  }
});

// Map columns and persist (sync for MVP; can move to job queue later)
const mappingValidation = [
  param('id').isUUID(),
  body('columnMapping').isObject().withMessage('columnMapping must be an object { sheetColumn: fieldName }'),
  body('requiredFields').optional().isArray(),
];

router.post('/:id/map', mappingValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: true, message: errors.array()[0].msg });
    const uploadRecord = await uploadService.getUploadById(req.organizationId, req.params.id);
    if (!uploadRecord) return res.status(404).json({ error: true, message: 'Upload not found' });
    const { columnMapping, requiredFields = [] } = req.body;
    const filePath = path.join(config.uploadDir, uploadRecord.filename);
    if (!fs.existsSync(filePath)) return res.status(400).json({ error: true, message: 'File no longer available' });
    let rows = uploadService.parseFile(filePath, uploadRecord.mime_type);
    const mapped = rows.map((row) => {
      const out = {};
      for (const [sheetCol, fieldName] of Object.entries(columnMapping)) {
        if (sheetCol && fieldName && row[sheetCol] !== undefined) out[fieldName] = row[sheetCol];
      }
      return out;
    });
    for (const field of requiredFields) {
      const missing = mapped.filter((r) => r[field] == null || String(r[field]).trim() === '');
      if (missing.length) {
        return res.status(400).json({
          error: true,
          message: `Missing required field "${field}" in ${missing.length} row(s)`,
        });
      }
    }
    await uploadService.updateUploadStatus(req.params.id, 'processing', null, columnMapping);
    await uploadService.persistDataRecords(
      req.organizationId,
      uploadRecord.project_id,
      uploadRecord.id,
      mapped
    );
    await uploadService.updateUploadStatus(req.params.id, 'completed', mapped.length);
    res.json({ success: true, rowsInserted: mapped.length });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const list = await uploadService.listUploads(req.organizationId, req.query.projectId || null);
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', param('id').isUUID(), async (req, res, next) => {
  try {
    const record = await uploadService.getUploadById(req.organizationId, req.params.id);
    if (!record) return res.status(404).json({ error: true, message: 'Upload not found' });
    res.json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
