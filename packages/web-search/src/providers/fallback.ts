/**
 * Fallback Search Provider
 * Provides robust web search when EXA_API_KEY is not yet defined
 * Using public DuckDuckGo search or structured web fallback
 */

import type { SearchOptions, WebSearchResponse, SearchResultItem, SearchProvider } from '../types/index.ts';
import { safeFetch, extractDomain } from '../utils/http.ts';

export class FallbackSearchProvider implements SearchProvider {
  readonly id = 'fallback';
  readonly name = 'Web Fallback (DuckDuckGo)';

  isConfigured(): boolean {
    return true; // Always available without secret key
  }

  async search(options: SearchOptions): Promise<WebSearchResponse> {
    const startTime = Date.now();
    const query = options.query?.trim();

    if (!query) {
      return {
        query: '',
        provider: 'fallback',
        results: [],
        totalResults: 0,
        latencyMs: 0,
      };
    }

    const numResults = Math.min(Math.max(options.numResults || 5, 1), 10);
    const results: SearchResultItem[] = [];

    try {
      // 1. Query DuckDuckGo HTML search
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await safeFetch(ddgUrl, {
        method: 'GET',
        headers: {
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
        timeoutMs: 8000,
        signal: options.signal,
      });

      if (response.ok) {
        const html = await response.text();

        // Extract result blocks
        // <a class="result__snippet" ...>...</a> and <a class="result__url" href="...">...</a>
        const resultBlockRegex = /<div class="result__body">([\s\S]*?)<\/div>/g;
        let match: RegExpExecArray | null;
        let count = 0;

        while ((match = resultBlockRegex.exec(html)) !== null && count < numResults) {
          const block = match[1];

          // Extract title & link
          const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
          const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);

          if (titleMatch) {
            let rawUrl = titleMatch[1];
            // DDG redirects: /l/?uddg=https%3A%2F%2F...
            if (rawUrl.includes('uddg=')) {
              try {
                const uddgParam = new URL(`https://duckduckgo.com${rawUrl}`).searchParams.get('uddg');
                if (uddgParam) rawUrl = decodeURIComponent(uddgParam);
              } catch {
                // leave as is
              }
            }

            const rawTitle = titleMatch[2].replace(/<[^>]+>/g, '').trim();
            const rawSnippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';

            if (rawUrl.startsWith('http')) {
              results.push({
                id: `ddg-${count}-${Date.now()}`,
                url: rawUrl,
                title: rawTitle || `Résultat ${count + 1}`,
                snippet: rawSnippet || 'Extrait non disponible',
                source: extractDomain(rawUrl),
              });
              count++;
            }
          }
        }
      }
    } catch (err: unknown) {
      console.warn('[FallbackSearch] DDG HTML fetch failed, trying DuckDuckGo Instant API:', err);
    }

    // 2. If no results yet, fallback to DuckDuckGo Instant Answers API
    if (results.length === 0) {
      try {
        const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const apiRes = await safeFetch(apiUrl, { timeoutMs: 5000, signal: options.signal });
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.AbstractURL && json.Abstract) {
            results.push({
              id: `ddg-instant-${Date.now()}`,
              url: json.AbstractURL,
              title: json.Heading || query,
              snippet: json.Abstract,
              source: extractDomain(json.AbstractURL),
            });
          }
          if (Array.isArray(json.RelatedTopics)) {
            for (const item of json.RelatedTopics.slice(0, numResults - results.length)) {
              if (item.FirstURL && item.Text) {
                results.push({
                  id: `ddg-rel-${results.length}-${Date.now()}`,
                  url: item.FirstURL,
                  title: item.Text.split(' - ')[0] || query,
                  snippet: item.Text,
                  source: extractDomain(item.FirstURL),
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn('[FallbackSearch] Instant API failed:', e);
      }
    }

    return {
      query,
      provider: 'fallback',
      results,
      totalResults: results.length,
      latencyMs: Date.now() - startTime,
      warning: process.env.EXA_API_KEY
        ? undefined
        : 'EXA_API_KEY non détectée : résultat obtenu via le moteur de secours public.',
    };
  }
}
