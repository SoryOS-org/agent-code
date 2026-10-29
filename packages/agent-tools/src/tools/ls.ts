/**
 * LS Directory List Tool
 * Lists files and subdirectories in a given directory path.
 */

import { runE2BCommand } from '@packages/opencode-e2b/src/e2b-agent-tools.ts';

export const lsTool = {
  name: 'ls',
  description: 'Lister le contenu d\'un dossier dans la Sandbox E2B.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Le chemin du dossier à lister (par défaut .).' },
    },
  },
  execute: async (args: Record<string, unknown>) => {
    const path = (args.path as string) || '.';
    const res = await runE2BCommand(`ls -la ${JSON.stringify(path)}`);
    return {
      path,
      output: res.stdout || '',
      error: res.stderr || undefined,
      success: res.exitCode === 0,
    };
  },
};
