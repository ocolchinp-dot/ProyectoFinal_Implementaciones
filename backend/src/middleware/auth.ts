import { NextFunction, Response } from 'express';
import { AuthRequest } from '../types';
import { decodeToken } from '../utils/auth';
import { RoleName } from '@prisma/client';
import { authCookieName } from '../config/env';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = req.cookies?.[authCookieName] || (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
  if (!token) return res.status(401).json({ message: 'Sesión requerida.' });
  try {
    req.user = decodeToken(token);
    next();
  } catch {
    return res.status(401).json({ message: 'Sesión inválida o expirada.' });
  }
}

export const authorize = (...roles: RoleName[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: 'No tienes permisos para esta acción.' });
  next();
};
