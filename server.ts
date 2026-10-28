/**
 * Full-Stack Application Entry Point
 * Mounts Express API routes and Vite middlewares for development on Port 3000
 */

import { createServer as createViteServer } from 'vite';
import { createApiApp } from './apps/api/src/app.ts';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';

import http from 'http';

dotenv.config();

async function startServer() {
  const app = createApiApp();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProduction) {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    // Development mode: attach Vite dev server middleware and bind HMR to httpServer
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets from dist
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[Aether AI Server] Listening on http://0.0.0.0:${port}`);
    console.log(`[Aether AI Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Aether AI Server] Gemini API Key configured: ${Boolean(process.env.GEMINI_API_KEY)}`);
  });
}

startServer().catch((err) => {
  console.error('[Aether AI Server] Fatal startup error:', err);
  process.exit(1);
});
