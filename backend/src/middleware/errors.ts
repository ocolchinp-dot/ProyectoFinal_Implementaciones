import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { IdempotencyError } from '../utils/idempotency';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const requestId = String(res.getHeader('x-request-id') || 'unknown');
  if (error instanceof ZodError) return res.status(400).json({ message: 'Revisa los datos enviados.', issues: error.flatten(), requestId });
  if (error instanceof IdempotencyError) return res.status(error.statusCode).json({ message: error.message, requestId });
  if (error instanceof Error && ['Stock insuficiente', 'El ajuste', 'El abono', 'La cantidad', 'El abono no puede'].some((text) => error.message.includes(text))) return res.status(409).json({ message: error.message, requestId });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ message: 'Ya existe un registro con esos datos.', requestId });
  console.error(JSON.stringify({ level: 'error', type: 'request_error', requestId, message: error instanceof Error ? error.message : 'unknown_error' }));
  return res.status(500).json({ message: 'Ocurrió un error inesperado.', requestId });
}
