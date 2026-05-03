import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const SECRET: Secret = process.env.JWT_SECRET || 'default-secret';
const EXPIRES = (process.env.JWT_EXPIRES_IN || '24h') as SignOptions['expiresIn'];

const signOptions = (expiresIn: SignOptions['expiresIn']): SignOptions => ({ expiresIn });

export const signToken = (payload: object) => jwt.sign(payload, SECRET, signOptions(EXPIRES));
export const verifyToken = (token: string) => jwt.verify(token, SECRET);
export const signRefresh = (payload: object) => jwt.sign(payload, SECRET + '_refresh' as Secret, signOptions('7d'));
