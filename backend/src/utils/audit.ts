import { Prisma, PrismaClient } from '@prisma/client';

export async function audit(prisma: PrismaClient | Prisma.TransactionClient, data: { action: string; module: string; reference?: string; userId?: string; metadata?: object }) {
  await prisma.auditLog.create({ data });
}
