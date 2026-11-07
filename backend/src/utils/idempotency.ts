import { createHash } from 'node:crypto';
import { IdempotencyStatus, Prisma, PrismaClient } from '@prisma/client';
import { Request } from 'express';
import { z } from 'zod';

const idempotencyKeySchema = z.string().trim().min(8).max(255).regex(/^[A-Za-z0-9._:-]+$/, 'formato inválido');
const idempotencyTtlMs = 24 * 60 * 60 * 1000;

export class IdempotencyError extends Error {
  constructor(public readonly statusCode: 400 | 409, message: string) {
    super(message);
    this.name = 'IdempotencyError';
  }
}

class IdempotencyRaceError extends Error {
  constructor() {
    super('idempotency_race');
    this.name = 'IdempotencyRaceError';
  }
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortObject(item)]));
  }
  return value;
}

export function getIdempotencyKey(req: Request) {
  const value = req.header('Idempotency-Key');
  const parsed = idempotencyKeySchema.safeParse(value);
  if (!parsed.success) throw new IdempotencyError(400, 'Debes enviar un Idempotency-Key válido para esta operación.');
  return parsed.data;
}

export function hashRequest(input: unknown) {
  return createHash('sha256').update(JSON.stringify(sortObject(input))).digest('hex');
}

type IdempotentResult<T> = { response: T; statusCode: number; replay: boolean };

export async function executeIdempotent<T>(params: {
  prisma: PrismaClient;
  userId: string;
  scope: string;
  key: string;
  input: unknown;
  handler: (tx: Prisma.TransactionClient) => Promise<T>;
  statusCode?: number;
}, attempt = 0): Promise<IdempotentResult<T>> {
  const requestHash = hashRequest(params.input);
  return params.prisma.$transaction(async (tx) => {
    const now = new Date();
    const existing = await tx.idempotencyKey.findUnique({ where: { userId_key_scope: { userId: params.userId, key: params.key, scope: params.scope } } });

    if (existing && existing.expiresAt <= now) {
      await tx.idempotencyKey.delete({ where: { id: existing.id } });
    } else if (existing) {
      if (existing.requestHash !== requestHash) throw new IdempotencyError(409, 'La misma clave fue utilizada con datos diferentes.');
      if (existing.status === IdempotencyStatus.COMPLETED && existing.response !== null && existing.statusCode !== null) {
        return { response: existing.response as T, statusCode: existing.statusCode, replay: true };
      }
      throw new IdempotencyError(409, 'La solicitud con esta clave todavía está siendo procesada.');
    }

    try {
      await tx.idempotencyKey.create({ data: { key: params.key, scope: params.scope, userId: params.userId, requestHash, expiresAt: new Date(now.getTime() + idempotencyTtlMs) } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new IdempotencyRaceError();
      throw error;
    }
    const result = await params.handler(tx);
    const response = JSON.parse(JSON.stringify(result)) as T;
    await tx.idempotencyKey.update({ where: { userId_key_scope: { userId: params.userId, key: params.key, scope: params.scope } }, data: { status: IdempotencyStatus.COMPLETED, statusCode: params.statusCode ?? 201, response: response as Prisma.InputJsonValue } });
    return { response, statusCode: params.statusCode ?? 201, replay: false };
  }).catch((error: unknown) => {
    if (error instanceof IdempotencyRaceError && attempt === 0) return executeIdempotent(params, 1);
    throw error;
  });
}
