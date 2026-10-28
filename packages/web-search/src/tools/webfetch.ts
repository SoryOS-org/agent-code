/**
 * webfetch tool: Fetches and extracts readable text/markdown from a specific URL
 * Conforms to OpenCode's webfetch tool specification and the project's ToolDefinition contract
 */

import type { WebFetchOptions, WebFetchResponse } from '../types/index.ts';
import { sanitizeAndValidateUrl, safeFetch } from '../utils/http.ts';
import { cleanHtmlToMarkdown } from '../utils/clean-html.ts';
import { OPENCODE_USER_AGENT } from '../providers/mcp.ts';

export function createWebFetchTool() {
  return {
    name: 'webfetch',
    description:
      'Fetch content from an HTTP or HTTPS URL and return it as text, markdown, or HTML. Markdown is the default. Replicates OpenCode native webfetch behavior.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The HTTP or HTTPS URL to fetch content from.',
        },
        format: {
          type: 'string',
          enum: ['markdown', 'text', 'html'],
          description: 'The format to return content in. Defaults to markdown.',
        },
        maxCharacters: {
          type: 'number',
          description: 'Maximum number of characters to extract (default: 8000, max: 25000).',
        },
      },
      required: ['url'],
    },
    execute: async (args: Record<string, unknown>): Promise<WebFetchResponse | { error: string }> => {
      const rawUrl = typeof args.url === 'string' ? args.url.trim() : '';
      const validation = sanitizeAndValidateUrl(rawUrl);

      if (!validation.valid || !validation.url) {
        return { error: validation.error || 'URL invalide' };
      }

      const targetUrl = validation.url.toString();
      const format = (args.format === 'text' || args.format === 'html' || args.format === 'markdown')
        ? args.format
        : 'markdown';

      const maxCharacters = Math.min(
        Math.max(typeof args.maxCharacters === 'number' ? args.maxCharacters : 8000, 500),
        25000
      );

      const startTime = Date.now();

      try {
        const acceptHeader =
          format === 'markdown'
            ? 'text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1'
            : format === 'text'
            ? 'text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, */*;q=0.1'
            : 'text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, text/markdown;q=0.7, */*;q=0.1';

        const response = await safeFetch(targetUrl, {
          method: 'GET',
          headers: {
            'User-Agent': OPENCODE_USER_AGENT,
            'Accept': acceptHeader,
            'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
          },
          timeoutMs: 15000,
        });

        if (!response.ok) {
          return {
            error: `Échec de récupération de la page (HTTP ${response.status} ${response.statusText}) pour ${targetUrl}`,
          };
        }

        const contentType = response.headers.get('content-type') || 'text/html';
        const finalUrl = response.url || targetUrl;

        let title = '';
        let content = '';
        let truncated = false;

        const rawBody = await response.text();

        if (format === 'html') {
          title = validation.url.hostname;
          if (rawBody.length > maxCharacters) {
            content = rawBody.slice(0, maxCharacters);
            truncated = true;
          } else {
            content = rawBody;
          }
        } else if (contentType.includes('application/json')) {
          title = `Données JSON (${validation.url.hostname})`;
          if (rawBody.length > maxCharacters) {
            content = rawBody.slice(0, maxCharacters) + '\n... [Tronqué]';
            truncated = true;
          } else {
            content = rawBody;
          }
        } else if (contentType.includes('text/plain') || format === 'text') {
          title = `Texte (${validation.url.hostname})`;
          // Strip basic HTML if format was requested as text from HTML page
          const cleanText = rawBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleanText.length > maxCharacters) {
            content = cleanText.slice(0, maxCharacters) + '\n... [Tronqué]';
            truncated = true;
          } else {
            content = cleanText;
          }
        } else {
          // Standard HTML to clean Markdown extraction
          const parsed = cleanHtmlToMarkdown(rawBody, maxCharacters);
          title = parsed.title || validation.url.hostname;
          content = parsed.markdown;
          truncated = parsed.truncated;
        }

        return {
          url: targetUrl,
          finalUrl,
          title,
          content,
          contentType,
          status: response.status,
          characterCount: content.length,
          latencyMs: Date.now() - startTime,
          truncated,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          error: `Erreur lors de la récupération de la page (${targetUrl}): ${message}`,
        };
      }
    },
  };
}
