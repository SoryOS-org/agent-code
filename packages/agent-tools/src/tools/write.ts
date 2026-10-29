/**
 * Write File Tool
 * Creates or updates a file inside the E2B Cloud Sandbox.
 */

import { writeE2BFile } from '@packages/opencode-e2b/src/e2b-agent-tools.ts';

export const writeTool = {
  name: 'write',
  description: 'Créer ou modifier un fichier dans l\'environnement Sandbox E2B.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Chemin du fichier (ex: src/app.py, index.js, Cargo.toml).' },
      content: { type: 'string', description: 'Contenu complet du fichier.' },
    },
    required: ['path', 'content'],
  },
  execute: async (args: Record<string, unknown>) => {
    const path = (args.path as string) || 'file.txt';
    const content = (args.content as string) || '';
    return await writeE2BFile(path, content);
  },
};
