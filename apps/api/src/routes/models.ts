/**
 * Models listing route
 */

import { Router } from 'express';
import { ProviderRegistry } from '@packages/provider-adapters/src/index.ts';

export const modelsRouter = Router();

modelsRouter.get('/models', async (_req, res) => {
  const registry = new ProviderRegistry();
  const models = registry.getAllModels();

  res.json({
    models,
    defaultModelId: 'gemini-3.8-flash',
  });
});
