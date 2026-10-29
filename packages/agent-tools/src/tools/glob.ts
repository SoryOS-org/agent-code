/**
 * Glob Pattern Search Tool
 * Lists files matching pattern glob in the E2B Cloud Sandbox.
 */

import { runE2BCommand } from '@packages/opencode-e2b/src/e2b-agent-tools.ts';

export const globTool = {
  name: 'glob',
  description: 'Trouver des fichiers selon un motif glob (ex: *.rs, src/**/*.ts) dans la Sandbox E2B.',
  parameters: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Le motif glob à rechercher (ex: *.py, src/*.ts).' },
      path: { type: 'string', description: 'Le répertoire de recherche (par défaut .).' },
    },
    required: ['pattern'],
  },
  execute: async (args: Record<string, unknown>) => {
    const pattern = (args.pattern as string) || '*';
    const path = (args.path as string) || '.';
    const res = await runE2BCommand(`find ${JSON.stringify(path)} -name ${JSON.stringify(pattern)}`);
    return {
      pattern,
      path,
      files: res.stdout ? res.stdout.split('\n').filter(Boolean) : [],
      error: res.stderr || undefined,
    };
  },
};
