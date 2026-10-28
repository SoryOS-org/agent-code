/**
 * User and preferences routes
 */

import { Router } from 'express';
import { db } from '@packages/database/src/index.ts';

export const usersRouter = Router();

usersRouter.get('/me', async (req, res) => {
  const userId = req.user?.id || 'usr_default';
  const user = await db.getUser(userId) || {
    id: userId,
    email: req.user?.email || 'user@aether-ai.local',
    name: req.user?.name || 'Utilisateur',
    createdAt: new Date().toISOString(),
  };

  const preferences = await db.getUserPreferences(userId);
  res.json({ user, preferences });
});

usersRouter.patch('/me/preferences', async (req, res) => {
  const userId = req.user?.id || 'usr_default';
  const updates = req.body || {};

  const preferences = await db.updateUserPreferences(userId, updates);
  res.json({ success: true, preferences });
});
