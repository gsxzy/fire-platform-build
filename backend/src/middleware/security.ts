/**
 * ═══════════════════════════════════════════════════════════════════
 * Security Middleware Suite
 * SQL注入预检 + 日志脱敏 + 请求头安全增强
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response, NextFunction } from 'express';
import logger from '@/config/logger';
import { fail } from '@/utils/response';

/* ── SQL 注入检测规则 ── */
const SQL_INJECTION_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,           // 基本引号/注释
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,  // = 后接危险字符
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i, // 'or 变体
  /((\%27)|(\'))union/i,                          // 'union
  /((\%27)|(\'))insert/i,                         // 'insert
  /((\%27)|(\'))delete/i,                         // 'delete
  /((\%27)|(\'))update/i,                         // 'update
  /((\%27)|(\'))drop/i,                           // 'drop
  /exec(\s|\+)+(s|x)p\w+/i,                       // exec xp_
  /UNION\s+SELECT/i,                               // UNION SELECT
  /;\s*SHUTDOWN/i,                                 // SHUTDOWN
  /;\s*DROP\s+TABLE/i,                             // DROP TABLE
];

const SENSITIVE_FIELDS = [
  'password', 'passwd', 'pwd', 'secret', 'token',
  'jwt', 'api_key', 'apikey', 'apiKey', 'authorization',
  'credit_card', 'card_no', 'id_card', 'phone',
  'db_password', 'db_password', 'mysql_password',
  'smtp_pass', 'smtp_pass',
];

/* ── SQL 注入预检中间件 ── */
export function sqlInjectionDetector(req: Request, res: Response, next: NextFunction) {
  const checkValue = (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    const str = decodeURIComponent(value);
    return SQL_INJECTION_PATTERNS.some(p => p.test(str));
  };

  const sources = [
    { name: 'query', data: req.query },
    { name: 'body', data: req.body },
    { name: 'params', data: req.params },
  ];

  for (const source of sources) {
    const values = Object.values(source.data || {});
    for (const v of values) {
      if (Array.isArray(v)) {
        for (const item of v) {
          if (checkValue(item)) {
            logger.warn(`[SECURITY] SQL注入检测: ${req.method} ${req.path} | source=${source.name} | ip=${req.ip}`);
            res.status(403).json(fail('请求包含非法字符，已被安全系统拦截', 403, req.reqId));
            return;
          }
        }
      } else if (checkValue(v)) {
        logger.warn(`[SECURITY] SQL注入检测: ${req.method} ${req.path} | source=${source.name} | ip=${req.ip}`);
        res.status(403).json(fail('请求包含非法字符，已被安全系统拦截', 403, req.reqId));
        return;
      }
    }
  }

  next();
}

/* ── 敏感信息脱敏工具 ── */
function maskSensitive(value: string, keep = 4): string {
  if (value.length <= keep * 2) return '*'.repeat(value.length);
  return value.slice(0, keep) + '*'.repeat(value.length - keep * 2) + value.slice(-keep);
}

/** 深度脱敏对象/数组中的敏感字段 */
export function sanitizeLogData(data: unknown): unknown {
  if (data == null) return data;

  if (typeof data === 'string') {
    // 检测字符串中是否包含敏感字段的值（简单启发式）
    let result = data;
    // 替换可能的 JWT token
    result = result.replace(/Bearer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, 'Bearer ***MASKED***');
    // 替换可能的密码参数
    result = result.replace(/(password|passwd|pwd|secret|token)\s*[:=]\s*[^&\s;]+/gi, '$1=***MASKED***');
    return result;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some(f => lowerKey.includes(f))) {
        if (typeof val === 'string' && val.length > 0) {
          result[key] = maskSensitive(val);
        } else {
          result[key] = '***MASKED***';
        }
      } else {
        result[key] = sanitizeLogData(val);
      }
    }
    return result;
  }

  return data;
}

/* ── 安全响应头增强中间件 ── */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // 禁用 X-Powered-By
  res.removeHeader('X-Powered-By');

  // 内容安全策略 (CSP) — 比 helmet 默认更严格
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );

  // 严格的 Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 权限策略
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  );

  next();
}

/* ── 组合导出 ── */
export default {
  sqlInjectionDetector,
  sanitizeLogData,
  securityHeaders,
};
