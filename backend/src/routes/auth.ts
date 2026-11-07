import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { audit } from '../utils/audit';
import { signToken, verifyPassword } from '../utils/auth';
import { AuthRequest } from '../types';
import { authCookieName, authCookieOptions } from '../config/env';

const router = Router();
const loginSchema = z.object({ username: z.string().trim().min(2).max(80), password: z.string().min(6).max(200) });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, skipSuccessfulRequests: true, message: { message: 'Demasiados intentos. Intenta de nuevo más tarde.' } });

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username: input.username }, include: { role: true } });
    if (!user || !user.active || !(await verifyPassword(input.password, user.passwordHash))) return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
    const authUser = { id: user.id, username: user.username, name: user.name, role: user.role.name };
    await audit(prisma, { action: 'INICIO_SESION', module: 'Autenticación', userId: user.id });
    res.cookie(authCookieName, signToken(authUser), authCookieOptions);
    return res.json({ user: authUser });
  } catch (error) { next(error); }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => res.json({ user: req.user }));
router.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (req.user) await audit(prisma, { action: 'CIERRE_SESION', module: 'Autenticación', userId: req.user.id });
    res.clearCookie(authCookieName, { ...authCookieOptions, maxAge: undefined });
    res.json({ message: 'Sesión cerrada.' });
  } catch (error) { next(error); }
});

export default router;
