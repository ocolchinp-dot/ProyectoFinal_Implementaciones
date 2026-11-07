const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function api<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const method = (options.method || 'GET').toUpperCase();
  if (method === 'POST' && (path === '/sales' || path === '/purchases') && !headers.has('Idempotency-Key')) headers.set('Idempotency-Key', crypto.randomUUID());
  const response = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudo completar la operación.');
  return data as T;
}

export const money = (value: number | string) => `Q ${Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const dateTime = (value: string) => new Date(value).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
