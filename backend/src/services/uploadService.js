/**
 * File upload: store metadata, parse Excel/CSV, validate, persist data_records. Async processing via status.
 */
import { pool } from '../db/connection.js';
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

export async function createUploadRecord(organizationId, projectId, fileInfo, userId) {
  const r = await pool.query(
    `INSERT INTO uploaded_files (organization_id, project_id, filename, original_name, mime_type, size_bytes, status, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
     RETURNING id, organization_id, project_id, filename, original_name, status, created_at`,
    [
      organizationId,
      projectId || null,
      fileInfo.filename,
      fileInfo.originalname,
      fileInfo.mimetype,
      fileInfo.size,
      userId || null,
    ]
  );
  return r.rows[0];
}

export async function updateUploadStatus(uploadId, status, rowCount = null, columnMapping = null) {
  await pool.query(
    `UPDATE uploaded_files SET status = $2, row_count = COALESCE($3, row_count), column_mapping = COALESCE($4, column_mapping), updated_at = now() WHERE id = $1`,
    [uploadId, status, rowCount, columnMapping ? JSON.stringify(columnMapping) : null]
  );
}

export function parseFile(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv' || mimeType === 'text/csv') {
    const buf = fs.readFileSync(filePath, 'utf8');
    const wb = XLSX.read(buf, { type: 'string', raw: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: '' });
  }
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

/** Persist rows as data_records. payload = mapped row object. */
export async function persistDataRecords(organizationId, projectId, uploadedFileId, rows) {
  if (rows.length === 0) return;
  const client = await pool.connect();
  try {
    for (const row of rows) {
      await client.query(
        `INSERT INTO data_records (organization_id, project_id, uploaded_file_id, payload)
         VALUES ($1, $2, $3, $4)`,
        [organizationId, projectId || null, uploadedFileId, JSON.stringify(row)]
      );
    }
  } finally {
    client.release();
  }
}

export async function getUploadById(organizationId, uploadId) {
  const r = await pool.query(
    `SELECT * FROM uploaded_files WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [uploadId, organizationId]
  );
  return r.rows[0] || null;
}

export async function listUploads(organizationId, projectId = null) {
  const r = await pool.query(
    `SELECT id, organization_id, project_id, original_name, mime_type, size_bytes, row_count, status, column_mapping, created_at
     FROM uploaded_files WHERE organization_id = $1 AND deleted_at IS NULL
     AND ($2::uuid IS NULL OR project_id = $2)
     ORDER BY created_at DESC`,
    [organizationId, projectId || null]
  );
  return r.rows;
}
