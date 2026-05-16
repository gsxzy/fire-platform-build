import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Search, Flame, Bell, Building2, Cpu, Wrench,
  MapPin, ClipboardList, BookOpen, FileText, PhoneCall,
  Monitor, Video, Shield, GraduationCap, Brain,
  LayoutDashboard, TrendingUp, Settings, Users
} from 'lucide-react';

interface SearchItem {
  label: string;
  path: string;
  icon: typeof Search;
  category: string;
  keywords: string;
}

const searchItems: SearchItem[] = [
  { label: '工作台', path: '/workbench', icon: LayoutDashboard, category: '首页', keywords: '工作台 首页 看板' },
  { label: '实时监控', path: '/monitor/realtime', icon: Monitor, category: '监控中心', keywords: '监控 实时 大屏 数据' },
  { label: '视频监控', path: '/monitor/video', icon: Video, category: '监控中心', keywords: '视频 监控 摄像头' },
  { label: '数智消控室', path: '/monitor/control', icon: Monitor, category: '监控中心', keywords: '消控室 控制 消防' },
  { label: '安消联动', path: '/monitor/linkage', icon: Flame, category: '监控中心', keywords: '联动 安消 消防' },
  { label: '告警总览', path: '/alarm/center', icon: Bell, category: '告警中心', keywords: '告警 报警 火警 故障' },
  { label: '接警处置', path: '/duty/dispatch', icon: PhoneCall, category: '值守中心', keywords: '接警 处置 值班' },
  { label: '值班日志', path: '/duty/log', icon: FileText, category: '值守中心', keywords: '日志 值班 交接' },
  { label: '设备档案', path: '/device/archive', icon: Cpu, category: '设备管理', keywords: '设备 档案 管理' },
  { label: '设备接入', path: '/device/access', icon: Cpu, category: '设备管理', keywords: '设备 接入 协议 网络 IoT' },
  { label: '设备分配', path: '/device/allocate', icon: Cpu, category: '设备管理', keywords: '设备 分配 单位 绑定' },
  { label: '设备配置', path: '/device/config', icon: Settings, category: '设备管理', keywords: '设备 配置 参数' },
  { label: '设备维护', path: '/device/maintain', icon: Wrench, category: '设备管理', keywords: '设备 维护 工单' },
  { label: '一般单位', path: '/unit/general', icon: Building2, category: '单位管理', keywords: '单位 一般 管理' },
  { label: '重点单位', path: '/unit/key', icon: Building2, category: '单位管理', keywords: '单位 重点 管理' },
  { label: '九小场所', path: '/unit/nine-small', icon: Building2, category: '单位管理', keywords: '九小 场所 单位' },
  { label: '单位统计', path: '/unit/stats', icon: TrendingUp, category: '单位管理', keywords: '单位 统计 分析' },
  { label: '维保合同', path: '/maintenance/contract', icon: FileText, category: '维保管理', keywords: '维保 合同 管理' },
  { label: '维保工单', path: '/maintenance/workorder', icon: Wrench, category: '维保管理', keywords: '维保 工单 管理' },
  { label: '巡检计划', path: '/patrol/plan', icon: ClipboardList, category: '巡检管理', keywords: '巡检 计划 任务' },
  { label: '隐患管理', path: '/patrol/hazard', icon: Shield, category: '巡检管理', keywords: '隐患 整改 管理' },
  { label: 'GIS地图', path: '/map/gis', icon: MapPin, category: '地图监控', keywords: '地图 GIS 位置' },
  { label: '报警分析', path: '/analysis/alarm', icon: TrendingUp, category: '数据分析', keywords: '报警 分析 统计' },
  { label: '消防知识库', path: '/knowledge/base', icon: BookOpen, category: '知识库', keywords: '知识 法规 标准' },
  { label: '智能预警', path: '/smart/warning', icon: Brain, category: '智能分析', keywords: '智能 预警 AI' },
  { label: '培训考核', path: '/training/manage', icon: GraduationCap, category: '培训管理', keywords: '培训 考核 证书' },
  { label: '消防检查', path: '/fire-check/manage', icon: ClipboardList, category: '检查管理', keywords: '检查 标准 合格' },
  { label: '用户管理', path: '/system/user', icon: Users, category: '系统管理', keywords: '用户 管理 权限' },
  { label: '系统配置', path: '/system/config', icon: Settings, category: '系统管理', keywords: '系统 配置 设置' },
];

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = searchItems.filter(item =>
    !query || item.label.includes(query) || item.keywords.includes(query) || item.category.includes(query)
  );

  useLayoutEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(filtered.length - 1, i + 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(0, i - 1)); return; }
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        navigate(filtered[selectedIndex].path);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, filtered, selectedIndex, navigate, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-700/50">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="搜索功能、页面、菜单..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-[10px] text-slate-400 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">未找到匹配的结果</div>
          )}
          {filtered.map((item: any, i: number) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); onClose(); }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex ? 'bg-blue-500/15' : 'hover:bg-slate-700/30'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  i === selectedIndex ? 'bg-blue-500/20' : 'bg-slate-700/50'
                }`}>
                  <Icon className={`w-4 h-4 ${i === selectedIndex ? 'text-blue-400' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${i === selectedIndex ? 'text-blue-300' : 'text-slate-200'}`}>{item.label}</div>
                  <div className="text-[10px] text-slate-500">{item.category}</div>
                </div>
                <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  i === selectedIndex ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-500'
                }`}>{i === selectedIndex ? '↵' : ''}</kbd>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-700/50 bg-slate-800/50">
          <span className="text-[10px] text-slate-500">↑↓ 选择</span>
          <span className="text-[10px] text-slate-500">↵ 确认</span>
          <span className="text-[10px] text-slate-500 ml-auto">共 {filtered.length} 个结果</span>
        </div>
      </div>
    </div>
  );
}
