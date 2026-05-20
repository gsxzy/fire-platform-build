"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.signToken = exports.SECRET = void 0;
exports.decodeUserIdIgnoreExpiration = decodeUserIdIgnoreExpiration;
require("dotenv/config");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
if (!process.env.JWT_SECRET) {
    console.error('[JWT] 错误：未设置 JWT_SECRET 环境变量，系统无法启动');
    process.exit(1);
}
exports.SECRET = process.env.JWT_SECRET;
const EXPIRES = (process.env.JWT_EXPIRES_IN || '24h');
const signOptions = (expiresIn) => ({ expiresIn });
const signToken = (payload) => jsonwebtoken_1.default.sign(payload, exports.SECRET, signOptions(EXPIRES));
exports.signToken = signToken;
const verifyToken = (token) => jsonwebtoken_1.default.verify(token, exports.SECRET);
exports.verifyToken = verifyToken;
/** 登出时解析 accessToken 中的 userId（忽略过期），用于吊销该用户全部 refresh */
function decodeUserIdIgnoreExpiration(token) {
    try {
        const d = jsonwebtoken_1.default.verify(token, exports.SECRET, { ignoreExpiration: true });
        return d.userId != null ? Number(d.userId) : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map