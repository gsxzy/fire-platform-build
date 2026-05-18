import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Edit3, Save, X, Sliders, Megaphone,
  ChevronRight, Search
} from 'lucide-react';
import DataContainer from '@/components/DataContainer';

/* ─── Types ─── */
interface ThresholdRule {
  id: number;
  name: string;
  device_type?: string;
  metric_type: string;
  operator: string;
  threshold_value: number;
  duration_seconds: number;
  alarm_type: number;
  alarm_level: number;
  status: number;
  created_at?: string;
}

interface NotifyPolicy {
  id: number;
  name: string;
  alarm_types?: number[];
  alarm_levels?: number[];
  channels?: Record<string, boolean>;
  targets?: any[];
  escalation_enabled: number;
  escalation_minutes: number;
  escalation_targets?: any[];
  status: number;
  created_at?: string;
}

/* ─── Helpers ─── */
const METRIC_LABELS: Record<string, string> = {
  temperature: '温度', pressure: '水压', level: '液位',
  smoke: '烟雾', voltage: '电压', current: '电流',
};
const OP_LABELS: Record<string, string> = { '>': '大于', '>=': '大于等于', '<': '小于', '<=': '小于等于', '==': '等于' };
const TYPE_LABELS: Record<number, string> = { 1: '火警', 2: '故障', 3: '预警' };
const LEVEL_LABELS: Record<number, string> = { 1: '一般', 2: '严重', 3: '紧急' };

