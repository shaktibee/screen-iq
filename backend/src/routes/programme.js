/**
 * Programme (scheduling) API: regions, states, locations, theatres, movies; create programme.
 */
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/connection.js';

const router = Router();

/** GET /api/programme — schedule overview: programmes in date range, optional filters (dateFrom, dateTo, regionId, locationId, theatreId; comma-separated for multiple). */
router.get('/', async (req, res, next) => {
  try {
    const { dateFrom, dateTo, regionId, locationId, theatreId } = req.query;
    const orgId = req.organizationId;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (dateFrom && dateTo) {
      conditions.push(`p.start_date <= $${idx} AND (p.end_date IS NULL OR p.end_date >= $${idx + 1})`);
      params.push(dateTo, dateFrom);
      idx += 2;
    }

    if (orgId) {
      conditions.push(`(p.organization_id = $${idx} OR p.organization_id IS NULL)`);
      params.push(orgId);
      idx += 1;
    }

    const toUuidList = (v) => {
      if (v == null || v === '') return null;
      const s = String(v).trim();
      return s ? s.split(',').map((id) => id.trim()).filter(Boolean) : null;
    };
    const regionIds = toUuidList(regionId);
    const locationIds = toUuidList(locationId);
    const theatreIds = toUuidList(theatreId);

    if (regionIds?.length) {
      conditions.push(`r.id = ANY($${idx}::uuid[])`);
      params.push(regionIds);
      idx += 1;
    }
    if (locationIds?.length) {
      conditions.push(`l.id = ANY($${idx}::uuid[])`);
      params.push(locationIds);
      idx += 1;
    }
    if (theatreIds?.length) {
      conditions.push(`t.id = ANY($${idx}::uuid[])`);
      params.push(theatreIds);
      idx += 1;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const q = `
      SELECT p.id AS programme_id, p.start_date, p.end_date, p.time_slot_pattern, p.tat_mins,
        m.id AS movie_id, m.title AS movie_title, m.duration_mins AS movie_duration_mins, m.language AS movie_language,
        t.id AS theatre_id, t.name AS theatre_name, t.screen_count,
        pt.shows_per_theatre, pt.shows_per_screen, pt.capacity_utilization,
        l.id AS location_id, l.name AS location_name, s.id AS state_id, s.name AS state_name,
        r.id AS region_id, r.name AS region_name
      FROM programme_theatres pt
      JOIN programmes p ON p.id = pt.programme_id
      JOIN movies m ON m.id = p.movie_id
      JOIN theatres t ON t.id = pt.theatre_id
      JOIN locations l ON l.id = t.location_id
      JOIN states s ON s.id = l.state_id
      LEFT JOIN regions r ON r.id = s.region_id
      ${where}
      ORDER BY p.start_date, t.name
    `;
    const r = await pool.query(q, params);
    const distinctTheatreIds = [...new Set(r.rows.map((row) => row.theatre_id))];
    let screenMap = new Map();
    if (distinctTheatreIds.length > 0) {
      try {
        const screenRes = await pool.query(
          `SELECT theatre_id, name FROM theatre_screens WHERE theatre_id = ANY($1::uuid[]) ORDER BY theatre_id, display_order, name`,
          [distinctTheatreIds]
        );
        for (const row of screenRes.rows) {
          if (!screenMap.has(row.theatre_id)) screenMap.set(row.theatre_id, []);
          screenMap.get(row.theatre_id).push(row.name);
        }
      } catch (_) {
        // screens table may not exist yet
      }
    }
    res.json(r.rows.map((row) => ({
      programmeId: row.programme_id,
      startDate: row.start_date,
      endDate: row.end_date,
      timeSlotPattern: row.time_slot_pattern,
      tatMins: row.tat_mins,
      movieId: row.movie_id,
      movieTitle: row.movie_title,
      durationMins: row.movie_duration_mins,
      movieLanguage: row.movie_language,
      theatreId: row.theatre_id,
      theatreName: row.theatre_name,
      screenCount: row.screen_count,
      theatreScreenNames: screenMap.get(row.theatre_id) || null,
      showsPerTheatre: row.shows_per_theatre,
      showsPerScreen: row.shows_per_screen,
      capacityUtilization: row.capacity_utilization,
      locationId: row.location_id,
      locationName: row.location_name,
      stateId: row.state_id,
      stateName: row.state_name,
      regionId: row.region_id,
      regionName: row.region_name,
    })));
  } catch (e) {
    next(e);
  }
});

router.get('/regions', async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const q = orgId
      ? 'SELECT id, name FROM regions WHERE organization_id = $1 OR organization_id IS NULL ORDER BY name'
      : 'SELECT id, name FROM regions ORDER BY name';
    const params = orgId ? [orgId] : [];
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) {
    next(e);
  }
});

