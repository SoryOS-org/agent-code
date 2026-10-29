/**
 * Web Fetch Tool
 * Fetches content from a URL or API endpoint.
 */

export const fetchTool = {
  name: 'fetch',
  description: 'Extraire le contenu texte ou JSON d\'une URL Web.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'L\'URL complète à récupérer (ex: https://api.github.com).' },
    },
    required: ['url'],
  },
  execute: async (args: Record<string, unknown>) => {
    const url = (args.url as string) || '';
    try {
      const response = await fetch(url);
      const text = await response.text();
      return {
        url,
        status: response.status,
        content: text.slice(0, 10000), // cap length
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { url, status: 500, error: msg };
    }
  },
};
