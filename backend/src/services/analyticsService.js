/**
 * Dashboard metrics: total shows, region coverage, capacity utilization, time-based summaries.
 * Filter by project, date range, region. Optimized queries.
 */
import { pool } from '../db/connection.js';

export async function getDashboardMetrics(organizationId, filters = {}) {
  const { projectId, startDate, endDate, region } = filters;
  const params = [organizationId];
  let where = 'WHERE s.organization_id = $1 AND s.deleted_at IS NULL';
  if (projectId) {
    params.push(projectId);
    where += ` AND s.project_id = $${params.length}`;
  }
  if (startDate) {
    params.push(startDate);
    where += ` AND s.end_time >= $${params.length}::date`;
  }
  if (endDate) {
    params.push(endDate);
    where += ` AND s.start_time <= $${params.length}::date`;
  }
  if (region) {
    params.push(region);
    where += ` AND s.region = $${params.length}`;
  }

  const [totalShows, regionCoverage, capacitySummary, timeSummary] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM shows s ${where}`, params),
    pool.query(
      `SELECT s.region, COUNT(*) AS count FROM shows s ${where} GROUP BY s.region ORDER BY count DESC`,
      params
    ),
    pool.query(
      `SELECT SUM(s.capacity) AS total_capacity, COUNT(*) AS show_count FROM shows s ${where} AND s.capacity IS NOT NULL`,
      params
    ),
    pool.query(
      `SELECT date_trunc('day', s.start_time) AS day, COUNT(*) AS count FROM shows s ${where} GROUP BY 1 ORDER BY 1`,
      params
    ),
  ]);

  return {
    totalShows: parseInt(totalShows.rows[0]?.total || 0, 10),
    regionCoverage: regionCoverage.rows,
    capacityUtilization: {
      totalCapacity: parseInt(capacitySummary.rows[0]?.total_capacity || 0, 10),
      showCount: parseInt(capacitySummary.rows[0]?.show_count || 0, 10),
    },
    timeSummary: timeSummary.rows.map((r) => ({ date: r.day, count: parseInt(r.count, 10) })),
  };
}
