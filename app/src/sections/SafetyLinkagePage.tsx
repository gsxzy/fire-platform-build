import { useState, useMemo, useEffect } from 'react';
import {
  Link2, ChevronRight, Plus, X, Save, Edit3, Trash2, Copy,
  CheckCircle, XCircle, Clock, Flame, Shield, Eye, Play,
  Settings, ToggleRight, ToggleLeft, Search,
  AlertTriangle, Bell, Camera, Wrench, BrainCircuit,
  DoorOpen, Droplets, Users, FileText, Download,
  MapPin, ChevronUp, Video,
  Zap, Activity,   Filter, Loader2
} from 'lucide-react';
import { legacyApi } from '@/api/services';
import { logger } from '@/lib/logger';
import { useToast } from '@/core/ToastContext';
import EmptyState from '@/components/EmptyState';
import TableBodyPlaceholder from '@/components/TableBodyPlaceholder';

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
  /** 指定触发设备时仅该设备告警匹配；留空表示任意设备 */
  triggerDeviceId?: string;
  /** 限制的告警类型（与 fire_alarm.alarm_type 一致），空表示不按类型额外过滤 */
  alarmTypes?: number[];
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
const defaultRules: LinkageRule[] = [];

const defaultLogs: LinkageLog[] = [];

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapUiActionLabel(label: string): { deviceId: number; command: string; params: Record<string, unknown> } {
  if (label.includes('门禁') || label.includes('释放')) {
    return { deviceId: 0, command: 'unlock', params: { description: label } };
  }
  if (label.includes('广播') || label.includes('119')) {
    return { deviceId: 0, command: 'broadcast', params: { description: label } };
  }
  if (label.includes('电梯') || label.includes('归首')) {
    return { deviceId: 0, command: 'floor1', params: { description: label } };
  }
  if (label.includes('电源') || label.includes('强切')) {
    return { deviceId: 0, command: 'power_off', params: { description: label } };
  }
  return { deviceId: 0, command: 'notify', params: { uiAction: label } };
}

function uiActionsToDb(actions: string[]) {
  const devices: number[] = [];
  const commands: { command: string; params: Record<string, unknown>; delay: number }[] = [];
  let delayAcc = 0;
  const stepSec = 1;
  for (const label of actions) {
    const m = mapUiActionLabel(label);
    devices.push(m.deviceId);
    commands.push({ command: m.command, params: m.params, delay: delayAcc });
    delayAcc += stepSec;
  }
  return {
    action_devices: JSON.stringify(devices),
    action_commands: JSON.stringify(commands),
  };
}

function buildTriggerCondition(form: Partial<LinkageRule>): string {
  return JSON.stringify({
    version: 2,
    type: form.type,
    trigger: form.trigger,
    triggerDesc: form.triggerDesc,
    priority: form.priority,
    timeRange: form.timeRange,
    units: form.units,
    deviceTypes: form.deviceTypes ?? [],
    targets: form.targets ?? [],
    description: form.description ?? '',
    actions: form.actions ?? [],
    alarmTypes: form.alarmTypes ?? [],
  });
}

function ruleToDbPayload(form: LinkageRule): Record<string, unknown> {
  const ac = uiActionsToDb(form.actions);
  const tid = form.triggerDeviceId?.trim();
  return {
    rule_name: form.name,
    trigger_type: 1,
    trigger_device_id: tid ? Number(tid) : null,
    trigger_condition: buildTriggerCondition(form),
    action_devices: ac.action_devices,
    action_commands: ac.action_commands,
    status: form.enabled ? 1 : 0,
  };
}

function deriveActionsFromCommands(row: { action_commands?: string }): string[] {
  const cmds = safeParseJson<Array<{ params?: { uiAction?: string; description?: string } }>>(row.action_commands, []);
  const out = cmds
    .map((c) => (c.params?.uiAction || c.params?.description || '').trim())
    .filter(Boolean);
  return out;
}

