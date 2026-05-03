import { useState } from 'react';
import {
  Megaphone, Plus, X, Edit3, Trash2, Eye, Pin, PinOff,
  ChevronRight, Calendar, User, Clock, Send, Save
} from 'lucide-react';

interface Notice {
  id: number;
  title: string;
  content: string;
  type: 'system' | 'emergency' | 'maintenance' | 'training';
  priority: 'high' | 'normal' | 'low';
  author: string;
  pinned: boolean;
  published: boolean;
  publishTime: string;
  expireTime?: string;
  readCount: number;
}

const initialNotices: Notice[] = [
  {
    id: 1, title: '关于五一假期消防安全检查的通知',
    content: '各维保单位、消防管理人员：\n\n五一假期将至，为确保假期期间消防安全，请各单位在4月28日前完成以下工作：\n\n1. 对所有消防设备进行全面检查和测试\n2. 确保消防通道畅通无阻\n3. 检查应急照明和疏散指示标志\n4. 确认消防控制室值班人员安排\n5. 更新应急预案并通知相关人员\n\n请各单位高度重视，认真执行。',
    type: 'system', priority: 'high', author: '系统管理员',
    pinned: true, published: true, publishTime: '2026-04-18 09:00', expireTime: '2026-05-05', readCount: 156,
  },
  {
    id: 2, title: '系统升级维护公告',
    content: '尊敬的用户：\n\n为提升系统性能和用户体验，平台将于4月20日凌晨02:00-06:00进行系统升级维护。\n\n维护期间可能出现以下影响：\n• 部分功能暂时不可用\n• 数据同步延迟\n• 推送通知可能中断\n\n请提前做好工作安排，给您带来的不便敬请谅解。',
    type: 'maintenance', priority: 'high', author: '技术运维',
    pinned: true, published: true, publishTime: '2026-04-17 14:00', expireTime: '2026-04-21', readCount: 328,
  },
  {
    id: 3, title: '4月份消防安全培训通知',
    content: '培训时间：2026年4月25日 14:00-16:00\n培训地点：万达消防控制中心\n培训内容：\n1. 新型消防设施操作规范\n2. 火灾应急处置流程\n3. 智能消防系统使用指南\n\n参训人员：各项目负责人、消防控制室值班人员\n注意事项：请携带工作证提前15分钟到场签到',
    type: 'training', priority: 'normal', author: '培训部',
    pinned: false, published: true, publishTime: '2026-04-16 10:30', readCount: 89,
  },
  {
    id: 4, title: '万达广场消防演练安排',
    content: '演练时间：2026年4月22日 09:00\n演练地点：万达广场A座\n演练类型：消防疏散演练\n\n参演单位：\n• 万达广场物业\n• 新致远消防维保\n• 辖区消防中队\n\n请各位参演人员准时到场，配合演练工作。',
    type: 'emergency', priority: 'normal', author: '应急管理部',
    pinned: false, published: true, publishTime: '2026-04-15 16:00', readCount: 245,
  },
  {
    id: 5, title: '消防法规更新提醒',
    content: '《建筑消防设施维护管理标准》GB25201-2026已正式发布，将于2026年6月1日起实施。\n\n主要更新内容：\n• 增加物联网消防设备管理要求\n• 细化维保周期和检查标准\n• 新增智能预警系统配置规范\n\n请各单位及时学习新规，调整工作流程。',
    type: 'system', priority: 'low', author: '法规部',
    pinned: false, published: false, publishTime: '-', readCount: 0,
  },
];

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  system: { label: '系统公告', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  emergency: { label: '应急通知', color: 'text-red-400', bg: 'bg-red-500/10' },
  maintenance: { label: '维护公告', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  training: { label: '培训通知', color: 'text-green-400', bg: 'bg-green-500/10' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: '重要', color: 'text-red-400 border-red-400/30 bg-red-400/10' },
  normal: { label: '普通', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  low: { label: '一般', color: 'text-slate-400 border-slate-400/30 bg-slate-400/10' },
};

export default function NoticePage() {
  const [notices, setNotices] = useState(initialNotices);
  const [showEditor, setShowEditor] = useState(false);
  const [showDetail, setShowDetail] = useState<Notice | null>(null);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState<Partial<Notice>>({ type: 'system', priority: 'normal', pinned: false, published: false });

  const handleSave = () => {
    if (!form.title || !form.content) return;
    const now = new Date().toLocaleString('zh-CN');
    if (editing) {
      setNotices(prev => prev.map(n => n.id === editing.id ? { ...n, ...form } as Notice : n));
    } else {
      const newNotice: Notice = {
        id: Date.now(),
        title: form.title || '',
        content: form.content || '',
        type: (form.type as any) || 'system',
        priority: (form.priority as any) || 'normal',
        author: '当前用户',
        pinned: form.pinned || false,
        published: form.published || false,
        publishTime: form.published ? now : '-',
        expireTime: form.expireTime,
        readCount: 0,
      };
      setNotices(prev => [newNotice, ...prev]);
    }
    setShowEditor(false);
    setEditing(null);
    setForm({ type: 'system', priority: 'normal', pinned: false, published: false });
  };

  const togglePin = (id: number) => {
    setNotices(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  };

  const deleteNotice = (id: number) => {
    setNotices(prev => prev.filter(n => n.id !== id));
  };

  const openEditor = (n?: Notice) => {
    if (n) {
      setEditing(n);
      setForm({ ...n });
    } else {
      setEditing(null);
      setForm({ type: 'system', priority: 'normal', pinned: false, published: false });
    }
    setShowEditor(true);
  };

  const sorted = [...notices].sort((a: any, b: any) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.id - a.id);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>工作台</span><ChevronRight className="w-3 h-3" /><span className="text-slate-300">系统公告</span>
        </div>
        <button onClick={() => openEditor()} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />发布公告
        </button>
      </div>

      {/* Pinned Notices Banner */}
      {sorted.some(n => n.pinned && n.published) && (
        <div className="space-y-2">
          {sorted.filter(n => n.pinned && n.published).map(n => (
            <div key={n.id} className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-lg p-3 flex items-center gap-3">
              <Pin className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${typeConfig[n.type]?.bg} ${typeConfig[n.type]?.color}`}>{typeConfig[n.type]?.label}</span>
                  <span className="text-xs text-amber-200 font-medium truncate">{n.title}</span>
                </div>
              </div>
              <button onClick={() => setShowDetail(n)} className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 flex-shrink-0">
                <Eye className="w-3 h-3" />查看
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Notice List */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/30">
        <div className="p-3 border-b border-slate-700/30 flex items-center justify-between">
          <h3 className="text-xs font-medium text-slate-200 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-400" />公告列表
          </h3>
          <span className="text-[10px] text-slate-500">共 {notices.length} 条</span>
        </div>
        <div className="divide-y divide-slate-700/30">
          {sorted.map(n => (
            <div key={n.id} className={`p-4 hover:bg-slate-700/20 transition-colors group ${n.pinned ? 'bg-amber-500/5' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${typeConfig[n.type]?.bg} ${typeConfig[n.type]?.color}`}>{typeConfig[n.type]?.label}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${priorityConfig[n.priority]?.color}`}>{priorityConfig[n.priority]?.label}</span>
                    {!n.published && <span className="text-[9px] px-1.5 py-0.5 bg-slate-700/30 rounded text-slate-500">草稿</span>}
                    {n.pinned && <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 rounded text-amber-400 flex items-center gap-1"><Pin className="w-2.5 h-2.5" />置顶</span>}
                  </div>
                  <h4 className="text-xs text-slate-200 font-medium mb-1 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setShowDetail(n)}>{n.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{n.content}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{n.author}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{n.publishTime}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{n.readCount} 次阅读</span>
                    {n.expireTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />截止 {n.expireTime}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => togglePin(n.id)} className="p-1.5 text-slate-400 hover:text-amber-400" title={n.pinned ? '取消置顶' : '置顶'}>
                    {n.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => openEditor(n)} className="p-1.5 text-slate-400 hover:text-blue-400"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteNotice(n.id)} className="p-1.5 text-slate-400 hover:text-red-400" aria-label="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 w-full max-w-lg">
            <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-200">{editing ? '编辑公告' : '发布公告'}</h3>
              <button onClick={() => { setShowEditor(false); setEditing(null); }} className="text-slate-500 hover:text-slate-300" aria-label="关闭"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">标题</label>
                <input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500" placeholder="输入公告标题" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">类型</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 outline-none">
                    {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">优先级</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 outline-none">
                    {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">过期时间</label>
                  <input type="date" value={form.expireTime || ''} onChange={e => setForm({ ...form, expireTime: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">内容</label>
                <textarea value={form.content || ''} onChange={e => setForm({ ...form, content: e.target.value })} rows={8} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500 resize-none" placeholder="输入公告内容" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.pinned || false} onChange={e => setForm({ ...form, pinned: e.target.checked })} className="rounded border-slate-600" />
                  <Pin className="w-3.5 h-3.5" />置顶公告
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.published || false} onChange={e => setForm({ ...form, published: e.target.checked })} className="rounded border-slate-600" />
                  <Send className="w-3.5 h-3.5" />立即发布
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
              <button onClick={() => { setShowEditor(false); setEditing(null); }} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-600/30 rounded-md">取消</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md flex items-center gap-1.5"><Save className="w-3.5 h-3.5" />保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 w-full max-w-lg">
            <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${typeConfig[showDetail.type]?.bg} ${typeConfig[showDetail.type]?.color}`}>{typeConfig[showDetail.type]?.label}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border ${priorityConfig[showDetail.priority]?.color}`}>{priorityConfig[showDetail.priority]?.label}</span>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-slate-500 hover:text-slate-300" aria-label="关闭"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-medium text-slate-200 mb-3">{showDetail.title}</h3>
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed mb-4">{showDetail.content}</pre>
              <div className="flex items-center gap-4 text-[10px] text-slate-500 border-t border-slate-700/30 pt-3">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{showDetail.author}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{showDetail.publishTime}</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{showDetail.readCount} 次阅读</span>
                {showDetail.expireTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />截止 {showDetail.expireTime}</span>}
              </div>
            </div>
            <div className="p-4 border-t border-slate-700/30 flex justify-end">
              <button onClick={() => setShowDetail(null)} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-600/30 rounded-md">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
