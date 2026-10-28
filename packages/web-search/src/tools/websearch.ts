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

/**
 * Extracts clean search terms from conversational prompts (e.g. "Fais des recherches sur le web à propos de deepseek harness" -> "deepseek harness")
 */
export function extractCleanSearchQuery(prompt: string): string {
  let cleaned = prompt
    .toLowerCase()
    .replace(/(?:fais|fait|faire|effectue|effectues|effectuer|lance|lances|lancer|cherche|chercher|recherche|rechercher)\s+(?:des\s+)?(?:recherches?|infos?|informations?|actualités?|actualite|news)?\s*(?:sur\s+(?:le\s+web|internet|google|l['\s]actualité)?\s*)?(?:à\s+propos\s+de\s+|au\s+sujet\s+de\s+|sur\s+|concernant\s+|de\s+|ce\s+|cette\s+)?/gi, ' ')
    .replace(/(?:peux-tu|tu\s+peux|s'il\s+te\s+plaît|sil\s+te\s+plaît|svp)\s*/gi, '')
    .trim();

  if (!cleaned || cleaned.length < 2) {
    return prompt;
  }
  return cleaned;
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
      const rawQuery = typeof args.query === 'string' ? args.query.trim() : '';
      if (!rawQuery) {
        return { error: 'Le paramètre "query" est requis et ne peut pas être vide.' };
      }

      const numResults = typeof args.numResults === 'number' ? args.numResults : 5;
      const type = (args.type === 'neural' || args.type === 'keyword' || args.type === 'auto')
        ? args.type
        : 'auto';

      const cleanQuery = extractCleanSearchQuery(rawQuery);

      try {
        let response = await provider.search({
          query: cleanQuery,
          numResults,
          type,
        });

        if ((!response.results || response.results.length === 0) && cleanQuery !== rawQuery) {
          response = await provider.search({
            query: rawQuery,
            numResults,
            type,
          });
        }

        const content = formatOpenCodeSearchResults(response);

        return {
          ...response,
          content,
        };
      } catch (err: unknown) {
        try {
          const response = await provider.search({
            query: rawQuery,
            numResults,
            type,
          });
          const content = formatOpenCodeSearchResults(response);
          return {
            ...response,
            content,
          };
        } catch (innerErr: unknown) {
          const message = innerErr instanceof Error ? innerErr.message : String(innerErr);
          return {
            error: `Erreur lors de la recherche Web: ${message}`,
          };
        }
      }
    },
  };
}