router.get('/states', async (req, res, next) => {
  try {
    const { regionId } = req.query;
    let q = 'SELECT id, name, region_id FROM states ORDER BY name';
    const params = [];
    if (regionId) {
      q = 'SELECT id, name, region_id FROM states WHERE region_id = $1 ORDER BY name';
      params.push(regionId);
    }
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) {
    next(e);
  }
});

router.get('/locations', async (req, res, next) => {
  try {
    const { stateId, regionId } = req.query;
    let q, params = [];
    if (stateId) {
      q = 'SELECT id, name, state_id FROM locations WHERE state_id = $1 ORDER BY name';
      params = [stateId];
    } else if (regionId) {
      q = `SELECT l.id, l.name, l.state_id FROM locations l
           JOIN states s ON s.id = l.state_id WHERE s.region_id = $1 ORDER BY l.name`;
      params = [regionId];
    } else {
      q = 'SELECT id, name, state_id FROM locations ORDER BY name';
    }
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) {
    next(e);
  }
});

router.get('/theatres', async (req, res, next) => {
  try {
    const { locationId, stateId, regionId } = req.query;
    let q, params = [];
    if (locationId) {
      q = `SELECT t.id, t.name, t.chain, t.screen_count, t.capabilities, t.location_id, l.name AS location_name
           FROM theatres t JOIN locations l ON l.id = t.location_id WHERE t.location_id = $1 ORDER BY t.name`;
      params = [locationId];
    } else if (stateId) {
      q = `SELECT t.id, t.name, t.chain, t.screen_count, t.capabilities, t.location_id, l.name AS location_name
           FROM theatres t JOIN locations l ON l.id = t.location_id WHERE l.state_id = $1 ORDER BY l.name, t.name`;
      params = [stateId];
    } else if (regionId) {
      q = `SELECT t.id, t.name, t.chain, t.screen_count, t.capabilities, t.location_id, l.name AS location_name
           FROM theatres t JOIN locations l ON l.id = t.location_id
           JOIN states s ON s.id = l.state_id WHERE s.region_id = $1 ORDER BY l.name, t.name`;
      params = [regionId];
    } else {
      q = `SELECT t.id, t.name, t.chain, t.screen_count, t.capabilities, t.location_id, l.name AS location_name
           FROM theatres t JOIN locations l ON l.id = t.location_id ORDER BY l.name, t.name`;
    }
    const r = await pool.query(q, params);
    res.json(r.rows.map((row) => ({
      id: row.id,
      name: row.name,
      chain: row.chain,
      screenCount: row.screen_count,
      capabilities: row.capabilities,
      locationId: row.location_id,
      locationName: row.location_name,
    })));
  } catch (e) {
    next(e);
  }
});

