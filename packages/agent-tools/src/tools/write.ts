/**
 * Write File Tool
 * Creates or updates a file inside the E2B Cloud Sandbox.
 */

import { writeE2BFile } from '@packages/e2b/src/e2b-agent-tools.ts';

export const writeTool = {
  name: 'write',
  description: 'Créer ou modifier un fichier dans le workspace du projet (ex: index.html, style.css, game.js).',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Chemin relatif du fichier dans le projet (ex: index.html, src/app.js, styles.css).' },
      content: { type: 'string', description: 'Contenu complet et textuel du fichier à enregistrer.' },
    },
    required: ['path', 'content'],
  },
  execute: async (args: Record<string, unknown> | string) => {
    let resolvedArgs = args;
    if (typeof args === 'string') {
      try {
        resolvedArgs = JSON.parse(args);
      } catch {
        resolvedArgs = { content: args };
      }
    }

    const dict = (resolvedArgs || {}) as Record<string, unknown>;
    let rawPath = (dict.path || dict.filePath || dict.filename || dict.file || dict.name || dict.targetPath || '') as string;
    let rawContent = (dict.content ?? dict.code ?? dict.file_content ?? dict.text ?? dict.body ?? dict.data ?? '') as string;

    if (!rawPath || typeof rawPath !== 'string' || rawPath.trim().length === 0) {
      // Heuristic fallback if content contains html/css/js
      if (rawContent.includes('<!DOCTYPE') || rawContent.includes('<html')) {
        rawPath = 'index.html';
      } else if (rawContent.includes('function') || rawContent.includes('const ') || rawContent.includes('let ')) {
        rawPath = 'game.js';
      } else {
        return { success: false, message: 'Le chemin du fichier (path) est requis.' };
      }
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const workspaceRoot = path.join(process.cwd(), 'workspace');

      // Normalize path: remove leading slashes and leading workspace/
      let cleanPath = rawPath.trim().replace(/^[/\\]+/, '');
      if (cleanPath.startsWith('workspace/')) {
        cleanPath = cleanPath.slice('workspace/'.length);
      } else if (cleanPath.startsWith('./workspace/')) {
        cleanPath = cleanPath.slice('./workspace/'.length);
      }

      // Prevent path traversal
      const localPath = path.resolve(workspaceRoot, cleanPath);
      if (!localPath.startsWith(workspaceRoot)) {
        return { success: false, message: 'Accès hors du dossier workspace non autorisé.' };
      }

      // Ensure directory exists
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, rawContent, 'utf-8');

      // Synchronize to E2B sandbox if active
      try {
        await writeE2BFile(cleanPath, rawContent);
      } catch {
        // E2B is optional
      }

      const byteLength = Buffer.byteLength(rawContent, 'utf-8');
      return {
        success: true,
        path: cleanPath,
        size: byteLength,
        message: `Fichier "${cleanPath}" (${byteLength} octets) créé et sauvegardé avec succès dans le workspace.`,
      };
    } catch (err: any) {
      return {
        success: false,
        path: rawPath,
        message: `Erreur d'écriture : ${err.message}`,
      };
    }
  },
};