function rowToRule(row: Record<string, unknown>): LinkageRule {
  const cond = safeParseJson<Partial<LinkageRule> & { actions?: string[]; alarmTypes?: number[] }>(
    row.trigger_condition as string,
    {},
  );
  const acts =
    Array.isArray(cond.actions) && cond.actions.length > 0
      ? cond.actions
      : deriveActionsFromCommands(row as { action_commands?: string });
  const tid = row.trigger_device_id;
  return {
    id: String(row.id ?? ''),
    name: (row.rule_name as string) || cond.name || '未命名',
    type: cond.type || 'fire-video',
    trigger: cond.trigger || '',
    triggerDesc: cond.triggerDesc || '',
    actions: acts,
    targets: cond.targets || [],
    enabled: row.status === 1,
    priority: (cond.priority as LinkageRule['priority']) || 'medium',
    timeRange: cond.timeRange || '00:00-23:59',
    units: cond.units?.length ? (cond.units as string[]) : ['全部单位'],
    deviceTypes: cond.deviceTypes || [],
    lastTriggered: '-',
    triggerCount: 0,
    description: cond.description || '',
    triggerDeviceId: tid != null && tid !== '' ? String(tid) : '',
    alarmTypes: Array.isArray(cond.alarmTypes) ? cond.alarmTypes : [],
  };
}

