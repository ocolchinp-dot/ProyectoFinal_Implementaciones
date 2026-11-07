import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/utils/auth';

describe('credenciales', () => {
  it('valida contraseñas usando hash', async () => {
    const hash = await hashPassword('Demo1234!');
    expect(await verifyPassword('Demo1234!', hash)).toBe(true);
    expect(await verifyPassword('incorrecta', hash)).toBe(false);
  });
});
