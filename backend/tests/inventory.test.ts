import { describe, expect, it } from 'vitest';
import { calculateNewStock, saleTotal } from '../src/services/inventory';

describe('reglas de inventario y ventas', () => {
  it('actualiza stock con entradas y salidas', () => {
    expect(calculateNewStock(10, 'ENTRADA', 5)).toBe(15);
    expect(calculateNewStock(10, 'SALIDA', 4)).toBe(6);
    expect(() => calculateNewStock(2, 'SALIDA', 3)).toThrow('Stock insuficiente');
  });
  it('calcula correctamente el total de una venta', () => {
    expect(saleTotal([{ quantity: 2, unitPrice: 10.5 }, { quantity: 3, unitPrice: 4 }])).toBe(33);
  });
});
