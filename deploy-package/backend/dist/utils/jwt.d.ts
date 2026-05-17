import 'dotenv/config';
import jwt, { type Secret } from 'jsonwebtoken';
export declare const SECRET: Secret;
export declare const signToken: (payload: object) => string;
export declare const verifyToken: (token: string) => string | jwt.JwtPayload;
/** 登出时解析 accessToken 中的 userId（忽略过期），用于吊销该用户全部 refresh */
export declare function decodeUserIdIgnoreExpiration(token: string): number | null;
//# sourceMappingURL=jwt.d.ts.map