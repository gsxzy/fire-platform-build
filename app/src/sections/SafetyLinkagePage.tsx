import { useState, useMemo, useEffect } from 'react';
import {
  Link2, ChevronRight, Plus, X, Save, Edit3, Trash2, Copy,
  CheckCircle, XCircle, Clock, Flame, Shield, Eye, Play,
  Settings, ToggleRight, ToggleLeft, Search,
  AlertTriangle, Bell, Camera, Wrench, BrainCircuit,
  DoorOpen, Droplets, Users, FileText, Download,
  MapPin, ChevronUp, Video,
  Zap, Activity, Filter
} from 'lucide-react';
import { legacyApi } from '@/api/services';

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */
interface LinkageRule {
  id: string;
  name: string;
  type: string;
  trigger: string;
  triggerDesc: string;
  actions: string[];
  targets: string[];
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
  timeRange: string;
  units: string[];
  deviceTypes: string[];
  lastTriggered: string;
  triggerCount: number;
  description: string;
}

interface LinkageLog {
  id: string;
  time: string;
  ruleName: string;
  ruleId: string;
  trigger: string;
  actions: string[];
  result: 'success' | 'partial' | 'fail';
  duration: string;
  operator: string;
}

/* ═══════════════════════════════════════════════
   8 Standard Linkage Rules
   ═══════════════════════════════════════════════ */
const defaultRules: LinkageRule[] = [
  {
    id: 'LK-001', name: '火警联动视频', type: 'fire-video',
    trigger: '火警报警触发', triggerDesc: '火灾报警控制器上报火警信号',
    actions: ['调取最近摄像头视频', '弹窗显示告警画面', '自动录像', 'AI烟火识别分析'],
    targets: ['视频监控系统', '告警中心', 'AI识别引擎'],
    enabled: true, priority: 'high', timeRange: '00:00-23:59',
    units: ['全部单位'], deviceTypes: ['火灾报警控制器', '烟感探测器', '温感探测器'],
    lastTriggered: '2026-04-19 09:15:22', triggerCount: 156, description: '火警发生时自动联动视频监控，实现可视化确认',
  },
  {
    id: 'LK-002', name: '故障联动视频', type: 'fault-video',
    trigger: '设备故障/离线', triggerDesc: '设备通讯中断或故障上报',
    actions: ['调取设备位置视频', '生成巡检提醒工单', '推送运维人员'],
    targets: ['视频监控系统', '维保管理'],
    enabled: true, priority: 'medium', timeRange: '00:00-23:59',
    units: ['全部单位'], deviceTypes: ['全部设备'],
    lastTriggered: '2026-04-18 14:30:15', triggerCount: 89, description: '设备故障或离线时联动视频查看现场情况',
  },
  {
    id: 'LK-003', name: '监管反馈联动', type: 'feedback',
    trigger: '设备启动/反馈信号', triggerDesc: '消防设备启动动作反馈',
    actions: ['启动事件录像', '记录联动结果', '更新设备状态'],
    targets: ['视频存储', '设备管理'],
    enabled: true, priority: 'medium', timeRange: '00:00-23:59',
    units: ['全部单位'], deviceTypes: ['排烟风机', '消防水泵', '防火卷帘'],
    lastTriggered: '2026-04-19 08:45:33', triggerCount: 234, description: '消防设备动作后自动记录联动结果',
  },
  {
    id: 'LK-004', name: 'AI烟火识别联动', type: 'ai-recognition',
    trigger: 'AI识别到烟火', triggerDesc: '视频AI分析检测到烟火特征',
    actions: ['生成预警事件', '弹窗提示值班人员', 'App推送', '短信通知'],
    targets: ['告警中心', '推送服务'],
    enabled: true, priority: 'high', timeRange: '00:00-23:59',
    units: ['万达广场', '兰州中心', '兰大二院'], deviceTypes: ['AI摄像头'],
    lastTriggered: '2026-04-17 16:22:08', triggerCount: 12, description: 'AI烟火识别检测到异常时自动预警',
  },
  {
    id: 'LK-005', name: '消防通道占用联动', type: 'blockage',
    trigger: '消防通道被占用', triggerDesc: 'AI视频分析检测到通道堵塞',
    actions: ['现场抓拍', '生成隐患工单', '推送管理人员', '声光告警'],
    targets: ['隐患管理', '推送服务'],
    enabled: true, priority: 'medium', timeRange: '00:00-23:59',
    units: ['万达广场', '兰州中心'], deviceTypes: ['AI摄像头'],
    lastTriggered: '2026-04-16 11:08:45', triggerCount: 45, description: '消防通道被占用时自动抓拍并生成隐患',
  },
  {
    id: 'LK-006', name: '消控室离岗联动', type: 'vacancy',
    trigger: '消控室人员离岗超3分钟', triggerDesc: 'AI视频检测消控室无人值守',
    actions: ['立即声光预警', '记录离岗事件', '推送管理人员', '生成巡查记录'],
    targets: ['告警中心', '推送服务'],
    enabled: true, priority: 'high', timeRange: '00:00-23:59',
    units: ['全部单位'], deviceTypes: ['AI摄像头'],
    lastTriggered: '2026-04-19 06:30:12', triggerCount: 23, description: '消控室离岗超时自动预警',
  },
  {
    id: 'LK-007', name: '水压液位超低联动', type: 'water-low',
    trigger: '水源压力/液位低于阈值', triggerDesc: '管网压力或水池液位异常',
    actions: ['调取水源位置视频', '生成维保工单', '推送维保人员', '大屏高亮'],
    targets: ['视频监控', '维保管理', '大屏'],
    enabled: true, priority: 'high', timeRange: '00:00-23:59',
    units: ['全部单位'], deviceTypes: ['压力传感器', '液位传感器'],
    lastTriggered: '2026-04-18 22:15:30', triggerCount: 8, description: '消防水源异常时联动视频并生成维保工单',
  },
  {
    id: 'LK-008', name: '重点区域批量联动', type: 'key-area',
    trigger: '重点单位火警', triggerDesc: '重点单位火灾报警触发',
    actions: ['全开所有摄像头', '全通道录像', '启动应急预案', '通知119', '疏散广播', '释放全部门禁'],
    targets: ['视频监控', '广播系统', '门禁系统', '告警中心'],
    enabled: true, priority: 'high', timeRange: '00:00-23:59',
    units: ['万达广场', '兰大二院', '中石油兰州石化'], deviceTypes: ['全部设备'],
    lastTriggered: '-', triggerCount: 0, description: '重点单位火警时启动全量联动预案',
  },
];

