/**
 * Express Application configuration and route mounting
 */

import express from 'express';
import { authMiddleware } from './middleware/auth.ts';
import { healthRouter } from './routes/health.ts';
import { modelsRouter } from './routes/models.ts';
import { usersRouter } from './routes/users.ts';
import { filesRouter } from './routes/files.ts';
import { conversationsRouter } from './routes/conversations.ts';
import { codeRouter } from './routes/code.ts';

export function createApiApp() {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Security and CORS headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  // Apply Auth / Identity context
  app.use(authMiddleware);

  // Mount API routers under /v1 and /api for compatibility
  const registerRoutes = (prefix: string) => {
    app.use(prefix, healthRouter);
    app.use(prefix, modelsRouter);
    app.use(prefix, usersRouter);
    app.use(prefix, filesRouter);
    app.use(prefix, conversationsRouter);
    app.use(prefix, codeRouter);
  };

  registerRoutes('/v1');
  registerRoutes('/api');

  // Error handling middleware
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API Server Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message,
      },
    });
  });

  return app;
}
