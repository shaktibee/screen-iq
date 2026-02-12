/**
 * ScreenIQ API server — auth, programme (regions/locations/theatres/movies), etc.
 */
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth, requireOrgSafe } from './middleware/auth.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import programmeRoutes from './routes/programme.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/programme', requireAuth, requireOrgSafe, programmeRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`ScreenIQ API listening on port ${config.port}`);
});
