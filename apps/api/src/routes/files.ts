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
