/**
 * WebSearch Router
 * Mirrors OpenCode server handlers for /api/websearch and /v1/websearch
 * Provides remote web search service without requiring user API keys
 */

import { Router } from 'express';
import { remoteWebSearchService } from '@packages/web-service/src/index.ts';

export const websearchRouter = Router();

/**
 * GET /api/websearch/providers or /v1/websearch/providers
 * Returns list of search providers and availability status
 */
websearchRouter.get('/websearch/providers', (_req, res) => {
  const providers = remoteWebSearchService.getProviders();
  res.json({
    providers,
    default: 'duckduckgo',
  });
});

/**
 * POST /api/websearch or /v1/websearch
 * Execute remote websearch with zero user key requirement
 */
websearchRouter.post('/websearch', async (req, res) => {
  const { query, providerID, limit } = req.body || {};

  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      error: {
        code: 'INVALID_QUERY',
        message: 'Le paramètre "query" est requis.',
      },
    });
  }

  try {
    const searchResponse = await remoteWebSearchService.search({
      query,
      providerID,
      limit: typeof limit === 'number' ? limit : 5,
    });

    res.json(searchResponse);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: {
        code: 'WEBSEARCH_ERROR',
        message: `Erreur lors de la recherche Web distante : ${msg}`,
      },
    });
  }
});
