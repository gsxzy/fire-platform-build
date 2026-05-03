import { useNavigate } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { Bell, User, LogOut, Settings, Shield, ChevronDown, CheckCircle, AlertTriangle, Flame, X, Search, Keyboard, RefreshCw, PanelLeftOpen, PanelLeftClose, Zap, Clock } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import GlobalSearch from './GlobalSearch';
import { useSidebar } from '@/core/SidebarContext';

const tickerItems = [
  { type: 'fire', text: '万达广场 1F大厅烟感探测器触发火警信号', time: '2分钟前' },
  { type: 'fire', text: '万达广场 B1停车场温感探测器触发火警信号', time: '5分钟前' },
  { type: 'fault', text: '万达广场 排烟风机#3轴承异响，故障报警', time: '12分钟前' },
  { type: 'fault', text: '兰州中心 消防栓泵控制器通讯中断', time: '30分钟前' },
  { type: 'pre', text: '万达广场 水池液位下降至3.2m，触发低液位预警', time: '1小时前' },
  { type: 'info', text: '维保工单已派发：喷淋泵定期巡检', time: '2小时前' },
  { type: 'fire', text: '兰大二院 3F走廊烟感确认为误报，已解除', time: '3小时前' },
  { type: 'fault', text: '西北师范大学 应急照明控制器离线', time: '4小时前' },
  { type: 'pre', text: '兰州石化 电气线路温度异常，建议排查', time: '5小时前' },
  { type: 'info', text: '系统完成每日自动巡检，生成报告', time: '6小时前' },
];

const notifications = [
  { id: 1, type: 'fire', title: '火警报警', content: '万达广场 1F大厅烟感探测器触发火警', time: '2分钟前', read: false },
  { id: 2, type: 'fire', title: '火警报警', content: '万达广场 B1停车场温感探测器触发火警', time: '5分钟前', read: false },
  { id: 3, type: 'fault', title: '设备故障', content: '万达广场 排烟风机#3轴承异响', time: '12分钟前', read: false },
  { id: 4, type: 'fault', title: '设备故障', content: '兰州中心 消防栓泵控制器通讯中断', time: '30分钟前', read: true },
  { id: 5, type: 'pre', title: '预警通知', content: '万达广场 水池液位下降至3.2m', time: '1小时前', read: true },
  { id: 6, type: 'workorder', title: '工单提醒', content: '新的维保工单已派发：喷淋泵定期巡检', time: '2小时前', read: true },
  { id: 7, type: 'fire', title: '火警已确认', content: '兰大二院 3F走廊烟感确认为误报', time: '3小时前', read: true },
  { id: 8, type: 'system', title: '系统通知', content: '平台完成每日自动数据备份', time: '4小时前', read: true },
];

const notifIcon = (type: string) => {
  switch (type) {
    case 'fire': return <Flame className="w-3.5 h-3.5 text-red-400" />;
    case 'fault': return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
    case 'pre': return <Shield className="w-3.5 h-3.5 text-purple-400" />;
    case 'system': return <RefreshCw className="w-3.5 h-3.5 text-blue-400" />;
    default: return <CheckCircle className="w-3.5 h-3.5 text-blue-400" />;
  }
};

const notifBg = (type: string) => {
  switch (type) {
    case 'fire': return 'bg-red-500/10 border-red-500/20';
    case 'fault': return 'bg-yellow-500/10 border-yellow-500/20';
    case 'pre': return 'bg-purple-500/10 border-purple-500/20';
    default: return 'bg-blue-500/5 border-slate-700/20';
  }
};

