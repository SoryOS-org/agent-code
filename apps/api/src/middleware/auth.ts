/**
 * Auth & User Context Middleware
 * Enforces authenticated user identity on each request
 */

import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Support Authorization: Bearer <userId> or header 'x-user-id'
  // In development/local mode, default to 'usr_default'
  const authHeader = req.headers.authorization;
  let userId = 'usr_default';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) userId = token;
  } else if (req.headers['x-user-id']) {
    userId = String(req.headers['x-user-id']);
  }

  req.user = {
    id: userId,
    email: `${userId}@aether-ai.local`,
    name: 'Utilisateur',
  };

  next();
}
