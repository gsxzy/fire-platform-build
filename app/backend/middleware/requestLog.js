/**
 * ═══════════════════════════════════════════════════════════════
 * 请求日志与性能监控中间件
 * ═══════════════════════════════════════════════════════════════
 */
const crypto = require('crypto');

/* ── 请求追踪中间件 ── */
function requestTracer(req, res, next) {
  const id = crypto.randomUUID().slice(0, 8);
  req.reqId = id;
  req.startTime = Date.now();
  next();
}

/* ── 请求日志中间件 ── */
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const size = res.get('Content-Length') || '-';
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(`[${new Date().toISOString()}] [${level}] ${req.reqId || '----'} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms ${size}b ${req.ip}`);
  });
  next();
}

/* ── 慢请求警告中间件 ── */
function slowRequestWarning(thresholdMs = 1000) {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > thresholdMs) {
        console.warn(`[SLOW] ${req.reqId || '----'} ${req.method} ${req.originalUrl} 耗时 ${duration}ms，超过阈值 ${thresholdMs}ms`);
      }
    });
    next();
  };
}

module.exports = { requestTracer, requestLogger, slowRequestWarning };
