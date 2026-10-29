/**
 * Web Fetch Tool (OpenCode Spec Compliant)
 * Fetches content from an HTTP/HTTPS URL and converts it to clean Markdown, Text, or HTML.
 */

import { convertHTMLToMarkdown, extractTextFromHTML } from '@packages/web-search/src/html-converter.ts';

const OPENCODE_USER_AGENT =
  'Mozilla/5.0 (compatible; AetherAI-OpenCode/1.0; +https://aetherai.local)';

export const fetchTool = {
  name: 'fetch',
  description: 'Extraire et convertir le contenu d\'une URL Web en Markdown, Texte ou HTML.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'L\'URL HTTP ou HTTPS à consulter.' },
      format: {
        type: 'string',
        enum: ['markdown', 'text', 'html'],
        description: 'Le format de restitution du contenu (par défaut: markdown).',
      },
    },
    required: ['url'],
  },
  execute: async (args: Record<string, unknown>) => {
    const url = (args.url as string) || '';
    const format = ((args.format as string) || 'markdown') as 'markdown' | 'text' | 'html';

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { error: 'L\'URL doit commencer par http:// ou https://', success: false };
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': OPENCODE_USER_AGENT,
          Accept:
            format === 'markdown'
              ? 'text/markdown, text/html;q=0.9, text/plain;q=0.8'
              : format === 'text'
              ? 'text/plain, text/html;q=0.8'
              : 'text/html, application/xhtml+xml',
        },
      });

      if (!response.ok) {
        return {
          url,
          status: response.status,
          error: `Échec de la requête HTTP (${response.status} ${response.statusText})`,
          success: false,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text();

      let output = rawText;
      if (contentType.includes('text/html')) {
        if (format === 'markdown') {
          output = convertHTMLToMarkdown(rawText);
        } else if (format === 'text') {
          output = extractTextFromHTML(rawText);
        }
      }

      // Limit response length to max 15,000 chars to avoid prompt context overflow
      const maxLen = 15000;
      const isTruncated = output.length > maxLen;
      const finalOutput = isTruncated ? output.slice(0, maxLen) + '\n\n...[Contenu tronqué pour respecter le contexte]' : output;

      return {
        url,
        status: response.status,
        contentType,
        format,
        output: finalOutput,
        isTruncated,
        success: true,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { url, status: 500, error: `Erreur de connexion : ${msg}`, success: false };
    }
  },
};
