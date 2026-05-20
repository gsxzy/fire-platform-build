/**
 * ═══════════════════════════════════════════════════════════════════
 * 轻量 API 概览生成器 — 基于 Express Router 扫描
 * 零依赖替代 Swagger，自动生成路由列表供 /docs 展示
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Application } from 'express';
export interface ApiEndpoint {
    method: string;
    path: string;
    middlewares: string[];
}
/**
 * 递归扫描 Express 应用的所有路由
 */
export declare function scanRoutes(app: Application): ApiEndpoint[];
/**
 * 按模块分组路由
 */
export declare function groupByModule(endpoints: ApiEndpoint[]): Record<string, ApiEndpoint[]>;
/**
 * 生成 Markdown 格式的 API 文档
 */
export declare function generateApiMarkdown(endpoints: ApiEndpoint[]): string;
//# sourceMappingURL=apiDocs.d.ts.map