router.get('/movies', async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT id, title, release_date, language, duration_mins, version, genre
       FROM movies ORDER BY release_date DESC NULLS LAST, title`
    );
    res.json(r.rows.map((row) => ({
      id: row.id,
      title: row.title,
      releaseDate: row.release_date,
      language: row.language,
      durationMins: row.duration_mins,
      version: row.version,
      genre: row.genre,
    })));
  } catch (e) {
    next(e);
  }
});

/** GET /api/programme/theatres/:theatreId/schedule?date=YYYY-MM-DD — theatre detail: screens and which movie on each screen for that date */
router.get('/theatres/:theatreId/schedule', async (req, res, next) => {
  try {
    const { theatreId } = req.params;
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const theatreRes = await pool.query(
      `SELECT t.id, t.name, t.screen_count, l.name AS location_name
       FROM theatres t JOIN locations l ON l.id = t.location_id WHERE t.id = $1`,
      [theatreId]
    );
    if (theatreRes.rows.length === 0) {
      return res.status(404).json({ error: true, message: 'Theatre not found' });
    }
    const theatre = {
      id: theatreRes.rows[0].id,
      name: theatreRes.rows[0].name,
      screenCount: theatreRes.rows[0].screen_count,
      locationName: theatreRes.rows[0].location_name,
    };

    const screensRes = await pool.query(
      `SELECT id, name, display_order FROM theatre_screens WHERE theatre_id = $1 ORDER BY display_order, name`,
      [theatreId]
    );
    const screens = screensRes.rows.map((r) => ({ id: r.id, name: r.name, displayOrder: r.display_order }));

    const programmesRes = await pool.query(
      `SELECT p.id AS programme_id, p.start_date, p.end_date, m.id AS movie_id, m.title AS movie_title, m.duration_mins
       FROM programme_theatres pt
       JOIN programmes p ON p.id = pt.programme_id
       JOIN movies m ON m.id = p.movie_id
       WHERE pt.theatre_id = $1 AND p.start_date <= $2 AND (p.end_date IS NULL OR p.end_date >= $2)
       ORDER BY p.start_date`,
      [theatreId, date]
    );
    const programmes = programmesRes.rows.map((r) => ({
      programmeId: r.programme_id,
      startDate: r.start_date,
      endDate: r.end_date,
      movieId: r.movie_id,
      movieTitle: r.movie_title,
      durationMins: r.duration_mins,
    }));

    let screenAllocation = new Map();
    try {
      const allocRes = await pool.query(
        `SELECT pts.screen_id, pts.programme_id
         FROM programme_theatre_screens pts
         JOIN programme_theatres pt ON pt.programme_id = pts.programme_id AND pt.theatre_id = pts.theatre_id
         JOIN programmes p ON p.id = pt.programme_id
         WHERE pts.theatre_id = $1 AND p.start_date <= $2 AND (p.end_date IS NULL OR p.end_date >= $2)`,
        [theatreId, date]
      );
      for (const row of allocRes.rows) {
        const prog = programmes.find((p) => p.programmeId === row.programme_id);
        if (prog) screenAllocation.set(row.screen_id, prog);
      }
    } catch (_) {
      // programme_theatre_screens table may not exist
    }

    const screenList =
      screens.length > 0
        ? screens
        : Array.from({ length: Math.max(1, theatre.screenCount) }, (_, i) => ({
            id: `s${i}`,
            name: `Audi ${i + 1}`,
            displayOrder: i + 1,
          }));
    const result = screenList.map((sc, idx) => {
      let prog = screenAllocation.get(sc.id) ?? null;
      if (!prog && programmes.length > 0) prog = programmes[idx % programmes.length] || null;
      return {
        id: sc.id,
        name: sc.name,
        programme: prog,
      };
    });

    res.json({ theatre, screens: result });
  } catch (e) {
    next(e);
  }
});

const createProgrammeValidation = [
  body('movieId').isUUID(),
  body('startDate').isDate(),
  body('endDate').optional({ values: 'null' }).isDate(),
  body('timeSlotPattern').optional().isIn(['linear', 'evening-heavy', 'art-house']),
  body('tatMins').optional().isInt({ min: 45, max: 90 }),
  body('theatres').isArray({ min: 1 }),
  body('theatres.*.theatreId').isUUID(),
  body('theatres.*.showsPerTheatre').optional().isInt({ min: 1, max: 50 }),
  body('theatres.*.showsPerScreen').optional().isInt({ min: 1, max: 20 }),
  body('theatres.*.capacityUtilization').optional().isIn(['max', 'moderate', 'low']),
  body('theatres.*.versionRatio2d').optional().isInt({ min: 0, max: 100 }),
  body('theatres.*.versionRatio3d').optional().isInt({ min: 0, max: 100 }),
  body('theatres.*.versionRatioImax').optional().isInt({ min: 0, max: 100 }),
  body('theatres.*.languages').optional().isArray(),
];

router.post('/', createProgrammeValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, errors: errors.array() });
    }
    const { movieId, startDate, endDate, timeSlotPattern, tatMins, theatres } = req.body;
    const organizationId = req.organizationId;
    const createdBy = req.user?.id || null;

    const client = await pool.connect();
    try {
      const progRes = await client.query(
        `INSERT INTO programmes (organization_id, created_by, movie_id, start_date, end_date, time_slot_pattern, tat_mins)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, start_date, end_date, created_at`,
        [
          organizationId,
          createdBy,
          movieId,
          startDate,
          endDate || null,
          timeSlotPattern || 'linear',
          tatMins ?? 50,
        ]
      );
      const programmeId = progRes.rows[0].id;

      for (const t of theatres) {
        await client.query(
          `INSERT INTO programme_theatres (programme_id, theatre_id, shows_per_theatre, shows_per_screen, capacity_utilization,
           version_ratio_2d, version_ratio_3d, version_ratio_imax, languages)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            programmeId,
            t.theatreId,
            t.showsPerTheatre ?? 1,
            t.showsPerScreen ?? 1,
            t.capacityUtilization || 'moderate',
            t.versionRatio2d ?? 70,
            t.versionRatio3d ?? 20,
            t.versionRatioImax ?? 10,
            Array.isArray(t.languages) ? t.languages : [],
          ]
        );
      }
      const row = progRes.rows[0];
      res.status(201).json({
        id: row.id,
        startDate: row.start_date,
        endDate: row.end_date,
        createdAt: row.created_at,
      });
    } finally {
      client.release();
    }
  } catch (e) {
    next(e);
  }
});

export default router;
