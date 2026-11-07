import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

router.get('/dashboard', async (_req, res, next) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
    const [salesToday, salesMonth, productCount, clients, pendingSales, recentSales, recentMovements] = await Promise.all([
      prisma.sale.aggregate({ _sum: { total: true }, where: { date: { gte: start } } }),
      prisma.sale.aggregate({ _sum: { total: true }, where: { date: { gte: month } } }),
      prisma.product.count({ where: { active: true } }),
      prisma.client.count({ where: { active: true } }),
      prisma.sale.count({ where: { paymentStatus: 'PENDIENTE' } }),
      prisma.sale.findMany({ include: { client: true }, orderBy: { date: 'desc' }, take: 5 }),
      prisma.inventoryMovement.findMany({ include: { product: true, user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 6 }),
    ]);
    const low = await prisma.$queryRaw<Array<{ id: string; code: string; name: string; stock: number; minimumStock: number }>>`SELECT id, code, name, stock, "minimumStock" FROM "Product" WHERE active = true AND stock <= "minimumStock" ORDER BY stock ASC LIMIT 6`;
    res.json({ kpis: { salesToday: Number(salesToday._sum.total || 0), salesMonth: Number(salesMonth._sum.total || 0), productCount, lowStock: low.length, clients, pendingSales }, lowStock: low, recentSales, recentMovements });
  } catch (e) { next(e); }
});

router.get('/reports', async (req, res, next) => { try { const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().setDate(new Date().getDate() - 30)); const to = req.query.to ? new Date(String(req.query.to)) : new Date(); to.setHours(23, 59, 59, 999); const [sales, purchases, movements] = await Promise.all([prisma.sale.findMany({ where: { date: { gte: from, lte: to } }, include: { client: true, user: { select: { name: true } } }, orderBy: { date: 'desc' } }), prisma.purchase.findMany({ where: { date: { gte: from, lte: to } }, include: { supplier: true, user: { select: { name: true } } }, orderBy: { date: 'desc' } }), prisma.inventoryMovement.findMany({ where: { createdAt: { gte: from, lte: to } }, include: { product: true, user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } })]); res.json({ sales, purchases, movements }); } catch (e) { next(e); } });

router.get('/audit', async (_req, res, next) => { try { res.json(await prisma.auditLog.findMany({ include: { user: { select: { name: true, username: true } } }, orderBy: { createdAt: 'desc' }, take: 100 })); } catch (e) { next(e); } });

export default router;
