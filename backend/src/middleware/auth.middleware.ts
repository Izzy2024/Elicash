import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env';
import type { AuthenticatedUser } from '../types/express';

const JWT_SECRET = getJwtSecret();

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Partial<AuthenticatedUser>;

    if (!decoded.userId || !decoded.tenantId || !decoded.role) {
      return res.status(401).json({ message: 'Token inválido o incompleto' });
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