async function fetchAllLinkageRules(): Promise<Record<string, unknown>[]> {
  const pageSize = 100;
  let pageNum = 1;
  const all: Record<string, unknown>[] = [];
  for (;;) {
    const data = (await legacyApi.linkageRuleList({ pageNum, pageSize })) as { list?: Record<string, unknown>[] };
    const list = data?.list ?? [];
    all.push(...list);
    if (list.length < pageSize) break;
    pageNum += 1;
    if (pageNum > 50) break;
  }
  return all;
}

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
  const { error: showError } = useToast();
  const [rules, setRules] = useState<LinkageRule[]>(defaultRules);
  const [logs] = useState<LinkageLog[]>(defaultLogs);
  const [activeTab, setActiveTab] = useState<'rules' | 'logs'>('rules');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<LinkageRule | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loadRules, setLoadRules] = useState(true);

  useEffect(() => {
    setLoadRules(true);
    fetchAllLinkageRules()
      .then((rows) => setRules(rows.map(rowToRule)))
      .catch((e) => {
        showError('加载失败', '联动规则加载出错，请确认后端已提供 /linkage/rules');
        logger.error(e);
      })
      .finally(() => setLoadRules(false));
  }, []);

  const toggleEnable = async (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const next = !target.enabled;
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: next } : r)));
    try {
      await legacyApi.updateLinkageRule(Number(id), { status: next ? 1 : 0 });
    } catch (e) {
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !next } : r)));
      showError('更新失败', '无法更新规则状态');
      logger.error(e);
    }
  };

  const handleCopy = async (rule: LinkageRule) => {
    const copy: LinkageRule = {
      ...rule,
      id: 'temp',
      name: `${rule.name} (复制)`,
      enabled: false,
      triggerCount: 0,
      lastTriggered: '-',
    };
    try {
      const created = (await legacyApi.createLinkageRule(ruleToDbPayload(copy))) as Record<string, unknown>;
      setRules((prev) => [...prev, rowToRule(created)]);
    } catch (e) {
      showError('保存失败', '请检查网络或稍后重试');
      logger.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    const prev = rules;
    setRules((prevList) => prevList.filter((r) => r.id !== id));
    try {
      await legacyApi.deleteLinkageRule(Number(id));
    } catch (e) {
      setRules(prev);
      showError('删除失败', '请检查网络或稍后重试');
      logger.error(e);
    }
  };

  const handleSaveEdit = async (updated: LinkageRule) => {
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setShowEditor(false);
    setEditingRule(null);
    try {
      await legacyApi.updateLinkageRule(Number(updated.id), ruleToDbPayload(updated));
    } catch (e) {
      showError('保存失败', '请检查网络或稍后重试');
      logger.error(e);
    }
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
          <div className="space-y-2 min-h-[160px]">
            {loadRules ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-slate-500">
                <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
                <span className="text-xs">联动规则加载中，请稍候…</span>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                type={search.trim() || priorityFilter !== 'all' || statusFilter !== 'all' ? 'search' : 'data'}
                title={search.trim() || priorityFilter !== 'all' || statusFilter !== 'all' ? '未找到匹配规则' : '暂无联动规则'}
                description={
                  search.trim() || priorityFilter !== 'all' || statusFilter !== 'all'
                    ? '请调整搜索词或筛选条件后重试。'
                    : '点击「新建规则」配置告警与视频的联动策略；规则可同步至后端预案库以便多终端一致。'
                }
                icon={Link2}
                className="py-10"
                action={
                  <button
                    type="button"
                    onClick={() => { setEditingRule(null); setShowEditor(true); }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg"
                  >
                    新建规则
                  </button>
                }
              />
            ) : filtered.map(rule => {
              const pc = priorityCfg(rule.priority);
              const isExpanded = expandedRule === rule.id;
              return (
                <div key={rule.id} className={`bg-slate-800/40 backdrop-blur-sm border rounded-xl transition-all hover:bg-slate-700/40 hover:scale-[1.01] ${rule.enabled ? 'border-slate-700/30' : 'border-slate-700/20 opacity-60'}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button type="button" onClick={() => { void toggleEnable(rule.id); }} className="mt-0.5 flex-shrink-0 p-1 hover:bg-slate-700/30 rounded-lg transition-all" aria-label="切换">
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
                {logs.length === 0 ? (
                  <TableBodyPlaceholder
                    colSpan={6}
                    isEmpty
                    emptyTitle="暂无联动执行记录"
                    emptyDescription="规则触发并执行动作后，将在此留痕；若长期为空，请确认联动引擎与日志上报是否已接入。"
                  />
                ) : (
                  logs.map(log => {
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
                  })
                )}
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
            if (editingRule) {
              await handleSaveEdit(r);
            } else {
              setShowEditor(false);
              setEditingRule(null);
              try {
                const created = (await legacyApi.createLinkageRule(ruleToDbPayload(r))) as Record<string, unknown>;
                setRules((prev) => [...prev, rowToRule(created)]);
              } catch (e) {
                showError('保存失败', '请检查网络或稍后重试');
                logger.error(e);
              }
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
const ALARM_TYPE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '火警' },
  { value: 2, label: '故障' },
  { value: 3, label: '预警' },
  { value: 4, label: '屏蔽' },
  { value: 5, label: '其他' },
];

const RULE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'fire-video', label: '火警视频联动' },
  { value: 'fault-video', label: '故障视频联动' },
  { value: 'feedback', label: '反馈联动' },
  { value: 'ai-recognition', label: 'AI 识别' },
  { value: 'blockage', label: '通道堵塞' },
  { value: 'vacancy', label: '离岗监测' },
  { value: 'water-low', label: '水位/水压' },
  { value: 'key-area', label: '重点区域' },
];

function LinkageRuleEditor({ rule, onSave, onClose }: { rule: LinkageRule | null; onSave: (r: LinkageRule) => void; onClose: () => void }) {
  const [form, setForm] = useState<Partial<LinkageRule>>(rule ? { ...rule } : {
    name: '', type: 'fire-video', trigger: '', triggerDesc: '', actions: [], targets: [],
    enabled: true, priority: 'medium', timeRange: '00:00-23:59', units: ['全部单位'], deviceTypes: [],
    lastTriggered: '-', triggerCount: 0, description: '',
    triggerDeviceId: '', alarmTypes: [],
  });

  const actionOptions = ['调取最近摄像头视频', '弹窗显示告警画面', '自动录像', 'AI烟火识别分析', '生成巡检提醒工单', '推送运维人员', '启动事件录像', '记录联动结果', '生成预警事件', 'App推送', '短信通知', '现场抓拍', '生成隐患工单', '声光预警', '生成维保工单', '大屏高亮', '全开所有摄像头', '全通道录像', '启动应急预案', '通知119', '疏散广播', '释放全部门禁'];

  const toFullRule = (): LinkageRule => ({
    id: rule?.id ?? '0',
    name: (form.name || '').trim() || '未命名规则',
    type: form.type || 'fire-video',
    trigger: form.trigger || '',
    triggerDesc: form.triggerDesc || '',
    actions: form.actions || [],
    targets: form.targets || [],
    enabled: form.enabled !== false,
    priority: (form.priority as LinkageRule['priority']) || 'medium',
    timeRange: form.timeRange || '00:00-23:59',
    units: form.units?.length ? form.units : ['全部单位'],
    deviceTypes: form.deviceTypes || [],
    lastTriggered: form.lastTriggered || '-',
    triggerCount: form.triggerCount ?? 0,
    description: form.description || '',
    triggerDeviceId: form.triggerDeviceId || '',
    alarmTypes: Array.isArray(form.alarmTypes) ? form.alarmTypes : [],
  });

  const toggleAlarmType = (v: number) => {
    const cur = form.alarmTypes || [];
    setForm({
      ...form,
      alarmTypes: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v].sort((a, b) => a - b),
    });
  };

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
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">规则场景</label>
            <select
              value={form.type || 'fire-video'}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-500/50 transition-colors"
            >
              {RULE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
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
            <label className="text-[10px] text-slate-400 mb-1 block">触发条件摘要</label>
            <input value={form.trigger || ''} onChange={e => setForm({ ...form, trigger: e.target.value })} className="w-full bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-500/50 transition-colors" placeholder="列表中展示的触发说明" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">触发说明（详情）</label>
            <input value={form.triggerDesc || ''} onChange={e => setForm({ ...form, triggerDesc: e.target.value })} className="w-full bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-500/50 transition-colors" placeholder="展开详情时展示" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">触发设备 ID（可选）</label>
            <input
              value={form.triggerDeviceId || ''}
              onChange={(e) => setForm({ ...form, triggerDeviceId: e.target.value })}
              className="w-full bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-500/50 transition-colors font-mono"
              placeholder="留空 = 任意设备告警均可匹配（在火警/高级别策略下）"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">告警类型过滤（不选 = 不按类型过滤）</label>
            <div className="flex flex-wrap gap-1.5">
              {ALARM_TYPE_OPTIONS.map((o) => {
                const on = (form.alarmTypes || []).includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggleAlarmType(o.value)}
                    className={`text-[9px] px-2 py-1 rounded-lg border transition-all ${on ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800/40 text-slate-400 border-slate-700/30 hover:bg-slate-700/30'}`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
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
            <input value={(form.units || []).join(', ')} onChange={e => setForm({ ...form, units: e.target.value.split(',').map((s: any) => s.trim()) })} className="w-full bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-slate-500/50 transition-colors" placeholder="全部单位" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">描述</label>
            <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none resize-none placeholder:text-slate-500 focus:border-slate-500/50 transition-colors" placeholder="规则描述" />
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-700/30 rounded-lg bg-slate-800/40 backdrop-blur-sm hover:bg-slate-700/40 transition-all">取消</button>
          <button type="button" onClick={() => onSave(toFullRule())} className="px-4 py-2 bg-blue-500/90 hover:bg-blue-500 text-white text-xs rounded-lg flex items-center gap-1.5 backdrop-blur-sm transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"><Save className="w-3.5 h-3.5" />保存</button>
        </div>
      </div>
    </div>
  );
}
