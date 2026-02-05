/**
 * Report generation: summary data, PDF/Excel export, shareable read-only links.
 */
import { pool } from '../db/connection.js';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import XLSX from 'xlsx';
import crypto from 'crypto';

export async function createReport(organizationId, userId, data) {
  const { title, type = 'summary', projectId } = data;
  const shareToken = crypto.randomBytes(32).toString('hex');
  const r = await pool.query(
    `INSERT INTO reports (organization_id, project_id, title, type, share_token, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, organization_id, project_id, title, type, share_token, created_at`,
    [organizationId, projectId || null, title, type, shareToken, userId || null]
  );
  return r.rows[0];
}

export async function getReportByToken(shareToken) {
  const r = await pool.query(
    `SELECT id, organization_id, project_id, title, type, created_at FROM reports WHERE share_token = $1 AND deleted_at IS NULL`,
    [shareToken]
  );
  return r.rows[0] || null;
}

export async function getReportById(organizationId, reportId) {
  const r = await pool.query(
    `SELECT * FROM reports WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [reportId, organizationId]
  );
  return r.rows[0] || null;
}

export async function listReports(organizationId, projectId = null) {
  let q = `SELECT id, organization_id, project_id, title, type, share_token, created_at FROM reports WHERE organization_id = $1 AND deleted_at IS NULL`;
  const params = [organizationId];
  if (projectId) {
    params.push(projectId);
    q += ` AND project_id = $2`;
  }
  q += ` ORDER BY created_at DESC`;
  const r = await pool.query(q, params);
  return r.rows;
}

/** Build summary data for a report (projects + show counts). */
export async function getSummaryData(organizationId, projectId = null) {
  const params = [organizationId];
  const projectFilter = projectId ? 'AND p.id = $2' : '';
  if (projectId) params.push(projectId);
  const r = await pool.query(
    `SELECT p.id, p.name, p.release_date, COUNT(s.id) AS show_count
     FROM projects p
     LEFT JOIN shows s ON s.project_id = p.id AND s.deleted_at IS NULL
     WHERE p.organization_id = $1 AND p.deleted_at IS NULL ${projectFilter}
     GROUP BY p.id, p.name, p.release_date`,
    params
  );
  return r.rows;
}

/** Generate a simple PDF buffer (title + summary table). */
export async function generatePdf(summaryRows) {
  const doc = await PDFDocument.create();
  const font = await doc.getFont(StandardFonts.Helvetica);
  const page = doc.addPage([600, 400]);
  let y = 380;
  page.drawText('ScreenIQ Report Summary', { x: 50, y, size: 18, font });
  y -= 30;
  for (const row of summaryRows) {
    const text = `${row.name || row.id} | Shows: ${row.show_count || 0}`;
    page.drawText(text, { x: 50, y, size: 12, font });
    y -= 20;
  }
  return Buffer.from(await doc.save());
}

/** Generate Excel buffer (one sheet with summary). */
export function generateExcel(summaryRows) {
  const ws = XLSX.utils.json_to_sheet(summaryRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
