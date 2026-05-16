/**
 * 统一日志工具
 * - 开发环境输出详细日志
 * - 生产环境仅输出错误日志
 */
const isDev = import.meta.env.NODE_ENV === 'development';

export const logger = {
  /** 信息日志 - 仅开发环境输出 */
  info: (...args: unknown[]) => {
    if (isDev) console.info('[INFO]', ...args);
  },

  /** 警告日志 - 仅开发环境输出 */
  warn: (...args: unknown[]) => {
    if (isDev) console.warn('[WARN]', ...args);
  },

  /** 错误日志 - 始终输出 */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },

  /** 调试日志 - 仅开发环境输出 */
  debug: (...args: unknown[]) => {
    if (isDev) console.debug('[DEBUG]', ...args);
  },
};