import 'dotenv/config';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  console.error('[JWT] 错误：未设置 JWT_SECRET 环境变量，系统无法启动');
  process.exit(1);
}
export const SECRET: Secret = process.env.JWT_SECRET;
const EXPIRES = (process.env.JWT_EXPIRES_IN || '24h') as SignOptions['expiresIn'];

const signOptions = (expiresIn: SignOptions['expiresIn']): SignOptions => ({ expiresIn });

export const signToken = (payload: object) => jwt.sign(payload, SECRET, signOptions(EXPIRES));
export const verifyToken = (token: string) => jwt.verify(token, SECRET);

/** 登出时解析 accessToken 中的 userId（忽略过期），用于吊销该用户全部 refresh */
export function decodeUserIdIgnoreExpiration(token: string): number | null {
  try {
    const d = jwt.verify(token, SECRET, { ignoreExpiration: true } as jwt.VerifyOptions) as { userId?: number };
    return d.userId != null ? Number(d.userId) : null;
  } catch {
    return null;
  }
}
