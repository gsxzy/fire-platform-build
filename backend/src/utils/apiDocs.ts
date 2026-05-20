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
export function scanRoutes(app: Application): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];

  function extract(stack: any[], basePath = '') {
    for (const layer of stack) {
      if (layer.route) {
        // 直接路由层
        const path = basePath + layer.route.path;
        const methods = Object.keys(layer.route.methods).filter(m => layer.route.methods[m]);
        for (const method of methods) {
          endpoints.push({
            method: method.toUpperCase(),
            path,
            middlewares: layer.route.stack.map((l: any) => l.name || 'anonymous').filter((n: string) => n !== 'anonymous'),
          });
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        // 子路由层
        const regexp = layer.regexp?.toString() || '';
        let subPath = basePath;
        // 从正则表达式中提取路径前缀
        const match = regexp.match(/^\/?\^?\\\/([^\\]*)/);
        if (match) {
          subPath = basePath + '/' + match[1];
        }
        extract(layer.handle.stack, subPath);
      }
    }
  }

  if ((app as any)._router?.stack) {
    extract((app as any)._router.stack);
  }

  // 去重并排序
  const seen = new Set<string>();
  return endpoints
    .filter(e => {
      const key = `${e.method} ${e.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      if (a.path !== b.path) return a.path.localeCompare(b.path);
      return a.method.localeCompare(b.method);
    });
}

/**
 * 按模块分组路由
 */
export function groupByModule(endpoints: ApiEndpoint[]): Record<string, ApiEndpoint[]> {
  const groups: Record<string, ApiEndpoint[]> = {};
  for (const ep of endpoints) {
    const parts = ep.path.split('/').filter(Boolean);
    const module = parts[1] || parts[0] || 'root';
    if (!groups[module]) groups[module] = [];
    groups[module].push(ep);
  }
  return groups;
}

/**
 * 生成 Markdown 格式的 API 文档
 */
export function generateApiMarkdown(endpoints: ApiEndpoint[]): string {
  const groups = groupByModule(endpoints);
  let md = '# API 概览\n\n';
  md += `> 自动生成于 ${new Date().toLocaleString('zh-CN')}\n\n`;
  md += `**总接口数**: ${endpoints.length}\n\n`;

  for (const [module, eps] of Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))) {
    md += `## ${module}\n\n`;
    md += '| 方法 | 路径 |\n';
    md += '|------|------|\n';
    for (const ep of eps) {
      const methodBadge = methodBadgeColor(ep.method);
      md += `| ${methodBadge} | \`${ep.path}\` |\n`;
    }
    md += '\n';
  }

  return md;
}

function methodBadgeColor(method: string): string {
  const colors: Record<string, string> = {
    GET: '\x1b[32mGET\x1b[0m',
    POST: '\x1b[34mPOST\x1b[0m',
    PUT: '\x1b[33mPUT\x1b[0m',
    DELETE: '\x1b[31mDELETE\x1b[0m',
    PATCH: '\x1b[35mPATCH\x1b[0m',
  };
  return colors[method] || method;
}
