/**
 * Programming dashboard API: rebalance list, summary, city breakdown; approve/reject actions.
 */
import { Router } from 'express';
import {
  getRebalanceList,
  getSummary,
  getCityBreakdown,
  setRebalanceStatus,
  getCities,
  getTheatres,
} from '../data/programmingStore.js';

const router = Router();

router.get('/cities', (req, res) => {
  res.json(getCities());
});

router.get('/theatres', (req, res) => {
  const list = getTheatres(req.query.city);
  res.json(list);
});

router.get('/rebalance', (req, res) => {
  const list = getRebalanceList(req.query);
  res.json(list);
});

router.get('/summary', (req, res) => {
  const summary = getSummary(req.query);
  res.json(summary);
});

router.get('/city-breakdown', (req, res) => {
  const breakdown = getCityBreakdown(req.query);
  res.json(breakdown);
});

router.patch('/rebalance/:id', (req, res) => {
  const { id } = req.params;
  const { action } = req.body || {};
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action; use approve or reject' });
  }
  const ok = setRebalanceStatus(id, action);
  if (!ok) return res.status(404).json({ message: 'Not found' });
  res.json({ success: true });
});

export default router;
