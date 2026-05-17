"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.slowRequestWarning = slowRequestWarning;
const logger_1 = __importDefault(require("@/config/logger"));
const SLOW_THRESHOLD_MS = 1000;
function slowRequestWarning(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > SLOW_THRESHOLD_MS) {
            logger_1.default.warn(`[SlowRequest] ${req.method} ${req.originalUrl} 耗时 ${duration}ms`, {
                method: req.method, path: req.originalUrl, duration,
                ip: req.ip, userId: req.user?.userId,
            });
        }
    });
    next();
}
//# sourceMappingURL=slowRequest.js.map