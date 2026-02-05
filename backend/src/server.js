/**
 * ScreenIQ API server — auth-only (login & signup).
 */
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`ScreenIQ API listening on port ${config.port}`);
});
