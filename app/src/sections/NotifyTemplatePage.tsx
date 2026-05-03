import { useState } from 'react';
import {
  Mail, MessageSquare, Bell, ChevronRight, Plus, Edit3, Trash2,
  Eye, X, Save, ToggleLeft, ToggleRight,
  Smartphone, Send
} from 'lucide-react';

interface Template {
  id: number;
  name: string;
  type: 'sms' | 'email' | 'push' | 'wechat';
  channel: string;
  subject?: string;
  content: string;
  variables: string[];
  enabled: boolean;
  usageCount: number;
  lastUsed: string;
}

const templates: Template[] = [
  {
    id: 1, name: '火警告警通知', type: 'sms', channel: '阿里云短信',
    content: '【新致远消防】告警提醒：{unitName}的{deviceName}于{alarmTime}触发{alarmType}，当前值：{currentValue}，请立即处理。',
    variables: ['unitName', 'deviceName', 'alarmTime', 'alarmType', 'currentValue'],
    enabled: true, usageCount: 12856, lastUsed: '2026-04-19 09:15'
  },
  {
    id: 2, name: '设备故障提醒', type: 'push', channel: 'App推送',
    content: '设备故障：{unitName}的{deviceName}发生故障，故障类型：{faultType}，请安排维修人员处理。',
    variables: ['unitName', 'deviceName', 'faultType'],
    enabled: true, usageCount: 8432, lastUsed: '2026-04-19 08:42'
  },
  {
    id: 3, name: '维保到期提醒', type: 'email', channel: 'SMTP邮件',
    subject: '消防维保到期提醒 - {unitName}',
    content: '您好，\n\n{unitName}的{deviceType}维保将于{expireDate}到期，请及时安排维保工作。\n\n设备位置：{location}\n负责人：{manager}\n联系电话：{phone}',
    variables: ['unitName', 'deviceType', 'expireDate', 'location', 'manager', 'phone'],
    enabled: true, usageCount: 3256, lastUsed: '2026-04-18 16:20'
  },
  {
    id: 4, name: '工单派发通知', type: 'wechat', channel: '企业微信',
    content: '新的维保工单已派发：\n工单编号：{orderNo}\n工单类型：{orderType}\n优先级：{priority}\n地点：{location}\n截止时间：{deadline}',
    variables: ['orderNo', 'orderType', 'priority', 'location', 'deadline'],
    enabled: false, usageCount: 5621, lastUsed: '2026-04-17 14:10'
  },
  {
    id: 5, name: '巡检异常上报', type: 'sms', channel: '阿里云短信',
    content: '【新致远消防】巡检异常：{unitName}{location}的{checkItem}检查结果为异常，异常描述：{description}，拍照：{photoUrl}',
    variables: ['unitName', 'location', 'checkItem', 'description', 'photoUrl'],
    enabled: true, usageCount: 1890, lastUsed: '2026-04-18 11:35'
  },
  {
    id: 6, name: '系统日报', type: 'email', channel: 'SMTP邮件',
    subject: '智慧消防平台日报 - {date}',
    content: '尊敬的管理员，\n\n{date}平台运行日报：\n告警总数：{alarmCount}\n已处理：{handledCount}\n待处理：{pendingCount}\n设备在线率：{onlineRate}%\n\n详情请登录平台查看。',
    variables: ['date', 'alarmCount', 'handledCount', 'pendingCount', 'onlineRate'],
    enabled: true, usageCount: 30, lastUsed: '2026-04-19 08:00'
  },
];

const typeIcon = (type: string) => {
  switch (type) {
    case 'sms': return <Smartphone className="w-3.5 h-3.5 text-purple-400" />;
    case 'email': return <Mail className="w-3.5 h-3.5 text-blue-400" />;
    case 'push': return <Bell className="w-3.5 h-3.5 text-orange-400" />;
    case 'wechat': return <MessageSquare className="w-3.5 h-3.5 text-green-400" />;
    default: return <Send className="w-3.5 h-3.5 text-slate-400" />;
  }
};

const typeLabel = (type: string) => {
  switch (type) {
    case 'sms': return '短信';
    case 'email': return '邮件';
    case 'push': return 'App推送';
    case 'wechat': return '微信';
    default: return type;
  }
};