export default function AlarmConfigPage() {
  const [tab, setTab] = useState<'threshold' | 'policy'>('threshold');

  /* Threshold state */
  const [tRules, setTRules] = useState<ThresholdRule[]>([]);
  const [tLoading, setTLoading] = useState(false);
  const [tError, setTError] = useState<Error | null>(null);
  const [tKeyword, setTKeyword] = useState('');
  const [tEditing, setTEditing] = useState<ThresholdRule | null>(null);
  const [tForm, setTForm] = useState<Partial<ThresholdRule>>({});

  /* Policy state */
  const [pRules, setPRules] = useState<NotifyPolicy[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState<Error | null>(null);
  const [pKeyword, setPKeyword] = useState('');
  const [pEditing, setPEditing] = useState<NotifyPolicy | null>(null);
  const [pForm, setPForm] = useState<Partial<NotifyPolicy>>({});

  const loadThresholds = useCallback(async () => {
    setTLoading(true); setTError(null);
    try {
      const res = await fetch('/api/alarms/config/thresholds?pageSize=999').then(r => r.json());
      setTRules(res?.data?.list || []);
    } catch (e) {
      setTError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setTLoading(false);
    }
  }, []);

  const loadPolicies = useCallback(async () => {
    setPLoading(true); setPError(null);
    try {
      const res = await fetch('/api/alarms/config/policies?pageSize=999').then(r => r.json());
      setPRules(res?.data?.list || []);
    } catch (e) {
      setPError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setPLoading(false);
    }
  }, []);

  useEffect(() => { loadThresholds(); loadPolicies(); }, [loadThresholds, loadPolicies]);

  const tFiltered = tRules.filter(r =>
    !tKeyword || r.name.includes(tKeyword) || (r.device_type || '').includes(tKeyword) || r.metric_type.includes(tKeyword)
  );
  const pFiltered = pRules.filter(r =>
    !pKeyword || r.name.includes(pKeyword)
  );

  const saveThreshold = async () => {
    const body = {
      name: tForm.name,
      device_type: tForm.device_type || null,
      metric_type: tForm.metric_type,
      operator: tForm.operator,
      threshold_value: Number(tForm.threshold_value),
      duration_seconds: Number(tForm.duration_seconds || 0),
      alarm_type: Number(tForm.alarm_type || 3),
      alarm_level: Number(tForm.alarm_level || 2),
      status: Number(tForm.status ?? 1),
    };
    const url = tEditing ? `/api/alarms/config/thresholds/${tEditing.id}` : '/api/alarms/config/thresholds';
    const method = tEditing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setTEditing(null); setTForm({}); loadThresholds();
  };

  const savePolicy = async () => {
    const body = {
      name: pForm.name,
      alarm_types: pForm.alarm_types || [],
      alarm_levels: pForm.alarm_levels || [],
      channels: pForm.channels || { sms: false, email: false, app: true, voice: false },
      targets: pForm.targets || [],
      escalation_enabled: Number(pForm.escalation_enabled || 0),
      escalation_minutes: Number(pForm.escalation_minutes || 5),
      escalation_targets: pForm.escalation_targets || [],
      status: Number(pForm.status ?? 1),
    };
    const url = pEditing ? `/api/alarms/config/policies/${pEditing.id}` : '/api/alarms/config/policies';
    const method = pEditing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setPEditing(null); setPForm({}); loadPolicies();
  };

  const delThreshold = async (id: number) => {
    if (!confirm('确定删除该阈值规则？')) return;
    await fetch(`/api/alarms/config/thresholds/${id}`, { method: 'DELETE' });
    loadThresholds();
  };

  const delPolicy = async (id: number) => {
    if (!confirm('确定删除该通知策略？')) return;
    await fetch(`/api/alarms/config/policies/${id}`, { method: 'DELETE' });
    loadPolicies();
  };

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>告警中心</span><ChevronRight className="w-3 h-3" /><span className="text-slate-300">告警配置</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit">
        <button
          onClick={() => setTab('threshold')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
            tab === 'threshold' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />阈值规则
        </button>
        <button
          onClick={() => setTab('policy')}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
            tab === 'policy' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />通知策略
        </button>
      </div>

      {tab === 'threshold' ? (
        <DataContainer loading={tLoading} error={tError} data={tFiltered} onRetry={loadThresholds} emptyText="暂无阈值规则">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  value={tKeyword}
                  onChange={e => setTKeyword(e.target.value)}
                  placeholder="搜索规则名称/设备类型/指标..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <button
                onClick={() => { setTEditing(null); setTForm({ metric_type: 'temperature', operator: '>', alarm_type: 3, alarm_level: 2, status: 1 }); }}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />新增规则
              </button>
            </div>

            {(tEditing || tForm.name !== undefined) && (
              <div className="glass rounded-xl p-4 space-y-3 animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">{tEditing ? '编辑阈值规则' : '新增阈值规则'}</span>
                  <button onClick={() => { setTEditing(null); setTForm({}); }} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">规则名称</label>
                    <input value={tForm.name || ''} onChange={e => setTForm(f => ({ ...f, name: e.target.value }))} className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">设备类型</label>
                    <input value={tForm.device_type || ''} onChange={e => setTForm(f => ({ ...f, device_type: e.target.value }))} placeholder="为空则匹配全部" className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">指标类型</label>
                    <select value={tForm.metric_type || 'temperature'} onChange={e => setTForm(f => ({ ...f, metric_type: e.target.value }))} className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500/50">
                      {Object.entries(METRIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">运算符</label>
                    <select value={tForm.operator || '>'} onChange={e => setTForm(f => ({ ...f, operator: e.target.value }))} className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500/50">
                      {Object.entries(OP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">阈值</label>
                    <input type="number" step="0.01" value={tForm.threshold_value || ''} onChange={e => setTForm(f => ({ ...f, threshold_value: Number(e.target.value) }))} className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">持续时间(秒)</label>
                    <input type="number" value={tForm.duration_seconds || 0} onChange={e => setTForm(f => ({ ...f, duration_seconds: Number(e.target.value) }))} className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">触发告警类型</label>
                    <select value={tForm.alarm_type || 3} onChange={e => setTForm(f => ({ ...f, alarm_type: Number(e.target.value) }))} className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500/50">
                      {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">触发告警级别</label>
                    <select value={tForm.alarm_level || 2} onChange={e => setTForm(f => ({ ...f, alarm_level: Number(e.target.value) }))} className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500/50">
                      {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-300">
                    <input type="checkbox" checked={!!tForm.status} onChange={e => setTForm(f => ({ ...f, status: e.target.checked ? 1 : 0 }))} className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-0" />
                    启用
                  </label>
                  <button onClick={saveThreshold} className="ml-auto px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5" />保存
                  </button>
                </div>
              </div>
            )}

            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50 text-slate-500">
                    <th className="px-3 py-2 text-left font-medium">规则名称</th>
                    <th className="px-3 py-2 text-left font-medium">指标</th>
                    <th className="px-3 py-2 text-left font-medium">条件</th>
                    <th className="px-3 py-2 text-left font-medium">触发</th>
                    <th className="px-3 py-2 text-left font-medium">状态</th>
                    <th className="px-3 py-2 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tFiltered.map(rule => (
                    <tr key={rule.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2 text-slate-200">{rule.name}</td>
                      <td className="px-3 py-2 text-slate-400">{METRIC_LABELS[rule.metric_type] || rule.metric_type}</td>
                      <td className="px-3 py-2 text-slate-400">{OP_LABELS[rule.operator] || rule.operator} {rule.threshold_value}{rule.duration_seconds > 0 ? ` (${rule.duration_seconds}s)` : ''}</td>
                      <td className="px-3 py-2 text-slate-400">{TYPE_LABELS[rule.alarm_type]} / {LEVEL_LABELS[rule.alarm_level]}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${rule.status ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                          {rule.status ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setTEditing(rule); setTForm({ ...rule }); }} className="p-1 text-slate-500 hover:text-blue-400 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => delThreshold(rule.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DataContainer>
      ) : (
        <DataContainer loading={pLoading} error={pError} data={pFiltered} onRetry={loadPolicies} emptyText="暂无通知策略">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  value={pKeyword}
                  onChange={e => setPKeyword(e.target.value)}
                  placeholder="搜索策略名称..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <button
                onClick={() => { setPEditing(null); setPForm({ alarm_types: [1, 2, 3], alarm_levels: [2, 3], channels: { sms: false, email: false, app: true, voice: false }, escalation_enabled: 0, escalation_minutes: 5, status: 1 }); }}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />新增策略
              </button>
            </div>

            {(pEditing || pForm.name !== undefined) && (
              <div className="glass rounded-xl p-4 space-y-3 animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">{pEditing ? '编辑通知策略' : '新增通知策略'}</span>
                  <button onClick={() => { setPEditing(null); setPForm({}); }} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">策略名称</label>
                    <input value={pForm.name || ''} onChange={e => setPForm(f => ({ ...f, name: e.target.value }))} className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">适用告警级别</label>
                    <select multiple value={(pForm.alarm_levels || []).map(String)} onChange={e => {
                      const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                      setPForm(f => ({ ...f, alarm_levels: opts }));
                    }} className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500/50">
                      {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">升级时间(分钟)</label>
                    <input type="number" value={pForm.escalation_minutes || 5} onChange={e => setPForm(f => ({ ...f, escalation_minutes: Number(e.target.value) }))} className="w-full px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-200 focus:outline-none focus:border-blue-500/50" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {Object.entries({ sms: '短信', email: '邮件', app: 'App推送', voice: '语音电话' }).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-1.5 text-xs text-slate-300">
                      <input type="checkbox" checked={!!(pForm.channels as any)?.[k]} onChange={e => setPForm(f => ({ ...f, channels: { ...(f.channels || {}), [k]: e.target.checked } }))} className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-0" />
                      {label}
                    </label>
                  ))}
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 ml-auto">
                    <input type="checkbox" checked={!!pForm.escalation_enabled} onChange={e => setPForm(f => ({ ...f, escalation_enabled: e.target.checked ? 1 : 0 }))} className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-0" />
                    启用升级
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300">
                    <input type="checkbox" checked={!!pForm.status} onChange={e => setPForm(f => ({ ...f, status: e.target.checked ? 1 : 0 }))} className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-0" />
                    启用
                  </label>
                  <button onClick={savePolicy} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5" />保存
                  </button>
                </div>
              </div>
            )}

            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50 text-slate-500">
                    <th className="px-3 py-2 text-left font-medium">策略名称</th>
                    <th className="px-3 py-2 text-left font-medium">适用级别</th>
                    <th className="px-3 py-2 text-left font-medium">通知渠道</th>
                    <th className="px-3 py-2 text-left font-medium">升级</th>
                    <th className="px-3 py-2 text-left font-medium">状态</th>
                    <th className="px-3 py-2 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pFiltered.map(policy => (
                    <tr key={policy.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2 text-slate-200">{policy.name}</td>
                      <td className="px-3 py-2 text-slate-400">{(policy.alarm_levels || []).map((l: number) => LEVEL_LABELS[l]).join(', ')}</td>
                      <td className="px-3 py-2 text-slate-400">
                        {Object.entries(policy.channels || {}).filter(([, v]) => v).map(([k]) => ({ sms: '短信', email: '邮件', app: 'App', voice: '语音' }[k])).join(', ')}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{policy.escalation_enabled ? `${policy.escalation_minutes}分钟` : '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${policy.status ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                          {policy.status ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setPEditing(policy); setPForm({ ...policy }); }} className="p-1 text-slate-500 hover:text-blue-400 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => delPolicy(policy.id)} className="p-1 text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DataContainer>
      )}
    </div>
  );
}
