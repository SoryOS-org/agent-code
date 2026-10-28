/**
 * Parallel Search Provider
 * Native OpenCode implementation from packages/core/src/plugin/websearch/parallel.ts
 * Uses OpenCode's MCP endpoint (https://search.parallel.ai/mcp)
 * Operates without requiring an API key, and attaches PARALLEL_API_KEY if supplied
 */

import type { SearchOptions, WebSearchResponse, SearchResultItem, SearchProvider } from '../types/index.ts';
import { SearchProviderError } from './provider.ts';
import { callMcpTool, OPENCODE_USER_AGENT } from './mcp.ts';
import { extractDomain } from '../utils/http.ts';

export const PARALLEL_MCP_ENDPOINT = 'https://search.parallel.ai/mcp';

export class ParallelSearchProvider implements SearchProvider {
  readonly id = 'parallel';
  readonly name = 'Parallel AI (OpenCode Native MCP)';

  isConfigured(): boolean {
    return true; // Usable without user key via OpenCode's public MCP endpoint
  }

  getMissingConfigHelp(): string {
    return 'Parallel fonctionne en mode natif OpenCode sans clé. Vous pouvez également spécifier PARALLEL_API_KEY dans votre fichier .env.';
  }

  async search(options: SearchOptions): Promise<WebSearchResponse> {
    const startTime = Date.now();
    const query = options.query?.trim();

    if (!query) {
      return {
        query: '',
        provider: 'parallel',
        results: [],
        totalResults: 0,
        latencyMs: 0,
      };
    }

    const envKey = process.env.PARALLEL_API_KEY?.trim();
    const headers: Record<string, string> = {
      'User-Agent': OPENCODE_USER_AGENT,
      ...(envKey ? { Authorization: `Bearer ${envKey}` } : {}),
    };

    try {
      const mcpResult = await callMcpTool({
        url: PARALLEL_MCP_ENDPOINT,
        tool: 'web_search',
        arguments: {
          objective: query,
          search_queries: [query],
        },
        headers,
        timeoutMs: 25000,
      });

      const rawItems = mcpResult.structuredContent?.results || [];

      // If structuredContent was not populated, try parsing text content
      const results: SearchResultItem[] = [];

      if (rawItems.length > 0) {
        for (const item of rawItems) {
          const published = item.publish_date ? Date.parse(item.publish_date) : undefined;
          const snippet = item.excerpts?.length ? item.excerpts.join('\n\n') : '';
          results.push({
            title: item.title || extractDomain(item.url) || 'Résultat de recherche',
            url: item.url,
            snippet: snippet || 'Extrait de page',
            source: extractDomain(item.url),
            publishedDate: published && Number.isFinite(published) ? new Date(published).toISOString() : undefined,
          });
        }
      } else if (mcpResult.content?.length) {
        // Fallback parse if returned as raw text json
        const text = mcpResult.content[0]?.text;
        if (text) {
          try {
            const parsed = JSON.parse(text);
            const list = parsed.results || [];
            for (const item of list) {
              results.push({
                title: item.title || extractDomain(item.url) || 'Résultat',
                url: item.url,
                snippet: Array.isArray(item.excerpts) ? item.excerpts.join('\n\n') : (item.snippet || ''),
                source: extractDomain(item.url),
                publishedDate: item.publish_date || undefined,
              });
            }
          } catch {
            // ignore JSON parse error on text
          }
        }
      }

      return {
        query,
        provider: 'parallel',
        results,
        totalResults: results.length,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new SearchProviderError(this.name, `Requête Parallel MCP échouée: ${msg}`, 'MCP_PARALLEL_ERROR');
    }
  }
}
