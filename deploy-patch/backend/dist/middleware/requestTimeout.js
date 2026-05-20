"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestTimeout = requestTimeout;
const logger_1 = __importDefault(require("@/config/logger"));
const DEFAULT_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);
function requestTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
    return (req, res, next) => {
        const timer = setTimeout(() => {
            if (!res.headersSent) {
                logger_1.default.warn(`[RequestTimeout] 请求超时: ${req.method} ${req.path} (${timeoutMs}ms)`);
                res.status(504).json({
                    code: 504,
                    message: '请求处理超时，请稍后重试',
                    timestamp: Date.now(),
                });
            }
        }, timeoutMs);
        res.on('finish', () => clearTimeout(timer));
        res.on('close', () => clearTimeout(timer));
        next();
    };
}
//# sourceMappingURL=requestTimeout.js.map