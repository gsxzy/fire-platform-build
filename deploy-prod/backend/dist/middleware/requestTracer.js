"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestTracer = requestTracer;
let reqIdCounter = 0;
function requestTracer(req, res, next) {
    const start = Date.now();
    const reqId = `${Date.now().toString(36)}-${(++reqIdCounter).toString(36)}`;
    req.reqId = reqId;
    res.setHeader('X-Request-Id', reqId);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.on('finish', () => {
        const duration = Date.now() - start;
        // 响应已发送，不能再设置 header，仅用于内部追踪
        res._responseTime = duration;
    });
    next();
}
//# sourceMappingURL=requestTracer.js.map