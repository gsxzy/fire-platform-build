/**
 * CORS 配置：
 * - 开发环境未设置 CORS_ORIGIN 时反射 Origin，保持联调便利性
 * - 生产环境必须设置 CORS_ORIGIN，否则拒绝启动（防止 CSRF）
 */
import type { CorsOptions } from 'cors';
export declare function getCorsOptions(): CorsOptions;
//# sourceMappingURL=corsOptions.d.ts.map