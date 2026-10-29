/**
 * Grep Search Tool
 * Searches for text or regular expression patterns in files.
 */

import { runE2BCommand } from '@packages/opencode-e2b/src/e2b-agent-tools.ts';

export const grepTool = {
  name: 'grep',
  description: 'Rechercher un motif ou du texte (grep) dans les fichiers du projet E2B.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Le texte ou l\'expression régulière à rechercher.' },
      path: { type: 'string', description: 'Le dossier ou fichier dans lequel chercher (par défaut .).' },
    },
    required: ['query'],
  },
  execute: async (args: Record<string, unknown>) => {
    const query = (args.query as string) || '';
    const path = (args.path as string) || '.';
    const res = await runE2BCommand(`grep -rn ${JSON.stringify(query)} ${JSON.stringify(path)}`);
    return {
      query,
      path,
      matches: res.stdout || '',
      error: res.stderr || undefined,
      count: res.stdout ? res.stdout.split('\n').filter(Boolean).length : 0,
    };
  },
};
