/**
 * ═══════════════════════════════════════════════════════════════════
 * 模块配置中心 - 23个业务模块可视化开关管理
 * 一键启用/禁用，配置实时生效，无需重启
 * ═══════════════════════════════════════════════════════════════════
 */
import { useState, useLayoutEffect, useCallback } from 'react';
import { ModuleEngine, CATEGORY_LABELS } from '@/core/platform';
import { useToast } from '@/core/ToastContext';
import {
  ToggleRight, ToggleLeft, RefreshCw, Database, Server,
  Shield, AlertTriangle, ChevronDown, ChevronRight, Puzzle
} from 'lucide-react';
import type { PlatformModule } from '@/core/platform';

const CAT_COLORS: Record<string, string> = {
  base: 'blue', monitor: 'red', manage: 'cyan', analyze: 'purple', iot: 'orange', ai: 'pink', system: 'slate',
};

export default function ModuleConfigPage() {
  const { success, warning } = useToast();
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    setModules(ModuleEngine.getAllModules());
  }, []);

  useLayoutEffect(() => {
    refresh();
    const unsub = ModuleEngine.subscribe((id, status) => {
      console.log(`[ModuleConfig] ${id} → ${status}`);
      refresh();
    });
    return () => unsub();
  }, [refresh]);

  const toggleModule = (mod: PlatformModule) => {
    if (mod.status === 'enabled') {
      ModuleEngine.disable(mod.id);
      warning('模块已禁用', `${mod.name} 模块已下线，对应菜单和路由已自动隐藏`);
    } else {
      ModuleEngine.enable(mod.id);
      success('模块已启用', `${mod.name} 模块已上线，对应菜单和路由已自动生效`);
    }
  };

  const stats = ModuleEngine.getStats();

  const filtered = filterCat === 'all'
    ? modules
    : modules.filter(m => m.category === filterCat);

  const categories = ['all', ...Array.from(new Set(modules.map(m => m.category)))];

  return (
    <div className="space-y-4">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Puzzle className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">模块配置中心</h2>
            <p className="text-[10px] text-slate-500">系统功能模块管理</p>
          </div>
        </div>
        <button onClick={refresh} className="text-[10px] px-3 py-1.5 bg-slate-700/30 text-slate-400 rounded hover:text-slate-200 flex items-center gap-1.5 transition-colors">
          <RefreshCw className="w-3 h-3" />刷新
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: '总模块', value: stats.total, color: 'text-blue-400' },
          { label: '已启用', value: stats.enabled, color: 'text-emerald-400' },
          { label: '已禁用', value: stats.disabled, color: 'text-red-400' },
          { label: '数据库表', value: modules.reduce((s: any, m: any) => s + m.dbTables.length, 0), color: 'text-purple-400' },
          { label: '权限点', value: modules.reduce((s: any, m: any) => s + m.permissions.length, 0), color: 'text-cyan-400' },
        ].map((s: any, i: number) => (
          <div key={i} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
            <span className="text-xs text-slate-400">{s.label}</span>
            <div className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}<span className="text-xs text-slate-500 ml-1">个</span></div>
          </div>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`text-[10px] px-3 py-1.5 rounded transition-colors ${
              filterCat === cat ? 'bg-blue-500 text-white' : 'bg-slate-700/30 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat === 'all' ? '全部' : CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat}
          </button>
        ))}
      </div>

      {/* Module List */}
      <div className="space-y-2">
        {filtered.map(mod => {
          const isEnabled = mod.status === 'enabled';
          const catColor = CAT_COLORS[mod.category] || 'slate';
          const hasDeps = mod.dependsOn && mod.dependsOn.length > 0;
          const isExpanded = expanded.has(mod.id);

          return (
            <div key={mod.id} className={`bg-slate-800/50 rounded-lg border transition-all ${isEnabled ? 'border-slate-700/30' : 'border-slate-700/20 opacity-60'}`}>
              {/* Main Row */}
              <div className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg bg-${catColor}-500/10 flex items-center justify-center flex-shrink-0`}>
                  <mod.icon className={`w-5 h-5 text-${catColor}-400`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{mod.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded bg-${catColor}-500/10 text-${catColor}-400`}>{mod.category}</span>
                    <span className="text-[9px] text-slate-600">{mod.version}</span>
                    {hasDeps && (
                      <span className="text-[9px] text-slate-500 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />依赖: {mod.dependsOn?.join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{mod.description}</div>
                  <div className="flex items-center gap-3 mt-1 text-[9px] text-slate-600">
                    <span className="flex items-center gap-1"><Database className="w-3 h-3" />{mod.dbTables.length}张表</span>
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{mod.permissions.length}个权限</span>
                    <span className="flex items-center gap-1"><Server className="w-3 h-3" />优先级{mod.priority}</span>
                  </div>
                </div>
                <button onClick={() => { toggleModule(mod); }} className="flex-shrink-0" aria-label="切换">
                  {isEnabled ? (
                    <ToggleRight className="w-9 h-9 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-600" />
                  )}
                </button>
                <button onClick={() => setExpanded(prev => {
                  const next = new Set(prev);
                  next.has(mod.id) ? next.delete(mod.id) : next.add(mod.id);
                  return next;
                })} className="text-slate-500 hover:text-slate-300 flex-shrink-0" aria-label="展开">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-4 pb-4 ml-14 space-y-3">
                  {/* DB Tables */}
                  <div>
                    <div className="text-[9px] text-slate-500 mb-1.5">数据库表</div>
                    <div className="flex flex-wrap gap-1.5">
                      {mod.dbTables.map(t => (
                        <span key={t} className="text-[9px] px-2 py-0.5 bg-slate-700/30 rounded text-slate-400">{t}</span>
                      ))}
                    </div>
                  </div>
                  {/* Permissions */}
                  <div>
                    <div className="text-[9px] text-slate-500 mb-1.5">权限配置</div>
                    <div className="flex flex-wrap gap-1.5">
                      {mod.permissions.map(p => (
                        <span key={p.code} className="text-[9px] px-2 py-0.5 bg-slate-700/30 rounded text-slate-400">{p.name} ({p.actions.join('/')})</span>
                      ))}
                    </div>
                  </div>
                  {/* Menu */}
                  {mod.menu && (
                    <div>
                      <div className="text-[9px] text-slate-500 mb-1.5">菜单路由</div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[9px] px-2 py-0.5 bg-blue-500/10 rounded text-blue-400">{mod.menu.path}</span>
                        {mod.menu.children?.map(c => (
                          <span key={c.id} className="text-[9px] px-2 py-0.5 bg-slate-700/30 rounded text-slate-500">{c.path}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
