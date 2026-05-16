/**
 * 主布局下、面包屑与业务区之间：展示当前页商用功能说明（与注册表子菜单 description 一致）。
 */
import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router';
import { ModuleEngine } from '@/core/platform';
import { getCommercialPageHint } from '@/lib/pageCommercialCopy';

/** 不展示说明的路由（全屏/极简） */
const HIDE_HINT_PATHS = new Set(['/bigscreen']);

export default function PageCommercialHint() {
  const { pathname } = useLocation();
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = ModuleEngine.subscribe(() => setTick(t => t + 1));
    return unsub;
  }, []);

  const hint = useMemo(() => {
    if (HIDE_HINT_PATHS.has(pathname)) return undefined;
    return getCommercialPageHint(pathname);
  }, [pathname]);

  if (!hint) return null;

  return (
    <div className="mb-3 px-1 -mt-1">
      <p className="text-[11px] text-slate-500 leading-relaxed border-l-2 border-blue-500/25 pl-2.5 py-0.5">
        {hint}
      </p>
    </div>
  );
}
