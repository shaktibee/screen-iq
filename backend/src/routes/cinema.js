/**
 * Cinema dashboard API (stub).
 */
import { Router } from 'express';
import { getLocations, getTheatres, getSchedule } from '../data/cinemaStore.js';

const router = Router();

router.get('/locations', (req, res) => {
  res.json(getLocations());
});

router.get('/theatres', (req, res) => {
  const list = getTheatres(req.query.locationId);
  res.json(list);
});

router.get('/schedule', (req, res) => {
  const list = getSchedule(req.query.locationId, req.query.date);
  res.json(list);
});

export default router;