const defaultLogs: LinkageLog[] = [
  { id: 'LL-001', time: '2026-04-19 09:15:22', ruleName: '火警联动视频', ruleId: 'LK-001', trigger: '1F大厅烟感001火警', actions: ['调视频', '弹窗', '录像', 'AI识别'], result: 'success', duration: '2.3s', operator: 'system' },
  { id: 'LL-002', time: '2026-04-19 09:15:25', ruleName: '重点区域批量联动', ruleId: 'LK-008', trigger: '万达广场1F火警', actions: ['开摄像头', '录像', '启动预案'], result: 'success', duration: '5.1s', operator: 'system' },
  { id: 'LL-003', time: '2026-04-19 08:45:33', ruleName: '监管反馈联动', ruleId: 'LK-003', trigger: '排烟风机#1启动', actions: ['录像', '记录状态'], result: 'success', duration: '1.2s', operator: 'system' },
  { id: 'LL-004', time: '2026-04-19 06:30:12', ruleName: '消控室离岗联动', ruleId: 'LK-006', trigger: '消控室离岗3分12秒', actions: ['声光预警', '推送'], result: 'success', duration: '0.8s', operator: 'system' },
  { id: 'LL-005', time: '2026-04-18 22:15:30', ruleName: '水压液位超低联动', ruleId: 'LK-007', trigger: 'B2管网压力0.15MPa', actions: ['调视频', '生成工单'], result: 'partial', duration: '3.5s', operator: 'system' },
  { id: 'LL-006', time: '2026-04-18 14:30:15', ruleName: '故障联动视频', ruleId: 'LK-002', trigger: '信号蝶阀#2通讯故障', actions: ['调视频', '巡检提醒'], result: 'success', duration: '2.1s', operator: 'system' },
];

