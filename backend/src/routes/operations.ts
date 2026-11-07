import { Router } from 'express';
import { MovementType, PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { audit } from '../utils/audit';
import { executeIdempotent, getIdempotencyKey } from '../utils/idempotency';
import { purchaseSchema, saleSchema } from '../schemas/operations';
import { recordMovement, saleTotal } from '../services/inventory';

const router = Router();
router.use(authenticate);

router.get('/inventory/movements', async (_req, res, next) => {
  try {
    const items = await prisma.inventoryMovement.findMany({ include: { product: true, user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json(items.map((m) => ({ ...m, product: { ...m.product, purchasePrice: Number(m.product.purchasePrice), salePrice: Number(m.product.salePrice) } })));
  } catch (e) { next(e); }
});

router.post('/inventory/adjustments', authorize('ADMIN', 'BODEGA'), async (req: AuthRequest, res, next) => {
  try {
    const input = z.object({ productId: z.string().trim().min(1).max(64), stock: z.coerce.number().int().nonnegative(), reason: z.string().trim().min(5).max(300) }).strict().parse(req.body);
    const movement = await prisma.$transaction((tx) => recordMovement(tx, { productId: input.productId, userId: req.user!.id, type: MovementType.AJUSTE, quantity: input.stock, reason: input.reason }));
    await audit(prisma, { action: 'AJUSTE_INVENTARIO', module: 'Inventario', reference: movement.id, userId: req.user?.id });
    res.status(201).json(movement);
  } catch (e) { next(e); }
});

router.get('/purchases', async (_req, res, next) => {
  try {
    res.json(await prisma.purchase.findMany({ include: { supplier: true, user: { select: { name: true } }, details: { include: { product: true } } }, orderBy: { date: 'desc' }, take: 100 }));
  } catch (e) { next(e); }
});

router.post('/purchases', authorize('ADMIN', 'BODEGA'), async (req: AuthRequest, res, next) => {
  try {
    const input = purchaseSchema.parse(req.body);
    const result = await executeIdempotent({
      prisma,
      userId: req.user!.id,
      scope: 'POST /purchases',
      key: getIdempotencyKey(req),
      input,
      handler: async (tx) => {
        const total = input.details.reduce((sum, detail) => sum + detail.quantity * detail.unitCost, 0);
        const purchase = await tx.purchase.create({
          data: {
            supplierId: input.supplierId,
            userId: req.user!.id,
            date: input.date,
            total,
            details: { create: input.details.map((detail) => ({ productId: detail.productId, quantity: detail.quantity, unitCost: detail.unitCost, subtotal: detail.quantity * detail.unitCost })) },
          },
          include: { details: true },
        });
        for (const detail of input.details) await recordMovement(tx, { productId: detail.productId, userId: req.user!.id, type: MovementType.ENTRADA, quantity: detail.quantity, reason: `Compra ${purchase.id}` });
        await audit(tx, { action: 'CREAR_COMPRA', module: 'Compras', reference: purchase.id, userId: req.user?.id });
        return purchase;
      },
    });
    res.status(result.statusCode).json(result.response);
  } catch (e) { next(e); }
});

router.get('/sales', async (_req, res, next) => {
  try {
    const items = await prisma.sale.findMany({ include: { client: true, user: { select: { name: true } }, details: { include: { product: true } } }, orderBy: { date: 'desc' }, take: 100 });
    res.json(items);
  } catch (e) { next(e); }
});

router.post('/sales', authorize('ADMIN', 'VENTAS'), async (req: AuthRequest, res, next) => {
  try {
    const input = saleSchema.parse(req.body);
    const result = await executeIdempotent({
      prisma,
      userId: req.user!.id,
      scope: 'POST /sales',
      key: getIdempotencyKey(req),
      input,
      handler: async (tx) => {
        const total = saleTotal(input.details.map((detail) => ({ quantity: detail.quantity, unitPrice: detail.unitPrice })));
        if (input.paidAmount > total) throw new Error('El abono no puede superar el total.');

        const sale = await tx.sale.create({
          data: {
            clientId: input.clientId,
            userId: req.user!.id,
            date: input.date,
            total,
            paidAmount: input.paidAmount,
            paymentStatus: input.paidAmount >= total ? PaymentStatus.PAGADO : input.paidAmount > 0 ? PaymentStatus.PARCIAL : PaymentStatus.PENDIENTE,
            details: { create: input.details.map((detail) => ({ productId: detail.productId, quantity: detail.quantity, unitPrice: detail.unitPrice, subtotal: detail.quantity * detail.unitPrice })) },
          },
          include: { details: true },
        });
        if (input.paidAmount > 0) await tx.payment.create({ data: { saleId: sale.id, userId: req.user!.id, amount: input.paidAmount } });
        for (const detail of input.details) await recordMovement(tx, { productId: detail.productId, userId: req.user!.id, type: MovementType.SALIDA, quantity: detail.quantity, reason: `Venta ${sale.id}` });
        await audit(tx, { action: 'CREAR_VENTA', module: 'Ventas', reference: sale.id, userId: req.user?.id });
        return sale;
      },
    });
    res.status(result.statusCode).json(result.response);
  } catch (e) { next(e); }
});

router.post('/sales/:id/payments', authorize('ADMIN', 'VENTAS'), async (req: AuthRequest, res, next) => {
  try {
    const amount = z.object({ amount: z.coerce.number().finite().positive() }).strict().parse(req.body).amount;
    const sale = await prisma.sale.findUniqueOrThrow({ where: { id: String(req.params.id) } });
    const nextPaid = Number(sale.paidAmount) + amount;
    if (nextPaid > Number(sale.total)) throw new Error('El abono supera el saldo pendiente.');
    const updated = await prisma.$transaction(async (tx) => {
      await tx.payment.create({ data: { saleId: sale.id, userId: req.user!.id, amount } });
      return tx.sale.update({ where: { id: sale.id }, data: { paidAmount: nextPaid, paymentStatus: nextPaid >= Number(sale.total) ? PaymentStatus.PAGADO : PaymentStatus.PARCIAL } });
    });
    await audit(prisma, { action: 'REGISTRAR_ABONO', module: 'Ventas', reference: sale.id, userId: req.user?.id });
    res.json(updated);
  } catch (e) { next(e); }
});

export default router;
