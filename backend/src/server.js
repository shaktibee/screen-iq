/**
 * ScreenIQ API server. Modular structure; middleware and routes mounted here.
 */
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import uploadRoutes from './routes/upload.js';
import showRoutes from './routes/shows.js';
import analyticsRoutes from './routes/analytics.js';
import reportRoutes from './routes/reports.js';
import userManagementRoutes from './routes/userManagement.js';
import regionRoutes from './routes/regions.js';
import cinemaChainRoutes from './routes/cinemaChains.js';
import theaterRoutes from './routes/theaters.js';
import screenRoutes from './routes/screens.js';
import programmingRoutes from './routes/programming.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Public
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);

// Protected API (auth + org middleware applied in each router where needed)
app.use('/api/projects', projectRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userManagementRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/cinema-chains', cinemaChainRoutes);
app.use('/api/theaters', theaterRoutes);
app.use('/api/screens', screenRoutes);
app.use('/api/programming', programmingRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`ScreenIQ API listening on port ${config.port}`);
});
