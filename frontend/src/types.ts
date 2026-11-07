export type User = { id: string; username: string; name: string; role: 'ADMIN' | 'VENTAS' | 'BODEGA' | 'GERENCIA' };
export type Product = { id: string; code: string; name: string; stock: number; minimumStock: number; salePrice: number; purchasePrice: number; categoryId?: string; description?: string; unit?: string; category?: { name: string }; lowStock?: boolean };
export type Client = { id: string; name: string; nit?: string; phone?: string; email?: string; address?: string; notes?: string };
export type Supplier = Client;
