/**
 * Read File Tool
 * Reads the content of a file from E2B Sandbox or workspace.
 */

import { runE2BCommand } from '@packages/e2b/src/e2b-agent-tools.ts';

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
    const filePath = (args.path as string);
    if (!filePath) {
      return { success: false, message: 'Le chemin du fichier est requis.' };
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const workspaceRoot = path.join(process.cwd(), 'workspace');
      const fullPath = path.join(workspaceRoot, filePath);

      // Security
      if (!fullPath.startsWith(workspaceRoot)) {
        return { success: false, message: 'Accès hors workspace non autorisé.' };
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      return {
        path: filePath,
        content,
        success: true,
      };
    } catch (err: any) {
      // Fallback to E2B if not found locally (maybe created via shell in E2B?)
      try {
        const res = await runE2BCommand(`cat ${JSON.stringify(filePath)}`);
        return {
          path: filePath,
          content: res.stdout || '',
          error: res.exitCode !== 0 ? res.stderr : undefined,
          success: res.exitCode === 0,
        };
      } catch (e2bErr: any) {
        return {
          path: filePath,
          error: `Fichier non trouvé localement ni dans E2B : ${err.message}`,
          success: false,
        };
      }
    }
  },
};
