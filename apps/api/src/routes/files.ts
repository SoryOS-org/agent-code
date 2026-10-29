/**
 * File upload and attachment route
 */

import { Router } from 'express';
import { db } from '@packages/database/src/index.ts';

export const filesRouter = Router();

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/javascript',
  'text/typescript',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

filesRouter.post('/files', async (req, res) => {
  const userId = req.user?.id || 'usr_default';
  const { name, mimeType, size, base64Data, conversationId } = req.body || {};

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Le nom du fichier est requis' });
    return;
  }

  if (!mimeType || typeof mimeType !== 'string' || !ALLOWED_MIME_TYPES.has(mimeType)) {
    res.status(400).json({
      error: `Type MIME "${mimeType}" non autorisé. Types acceptés: images, PDF, texte brut, JSON, code.`,
    });
    return;
  }

  if (typeof size === 'number' && size > MAX_FILE_SIZE_BYTES) {
    res.status(400).json({ error: 'La taille du fichier dépasse la limite maximale de 10 Mo' });
    return;
  }

  try {
    const attachment = await db.createAttachment(userId, conversationId || 'conv_temp', {
      name: name.replace(/[^a-zA-Z0-9._-]/g, '_'),
      mimeType,
      size: Number(size) || 0,
      base64Data,
    });

    res.status(201).json({ attachment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors du téléversement';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /workspace/tree
 * Returns workspace file structure like VSCode File Explorer
 */
filesRouter.get('/workspace/tree', async (_req, res) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const rootDir = process.cwd();

    const ignoredDirs = new Set(['.git', 'node_modules', 'dist', '.aistudio', '.turbo']);

    interface FileNode {
      name: string;
      path: string;
      type: 'file' | 'directory';
      children?: FileNode[];
      size?: number;
    }

    async function scanDirectory(dir: string, relativePath = ''): Promise<FileNode[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const nodes: FileNode[] = [];

      // Sort directories first, then alphabetical
      const sorted = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (const entry of sorted) {
        if (ignoredDirs.has(entry.name)) continue;

        const rel = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const children = await scanDirectory(full, rel);
          nodes.push({
            name: entry.name,
            path: rel,
            type: 'directory',
            children,
          });
        } else {
          try {
            const stats = await fs.stat(full);
            nodes.push({
              name: entry.name,
              path: rel,
              type: 'file',
              size: stats.size,
            });
          } catch {
            nodes.push({
              name: entry.name,
              path: rel,
              type: 'file',
            });
          }
        }
      }
      return nodes;
    }

    const tree = await scanDirectory(rootDir);
    res.json({ root: tree });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la lecture de l\'arborescence';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /workspace/file?path=...
 * Reads and returns content of an open file for VS Code style editor
 */
filesRouter.get('/workspace/file', async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath || typeof filePath !== 'string') {
    res.status(400).json({ error: 'Le paramètre "path" est requis' });
    return;
  }

  // Prevent path traversal
  if (filePath.includes('..') || filePath.startsWith('/')) {
    res.status(400).json({ error: 'Chemin relatif non autorisé' });
    return;
  }

  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const fullPath = path.join(process.cwd(), filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    res.json({
      path: filePath,
      content,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Fichier non trouvé';
    res.status(404).json({ error: message });
  }
});
