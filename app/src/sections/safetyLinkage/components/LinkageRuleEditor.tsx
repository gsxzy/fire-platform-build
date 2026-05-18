import { useState } from 'react';
import { Save, X } from 'lucide-react';
import type { LinkageRule } from '../types';
import { ALARM_TYPE_OPTIONS, RULE_TYPE_OPTIONS } from '../utils';

export default function LinkageRuleEditor({
  rule,
  onSave,
  onClose,
}: {
  rule: LinkageRule | null;
  onSave: (r: LinkageRule) => void;
  onClose: () => void;
}) {
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
