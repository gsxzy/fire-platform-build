/**
 * ═══════════════════════════════════════════════════════════════════
 * TDengine 时序数据库连接配置
 * 采用 REST API 方式连接，避免 C 语言驱动依赖
 * ═══════════════════════════════════════════════════════════════════
 */

export const TDENGINE_URL = process.env.TDENGINE_URL || 'http://127.0.0.1:6041';
export const TDENGINE_DB = process.env.TDENGINE_DB || 'fire_platform_ts';
export const TDENGINE_USER = process.env.TDENGINE_USER || 'root';
export const TDENGINE_PASSWORD = process.env.TDENGINE_PASSWORD || 'taosdata';
