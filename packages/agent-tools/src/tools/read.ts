/**
 * Read File Tool
 * Reads the content of a file from E2B Sandbox or workspace.
 */

import { runE2BCommand } from '@packages/opencode-e2b/src/e2b-agent-tools.ts';

export const readTool = {
  name: 'read',
  description: 'Lire le contenu d\'un fichier dans l\'environnement Sandbox E2B.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Le chemin du fichier à lire (ex: src/main.rs, Cargo.toml).' },
    },
    required: ['path'],
  },
  execute: async (args: Record<string, unknown>) => {
    const path = (args.path as string) || '';
    const res = await runE2BCommand(`cat ${JSON.stringify(path)}`);
    return {
      path,
      content: res.stdout || '',
      error: res.stderr || undefined,
      success: res.exitCode === 0,
    };
  },
};
