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
    const filePath = (args.path as string);
    const content = (args.content as string) || '';

    if (!filePath) {
      return { success: false, message: 'Le chemin du fichier est requis.' };
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const workspaceRoot = path.join(process.cwd(), 'workspace');
      const localPath = path.join(workspaceRoot, filePath);
      
      // Security: Prevent writing outside workspace
      if (!localPath.startsWith(workspaceRoot)) {
        return { success: false, message: 'Accès hors workspace non autorisé.' };
      }

      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, content, 'utf-8');

      // Also attempt to write to E2B for compatibility with execution tools
      try {
        await writeE2BFile(filePath, content);
      } catch (e2bErr) {
        console.warn('Failed to sync to E2B:', e2bErr);
      }

      return {
        success: true,
        path: filePath,
        message: `Fichier "${filePath}" créé et sauvegardé localement dans le workspace.`,
      };
    } catch (err: any) {
      return {
        success: false,
        path: filePath,
        message: `Erreur d'écriture : ${err.message}`,
      };
    }
  },
};