/* ═══════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════ */
const priorityCfg = (p: string) => {
  switch (p) {
    case 'high': return { label: '高', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
    case 'medium': return { label: '中', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
    case 'low': return { label: '低', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
    default: return { label: '中', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
  }
};

const resultCfg = (r: string) => {
  switch (r) {
    case 'success': return { label: '成功', color: 'text-emerald-400', icon: CheckCircle };
    case 'partial': return { label: '部分成功', color: 'text-yellow-400', icon: AlertTriangle };
    case 'fail': return { label: '失败', color: 'text-red-400', icon: XCircle };
    default: return { label: r, color: 'text-slate-400', icon: XCircle };
  }
};

const typeIcon = (type: string) => {
  switch (type) {
    case 'fire-video': return <Flame className="w-4 h-4 text-red-400" />;
    case 'fault-video': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    case 'feedback': return <Activity className="w-4 h-4 text-blue-400" />;
    case 'ai-recognition': return <BrainCircuit className="w-4 h-4 text-purple-400" />;
    case 'blockage': return <DoorOpen className="w-4 h-4 text-orange-400" />;
    case 'vacancy': return <Users className="w-4 h-4 text-pink-400" />;
    case 'water-low': return <Droplets className="w-4 h-4 text-cyan-400" />;
    case 'key-area': return <Shield className="w-4 h-4 text-red-400" />;
    default: return <Link2 className="w-4 h-4 text-slate-400" />;
  }
};

const actionIcon = (action: string) => {
  if (action.includes('视频')) return <Video className="w-3 h-3 text-blue-400" />;
  if (action.includes('弹窗')) return <Bell className="w-3 h-3 text-yellow-400" />;
  if (action.includes('录像')) return <Camera className="w-3 h-3 text-purple-400" />;
  if (action.includes('AI')) return <BrainCircuit className="w-3 h-3 text-cyan-400" />;
  if (action.includes('工单')) return <Wrench className="w-3 h-3 text-orange-400" />;
  if (action.includes('推送')) return <Zap className="w-3 h-3 text-green-400" />;
  if (action.includes('预警') || action.includes('告警')) return <AlertTriangle className="w-3 h-3 text-red-400" />;
  if (action.includes('抓拍')) return <Camera className="w-3 h-3 text-indigo-400" />;
  if (action.includes('预案')) return <Shield className="w-3 h-3 text-red-400" />;
  if (action.includes('广播')) return <Bell className="w-3 h-3 text-pink-400" />;
  if (action.includes('门禁')) return <DoorOpen className="w-3 h-3 text-blue-400" />;
  return <Play className="w-3 h-3 text-slate-400" />;
};

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */
export default function SafetyLinkagePage() {
  const [rules, setRules] = useState<LinkageRule[]>(defaultRules);
  const [logs] = useState<LinkageLog[]>(defaultLogs);
  const [activeTab, setActiveTab] = useState<'rules' | 'logs'>('rules');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<LinkageRule | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    legacyApi.planList().then((res: any) => {
      const list = res.data?.list || [];
      if (list.length > 0) {
        const parsed = list.map((item: any) => {
          try { return item.content ? JSON.parse(item.content) : null; } catch { return null; }
        }).filter(Boolean);
        if (parsed.length > 0) setRules(parsed);
      }
    }).catch(() => {});
  }, []);

  const toggleEnable = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const syncRule = async (rule: LinkageRule, isNew: boolean) => {
    const payload = { name: rule.name, status: rule.enabled ? '启用' : '停用', content: JSON.stringify(rule) };
    if (isNew) {
      await legacyApi.createPlan(payload);
    } else {
      await legacyApi.updatePlan(Number(rule.id), payload);
    }
  };

  const handleCopy = async (rule: LinkageRule) => {
    const newRule: LinkageRule = {
      ...rule,
      id: `LK-${Date.now()}`,
      name: `${rule.name} (复制)`,
      enabled: false,
      triggerCount: 0,
      lastTriggered: '-',
    };
    setRules(prev => [...prev, newRule]);
    try { await syncRule(newRule, true); } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    try { await legacyApi.deletePlan(Number(id)); } catch { /* ignore */ }
  };

  const handleSaveEdit = async (updated: LinkageRule) => {
    setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
    setShowEditor(false);
    setEditingRule(null);
    try { await syncRule(updated, false); } catch { /* ignore */ }
  };

  const filtered = useMemo(() => {
    return rules.filter(r => {
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (statusFilter === 'enabled' && !r.enabled) return false;
      if (statusFilter === 'disabled' && r.enabled) return false;
      if (search && !r.name.includes(search) && !r.trigger.includes(search) && !r.id.includes(search)) return false;
      return true;
    });
  }, [rules, priorityFilter, statusFilter, search]);

  const stats = {
    total: rules.length, enabled: rules.filter(r => r.enabled).length,
    high: rules.filter(r => r.priority === 'high').length,
    todayTriggers: logs.length,
  };

  return (
    <div className="p-4 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>监控中心</span><ChevronRight className="w-3 h-3" /><span className="text-slate-300">安消联动</span>
        </div>
        <button
          onClick={() => { setEditingRule(null); setShowEditor(true); }}
          className="px-3 py-1.5 bg-blue-500/90 hover:bg-blue-500 text-white text-xs rounded-lg transition-all flex items-center gap-1.5 backdrop-blur-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
        >
          <Plus className="w-3.5 h-3.5" />新建规则
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '联动规则', value: stats.total, icon: Link2, color: 'blue', barFrom: 'from-blue-500', barTo: 'to-cyan-400', barW: '100%' },
          { label: '已启用', value: stats.enabled, icon: CheckCircle, color: 'emerald', barFrom: 'from-emerald-500', barTo: 'to-teal-400', barW: `${stats.total > 0 ? (stats.enabled / stats.total) * 100 : 0}%` },
          { label: '紧急级', value: stats.high, icon: AlertTriangle, color: 'red', barFrom: 'from-red-500', barTo: 'to-orange-400', barW: '45%' },
          { label: '今日触发', value: stats.todayTriggers, icon: Activity, color: 'purple', barFrom: 'from-purple-500', barTo: 'to-pink-400', barW: '65%' },
        ].map((s) => (
          <div key={s.label} className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-xl p-4 hover:bg-slate-700/40 transition-all hover:scale-[1.01]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400 font-medium">{s.label}</span>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                s.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20' :
                s.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20' :
                s.color === 'red' ? 'bg-red-500/10 border-red-500/20' :
                'bg-purple-500/10 border-purple-500/20'
              }`}>
                <s.icon className={`w-4 h-4 ${
                  s.color === 'blue' ? 'text-blue-400' :
                  s.color === 'emerald' ? 'text-emerald-400' :
                  s.color === 'red' ? 'text-red-400' :
                  'text-purple-400'
                }`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-100">{s.value}<span className="text-xs font-normal text-slate-500 ml-1">条</span></div>
            <div className="mt-3 h-1 w-full bg-slate-700/30 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${s.barFrom} ${s.barTo} rounded-full transition-all duration-500`} style={{ width: s.barW }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-xl w-fit">
        <button onClick={() => setActiveTab('rules')} className={`px-4 py-2 text-xs rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'rules' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'}`}><Settings className="w-3.5 h-3.5" />联动规则</button>
        <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 text-xs rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'logs' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'}`}><FileText className="w-3.5 h-3.5" />联动记录</button>
      </div>

      {activeTab === 'rules' ? (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索规则名称/编号/触发条件" className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 outline-none w-56 placeholder:text-slate-500 focus:border-slate-500/50 transition-colors" />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-slate-500" />
              <div className="flex items-center gap-1 p-1 bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'high', label: '高' },
                  { key: 'medium', label: '中' },
                  { key: 'low', label: '低' },
                ].map(p => (
                  <button key={p.key} onClick={() => setPriorityFilter(p.key)} className={`px-3 py-1.5 text-[11px] rounded-md transition-all ${priorityFilter === p.key ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'}`}>{p.label}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg">
              {[
                { key: 'all', label: '全部状态' },
                { key: 'enabled', label: '已启用' },
                { key: 'disabled', label: '已停用' },
              ].map(s => (
                <button key={s.key} onClick={() => setStatusFilter(s.key)} className={`px-3 py-1.5 text-[11px] rounded-md transition-all ${statusFilter === s.key ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'}`}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-2">
            {filtered.map(rule => {
              const pc = priorityCfg(rule.priority);
              const isExpanded = expandedRule === rule.id;
              return (
                <div key={rule.id} className={`bg-slate-800/40 backdrop-blur-sm border rounded-xl transition-all hover:bg-slate-700/40 hover:scale-[1.01] ${rule.enabled ? 'border-slate-700/30' : 'border-slate-700/20 opacity-60'}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button onClick={() => toggleEnable(rule.id)} className="mt-0.5 flex-shrink-0 p-1 hover:bg-slate-700/30 rounded-lg transition-all" aria-label="切换">
                          {rule.enabled ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-600" />}
                        </button>
                        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-700/30 border border-slate-600/20 flex items-center justify-center">
                          {typeIcon(rule.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-200 font-medium">{rule.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${pc.color} ${pc.bg} ${pc.border}`}>{pc.label}</span>
                            {rule.enabled ? (
                              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 rounded text-emerald-400 flex items-center gap-1">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                启用
                              </span>
                            ) : <span className="text-[9px] px-1.5 py-0.5 bg-slate-700/30 rounded text-slate-500">停用</span>}
                            <span className="text-[9px] text-slate-600 font-mono">{rule.id}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-red-400" />{rule.trigger}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" />{rule.timeRange}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-purple-400" />{rule.units.join(', ')}</span>
                          </div>
                          {/* Action Tags */}
                          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                            {rule.actions.map((a: any, i: number) => (
                              <span key={i} className="text-[9px] px-2 py-1 bg-slate-800/60 border border-slate-700/30 rounded-md text-slate-300 flex items-center gap-1 transition-colors hover:bg-slate-700/40">
                                {actionIcon(a)}{a}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 ml-3 flex-shrink-0">
                        <button onClick={() => setExpandedRule(isExpanded ? null : rule.id)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title="查看详情" aria-label="收起">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => { setEditingRule(rule); setShowEditor(true); }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title="编辑"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleCopy(rule)} className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all" title="复制"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="删除" aria-label="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="mt-3 ml-10 p-3 bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/30 space-y-2">
                        <div className="text-[10px] text-slate-400">{rule.description}</div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="p-2.5 bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg"><span className="text-slate-500">触发条件:</span> <span className="text-slate-300">{rule.triggerDesc}</span></div>
                          <div className="p-2.5 bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg"><span className="text-slate-500">生效时间:</span> <span className="text-slate-300">{rule.timeRange}</span></div>
                          <div className="p-2.5 bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg"><span className="text-slate-500">联网单位:</span> <span className="text-slate-300">{rule.units.join(', ')}</span></div>
                          <div className="p-2.5 bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg"><span className="text-slate-500">设备类型:</span> <span className="text-slate-300">{rule.deviceTypes.join(', ')}</span></div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span>累计触发: {rule.triggerCount} 次</span>
                          {rule.lastTriggered !== '-' && <span>最近触发: {rule.lastTriggered}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Logs Tab */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">共 {logs.length} 条记录</span>
            </div>
            <button className="text-[10px] px-3 py-1.5 bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 text-slate-400 rounded-lg hover:text-slate-200 hover:bg-slate-700/40 transition-all flex items-center gap-1">
              <Download className="w-3 h-3" />导出记录
            </button>
          </div>
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="text-[10px] text-slate-400 border-b border-slate-700/30 bg-slate-800/60">
                <th className="text-left p-3">时间</th><th className="text-left p-3">规则</th><th className="text-left p-3">触发源</th>
                <th className="text-left p-3">执行动作</th><th className="text-left p-3">结果</th><th className="text-left p-3">耗时</th>
              </tr></thead>
              <tbody className="text-[11px]">
                {logs.map(log => {
                  const rc = resultCfg(log.result);
                  return (
                    <tr key={log.id} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                      <td className="p-3 text-slate-400 font-mono">{log.time}</td>
                      <td className="p-3"><span className="text-slate-200">{log.ruleName}</span><span className="text-slate-600 text-[9px] ml-1">{log.ruleId}</span></td>
                      <td className="p-3 text-slate-400">{log.trigger}</td>
                      <td className="p-3"><div className="flex flex-wrap gap-1">{log.actions.map((a: any, i: number) => <span key={i} className="text-[8px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20">{a}</span>)}</div></td>
                      <td className="p-3"><span className={`flex items-center gap-1 ${rc.color}`}><rc.icon className="w-3 h-3" />{rc.label}</span></td>
                      <td className="p-3 text-slate-500 font-mono">{log.duration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <LinkageRuleEditor
          rule={editingRule}
          onSave={async (r) => {
            if (editingRule) { await handleSaveEdit(r); }
            else {
              const newRule = { ...r, id: `LK-${Date.now()}` };
              setRules(prev => [...prev, newRule]);
              setShowEditor(false);
              try { await syncRule(newRule, true); } catch { /* ignore */ }
            }
          }}
          onClose={() => { setShowEditor(false); setEditingRule(null); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Linkage Rule Editor Modal
   ═══════════════════════════════════════════════ */
function LinkageRuleEditor({ rule, onSave, onClose }: { rule: LinkageRule | null; onSave: (r: LinkageRule) => void; onClose: () => void }) {
  const [form, setForm] = useState<Partial<LinkageRule>>(rule ? { ...rule } : {
    name: '', type: 'fire-video', trigger: '', triggerDesc: '', actions: [], targets: [],
    enabled: true, priority: 'medium', timeRange: '00:00-23:59', units: ['全部单位'], deviceTypes: [],
    lastTriggered: '-', triggerCount: 0, description: '',
  });

  const actionOptions = ['调取最近摄像头视频', '弹窗显示告警画面', '自动录像', 'AI烟火识别分析', '生成巡检提醒工单', '推送运维人员', '启动事件录像', '记录联动结果', '生成预警事件', 'App推送', '短信通知', '现场抓拍', '生成隐患工单', '声光预警', '生成维保工单', '大屏高亮', '全开所有摄像头', '全通道录像', '启动应急预案', '通知119', '疏散广播', '释放全部门禁'];

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-slate-800/90 backdrop-blur-md border border-slate-700/30 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200">{rule ? '编辑联动规则' : '新建联动规则'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-700/30 rounded-lg transition-all" aria-label="关闭"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">规则名称</label>
            <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-500/50 transition-colors" placeholder="输入规则名称" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">优先级</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })} className="w-full bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-500/50 transition-colors">
                <option value="high">高</option><option value="medium">中</option><option value="low">低</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">生效时间段</label>
              <input value={form.timeRange || ''} onChange={e => setForm({ ...form, timeRange: e.target.value })} className="w-full bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-500/50 transition-colors" placeholder="00:00-23:59" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">触发条件</label>
            <input value={form.trigger || ''} onChange={e => setForm({ ...form, trigger: e.target.value })} className="w-full bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-500/50 transition-colors" placeholder="输入触发条件" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">联动动作</label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {actionOptions.map(a => (
                <button
                  key={a}
                  onClick={() => {
                    const current = form.actions || [];
                    setForm({ ...form, actions: current.includes(a) ? current.filter(x => x !== a) : [...current, a] });
                  }}
                  className={`text-[9px] px-2 py-1 rounded-lg border transition-all ${(form.actions || []).includes(a) ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-slate-800/40 text-slate-400 border-slate-700/30 hover:bg-slate-700/30'}`}
                >{a}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">联网单位</label>
            <input value={(form.units || []).join(', ')} onChange={e => setForm({ ...form, units: e.target.value.split(',').map((s: any) => s.trim()) })} className="w-full bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-500/50 transition-colors" placeholder="全部单位, 万达广场, 兰州中心" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">描述</label>
            <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none resize-none placeholder:text-slate-500 focus:border-slate-500/50 transition-colors" placeholder="规则描述" />
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-700/30 rounded-lg bg-slate-800/40 backdrop-blur-sm hover:bg-slate-700/40 transition-all">取消</button>
          <button onClick={() => onSave(form as LinkageRule)} className="px-4 py-2 bg-blue-500/90 hover:bg-blue-500 text-white text-xs rounded-lg flex items-center gap-1.5 backdrop-blur-sm transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"><Save className="w-3.5 h-3.5" />保存</button>
        </div>
      </div>
    </div>
  );
}
