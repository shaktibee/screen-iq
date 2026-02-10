/**
 * Movies API: list movies from DB (uses programme schema if available).
 */
import { Router } from 'express';
import { pool } from '../db/connection.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const q = `SELECT id, title, release_date, language, duration_mins, version, genre
               FROM movies ORDER BY release_date DESC NULLS LAST, title`;
    const r = await pool.query(q);
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

export default router;
