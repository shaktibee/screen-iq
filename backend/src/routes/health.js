/**
 * Health check for load balancers and monitoring. No auth required.
 */
import { Router } from 'express';
import { pool } from '../db/connection.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(503).json({ ok: false, db: 'disconnected', error: err.message });
  }
});

export default router;