function AlarmTicker() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || paused) return;
    let raf: number, pos = 0, speed = 0.8;
    const animate = () => { pos += speed; const half = el.scrollWidth / 2; if (pos >= half) pos = 0; el.style.transform = `translateX(-${pos}px)`; raf = requestAnimationFrame(animate); };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [paused]);
  return (
    <div className="h-7 bg-gradient-to-r from-red-950/30 via-slate-900/70 to-orange-950/30 border-y border-slate-700/20 flex items-center overflow-hidden relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 border-r border-slate-700/20 z-10 bg-slate-800/80 backdrop-blur-sm">
        <Flame className="w-3 h-3 text-red-400 animate-pulse" />
        <span className="text-[10px] font-bold text-red-400 tracking-wider">实时告警</span>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div ref={scrollRef} className="flex items-center gap-8 whitespace-nowrap">
          {[...tickerItems, ...tickerItems].map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
              {item.type === 'fire' && <Flame className="w-2.5 h-2.5 text-red-400 flex-shrink-0" />}
              {item.type === 'fault' && <AlertTriangle className="w-2.5 h-2.5 text-yellow-400 flex-shrink-0" />}
              {item.type === 'pre' && <Shield className="w-2.5 h-2.5 text-purple-400 flex-shrink-0" />}
              {item.type === 'info' && <CheckCircle className="w-2.5 h-2.5 text-blue-400 flex-shrink-0" />}
              <span className={`text-[10px] ${item.type === 'fire' ? 'text-red-300' : item.type === 'fault' ? 'text-yellow-300' : item.type === 'pre' ? 'text-purple-300' : 'text-slate-400'}`}>{item.text}</span>
              <span className="text-[8px] text-slate-600">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  const shortcuts = [
    { key: 'Ctrl + K', action: '打开全局搜索' },
    { key: 'Ctrl + H', action: '返回首页工作台' },
    { key: 'Ctrl + M', action: '打开GIS地图' },
    { key: 'Ctrl + A', action: '打开AI助手' },
    { key: 'Ctrl + N', action: '打开通知面板' },
    { key: 'Escape', action: '关闭弹窗/面板' },
  ];
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-80 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-200">键盘快捷键</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors" aria-label="关闭"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 space-y-1 max-h-72 overflow-y-auto scrollbar-thin">
          {shortcuts.map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-700/30 transition-colors">
              <span className="text-[11px] text-slate-400">{s.action}</span>
              <kbd className="text-[10px] px-2 py-0.5 bg-slate-700/50 rounded text-slate-300 font-mono border border-slate-600/30">{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { collapsed, toggleSidebar } = useSidebar();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const [notifList, setNotifList] = useState(notifications);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifList.filter(n => !n.read).length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowSearch(prev => !prev); }
      if (e.key === 'Escape') { setShowSearch(false); setShowNotif(false); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); setShowNotif(prev => !prev); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markRead = (id: number) => { setNotifList(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); };
  const markAllRead = () => { setNotifList(prev => prev.map(n => ({ ...n, read: true }))); };

  return (
    <>
      <header className="flex-shrink-0 relative z-20">
        <div className="h-14 flex items-center justify-between px-3 border-b border-slate-700/30 bg-slate-800/80 backdrop-blur-xl z-40 relative">
          <div className="flex items-center gap-2">
            <button onClick={toggleSidebar} className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all border border-transparent hover:border-slate-600/30" title={collapsed ? '展开侧边栏' : '折叠侧边栏'} aria-label="展开侧边栏">
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2.5 pointer-events-auto">
              <div className="relative flex items-center justify-center">
                <div className="flex items-center justify-center">
                  <img src="/logo.png" alt="新致远" className="w-8 h-8 object-contain logo-blend" />
                </div>
              </div>
              <div className="text-center hidden sm:block">
                <h1 className="text-[15px] md:text-[17px] font-bold text-slate-100 leading-tight tracking-wider" style={{ textShadow: '0 0 16px rgba(59,130,246,0.25), 0 2px 4px rgba(0,0,0,0.5)' }}>新致远智慧消防远程监控中心</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button onClick={() => setShowSearch(true)} className="flex items-center gap-2 px-3 h-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all border border-slate-700/30 hover:border-slate-600/40">
              <Search className="w-4 h-4" />
              <span className="text-[11px] hidden md:inline">搜索...</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-500 hidden md:inline border border-slate-600/30">Ctrl+K</span>
            </button>

            <button onClick={() => setShowShortcuts(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all border border-transparent hover:border-slate-600/30 hidden md:flex" title="快捷键" aria-label="快捷键">
              <Keyboard className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-slate-700/30" />

            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotif(!showNotif)} aria-label="通知" className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all border border-transparent hover:border-slate-600/30">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold animate-pulse shadow-lg shadow-red-500/20">{unreadCount}</span>}
              </button>
              {showNotif && (
                <div className="absolute right-0 top-full mt-2 w-84 bg-slate-800/95 border border-slate-700/40 rounded-xl shadow-2xl z-[150] overflow-hidden backdrop-blur-xl animate-fade-in-up duration-200">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
                  <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-semibold text-slate-200">消息通知</span>
                      {unreadCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/20 font-medium">{unreadCount} 未读</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={markAllRead} className="text-[9px] text-blue-400 hover:text-blue-300 transition-colors">全部已读</button>
                      <button onClick={() => setShowNotif(false)} aria-label="关闭通知" className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin">
                    {notifList.map(n => (
                      <div key={n.id} onClick={() => markRead(n.id)} className={`p-3 border-b border-slate-700/20 cursor-pointer transition-all duration-200 hover:bg-slate-700/20 ${!n.read ? 'bg-blue-500/[0.03]' : ''} ${notifBg(n.type)}`}>
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-600/30">{notifIcon(n.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-200 font-medium">{n.title}</span>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-2.5 h-2.5 text-slate-600" />
                                <span className="text-[8px] text-slate-500 flex-shrink-0">{n.time}</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{n.content}</p>
                          </div>
                          {!n.read && <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1.5 shadow-[0_0_6px_rgba(96,165,250,0.5)]" />}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2.5 border-t border-slate-700/30 flex items-center justify-between">
                    <button onClick={() => { setShowNotif(false); navigate('/alarm/center'); }} className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-medium">查看全部通知</button>
                    <button onClick={() => { setShowNotif(false); navigate('/system/log'); }} className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors">查看日志</button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-slate-700/30" />

            <div className="relative" ref={profileRef}>
              <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-700/50 transition-all border border-transparent hover:border-slate-600/30">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-[11px] text-slate-200 font-medium leading-tight">{user?.realName || user?.username || '管理员'}</div>
                  <div className="text-[9px] text-slate-500 leading-tight">{user?.roles?.join?.(',') || '系统管理员'}</div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-500 hidden md:block" />
              </button>
              {showProfile && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800/95 border border-slate-700/40 rounded-xl shadow-2xl z-[150] overflow-hidden backdrop-blur-xl animate-fade-in-up duration-200">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
                  <div className="p-3 border-b border-slate-700/30">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-[12px] text-slate-200 font-medium">{user?.realName || user?.username || '管理员'}</div>
                        <div className="text-[10px] text-slate-500">{user?.username || 'admin'}@xzy.cn</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <button onClick={() => { setShowProfile(false); navigate('/profile'); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-700/30 rounded-lg transition-colors">
                      <User className="w-3.5 h-3.5" /> 个人中心
                    </button>
                    <button onClick={() => { setShowProfile(false); navigate('/system/config'); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-700/30 rounded-lg transition-colors">
                      <Settings className="w-3.5 h-3.5" /> 系统设置
                    </button>
                    <div className="h-px bg-slate-700/30 my-1" />
                    <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <LogOut className="w-3.5 h-3.5" /> 退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <AlarmTicker />
      </header>
      {showSearch && <GlobalSearch open={showSearch} onClose={() => setShowSearch(false)} />}
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </>
  );
}
