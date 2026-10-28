/**
 * Unified OpenCode Web Search Orchestrator
 * Implements OpenCode's provider rotation and fallback logic
 * from packages/core/src/websearch.ts
 */

import type { SearchOptions, WebSearchResponse, SearchProvider } from '../types/index.ts';
import { ExaSearchProvider } from './exa.ts';
import { ParallelSearchProvider } from './parallel.ts';
import { FallbackSearchProvider } from './fallback.ts';

export class OpenCodeSearchProvider implements SearchProvider {
  readonly id = 'opencode';
  readonly name = 'OpenCode Native Search (Exa + Parallel + Web)';

  private exa = new ExaSearchProvider();
  private parallel = new ParallelSearchProvider();
  private fallback = new FallbackSearchProvider();

  isConfigured(): boolean {
    return true; // Always usable without API key
  }

  getMissingConfigHelp(): string {
    return 'Le moteur OpenCode fonctionne directement sans clé API. Si souhaité, EXA_API_KEY ou PARALLEL_API_KEY peuvent être définies dans votre environnement.';
  }

  async search(options: SearchOptions): Promise<WebSearchResponse> {
    const startTime = Date.now();
    const errors: string[] = [];

    // 1. First attempt: Exa MCP (OpenCode default provider)
    try {
      const exaResult = await this.exa.search(options);
      if (exaResult.results && exaResult.results.length > 0) {
        return exaResult;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Exa: ${msg}`);
    }

    // 2. Second attempt: Parallel MCP (OpenCode secondary provider)
    try {
      const parallelResult = await this.parallel.search(options);
      if (parallelResult.results && parallelResult.results.length > 0) {
        return parallelResult;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Parallel: ${msg}`);
    }

    // 3. Third attempt: Resilient Web Fallback (DuckDuckGo parser)
    try {
      const fallbackResult = await this.fallback.search(options);
      return {
        ...fallbackResult,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Fallback: ${msg}`);
      throw new Error(`Tous les fournisseurs de recherche ont échoué:\n${errors.join('\n')}`);
    }
  }
}

/**
 * Formats structured search results into OpenCode's LLM Markdown representation
 * Exact format from OpenCode packages/core/src/tool/plugin/websearch.ts:
 * ## [Title](URL)
 * Published: <date>
 * 
 * <Content>
 */
export function formatOpenCodeSearchResults(response: WebSearchResponse): string {
  if (!response.results || response.results.length === 0) {
    return 'Aucun résultat trouvé pour cette recherche.';
  }

  return response.results
    .map((res) => {
      const title = res.title || res.url;
      const published = res.publishedDate ? `\nPublished: ${res.publishedDate}` : '';
      const snippet = res.snippet ? `\n\n${res.snippet}` : '';
      return `## [${title}](${res.url})${published}${snippet}`;
    })
    .join('\n\n');
}
