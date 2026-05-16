/**
 * 根据当前路径匹配 ModuleRegistry 中最长的菜单前缀，返回商用功能说明（与侧边栏 description 同源）。
 */
import { ModuleEngine } from '@/core/platform';
import type { PlatformModule } from '@/core/platform';

function collectCandidates(pathname: string, mod: PlatformModule): { pathLen: number; description: string } | null {
  if (!mod.menu) return null;
  const menu = mod.menu;
  const children = menu.children;

  if (children?.length) {
    let best: { pathLen: number; description: string } | null = null;
    for (const c of children) {
      if (!c.path) continue;
      if (pathname === c.path || pathname.startsWith(c.path + '/')) {
        const pathLen = c.path.length;
        const description = (c.description || menu.description || mod.description || '').trim();
        if (!description) continue;
        if (!best || pathLen > best.pathLen) best = { pathLen, description };
      }
    }
    return best;
  }

  const p = menu.path || mod.path || '';
  if (p && (pathname === p || pathname.startsWith(p + '/'))) {
    const description = (menu.description ?? mod.description ?? '').trim();
    if (!description) return null;
    return { pathLen: p.length, description };
  }
  return null;
}

/** 返回与当前路由最匹配的菜单商用说明；无则 undefined */
export function getCommercialPageHint(pathname: string): string | undefined {
  const modules = ModuleEngine.getMenuModules();
  let best: { pathLen: number; description: string } | null = null;
  for (const mod of modules) {
    const hit = collectCandidates(pathname, mod);
    if (hit && (!best || hit.pathLen > best.pathLen)) best = hit;
  }
  return best?.description;
}
