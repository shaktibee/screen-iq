/**
 * Programme (scheduling) API: regions, states, locations, theatres, movies; create programme.
 */
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/connection.js';

const router = Router();

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
