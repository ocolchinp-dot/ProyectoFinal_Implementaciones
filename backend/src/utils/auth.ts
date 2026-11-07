import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RoleName } from '@prisma/client';
import { AuthUser } from '../types';
import { config } from '../config/env';

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export const signToken = (user: AuthUser) => jwt.sign(user, config.JWT_SECRET, { expiresIn: '8h' });
export const decodeToken = (token: string) => jwt.verify(token, config.JWT_SECRET) as AuthUser;

export const asRole = (value: string): RoleName | undefined =>
  (Object.values(RoleName) as string[]).includes(value) ? (value as RoleName) : undefined;
