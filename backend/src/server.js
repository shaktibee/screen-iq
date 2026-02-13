/**
 * ScreenIQ API server — auth, programme (regions/locations/theatres/movies), etc.
 */
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth, requireOrgSafe } from './middleware/auth.js';
import healthRoutes from './routes/health.js';
import reportRoutes from './routes/reports.js';
import cinemaRoutes from './routes/cinema.js';
import programmingRoutes from './routes/programming.js';
import authRoutes from './routes/auth.js';
import programmeRoutes from './routes/programme.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/health', healthRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/cinema', cinemaRoutes);
app.use('/api/programming', programmingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/programme', requireAuth, requireOrgSafe, programmeRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`ScreenIQ API listening on port ${config.port}`);
});
