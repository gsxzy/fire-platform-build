"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
exports.errorLogger = errorLogger;
const logger_1 = __importDefault(require("@/config/logger"));
const metrics_1 = require("@/utils/metrics");
function requestLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        metrics_1.metrics.record(req.method, req.path, res.statusCode, duration);
        logger_1.default.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
            method: req.method, path: req.path, status: res.statusCode, duration,
            ip: req.ip, userAgent: req.get('user-agent'), reqId: req.reqId,
            userId: req.user?.userId,
        });
    });
    next();
}
const SENSITIVE_KEYS = ['password', 'newPassword', 'oldPassword', 'token', 'secret', 'apiKey', 'api_key', 'jwt', 'authorization', 'auth'];
function sanitizeBody(body) {
    if (!body || typeof body !== 'object')
        return body;
    const sanitized = Array.isArray(body) ? [...body] : { ...body };
    for (const key of Object.keys(sanitized)) {
        if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk))) {
            sanitized[key] = '***';
        }
        else if (typeof sanitized[key] === 'object') {
            sanitized[key] = sanitizeBody(sanitized[key]);
        }
    }
    return sanitized;
}
function errorLogger(err, req, res, next) {
    logger_1.default.error(`${req.method} ${req.path} - ${err.message}`, {
        stack: err.stack, body: sanitizeBody(req.body), query: req.query, params: req.params,
        ip: req.ip, reqId: req.reqId, userId: req.user?.userId,
    });
    next(err);
}
//# sourceMappingURL=logger.js.map