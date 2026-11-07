import 'dotenv/config';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { app } from '../src/app';
import { prisma } from '../src/lib/prisma';

const integration = describe.skipIf(!process.env.DATABASE_URL);
const agent = request.agent(app);

integration('flujo integrado de operaciones', () => {
  beforeAll(async () => {
    await agent.post('/api/auth/login').send({ username: 'admin', password: 'Demo1234!' });
  });

  it('conecta login, compra, inventario y venta en una operación real', async () => {
    const [products, suppliers, clients] = await Promise.all([
      agent.get('/api/products'),
      agent.get('/api/suppliers'),
      agent.get('/api/clients'),
    ]);
    const product = products.body.find((item: { stock: number }) => item.stock > 0);
    const before = product.stock;
    const purchase = await agent.post('/api/purchases').set('Idempotency-Key', randomUUID()).send({ supplierId: suppliers.body[0].id, details: [{ productId: product.id, quantity: 1, unitCost: product.purchasePrice }] });
    expect(purchase.status).toBe(201);
    const afterPurchase = (await agent.get('/api/products')).body.find((item: { id: string }) => item.id === product.id).stock;
    expect(afterPurchase).toBe(before + 1);
    const sale = await agent.post('/api/sales').set('Idempotency-Key', randomUUID()).send({ clientId: clients.body[0].id, paymentStatus: 'PENDIENTE', details: [{ productId: product.id, quantity: 1, unitPrice: product.salePrice }] });
    expect(sale.status).toBe(201);
    const afterSale = (await agent.get('/api/products')).body.find((item: { id: string }) => item.id === product.id).stock;
    expect(afterSale).toBe(before);
  });

  it('rechaza una venta que supera el stock', async () => {
    const [products, clients] = await Promise.all([agent.get('/api/products'), agent.get('/api/clients')]);
    const product = products.body[0];
    const response = await agent.post('/api/sales').set('Idempotency-Key', randomUUID()).send({ clientId: clients.body[0].id, paymentStatus: 'PENDIENTE', details: [{ productId: product.id, quantity: 99999, unitPrice: product.salePrice }] });
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('Stock insuficiente');
  });

  it('procesa una venta repetida una sola vez y rechaza cambios en la misma clave', async () => {
    const [products, clients] = await Promise.all([agent.get('/api/products'), agent.get('/api/clients')]);
    const product = products.body.find((item: { stock: number }) => item.stock > 0);
    expect(product).toBeTruthy();
    const input = { clientId: clients.body[0].id, paymentStatus: 'PENDIENTE', details: [{ productId: product.id, quantity: 1, unitPrice: product.salePrice }] };
    const key = `e2e-idempotency-${randomUUID()}`;
    const before = product.stock;
    const [first, replay] = await Promise.all([
      agent.post('/api/sales').set('Idempotency-Key', key).send(input),
      agent.post('/api/sales').set('Idempotency-Key', key).send(input),
    ]);
    const changed = await agent.post('/api/sales').set('Idempotency-Key', key).send({ ...input, paidAmount: 1 });
    const after = (await agent.get('/api/products')).body.find((item: { id: string }) => item.id === product.id).stock;

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(replay.body.id).toBe(first.body.id);
    expect(changed.status).toBe(409);
    expect(after).toBe(before - 1);
  });

  afterAll(async () => { await prisma.$disconnect(); });
});
