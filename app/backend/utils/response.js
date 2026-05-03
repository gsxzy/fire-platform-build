/**
 * ═══════════════════════════════════════════════════════════════
 * 统一 API 响应格式与错误处理
 * ═══════════════════════════════════════════════════════════════
 */

const isProduction = process.env.NODE_ENV === 'production';

/* ── 通用响应包装 ── */
function success(data = null, msg = 'success') {
  return { code: 200, msg, data };
}

function fail(msg = 'error', code = 500) {
  return { code, msg, data: null };
}

/* ── 统一错误处理 ── */
function handleError(res, err, req, label) {
  console.error(`[${req.reqId || 'unknown'}] ${label}:`, err);
  const message = isProduction ? '服务器内部错误' : (err.message || '服务器内部错误');
  const status = err.status || err.statusCode || 500;
  res.status(status).json(fail(message, status));
}

/* ── API 响应增强中间件 ── */
function responseEnhancer(req, res, next) {
  // 添加响应缓存控制头（默认不缓存API）
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // 包装 json 方法，自动添加请求ID
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    if (data && typeof data === 'object' && !data._reqId) {
      data._reqId = req.reqId;
    }
    return originalJson(data);
  };
  
  next();
}

module.exports = { success, fail, handleError, responseEnhancer };
