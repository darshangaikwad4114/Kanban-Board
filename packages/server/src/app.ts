import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import boardRoutes from './routes/boardRoutes';
import listRoutes from './routes/listRoutes';
import cardRoutes from './routes/cardRoutes';
import templateRoutes from './routes/templateRoutes';

/**
 * Builds the Express application without connecting to MongoDB or starting
 * an HTTP listener. Kept separate from `index.ts` so tests (and anything
 * else that needs the app) can import it without side effects.
 */
export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/boards', boardRoutes);
  app.use('/api/lists', listRoutes);
  app.use('/api/cards', cardRoutes);
  app.use('/api/templates', templateRoutes);

  // 404 handler for unknown routes
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { message: 'Not found', code: 'NOT_FOUND', status: 404 },
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

export const app = createApp();
