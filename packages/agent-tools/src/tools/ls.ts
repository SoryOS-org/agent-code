/**
 * LS Directory List Tool
 * Lists files and subdirectories in a given directory path.
 */

import { runE2BCommand } from '@packages/e2b/src/e2b-agent-tools.ts';

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
    const dirPath = (args.path as string) || '.';
    
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const workspaceRoot = path.join(process.cwd(), 'workspace');
      const fullPath = path.join(workspaceRoot, dirPath);

      // Security
      if (!fullPath.startsWith(workspaceRoot)) {
        return { success: false, message: 'Accès hors workspace non autorisé.' };
      }

      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const output = entries.map(e => `${e.isDirectory() ? 'd' : 'f'} ${e.name}`).join('\n');
      
      return {
        path: dirPath,
        output: output || '(dossier vide)',
        success: true,
      };
    } catch (err: any) {
      // Fallback to E2B
      const res = await runE2BCommand(`ls -la ${JSON.stringify(dirPath)}`);
      return {
        path: dirPath,
        output: res.stdout || '',
        error: res.stderr || undefined,
        success: res.exitCode === 0,
      };
    }
  },
};
