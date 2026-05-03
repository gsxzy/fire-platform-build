/**
 * ═══════════════════════════════════════════════════════════════════
 * API 兼容层（已废弃）
 * 
 * ⚠️ 此文件仅保留用于兼容旧页面引用。
 *    新代码请直接使用：import { xxxService } from '@/api/services'
 * 
 * 底层实现已统一至 src/api/ 目录。
 * ═══════════════════════════════════════════════════════════════════
 */
export { api } from '@/api/services';
export { legacyApi } from '@/api/services';
export { api as default } from '@/api/services';
