/**
 * 动态侧边栏 - 基于 ModuleEngine 动态渲染 + 折叠展开功能
 */
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  ChevronDown, ChevronRight,
  Search, Star, X, LayoutDashboard,
  PanelLeftOpen, PanelLeftClose,
} from 'lucide-react';
import { ModuleEngine } from '@/core/platform';
import { useSidebar } from '@/core/SidebarContext';
import type { PlatformModule, ModuleMenuChild } from '@/core/platform';
import React from 'react';

const IconRenderer: React.FC<{ icon: unknown; className?: string }> = ({ icon: Icon, className }) => {
  if (!Icon) return <LayoutDashboard className={className} />;
  const IconComp = Icon as React.FC<{ className?: string }>;
  return <IconComp className={className} />;
};

interface MenuFlatItem {
  id: string;
  label: string;
  path: string;
  icon: unknown;
  parentLabel: string;
  parentPath: string;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggleSidebar, mobile } = useSidebar();

  const [menuModules, setMenuModules] = useState<PlatformModule[]>([]);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const updateModules = () => {
      setMenuModules(ModuleEngine.getMenuModules());
      forceUpdate(v => v + 1);
    };
    updateModules();
    const unsubscribe = ModuleEngine.subscribe(updateModules);
    return unsubscribe;
  }, []);

  const [openMenus, setOpenMenus] = useState<string[]>(['/monitor']);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('sfp_sidebar_favorites') || '[]');
    } catch { return []; }
  });

  const [hoverExpand, setHoverExpand] = useState(false);
  const isEffectivelyCollapsed = collapsed && !hoverExpand;

  const toggleMenu = (path: string) => {
    setOpenMenus(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (mod: PlatformModule) =>
    mod.menu?.children?.some(c => location.pathname.startsWith(c.path)) ?? false;

  const toggleFavorite = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const newFavs = favorites.includes(path)
      ? favorites.filter(f => f !== path)
      : [...favorites, path];
    setFavorites(newFavs);
    localStorage.setItem('sfp_sidebar_favorites', JSON.stringify(newFavs));
  };

  const allMenuItems: MenuFlatItem[] = useMemo(() => {
    const items: MenuFlatItem[] = [];
    for (const mod of menuModules) {
      if (!mod.menu) continue;
      const parentLabel = mod.menu.label || mod.name;
      const parentPath = mod.menu.path || mod.path || '';

      if (mod.menu.children?.length) {
        for (const child of mod.menu.children) {
          items.push({ id: child.id, label: child.label, path: child.path, icon: child.icon, parentLabel, parentPath });
        }
      } else {
        items.push({ id: mod.id, label: mod.menu.label || mod.name, path: mod.menu.path || mod.path || '', icon: mod.menu.icon || mod.icon, parentLabel, parentPath });
      }
    }
    return items;
  }, [menuModules]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allMenuItems.filter(item =>
      item.label.toLowerCase().includes(q) || item.parentLabel.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery, allMenuItems]);

  const favItems = useMemo(() =>
    allMenuItems.filter(item => favorites.includes(item.path)),
  [allMenuItems, favorites]);

  if (menuModules.length === 0) {
    return (
      <aside className="h-full flex flex-col transition-all duration-300" style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', borderRight: '1px solid rgba(71,85,105,0.3)', width: collapsed ? 64 : 220, flexShrink: 0 }}>
        <div className="h-14 flex items-center justify-center px-2" style={{ borderBottom: '1px solid rgba(71,85,105,0.2)' }}>
          <img src="/logo.png" alt="新致远" className="w-8 h-8 object-contain logo-blend" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-slate-500">
          <LayoutDashboard className="w-8 h-8 opacity-30" />
          {!collapsed && <div className="text-xs text-center">无启用的模块</div>}
        </div>
      </aside>
    );
  }

  if (mobile) {
    return (
      <>
        {!collapsed && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" onClick={toggleSidebar} />
            <aside
              className="fixed left-0 top-0 bottom-0 z-[100] flex flex-col transition-all duration-300 ease-in-out shadow-2xl"
              style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', borderRight: '1px solid rgba(71,85,105,0.3)', width: 260 }}
            >
              <div className="h-14 flex items-center justify-between px-4" style={{ borderBottom: '1px solid rgba(71,85,105,0.2)' }}>
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="新致远" className="w-8 h-8 object-contain logo-blend" />
                  <div>
                    <h1 className="text-[13px] font-bold text-slate-100 leading-tight whitespace-nowrap">新致远智慧消防</h1>
                    <p className="text-[9px] text-slate-500 leading-tight whitespace-nowrap">远程监控中心</p>
                  </div>
                </div>
                <button onClick={toggleSidebar} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
                {menuModules.map((mod: any) => {
                  const menu = mod.menu;
                  if (!menu) return null;
                  const hasChildren = !!menu.children?.length;
                  const active = isParentActive(mod) || (mod.path === '/bigscreen' && isActive(mod.path || ''));
                  const isOpen = openMenus.includes(mod.path || '') || active;
                  const modPath = mod.path || '';
                  return (
                    <div key={mod.id}>
                      <button
                        onClick={() => {
                          if (!hasChildren && modPath) { navigate(modPath); toggleSidebar(); }
                          else toggleMenu(modPath);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 rounded-lg mx-2 ${
                          active || isActive(modPath)
                            ? 'text-blue-400 bg-blue-500/10 border-l-2 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.08)]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                        }`}
                      >
                        <IconRenderer icon={menu.icon || mod.icon} className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 text-left truncate">{menu.label || mod.name}</span>
                        {hasChildren && (isOpen ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />)}
                      </button>
                      {isOpen && hasChildren && menu.children && (
                        <div className="ml-4 mr-2">
                          {menu.children.map((child: ModuleMenuChild) => (
                            <button
                              key={child.id}
                              onClick={() => { navigate(child.path); toggleSidebar(); }}
                              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-all duration-200 rounded-lg ${
                                isActive(child.path)
                                  ? 'text-blue-400 bg-blue-500/10 shadow-[0_0_8px_rgba(59,130,246,0.06)]'
                                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/20'
                              }`}
                            >
                              <IconRenderer icon={child.icon} className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{child.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </aside>
          </>
        )}
      </>
    );
  }

  return (
    <aside
      className="h-full flex flex-col relative transition-all duration-300 ease-in-out"
      style={{
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderRight: '1px solid rgba(71,85,105,0.25)',
        width: isEffectivelyCollapsed ? 72 : 228,
        flexShrink: 0,
      }}
      onMouseEnter={() => collapsed && setHoverExpand(true)}
      onMouseLeave={() => setHoverExpand(false)}
    >
      <div
        className="flex items-center justify-center transition-all duration-300 overflow-hidden"
        style={{
          borderBottom: '1px solid rgba(71,85,105,0.2)',
          height: isEffectivelyCollapsed ? 60 : 68,
          padding: isEffectivelyCollapsed ? '0 10px' : '0 14px',
        }}
      >
        {isEffectivelyCollapsed ? (
          <div className="flex items-center justify-center w-full">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center">
              <img src="/logo.png" alt="新致远" className="w-7 h-7 object-contain flex-shrink-0 logo-blend" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 w-full justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <img src="/logo.png" alt="新致远" className="w-6 h-6 object-contain logo-blend" />
            </div>
            <div className="text-center">
              <h1 className="text-[13px] font-bold text-slate-100 leading-tight whitespace-nowrap tracking-wide">新致远智慧消防</h1>
              <p className="text-[9px] text-slate-500 leading-tight whitespace-nowrap">远程监控中心</p>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[74px] z-50 w-6 h-6 rounded-full flex items-center justify-center
                   bg-slate-700 border border-slate-600 hover:bg-blue-600 hover:border-blue-500
                   transition-all duration-200 shadow-lg group"
        title={collapsed ? '展开菜单' : '折叠菜单'}
        style={{ opacity: isEffectivelyCollapsed ? 0 : 1, transition: 'opacity 0.2s' }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { if (isEffectivelyCollapsed) e.currentTarget.style.opacity = '0'; }} aria-label="展开侧边栏">
        {collapsed
          ? <PanelLeftOpen className="w-3 h-3 text-slate-300 group-hover:text-white" />
          : <PanelLeftClose className="w-3 h-3 text-slate-300 group-hover:text-white" />
        }
      </button>

      {!isEffectivelyCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-blue-400 transition-colors" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索菜单..."
              className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-slate-300 placeholder-slate-600 outline-none focus:border-blue-500/40 focus:bg-slate-800/80 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)] transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} aria-label="清除搜索" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="mt-1.5 bg-slate-800/90 border border-slate-700/40 rounded-lg overflow-hidden shadow-xl backdrop-blur-sm">
              {searchResults.length > 0 ? (
                searchResults.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { navigate(item.path); setSearchQuery(''); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-slate-300 hover:bg-blue-500/10 hover:text-blue-300 transition-colors text-left"
                  >
                    <IconRenderer icon={item.icon} className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <span className="text-[9px] text-slate-600 flex-shrink-0">{item.parentLabel}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-[11px] text-slate-600 text-center">未找到匹配的菜单</div>
              )}
            </div>
          )}
        </div>
      )}

      {!isEffectivelyCollapsed && favItems.length > 0 && !searchQuery && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1.5 px-2 mb-1.5">
            <Star className="w-3 h-3 text-yellow-500" />
            <span className="text-[9px] text-slate-500 font-medium tracking-wider">收藏</span>
          </div>
          {favItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] rounded-lg transition-all duration-200 ${
                isActive(item.path) ? 'text-blue-400 bg-blue-500/10 shadow-[0_0_8px_rgba(59,130,246,0.06)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
              }`}
            >
              <IconRenderer icon={item.icon} className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {menuModules.map((mod: any) => {
          const menu = mod.menu;
          if (!menu) return null;

          const hasChildren = !!menu.children?.length;
          const active = isParentActive(mod) || (mod.path === '/bigscreen' && isActive(mod.path || ''));
          const isOpen = openMenus.includes(mod.path || '') || active;
          const modPath = mod.path || '';

          if (isEffectivelyCollapsed) {
            return (
              <div key={mod.id} className="relative group px-2 mb-1">
                <button
                  onClick={() => {
                    if (!hasChildren && modPath) navigate(modPath);
                    else toggleMenu(modPath);
                  }}
                  title={menu.label || mod.name}
                  className={`w-full flex items-center justify-center py-2.5 rounded-xl transition-all duration-200 ${
                    active
                      ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.08)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 hover:shadow-[0_0_8px_rgba(59,130,246,0.05)]'
                  }`}
                >
                  <IconRenderer icon={menu.icon || mod.icon} className="w-5 h-5 flex-shrink-0" />
                </button>

                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-800 border border-slate-700/50 rounded-lg shadow-2xl
                              text-[11px] text-slate-200 whitespace-nowrap z-[100] opacity-0 group-hover:opacity-100 pointer-events-none
                              transition-all duration-150 translate-x-1 group-hover:translate-x-0">
                  {menu.label || mod.name}
                  <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 border-l border-b border-slate-700/50 rotate-45" />
                </div>

                {isOpen && hasChildren && menu.children && (
                  <div className="absolute left-full top-0 ml-3 w-48 bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl z-[100] py-1.5 overflow-hidden">
                    <div className="px-3 py-1.5 text-[10px] text-slate-500 border-b border-slate-700/30 mb-1 font-medium">
                      {menu.label || mod.name}
                    </div>
                    {menu.children.map((child: ModuleMenuChild) => (
                      <button
                        key={child.id}
                        onClick={() => navigate(child.path)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-[11px] transition-all duration-200 ${
                          isActive(child.path)
                            ? 'text-blue-400 bg-blue-500/10'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                        }`}
                      >
                        <IconRenderer icon={child.icon} className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={mod.id} className="px-2 mb-0.5">
              <button
                onClick={() => {
                  if (!hasChildren && modPath) navigate(modPath);
                  else toggleMenu(modPath);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 rounded-xl ${
                  active || isActive(modPath)
                    ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.08)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                }`}
              >
                <IconRenderer icon={menu.icon || mod.icon} className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-400' : ''}`} />
                <span className="flex-1 text-left truncate font-medium">{menu.label || mod.name}</span>
                {hasChildren && (isOpen ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />)}
              </button>

              {isOpen && hasChildren && menu.children && (
                <div className="ml-4 mt-0.5 space-y-0.5 relative">
                  <div className="absolute left-0 top-1 bottom-1 w-px bg-slate-700/30" />
                  {menu.children.map((child: ModuleMenuChild) => (
                    <div key={child.id} className="group relative flex items-center pl-3">
                      <button
                        onClick={() => navigate(child.path)}
                        className={`flex-1 flex items-center gap-3 px-3 py-2 text-sm transition-all duration-200 rounded-lg ${
                          isActive(child.path)
                            ? 'text-blue-400 bg-blue-500/10 shadow-[0_0_8px_rgba(59,130,246,0.06)]'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/20 hover:shadow-[0_0_6px_rgba(59,130,246,0.04)]'
                        }`}
                      >
                        <IconRenderer icon={child.icon} className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{child.label}</span>
                      </button>
                      <button
                        onClick={(e) => toggleFavorite(e, child.path)}
                        className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-700/30"
                      >
                        <Star className={`w-3 h-3 ${favorites.includes(child.path) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-600 hover:text-yellow-500'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {!isEffectivelyCollapsed ? (
        <div className="px-4 py-3 border-t border-slate-700/20 flex items-center justify-between text-[9px] text-slate-600">
          <span className="font-mono tracking-wider">V2.0.0</span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-emerald-400 font-medium">在线</span>
          </span>
        </div>
      ) : (
        <div className="py-3 border-t border-slate-700/20 flex items-center justify-center">
          <span className="relative flex h-2 w-2" title="在线">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
        </div>
      )}
    </aside>
  );
}
