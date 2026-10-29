/**
 * WebSearch Tool (OpenCode Spec Compliant)
 * Executes web searches without requiring user API keys via @packages/web-service
 */

import { remoteWebSearchService } from '@packages/web-service/src/index.ts';

export const websearchTool = {
  name: 'websearch',
  description: 'Rechercher des informations récentes sur le Web sans clé API utilisateur.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'La requête de recherche sur le Web.' },
      limit: { type: 'number', description: 'Nombre maximal de résultats (par défaut: 5).' },
    },
    required: ['query'],
  },
  execute: async (args: Record<string, unknown>) => {
    const query = (args.query as string) || '';
    const limit = typeof args.limit === 'number' ? args.limit : 5;

    const res = await remoteWebSearchService.search({ query, limit });
    return {
      provider: res.providerID,
      query: res.query,
      results: res.results,
      count: res.results.length,
      latencyMs: res.latencyMs,
    };
  },
};
