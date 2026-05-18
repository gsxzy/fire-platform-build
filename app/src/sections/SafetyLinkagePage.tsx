import { useState, useMemo, useEffect } from 'react';
import {
  Link2, ChevronRight, Plus, Edit3, Trash2, Copy,
  CheckCircle, Clock, Flame, Eye,
  Settings, ToggleRight, ToggleLeft, Search,
  AlertTriangle, FileText, Download,
  MapPin, ChevronUp, Activity, Filter, Loader2,
} from 'lucide-react';
import { linkageService } from '@/api/services';
import { logger } from '@/lib/logger';
import { useToast } from '@/core/ToastContext';
import EmptyState from '@/components/EmptyState';
import TableBodyPlaceholder from '@/components/TableBodyPlaceholder';
import type { LinkageRule, LinkageLog } from './safetyLinkage/types';
import {
  fetchAllLinkageRules, rowToRule, ruleToDbPayload,
  priorityCfg, resultCfg, typeIcon, actionIcon,
} from './safetyLinkage/utils';
import LinkageRuleEditor from './safetyLinkage/components/LinkageRuleEditor';

const defaultRules: LinkageRule[] = [];
const defaultLogs: LinkageLog[] = [];

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
      await linkageService.updateRule(Number(id), { status: next ? 1 : 0 });
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
      const created = (await linkageService.createRule(ruleToDbPayload(copy))) as Record<string, unknown>;
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
      await linkageService.deleteRule(Number(id));
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
      await linkageService.updateRule(Number(updated.id), ruleToDbPayload(updated));
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
                const created = (await linkageService.createRule(ruleToDbPayload(r))) as Record<string, unknown>;
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
