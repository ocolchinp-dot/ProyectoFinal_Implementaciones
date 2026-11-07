import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RoleName, MovementType, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env';

if (config.NODE_ENV === 'production') throw new Error('El seed demo está bloqueado en producción.');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const permissions = ['dashboard.view', 'clients.manage', 'suppliers.manage', 'products.manage', 'inventory.manage', 'purchases.manage', 'sales.manage', 'reports.view', 'audit.view', 'users.manage'];
  for (const code of permissions) await prisma.permission.upsert({ where: { code }, update: {}, create: { code, label: code.replace('.', ' / ') } });
  const roleLabels: Record<RoleName, string> = { ADMIN: 'Administrador', VENTAS: 'Ventas', BODEGA: 'Bodega', GERENCIA: 'Consulta / Gerencia' };
  const roles = {} as Record<RoleName, { id: string }>;
  for (const name of Object.values(RoleName)) roles[name] = await prisma.role.upsert({ where: { name }, update: { label: roleLabels[name] }, create: { name, label: roleLabels[name] } });
  for (const name of Object.values(RoleName)) {
    const allowed = name === 'ADMIN' ? permissions : name === 'VENTAS' ? ['dashboard.view', 'clients.manage', 'sales.manage', 'reports.view'] : name === 'BODEGA' ? ['dashboard.view', 'suppliers.manage', 'products.manage', 'inventory.manage', 'purchases.manage', 'reports.view'] : ['dashboard.view', 'reports.view', 'audit.view'];
    for (const code of allowed) { const p = await prisma.permission.findUniqueOrThrow({ where: { code } }); await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: roles[name].id, permissionId: p.id } }, update: {}, create: { roleId: roles[name].id, permissionId: p.id } }); }
  }
  const passwordHash = await bcrypt.hash('Demo1234!', 12);
  for (const data of [{ username: 'admin', name: 'Ana Morales', role: 'ADMIN' as RoleName }, { username: 'ventas', name: 'Carlos López', role: 'VENTAS' as RoleName }, { username: 'bodega', name: 'María Pérez', role: 'BODEGA' as RoleName }, { username: 'gerencia', name: 'Jorge Castillo', role: 'GERENCIA' as RoleName }]) await prisma.user.upsert({ where: { username: data.username }, update: {}, create: { username: data.username, name: data.name, passwordHash, roleId: roles[data.role].id } });
  const categories = ['Abarrotes', 'Bebidas', 'Limpieza', 'Cuidado personal'];
  const categoryMap: Record<string, string> = {};
  for (const name of categories) categoryMap[name] = (await prisma.category.upsert({ where: { name }, update: {}, create: { name } })).id;
  const products = [
    ['AB-001', 'Arroz blanco 5 lb', 'Abarrotes', 24.5, 31.0, 24], ['AB-002', 'Frijol negro 2 lb', 'Abarrotes', 16.5, 22.0, 20], ['AB-003', 'Azúcar estándar 5 lb', 'Abarrotes', 20.0, 27.0, 15], ['AB-004', 'Aceite vegetal 800 ml', 'Abarrotes', 14.0, 19.5, 18], ['BE-001', 'Agua pura 600 ml', 'Bebidas', 2.4, 4.0, 40], ['BE-002', 'Gaseosa cola 2.5 L', 'Bebidas', 12.0, 17.0, 12], ['BE-003', 'Jugo de naranja 1 L', 'Bebidas', 9.0, 14.0, 10], ['LI-001', 'Detergente en polvo 1 kg', 'Limpieza', 21.0, 29.5, 10], ['LI-002', 'Cloro 1 galón', 'Limpieza', 18.0, 25.0, 8], ['LI-003', 'Esponja multiusos', 'Limpieza', 4.5, 7.0, 20], ['CP-001', 'Jabón de tocador', 'Cuidado personal', 6.0, 9.0, 15], ['CP-002', 'Pasta dental 90 g', 'Cuidado personal', 10.5, 16.0, 12]
  ] as const;
  for (const [code, name, cat, purchasePrice, salePrice, minimumStock] of products) await prisma.product.upsert({ where: { code }, update: {}, create: { code, name, categoryId: categoryMap[cat], purchasePrice, salePrice, minimumStock, stock: 0 } });
  const clients = [{ name: 'Abarrotería El Puente', nit: 'CF-1001', phone: '5550-1001', address: 'Zona 1, Retalhuleu' }, { name: 'Tienda La Bendición', nit: 'CF-1002', phone: '5550-1002', address: 'Zona 3, Retalhuleu' }, { name: 'Comedor Las Palmeras', nit: 'CF-1003', phone: '5550-1003', address: 'San Sebastián' }, { name: 'Mini Súper El Centro', nit: 'CF-1004', phone: '5550-1004', address: 'Zona 1, Retalhuleu' }, { name: 'Hotel Costa Verde', nit: 'CF-1005', phone: '5550-1005', address: 'Champerico' }];
  for (const client of clients) await prisma.client.upsert({ where: { nit: client.nit }, update: {}, create: client });
  const suppliers = [{ name: 'Alimentos del Pacífico, S.A.', nit: 'SUP-2001', phone: '5551-2001' }, { name: 'Distribuidora La Cosecha', nit: 'SUP-2002', phone: '5551-2002' }, { name: 'Comercializadora del Sur', nit: 'SUP-2003', phone: '5551-2003' }, { name: 'Bebidas Regionales', nit: 'SUP-2004', phone: '5551-2004' }, { name: 'Higiene y Hogar GT', nit: 'SUP-2005', phone: '5551-2005' }];
  for (const supplier of suppliers) await prisma.supplier.upsert({ where: { nit: supplier.nit }, update: {}, create: supplier });
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });
  const supplier = await prisma.supplier.findFirstOrThrow();
  const client = await prisma.client.findFirstOrThrow();
  const firstProducts = await prisma.product.findMany({ take: 5, orderBy: { code: 'asc' } });
  if (await prisma.purchase.count() === 0) {
    const purchase = await prisma.purchase.create({ data: { supplierId: supplier.id, userId: admin.id, total: 0, details: { create: firstProducts.map((p, i) => ({ productId: p.id, quantity: 20 + i * 5, unitCost: p.purchasePrice, subtotal: Number(p.purchasePrice) * (20 + i * 5) })) } }, include: { details: true } });
    const total = purchase.details.reduce((sum, d) => sum + Number(d.subtotal), 0); await prisma.purchase.update({ where: { id: purchase.id }, data: { total } });
    for (const d of purchase.details) { const p = await prisma.product.findUniqueOrThrow({ where: { id: d.productId } }); await prisma.product.update({ where: { id: p.id }, data: { stock: p.stock + d.quantity } }); await prisma.inventoryMovement.create({ data: { type: MovementType.ENTRADA, reason: `Compra inicial ${purchase.id}`, quantity: d.quantity, previousStock: p.stock, resultingStock: p.stock + d.quantity, productId: p.id, userId: admin.id } }); }
  }
  if (await prisma.sale.count() === 0) { const p = firstProducts[0]; const quantity = 3; await prisma.sale.create({ data: { clientId: client.id, userId: admin.id, total: Number(p.salePrice) * quantity, paymentStatus: PaymentStatus.PAGADO, details: { create: { productId: p.id, quantity, unitPrice: p.salePrice, subtotal: Number(p.salePrice) * quantity } } } }); const current = await prisma.product.findUniqueOrThrow({ where: { id: p.id } }); await prisma.product.update({ where: { id: p.id }, data: { stock: current.stock - quantity } }); await prisma.inventoryMovement.create({ data: { type: MovementType.SALIDA, reason: 'Venta demo', quantity, previousStock: current.stock, resultingStock: current.stock - quantity, productId: p.id, userId: admin.id } }); }
  console.log('Seed completado. Usuarios demo: admin, ventas, bodega, gerencia / Demo1234!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
