/**
 * Health check route
 */

import { Router } from 'express';
import { db } from '@packages/database/src/index.ts';
import { ProviderRegistry } from '@packages/provider-adapters/src/index.ts';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const registry = new ProviderRegistry();
  const allProviders = registry.getAll();

  const providersStatus: Record<string, { configured: boolean; modelsCount: number }> = {};
  for (const p of allProviders) {
    providersStatus[p.id] = {
      configured: p.isConfigured(),
      modelsCount: p.getModels().length,
    };
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    activeProvider: process.env.GEMINI_API_KEY ? 'gemini' : 'mock',
    providersStatus,
  });
});
