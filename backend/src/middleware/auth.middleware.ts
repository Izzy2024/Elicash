import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env';
import { prisma } from '../lib/prisma';
import type { AuthTokenPayload } from '../types/express';

const JWT_SECRET = getJwtSecret();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Partial<AuthTokenPayload>;

    if (!decoded.userId || !decoded.tenantId || !decoded.role) {
      return res.status(401).json({ message: 'Token inválido o incompleto' });
    }

    // Reject tokens issued before the user's last password reset (or for deleted users).
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { tokenVersion: true }
    });

    if (!user || (decoded.tokenVersion ?? 0) !== user.tokenVersion) {
      return res.status(401).json({ message: 'Sesión expirada. Inicia sesión de nuevo.' });
    }

    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    next();
  };
};
