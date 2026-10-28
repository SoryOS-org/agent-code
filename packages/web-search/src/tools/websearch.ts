/**
 * websearch tool: Performs live web search and returns structured results
 * Conforms to OpenCode's websearch tool format and the project's ToolDefinition contract
 */

import type { SearchProvider, WebSearchResponse } from '../types/index.ts';
import { getDefaultSearchProvider, formatOpenCodeSearchResults } from '../providers/index.ts';

export interface WebSearchToolArgs {
  query: string;
  numResults?: number;
  type?: 'auto' | 'neural' | 'keyword';
}

export function createWebSearchTool(provider: SearchProvider = getDefaultSearchProvider()) {
  return {
    name: 'websearch',
    description:
      'Search the web using OpenCode native search integration. Use this for current information beyond knowledge cutoff. Returns structured results with title, url, excerpts, and clickable markdown citations.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Web search query or keywords.',
        },
        numResults: {
          type: 'number',
          description: 'Number of results to return (1-10, default: 5).',
        },
        type: {
          type: 'string',
          enum: ['auto', 'neural', 'keyword'],
          description: 'Search mode: auto, neural semantic, or keyword.',
        },
      },
      required: ['query'],
    },
    execute: async (args: Record<string, unknown>): Promise<(WebSearchResponse & { content: string }) | { error: string }> => {
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      if (!query) {
        return { error: 'Le paramètre "query" est requis et ne peut pas être vide.' };
      }

      const numResults = typeof args.numResults === 'number' ? args.numResults : 5;
      const type = (args.type === 'neural' || args.type === 'keyword' || args.type === 'auto')
        ? args.type
        : 'auto';

      try {
        const response = await provider.search({
          query,
          numResults,
          type,
        });

        const content = formatOpenCodeSearchResults(response);

        return {
          ...response,
          content,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          error: `Erreur lors de la recherche Web: ${message}`,
        };
      }
    },
  };
}
