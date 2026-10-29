/**
 * Remote Web Search Service Engine
 * Inspired by OpenCode packages/core/src/websearch.ts and plugin/provider/opencode.ts
 *
 * Implements native, zero-user-key search with robust fallback pipeline:
 * 1. DuckDuckGo HTML Direct Scraping & Parsing (No key required)
 * 2. DuckDuckGo Instant Answers API (No key required)
 * 3. OpenCode / Public SearXNG Engine Nodes (No key required)
 * 4. Fallback to server-configured EXA_API_KEY (if server operator configured it)
 */

import type {
  RemoteWebSearchQuery,
  RemoteWebSearchResponse,
  RemoteWebSearchResult,
  WebSearchProviderInfo,
} from './types.ts';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export class RemoteWebSearchService {
  private cooldowns = new Map<string, number>();

  /**
   * Return available search providers
   */
  getProviders(): WebSearchProviderInfo[] {
    return [
      { id: 'duckduckgo', name: 'DuckDuckGo (Sans clé)', isAvailable: true, requiresKey: false },
      { id: 'duckduckgo-api', name: 'DuckDuckGo Instant API (Sans clé)', isAvailable: true, requiresKey: false },
      { id: 'searxng', name: 'SearXNG Open Nodes (Sans clé)', isAvailable: true, requiresKey: false },
      { id: 'exa', name: 'Exa Neural Search (Serveur)', isAvailable: Boolean(process.env.EXA_API_KEY), requiresKey: true },
    ];
  }

  /**
   * Primary query method with OpenCode-style fallback and cooldown mechanism
   */
  async search(queryOptions: RemoteWebSearchQuery): Promise<RemoteWebSearchResponse> {
    const startTime = Date.now();
    const query = queryOptions.query?.trim();

    if (!query) {
      return {
        providerID: 'empty',
        results: [],
        query: '',
        latencyMs: 0,
      };
    }

    const limit = Math.min(Math.max(queryOptions.limit || 5, 1), 10);
    const requestedProvider = queryOptions.providerID;

    // 1. If explicit provider requested, attempt it
    if (requestedProvider === 'exa' && process.env.EXA_API_KEY) {
      const exaRes = await this.searchWithExa(query, limit);
      if (exaRes.length > 0) {
        return {
          providerID: 'exa',
          results: exaRes,
          query,
          latencyMs: Date.now() - startTime,
        };
      }
    }

    // 2. Default Zero-Key Strategy: DuckDuckGo HTML Engine
    if (!this.isCoolingDown('duckduckgo')) {
      try {
        const ddgResults = await this.searchDuckDuckGoHTML(query, limit);
        if (ddgResults.length > 0) {
          return {
            providerID: 'duckduckgo',
            results: ddgResults,
            query,
            latencyMs: Date.now() - startTime,
          };
        }
      } catch (err: unknown) {
        this.setCooldown('duckduckgo', 30000); // 30s cooldown on failure
      }
    }

    // 3. Fallback Zero-Key Strategy: DuckDuckGo Instant API
    if (!this.isCoolingDown('duckduckgo-api')) {
      try {
        const ddgApiResults = await this.searchDuckDuckGoAPI(query, limit);
        if (ddgApiResults.length > 0) {
          return {
            providerID: 'duckduckgo-api',
            results: ddgApiResults,
            query,
            latencyMs: Date.now() - startTime,
          };
        }
      } catch {
        this.setCooldown('duckduckgo-api', 30000);
      }
    }

    // 4. Fallback: SearXNG Open Node
    try {
      const searxngResults = await this.searchSearXNG(query, limit);
      if (searxngResults.length > 0) {
        return {
          providerID: 'searxng',
          results: searxngResults,
          query,
          latencyMs: Date.now() - startTime,
        };
      }
    } catch {
      // Continue to final fallback
    }

    // 5. If server has EXA_API_KEY as operator key, try it
    if (process.env.EXA_API_KEY) {
      const exaFallback = await this.searchWithExa(query, limit);
      if (exaFallback.length > 0) {
        return {
          providerID: 'exa',
          results: exaFallback,
          query,
          latencyMs: Date.now() - startTime,
        };
      }
    }

    // Graceful degraded output
    return {
      providerID: 'fallback-empty',
      results: [],
      query,
      latencyMs: Date.now() - startTime,
    };
  }

  private isCoolingDown(provider: string): boolean {
    const until = this.cooldowns.get(provider);
    if (!until) return false;
    if (Date.now() > until) {
      this.cooldowns.delete(provider);
      return false;
    }
    return true;
  }

  private setCooldown(provider: string, durationMs: number) {
    this.cooldowns.set(provider, Date.now() + durationMs);
  }

  /**
   * DuckDuckGo HTML scraping search without API keys
   */
  private async searchDuckDuckGoHTML(query: string, limit: number): Promise<RemoteWebSearchResult[]> {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`DuckDuckGo returned ${res.status}`);
      }

      const html = await res.text();
      const results: RemoteWebSearchResult[] = [];

      // Extract result bodies
      const bodyRegex = /<div class="result__body">([\s\S]*?)<\/div>/g;
      let match: RegExpExecArray | null;

      while ((match = bodyRegex.exec(html)) !== null && results.length < limit) {
        const block = match[1];
        const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
        const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);

        if (titleMatch) {
          let rawUrl = titleMatch[1];
          // Handle duckduckgo redirect wrappers (/l/?uddg=...)
          if (rawUrl.includes('uddg=')) {
            try {
              const parsed = new URL(`https://duckduckgo.com${rawUrl}`);
              const target = parsed.searchParams.get('uddg');
              if (target) rawUrl = decodeURIComponent(target);
            } catch {
              // ignore
            }
          }

          const title = titleMatch[2].replace(/<[^>]+>/g, '').trim();
          const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          if (rawUrl.startsWith('http')) {
            results.push({
              title: title || 'Résultat de recherche',
              url: rawUrl,
              content: snippet,
            });
          }
        }
      }

      return results;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * DuckDuckGo Instant Answers API
   */
  private async searchDuckDuckGoAPI(query: string, limit: number): Promise<RemoteWebSearchResult[]> {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error('DDG API failed');

      const data = await res.json();
      const results: RemoteWebSearchResult[] = [];

      if (data.AbstractText && data.AbstractURL) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL,
          content: data.AbstractText,
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (results.length >= limit) break;
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 50),
              url: topic.FirstURL,
              content: topic.Text,
            });
          }
        }
      }

      return results;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * SearXNG Public Open Node fallback
   */
  private async searchSearXNG(query: string, limit: number): Promise<RemoteWebSearchResult[]> {
    const node = 'https://search.ononoki.org/search';
    const url = `${node}?q=${encodeURIComponent(query)}&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('SearXNG node failed');

      const data = await res.json();
      if (!Array.isArray(data.results)) return [];

      return data.results.slice(0, limit).map((r: any) => ({
        title: r.title || 'Résultat',
        url: r.url,
        content: r.content || '',
        published: r.publishedDate,
      }));
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Exa Neural Search (Server Key Fallback)
   */
  private async searchWithExa(query: string, limit: number): Promise<RemoteWebSearchResult[]> {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) return [];

    try {
      const res = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          query,
          numResults: limit,
          useAutoprompt: true,
          type: 'auto',
          contents: {
            text: { maxCharacters: 1200 },
          },
        }),
      });

      if (!res.ok) return [];

      const data = await res.json();
      if (!Array.isArray(data.results)) return [];

      return data.results.map((r: any) => ({
        title: r.title || query,
        url: r.url,
        content: r.text || r.snippet || '',
        published: r.publishedDate,
        score: r.score,
      }));
    } catch {
      return [];
    }
  }
}

export const remoteWebSearchService = new RemoteWebSearchService();