export default function NotifyTemplatePage() {
  const [templateList, setTemplateList] = useState(templates);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  const toggleEnable = (id: number) => {
    setTemplateList(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  };

  const openEditor = (t?: Template) => {
    if (t) {
      setEditing({ ...t });
      setPreviewData({});
    } else {
      setEditing({ id: Date.now(), name: '', type: 'sms', channel: '', content: '', variables: [], enabled: true, usageCount: 0, lastUsed: '-' });
    }
    setShowEditor(true);
  };

  const handleSave = () => {
    if (!editing) return;
    setTemplateList(prev => {
      const exists = prev.find(t => t.id === editing.id);
      if (exists) return prev.map(t => t.id === editing.id ? editing : t);
      return [...prev, editing];
    });
    setShowEditor(false);
    setEditing(null);
  };

  const renderPreview = (content: string, vars: string[]) => {
    let result = content;
    vars.forEach(v => {
      const val = previewData[v] || `{${v}}`;
      result = result.replace(new RegExp(`\\{${v}\\}`, 'g'), val);
    });
    return result;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>系统管理</span><ChevronRight className="w-3 h-3" /><span className="text-slate-300">通知模板</span>
        </div>
        <button onClick={() => openEditor()} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />新建模板
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: '短信模板', value: templateList.filter(t => t.type === 'sms').length, icon: Smartphone, color: 'purple' },
          { label: '邮件模板', value: templateList.filter(t => t.type === 'email').length, icon: Mail, color: 'blue' },
          { label: '推送模板', value: templateList.filter(t => t.type === 'push').length, icon: Bell, color: 'orange' },
          { label: '微信模板', value: templateList.filter(t => t.type === 'wechat').length, icon: MessageSquare, color: 'green' },
          { label: '本月发送', value: '32,085', icon: Send, color: 'emerald' },
        ].map((s: any, i: number) => (
          <div key={i} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 text-${s.color}-400`} />
              <span className="text-xs text-slate-400">{s.label}</span>
            </div>
            <div className="text-xl font-bold text-slate-100">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Template List */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/30">
        <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
          <h3 className="text-xs font-medium text-slate-200">模板列表</h3>
          <span className="text-[10px] text-slate-500">共 {templateList.length} 个模板</span>
        </div>
        <div className="divide-y divide-slate-700/30">
          {templateList.map(t => (
            <div key={t.id} className="p-4 hover:bg-slate-700/20 transition-colors group">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {typeIcon(t.type)}
                    <span className="text-xs text-slate-200 font-medium">{t.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-700/30 rounded text-slate-400">{typeLabel(t.type)}</span>
                    <span className="text-[9px] text-slate-500">{t.channel}</span>
                    {t.enabled ? (
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 rounded text-emerald-400">启用</span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-700/30 rounded text-slate-500">停用</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{t.content}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span>变量: {t.variables.join(', ')}</span>
                    <span>使用 {t.usageCount.toLocaleString()} 次</span>
                    <span>最近使用: {t.lastUsed}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleEnable(t.id)} className="p-1.5 text-slate-400 hover:text-slate-200" title={t.enabled ? '停用' : '启用'} aria-label="切换">
                    {t.enabled ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                  </button>
                  <button onClick={() => { setPreviewData({}); setEditing(t); setShowPreview(true); }} className="p-1.5 text-slate-400 hover:text-blue-400" title="预览" aria-label="查看">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEditor(t)} className="p-1.5 text-slate-400 hover:text-blue-400" title="编辑">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-red-400" title="删除" aria-label="删除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-200">{editing.id > 100 ? '编辑模板' : '新建模板'}</h3>
              <button onClick={() => { setShowEditor(false); setEditing(null); }} className="text-slate-500 hover:text-slate-300" aria-label="关闭"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">模板名称</label>
                  <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none" placeholder="输入模板名称" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">通知渠道</label>
                  <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as any })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 outline-none">
                    <option value="sms">短信</option>
                    <option value="email">邮件</option>
                    <option value="push">App推送</option>
                    <option value="wechat">微信</option>
                  </select>
                </div>
              </div>
              {editing.type === 'email' && (
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">邮件主题</label>
                  <input value={editing.subject || ''} onChange={e => setEditing({ ...editing, subject: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none" placeholder="输入邮件主题，可使用变量" />
                </div>
              )}
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">模板内容</label>
                <textarea value={editing.content} onChange={e => setEditing({ ...editing, content: e.target.value })} rows={6} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none resize-none font-mono" placeholder="输入模板内容，使用 {变量名} 作为占位符" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">可用变量</label>
                <div className="flex flex-wrap gap-1.5">
                  {editing.variables.map((v: any, i: number) => (
                    <span key={i} className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-400 rounded flex items-center gap-1">
                      {'{'}{v}{'}'}
                      <button onClick={() => setEditing({ ...editing, variables: editing.variables.filter((_, j) => j !== i) })} className="hover:text-red-400" aria-label="关闭"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                  <button onClick={() => {
                    const name = prompt('输入变量名（不含花括号）:');
                    if (name) setEditing({ ...editing, variables: [...editing.variables, name] });
                  }} className="text-[10px] px-2 py-1 bg-slate-700/30 text-slate-400 rounded hover:text-slate-200">
                    <Plus className="w-3 h-3 inline" />添加变量
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700/30 flex items-center justify-end gap-2">
              <button onClick={() => { setShowEditor(false); setEditing(null); }} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-600/30 rounded-md">取消</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" />保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 w-full max-w-lg">
            <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-200">模板预览</h3>
              <button onClick={() => setShowPreview(false)} className="text-slate-500 hover:text-slate-300" aria-label="关闭"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400">测试数据填充</label>
                {editing.variables.map(v => (
                  <div key={v} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 w-24">{'{'}{v}{'}'}</span>
                    <input
                      value={previewData[v] || ''}
                      onChange={e => setPreviewData({ ...previewData, [v]: e.target.value })}
                      className="flex-1 bg-slate-700/30 border border-slate-600/30 rounded-md px-2 py-1 text-xs text-slate-200 outline-none"
                      placeholder={`输入 ${v} 的测试值`}
                    />
                  </div>
                ))}
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                <div className="text-[10px] text-slate-500 mb-1">预览效果</div>
                <pre className="text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">{renderPreview(editing.content, editing.variables)}</pre>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700/30 flex justify-end">
              <button onClick={() => setShowPreview(false)} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
