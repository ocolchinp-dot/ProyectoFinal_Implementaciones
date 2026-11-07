import { Prisma, PrismaClient, MovementType } from '@prisma/client';

export function calculateNewStock(previous: number, type: MovementType, quantity: number) {
  if (quantity <= 0) throw new Error('La cantidad debe ser mayor que cero.');
  const next = type === MovementType.ENTRADA ? previous + quantity : previous - quantity;
  if (next < 0) throw new Error('Stock insuficiente para completar la operación.');
  return next;
}

export async function recordMovement(tx: PrismaClient | Prisma.TransactionClient, input: { productId: string; userId: string; type: MovementType; quantity: number; reason: string }) {
  if (input.quantity <= 0 && input.type !== MovementType.AJUSTE) throw new Error('La cantidad debe ser mayor que cero.');

  if (input.type === MovementType.AJUSTE) {
    const current = await tx.product.findUnique({ where: { id: input.productId }, select: { id: true, stock: true } });
    if (!current) throw new Error('Producto no encontrado.');
    const updated = await tx.product.update({ where: { id: current.id }, data: { stock: input.quantity } });
    return tx.inventoryMovement.create({ data: {
      type: input.type,
      reason: input.reason,
      quantity: Math.abs(updated.stock - current.stock),
      previousStock: current.stock,
      resultingStock: updated.stock,
      productId: input.productId,
      userId: input.userId,
    }});
  }

  const result = await tx.product.updateMany({
    where: input.type === MovementType.SALIDA
      ? { id: input.productId, stock: { gte: input.quantity } }
      : { id: input.productId },
    data: input.type === MovementType.ENTRADA
      ? { stock: { increment: input.quantity } }
      : { stock: { decrement: input.quantity } },
  });

  if (result.count === 0) {
    const product = await tx.product.findUnique({ where: { id: input.productId }, select: { id: true } });
    if (!product) throw new Error('Producto no encontrado.');
    throw new Error('Stock insuficiente para completar la operación.');
  }

  const updated = await tx.product.findUniqueOrThrow({ where: { id: input.productId }, select: { stock: true } });
  const previousStock = input.type === MovementType.ENTRADA ? updated.stock - input.quantity : updated.stock + input.quantity;
  return tx.inventoryMovement.create({ data: {
    type: input.type,
    reason: input.reason,
    quantity: input.quantity,
    previousStock,
    resultingStock: updated.stock,
    productId: input.productId,
    userId: input.userId,
  }});
}

export function saleTotal(items: Array<{ quantity: number; unitPrice: number }>) {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}
