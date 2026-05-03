/**
 * ═══════════════════════════════════════════════════════════════
 * JWT 认证中间件
 * ═══════════════════════════════════════════════════════════════
 */
const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');
const { getJwtSecret } = require('../config/database');

const _jwtSecret = getJwtSecret();

/* ── JWT 认证中间件 ── */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json(fail('未授权', 401));
  jwt.verify(token, _jwtSecret, { 
    algorithms: ['HS256'],
    issuer: 'fire-platform' 
  }, (err, user) => {
    if (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(401).json(fail(isExpired ? 'Token 已过期' : 'Token 无效', 401));
    }
    req.user = user;
    next();
  });
}

/* ── 统一 JWT 认证（排除公开路由） ── */
const PUBLIC_PATHS = [
  '/health',
  '/auth/login',
  '/auth/register',
  '/auth/refresh',   // 刷新接口公开，用于换取新 accessToken
  '/auth/logout',    // 登出接口公开，允许未登录状态调用
  '/fscn8001/push',
];

function authMiddleware(req, res, next) {
  if (PUBLIC_PATHS.some(p => req.path === p || req.path.startsWith(p + '/'))) {
    return next();
  }
  return authenticateToken(req, res, next);
}

module.exports = { authenticateToken, authMiddleware, _jwtSecret };
