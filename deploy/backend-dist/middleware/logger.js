"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
exports.errorLogger = errorLogger;
const logger_1 = __importDefault(require("@/config/logger"));
function requestLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger_1.default.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
            method: req.method, path: req.path, status: res.statusCode, duration,
            ip: req.ip, userAgent: req.get('user-agent'), reqId: req.reqId,
            userId: req.user?.userId,
        });
    });
    next();
}
function errorLogger(err, req, res, next) {
    logger_1.default.error(`${req.method} ${req.path} - ${err.message}`, {
        stack: err.stack, body: req.body, query: req.query, params: req.params,
        ip: req.ip, reqId: req.reqId, userId: req.user?.userId,
    });
    next(err);
}
//# sourceMappingURL=logger.js.map