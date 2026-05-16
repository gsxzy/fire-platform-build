/**
 * CORS 配置：
 * - 开发环境未设置 CORS_ORIGIN 时反射 Origin，保持联调便利性
 * - 生产环境必须设置 CORS_ORIGIN，否则拒绝启动（防止 CSRF）
 */
import type { CorsOptions } from 'cors';
import logger from '@/config/logger';

export function getCorsOptions(): CorsOptions {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[SECURITY] ❌ 生产环境必须配置 CORS_ORIGIN，否则存在 CSRF 风险。服务已拒绝启动。');
      process.exit(1);
    }
    return { origin: true, credentials: true };
  }
  const list = raw.split(',').map(s => s.trim()).filter(Boolean);
  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (list.includes('*') || list.includes(origin)) {
        callback(null, true);
        return;
      }
      logger.warn(`[CORS] 拒绝来源: ${origin}`);
      callback(null, false);
    },
  };
}
