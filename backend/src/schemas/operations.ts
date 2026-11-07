import { PaymentStatus } from '@prisma/client';
import { z } from 'zod';

const idSchema = z.string().trim().min(1).max(64);
const positiveNumber = z.coerce.number().finite().positive();
const nonNegativeNumber = z.coerce.number().finite().nonnegative();

const detailBaseSchema = z.object({
  productId: idSchema,
  quantity: z.coerce.number().int().positive().max(1_000_000),
});

export const purchaseSchema = z.object({
  supplierId: idSchema,
  date: z.coerce.date().optional(),
  details: z.array(detailBaseSchema.extend({ unitCost: positiveNumber })).min(1).max(100),
}).strict();

export const saleSchema = z.object({
  clientId: idSchema,
  paymentStatus: z.nativeEnum(PaymentStatus),
  paidAmount: nonNegativeNumber.default(0),
  date: z.coerce.date().optional(),
  details: z.array(detailBaseSchema.extend({ unitPrice: positiveNumber })).min(1).max(100),
}).strict();

export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
