import { Request } from 'express';
import { RoleName } from '@prisma/client';

export type AuthUser = { id: string; username: string; name: string; role: RoleName };
export type AuthRequest = Request & { user?: AuthUser };
