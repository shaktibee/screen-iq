/**
 * Movie Programming: slate (titles) by week, influencing factors, schedule, alerts, re-release recommendations, export.
 */
import { pool } from '../db/connection.js';
import XLSX from 'xlsx';

/** Get week start (Monday) for a date string or today. */
function getWeekStart(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

/** Slate: titles (projects) for the given week. */
export async function getSlate(organizationId, weekStart) {
  const start = weekStart || getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endStr = end.toISOString().slice(0, 10);
  try {
    const r = await pool.query(
      `SELECT p.id, p.name, p.release_date, p.language, p.regions, p.duration_mins, p.genre, p.versions, p.week_start, p.created_at
       FROM projects p
       WHERE p.organization_id = $1 AND p.deleted_at IS NULL
       AND p.week_start >= $2::date AND p.week_start <= $3::date
       ORDER BY p.name`,
      [organizationId, start, endStr]
    );
    const allForOrg = await pool.query(
      `SELECT id, name, release_date, language, regions, duration_mins, genre, versions, week_start
       FROM projects WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY name`,
      [organizationId]
    );
    return {
      weekStart: start,
      weekEnd: endStr,
      slate: r.rows,
      allTitles: allForOrg.rows,
    };
  } catch (err) {
    if (err.code === '42703') {
      const allForOrg = await pool.query(
        `SELECT id, name, release_date, language, regions FROM projects WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY name`,
        [organizationId]
      );
      return { weekStart: start, weekEnd: endStr, slate: [], allTitles: allForOrg.rows };
    }
    throw err;
  }
}

/** Get influencing factors for a project (or all for org). */
export async function getFactors(organizationId, projectId = null) {
  try {
    if (projectId) {
      const r = await pool.query(
        `SELECT * FROM title_factors WHERE organization_id = $1 AND project_id = $2`,
        [organizationId, projectId]
      );
      return r.rows[0] || null;
    }
    const r = await pool.query(
      `SELECT tf.*, p.name AS project_name FROM title_factors tf
       JOIN projects p ON p.id = tf.project_id AND p.deleted_at IS NULL
       WHERE tf.organization_id = $1 ORDER BY p.name`,
      [organizationId]
    );
    return r.rows;
  } catch (err) {
    if (err.code === '42P01' || err.code === '42703') return projectId ? null : [];
    throw err;
  }
}

/** Upsert influencing factors for a project. */
export async function upsertFactors(organizationId, projectId, data) {
  try {
    const r = await pool.query(
      `INSERT INTO title_factors (organization_id, project_id, is_franchise, genre_buzz, actor_buzz, lead_actor_performance, language_population_pct, social_buzz, advance_booking_pct)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (project_id) DO UPDATE SET
         is_franchise = EXCLUDED.is_franchise, genre_buzz = EXCLUDED.genre_buzz, actor_buzz = EXCLUDED.actor_buzz,
         lead_actor_performance = EXCLUDED.lead_actor_performance, language_population_pct = EXCLUDED.language_population_pct,
         social_buzz = EXCLUDED.social_buzz, advance_booking_pct = EXCLUDED.advance_booking_pct
       RETURNING *`,
      [
        organizationId,
        projectId,
        data.is_franchise ?? false,
        data.genre_buzz ?? 0,
        data.actor_buzz ?? 0,
        data.lead_actor_performance ?? 0,
        data.language_population_pct ?? 0,
        data.social_buzz ?? 0,
        data.advance_booking_pct ?? 0,
      ]
    );
    return r.rows[0] || getFactors(organizationId, projectId);
  } catch (err) {
    if (err.code === '42P01') throw new Error('Run programming migration: npm run db:migrate:programming');
    throw err;
  }
}

/** Schedule at Theatre × Screen level for a week. Optional theaterId filters to one theatre. */
export async function getSchedule(organizationId, weekStart, theaterId = null) {
  const start = weekStart || getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const endStr = end.toISOString().slice(0, 10);
  let q = `SELECT s.id, s.project_id, s.screen_id, s.name AS show_name, s.region, s.start_time, s.end_time, s.capacity, s.ticket_price, s.sold_count, s.metadata,
            sc.name AS screen_name, sc.capacity AS screen_capacity,
            t.id AS theater_id, t.name AS theater_name, t.city,
            p.name AS title
     FROM shows s
     LEFT JOIN screens sc ON sc.id = s.screen_id AND sc.deleted_at IS NULL
     LEFT JOIN theaters t ON t.id = sc.theater_id AND t.deleted_at IS NULL
     LEFT JOIN projects p ON p.id = s.project_id AND p.deleted_at IS NULL
     WHERE s.organization_id = $1 AND s.deleted_at IS NULL
     AND s.start_time >= $2::date AND s.start_time < $3::date`;
  const params = [organizationId, start, endStr];
  if (theaterId) {
    q += ` AND t.id = $4`;
    params.push(theaterId);
  }
  q += ` ORDER BY t.name, sc.name, s.start_time`;
  const r = await pool.query(q, params);
  const occupancy = r.rows.map((row) => {
    const cap = row.capacity ?? row.screen_capacity;
    const sold = row.sold_count ?? 0;
    return { ...row, occupancy_pct: cap ? Math.round((sold / cap) * 100) : null };
  });
  return { weekStart: start, weekEnd: endStr, schedule: occupancy };
}

/** Alerts: missing Title × City combinations; whitespaces (first mover). */
export async function getAlerts(organizationId, weekStart) {
  const start = weekStart || getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const endStr = end.toISOString().slice(0, 10);

  const cities = await pool.query(
    `SELECT DISTINCT t.city FROM theaters t WHERE t.organization_id = $1 AND t.deleted_at IS NULL AND t.city IS NOT NULL`,
    [organizationId]
  );
  const titlesInWeek = await pool.query(
    `SELECT DISTINCT p.id, p.name FROM projects p
     JOIN shows s ON s.project_id = p.id AND s.deleted_at IS NULL
     WHERE p.organization_id = $1 AND p.deleted_at IS NULL
     AND s.start_time >= $2::date AND s.start_time < $3::date`,
    [organizationId, start, endStr]
  );
  const titleCityPairs = await pool.query(
    `SELECT DISTINCT p.id AS project_id, p.name AS title, t.city
     FROM shows s
     JOIN projects p ON p.id = s.project_id AND p.deleted_at IS NULL
     JOIN screens sc ON sc.id = s.screen_id AND sc.deleted_at IS NULL
     JOIN theaters t ON t.id = sc.theater_id AND t.deleted_at IS NULL
     WHERE s.organization_id = $1 AND s.deleted_at IS NULL
     AND s.start_time >= $2::date AND s.start_time < $3::date AND t.city IS NOT NULL`,
    [organizationId, start, endStr]
  );
  const pairSet = new Set(titleCityPairs.rows.map((r) => `${r.project_id}|${r.city}`));
  const missingTitleCity = [];
  for (const title of titlesInWeek.rows) {
    for (const c of cities.rows) {
      if (!c.city) continue;
      if (!pairSet.has(`${title.id}|${c.city}`)) {
        missingTitleCity.push({ title: title.name, city: c.city });
      }
    }
  }

  const screensWithShows = await pool.query(
    `SELECT sc.id, sc.name, t.name AS theater_name, t.city,
            COUNT(s.id) AS show_count,
            MIN(s.start_time)::date AS first_show_date,
            MAX(s.end_time)::date AS last_show_date
     FROM screens sc
     JOIN theaters t ON t.id = sc.theater_id AND t.deleted_at IS NULL
     LEFT JOIN shows s ON s.screen_id = sc.id AND s.deleted_at IS NULL AND s.start_time >= $2::date AND s.start_time < $3::date
     WHERE sc.organization_id = $1 AND sc.deleted_at IS NULL
     GROUP BY sc.id, sc.name, t.name, t.city`,
    [organizationId, start, endStr]
  );
  const whitespaces = screensWithShows.rows
    .filter((r) => parseInt(r.show_count, 10) === 0 || r.show_count == null)
    .map((r) => ({ screen: r.name, theater: r.theater_name, city: r.city }));

  return {
    weekStart: start,
    missingTitleCity: missingTitleCity.slice(0, 50),
    whitespaceScreens: whitespaces,
  };
}

/** Re-release recommendations: low-performing weeks + suggested re-releases. */
export async function getReReleaseRecommendations(organizationId, limitWeeks = 12) {
  const limit = parseInt(limitWeeks, 10) || 12;
  const r = await pool.query(
    `SELECT date_trunc('week', s.start_time)::date AS week_start,
            COUNT(s.id) AS show_count,
            SUM(s.sold_count) AS total_sold,
            SUM(COALESCE(s.capacity, 0)) AS total_capacity,
            SUM(s.sold_count)::float / NULLIF(SUM(COALESCE(s.capacity, 0)), 0) * 100 AS avg_occupancy_pct
     FROM shows s
     WHERE s.organization_id = $1 AND s.deleted_at IS NULL
     AND s.start_time >= now() - ($2::text || ' weeks')::interval
     GROUP BY 1 ORDER BY 1 DESC LIMIT $3`,
    [organizationId, String(limit), limit]
  );
  const weeks = r.rows.map((w) => ({
    week_start: w.week_start,
    show_count: parseInt(w.show_count, 10),
    total_sold: parseInt(w.total_sold, 10) || 0,
    total_capacity: parseInt(w.total_capacity, 10) || 0,
    avg_occupancy_pct: w.avg_occupancy_pct != null ? Math.round(parseFloat(w.avg_occupancy_pct)) : null,
  }));
  const sortedByOccupancy = [...weeks].sort((a, b) => (a.avg_occupancy_pct ?? 0) - (b.avg_occupancy_pct ?? 0));
  const lowWeeks = sortedByOccupancy.slice(0, 3);
  let allTitles = [];
  try {
    const r = await pool.query(
      `SELECT id, name, release_date FROM projects WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY name`,
      [organizationId]
    );
    allTitles = r.rows;
  } catch (err) {
    if (err.code !== '42703') throw err;
  }
  return {
    lowPerformingWeeks: lowWeeks,
    recommendedReReleases: allTitles.slice(0, 5).map((p) => ({
      title: p.name,
      genre: p.genre ?? null,
      release_date: p.release_date,
      reason: 'Historical performer; consider re-release in low-occupancy weeks',
    })),
  };
}

/** KPIs for dashboard. */
export async function getProgrammingKpis(organizationId, weekStart) {
  const start = weekStart || getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const endStr = end.toISOString().slice(0, 10);
  const [screens, shows, occupancy, price] = await Promise.all([
    pool.query(
      `SELECT COUNT(DISTINCT sc.id) AS n FROM screens sc WHERE sc.organization_id = $1 AND sc.deleted_at IS NULL`,
      [organizationId]
    ),
    pool.query(
      `SELECT COUNT(*) AS n FROM shows s WHERE s.organization_id = $1 AND s.deleted_at IS NULL AND s.start_time >= $2::date AND s.start_time < $3::date`,
      [organizationId, start, endStr]
    ),
    pool.query(
      `SELECT SUM(s.sold_count) AS sold, SUM(s.capacity) AS cap FROM shows s WHERE s.organization_id = $1 AND s.deleted_at IS NULL AND s.start_time >= $2::date AND s.start_time < $3::date`,
      [organizationId, start, endStr]
    ),
    pool.query(
      `SELECT AVG(s.ticket_price) AS avg_price FROM shows s WHERE s.organization_id = $1 AND s.deleted_at IS NULL AND s.start_time >= $2::date AND s.start_time < $3::date AND s.ticket_price IS NOT NULL`,
      [organizationId, start, endStr]
    ),
  ]);
  const sold = parseInt(occupancy.rows[0]?.sold || 0, 10);
  const cap = parseInt(occupancy.rows[0]?.cap || 0, 10);
  const avgOccupancy = cap ? Math.round((sold / cap) * 100) : null;
  return {
    totalScreens: parseInt(screens.rows[0]?.n || 0, 10),
    totalShows: parseInt(shows.rows[0]?.n || 0, 10),
    avgOccupancyPct: avgOccupancy,
    avgTicketPrice: price.rows[0]?.avg_price != null ? parseFloat(price.rows[0].avg_price) : null,
  };
}

/** Genre breakdown for the week. */
export async function getGenreBreakdown(organizationId, weekStart) {
  const start = weekStart || getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const endStr = end.toISOString().slice(0, 10);
  try {
    const r = await pool.query(
      `SELECT COALESCE(p.genre, 'Unknown') AS genre, COUNT(s.id) AS show_count
       FROM shows s
       JOIN projects p ON p.id = s.project_id AND p.deleted_at IS NULL
       WHERE s.organization_id = $1 AND s.deleted_at IS NULL
       AND s.start_time >= $2::date AND s.start_time < $3::date
       GROUP BY p.genre ORDER BY show_count DESC`,
      [organizationId, start, endStr]
    );
    const total = r.rows.reduce((acc, row) => acc + parseInt(row.show_count, 10), 0);
    return r.rows.map((row) => ({
      genre: row.genre,
      count: parseInt(row.show_count, 10),
      pct: total ? Math.round((parseInt(row.show_count, 10) / total) * 100) : 0,
    }));
  } catch (err) {
    if (err.code === '42703') return [];
    throw err;
  }
}

/** Show distribution by time of day. */
export async function getShowDistribution(organizationId, weekStart) {
  const start = weekStart || getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const endStr = end.toISOString().slice(0, 10);
  const r = await pool.query(
    `SELECT
       CASE
         WHEN EXTRACT(HOUR FROM s.start_time) < 12 THEN 'Morning'
         WHEN EXTRACT(HOUR FROM s.start_time) < 17 THEN 'Afternoon'
         WHEN EXTRACT(HOUR FROM s.start_time) < 21 THEN 'Evening'
         ELSE 'Night'
       END AS slot,
       COUNT(*) AS n
     FROM shows s
     WHERE s.organization_id = $1 AND s.deleted_at IS NULL
     AND s.start_time >= $2::date AND s.start_time < $3::date
     GROUP BY 1 ORDER BY MIN(EXTRACT(HOUR FROM s.start_time))`,
    [organizationId, start, endStr]
  );
  return r.rows.map((row) => ({ slot: row.slot, count: parseInt(row.n, 10) }));
}

/** Top performing titles by occupancy/sold. */
export async function getTopTitles(organizationId, weekStart, limit = 5) {
  const start = weekStart || getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const endStr = end.toISOString().slice(0, 10);
  const limitInt = parseInt(limit, 10) || 5;
  const r = await pool.query(
    `SELECT p.name AS title, SUM(s.sold_count) AS sold, SUM(s.capacity) AS cap
     FROM shows s
     JOIN projects p ON p.id = s.project_id AND p.deleted_at IS NULL
     WHERE s.organization_id = $1 AND s.deleted_at IS NULL
     AND s.start_time >= $2::date AND s.start_time < $3::date
     GROUP BY p.id, p.name
     ORDER BY SUM(s.sold_count) DESC NULLS LAST LIMIT $4::int`,
    [organizationId, start, endStr, limitInt]
  );
  return r.rows.map((row) => ({
    title: row.title,
    sold: parseInt(row.sold, 10) || 0,
    capacity: parseInt(row.cap, 10) || 0,
    occupancyPct: row.cap ? Math.round((parseInt(row.sold, 10) || 0) / parseInt(row.cap, 10) * 100) : null,
  }));
}

/** Capacity allocation by movie: shows, movie length, capacity allocated, %, demand (placeholder), recommendation, occ %. Optional theaterId. */
export async function getCapacityAllocation(organizationId, weekStart, theaterId = null) {
  const start = weekStart || getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const endStr = end.toISOString().slice(0, 10);

  const slateRes = await pool.query(
    `SELECT p.id, p.name, p.language, p.versions, p.censor_certificate, p.duration_mins
     FROM projects p
     WHERE p.organization_id = $1 AND p.deleted_at IS NULL
     AND p.week_start >= $2::date AND p.week_start <= $3::date
     ORDER BY p.name`,
    [organizationId, start, endStr]
  );
  let slate = slateRes.rows;
  if (slate.length === 0) {
    let withShowsQ = `SELECT DISTINCT p.id FROM projects p
       JOIN shows s ON s.project_id = p.id AND s.deleted_at IS NULL
       JOIN screens sc ON sc.id = s.screen_id AND sc.deleted_at IS NULL
       JOIN theaters t ON t.id = sc.theater_id AND t.deleted_at IS NULL
       WHERE p.organization_id = $1 AND p.deleted_at IS NULL
       AND s.organization_id = $1 AND s.deleted_at IS NULL
       AND s.start_time >= $2::date AND s.start_time < $3::date`;
    const withShowsParams = [organizationId, start, endStr];
    if (theaterId) { withShowsQ += ` AND t.id = $4`; withShowsParams.push(theaterId); }
    const withShows = await pool.query(withShowsQ, withShowsParams);
    if (withShows.rows.length > 0) {
      const ids = withShows.rows.map((r) => r.id);
      const placeholders = ids.map((_, i) => `$${i + 4}`).join(',');
      slate = (await pool.query(
        `SELECT id, name, language, versions, censor_certificate, duration_mins
         FROM projects WHERE id IN (${placeholders}) ORDER BY name`,
        [organizationId, start, endStr, ...ids]
      )).rows;
    }
  }

  let aggQ = `SELECT s.project_id,
            COUNT(s.id)::int AS show_count,
            COALESCE(SUM(GREATEST(s.capacity, COALESCE(sc.capacity, 0))), 0)::bigint AS capacity_allocated,
            COALESCE(SUM(s.sold_count), 0)::bigint AS sold
     FROM shows s
     LEFT JOIN screens sc ON sc.id = s.screen_id AND sc.deleted_at IS NULL
     LEFT JOIN theaters t ON t.id = sc.theater_id AND t.deleted_at IS NULL
     WHERE s.organization_id = $1 AND s.deleted_at IS NULL
     AND s.start_time >= $2::date AND s.start_time < $3::date`;
  const aggParams = [organizationId, start, endStr];
  if (theaterId) { aggQ += ` AND t.id = $4`; aggParams.push(theaterId); }
  aggQ += ` GROUP BY s.project_id`;
  const aggRes = await pool.query(aggQ, aggParams);
  const aggByProject = new Map(aggRes.rows.map((r) => [r.project_id, r]));

  const totalCapacityFromAgg = aggRes.rows.reduce((sum, r) => sum + Number(r.capacity_allocated || 0), 0);

  const rows = slate.map((p) => {
    const a = aggByProject.get(p.id) || { show_count: 0, capacity_allocated: 0, sold: 0 };
    const showCount = parseInt(a.show_count, 10) || 0;
    const capacityAllocated = Number(a.capacity_allocated || 0);
    const sold = Number(a.sold || 0);
    const capacityPct = totalCapacityFromAgg > 0 ? (capacityAllocated / totalCapacityFromAgg) * 100 : 0;
    const occPct = capacityAllocated > 0 ? (sold / capacityAllocated) * 100 : null;
    let recommendation = null;
    if (showCount === 0) recommendation = 'increase';
    else if (occPct != null && occPct < 40) recommendation = 'decrease';
    else if (occPct != null && occPct >= 70) recommendation = 'increase';

    const versions = Array.isArray(p.versions) ? p.versions : [];
    const versionStr = versions.length ? ` (${versions.join(' ')})` : '';
    const lang = p.language ? ` (${String(p.language).toUpperCase()})` : '';
    const censor = p.censor_certificate ? ` (${String(p.censor_certificate).toUpperCase()})` : '';
    const movieLabel = `${p.name || '—'}${versionStr}${lang}${censor}`;

    return {
      project_id: p.id,
      movie: movieLabel,
      shows: showCount,
      movie_length: p.duration_mins != null ? parseInt(p.duration_mins, 10) : null,
      capacity_allocated: capacityAllocated,
      capacity_pct: Math.round(capacityPct * 10) / 10,
      demand_estimated: null,
      demand_pct: null,
      recommendation,
      occ_pct: occPct != null ? Math.round(occPct * 100) / 100 : null,
    };
  });

  const totalCapacityAllocated = rows.reduce((sum, r) => sum + r.capacity_allocated, 0);
  rows.forEach((r) => {
    r.capacity_pct = totalCapacityAllocated > 0 ? Math.round((r.capacity_allocated / totalCapacityAllocated) * 1000) / 10 : 0;
  });

  const totalShows = rows.reduce((s, r) => s + r.shows, 0);
  return {
    weekStart: start,
    weekEnd: endStr,
    totalShows,
    totalCapacityAllocated,
    rows,
  };
}

/** Movies × Locations matrix: rows = movies, columns = cities (and optional screen type), values = show count. */
export async function getMoviesByLocations(organizationId, weekStart, theaterId = null) {
  const start = weekStart || getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const endStr = end.toISOString().slice(0, 10);
  let q = `SELECT p.id AS project_id, p.name AS title, p.language,
            t.city,
            COALESCE(t.name, 'Unknown') AS theater_name,
            COUNT(s.id)::int AS show_count
     FROM shows s
     JOIN projects p ON p.id = s.project_id AND p.deleted_at IS NULL
     JOIN screens sc ON sc.id = s.screen_id AND sc.deleted_at IS NULL
     JOIN theaters t ON t.id = sc.theater_id AND t.deleted_at IS NULL
     WHERE s.organization_id = $1 AND s.deleted_at IS NULL
     AND s.start_time >= $2::date AND s.start_time < $3::date`;
  const params = [organizationId, start, endStr];
  if (theaterId) { q += ` AND t.id = $4`; params.push(theaterId); }
  q += ` GROUP BY p.id, p.name, p.language, t.id, t.city, t.name ORDER BY p.name, t.city`;
  const r = await pool.query(q, params);
  const columns = [...new Set(r.rows.map((row) => row.city || 'Unknown'))].sort();
  const rowKey = (row) => `${row.project_id}`;
  const byMovie = new Map();
  for (const row of r.rows) {
    const key = rowKey(row);
    if (!byMovie.has(key)) {
      byMovie.set(key, {
        project_id: row.project_id,
        movie: `${row.title || '—'} (${(row.language || '').toUpperCase()})`,
        locations: {},
      });
    }
    const loc = row.city || 'Unknown';
    byMovie.get(key).locations[loc] = parseInt(row.show_count, 10) || 0;
  }
  const rows = Array.from(byMovie.values()).map((r) => ({
    ...r,
    locations: columns.reduce((acc, col) => ({ ...acc, [col]: r.locations[col] ?? 0 }), {}),
  }));
  return { weekStart: start, weekEnd: endStr, columns, rows };
}

/** Export schedule as XLSX or CSV buffer. */
export async function exportSchedule(organizationId, weekStart, format = 'xlsx') {
  const { schedule } = await getSchedule(organizationId, weekStart);
  const rows = schedule.map((s) => ({
    Theater: s.theater_name || '',
    City: s.city || '',
    Screen: s.screen_name || '',
    Title: s.title || '',
    Show: s.show_name || '',
    Start: s.start_time,
    End: s.end_time,
    Capacity: s.capacity ?? '',
    Sold: s.sold_count ?? '',
    Occupancy: s.occupancy_pct != null ? `${s.occupancy_pct}%` : '',
    TicketPrice: s.ticket_price ?? '',
  }));
  if (format === 'csv') {
    const header = Object.keys(rows[0] || {}).join(',');
    const lines = rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    return Buffer.from([header, ...lines].join('\n'), 'utf8');
  }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
