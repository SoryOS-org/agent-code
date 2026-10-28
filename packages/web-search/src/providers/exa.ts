/**
 * Exa Search Provider
 * Native OpenCode implementation from packages/core/src/plugin/websearch/exa.ts
 * Uses OpenCode's MCP endpoint (https://mcp.exa.ai/mcp)
 * Operates without requiring an API key, and attaches EXA_API_KEY if supplied
 */

import type { SearchOptions, WebSearchResponse, SearchResultItem, SearchProvider } from '../types/index.ts';
import { SearchProviderError } from './provider.ts';
import { callMcpTool } from './mcp.ts';
import { extractDomain } from '../utils/http.ts';

export const EXA_MCP_ENDPOINT = 'https://mcp.exa.ai/mcp';

export class ExaSearchProvider implements SearchProvider {
  readonly id = 'exa';
  readonly name = 'Exa AI (OpenCode Native MCP)';

  /**
   * In OpenCode, Exa is always configured/usable even without an API key
   * because https://mcp.exa.ai/mcp accepts public MCP queries.
   */
  isConfigured(): boolean {
    return true;
  }

  getMissingConfigHelp(): string {
    return 'Exa fonctionne en mode natif OpenCode sans clé. Pour des quotas professionnels plus élevés, vous pouvez ajouter EXA_API_KEY dans votre fichier .env.';
  }

  async search(options: SearchOptions): Promise<WebSearchResponse> {
    const startTime = Date.now();
    const query = options.query?.trim();

    if (!query) {
      return {
        query: '',
        provider: 'exa',
        results: [],
        totalResults: 0,
        latencyMs: 0,
      };
    }

    const numResults = Math.min(Math.max(options.numResults || 8, 1), 10);

    // If an API key is available in environment, append it as in OpenCode:
    // if (credential?.type === "key") url.searchParams.set("exaApiKey", credential.key)
    const url = new URL(EXA_MCP_ENDPOINT);
    const envKey = process.env.EXA_API_KEY?.trim();
    if (envKey) {
      url.searchParams.set('exaApiKey', envKey);
    }

    try {
      const mcpResult = await callMcpTool({
        url: url.toString(),
        tool: 'web_search_exa',
        arguments: {
          query,
          numResults,
        },
        timeoutMs: 25000,
      });

      const textItem = mcpResult.content?.find((item) => item.text);
      const rawText = textItem ? textItem.text : '';

      const items = parseExaResults(rawText);

      const results: SearchResultItem[] = items.map((item, idx) => ({
        title: item.title || extractDomain(item.url) || `Source ${idx + 1}`,
        url: item.url,
        snippet: item.content || 'Extrait non disponible',
        source: extractDomain(item.url),
        publishedDate: item.time?.published ? new Date(item.time.published).toISOString() : undefined,
      }));

      return {
        query,
        provider: 'exa',
        results,
        totalResults: results.length,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new SearchProviderError(this.name, `Requête Exa MCP échouée: ${msg}`, 'MCP_EXA_ERROR');
    }
  }
}

/**
 * Exact parser from OpenCode packages/core/src/plugin/websearch/exa.ts
 */
export function parseExaResults(text: string): Array<{
  url: string;
  title?: string;
  content?: string;
  time?: { published?: number };
}> {
  if (!text) return [];

  return text.split(/\n\n---\n\n/).flatMap((block) => {
    const url = block.match(/^URL:\s*(.+)$/m)?.[1]?.trim();
    if (!url) return [];

    const title = block.match(/^Title:\s*(.+)$/m)?.[1]?.trim();
    const publishedText = block.match(/^Published:\s*(.+)$/m)?.[1]?.trim();
    const published = publishedText && publishedText !== 'N/A' ? Date.parse(publishedText) : undefined;
    const content = block.match(/^(?:Highlights|Text):\s*\n?([\s\S]*)$/m)?.[1]?.trim();

    return [
      {
        url,
        ...(title && title !== 'N/A' ? { title } : {}),
        ...(content ? { content } : {}),
        time: { ...(published !== undefined && Number.isFinite(published) ? { published } : {}) },
      },
    ];
  });
}
