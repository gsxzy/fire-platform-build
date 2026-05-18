import { useState, useEffect, useMemo } from 'react';
import {
  Megaphone, Plus, X, Edit3, Trash2, Eye, Pin, PinOff,
  ChevronRight, Calendar, User, Clock, Send, Save
} from 'lucide-react';
import { workbenchService } from '@/api/services';

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

async function fetchNotices(): Promise<Notice[]> {
  const res = await workbenchService.noticeList() as any;
  if (Array.isArray(res)) return res;
  const list = res?.list;
  return Array.isArray(list) ? list : [];
}

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
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [showDetail, setShowDetail] = useState<Notice | null>(null);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState<Partial<Notice>>({ type: 'system', priority: 'normal', pinned: false, published: false });

  useEffect(() => {
    let mounted = true;
    fetchNotices()
      .then(data => { if (mounted) setNotices(data || []); })
      .catch(() => { if (mounted) setNotices([]); })
      .finally(() => { if (mounted) {/* loaded */} });
    return () => { mounted = false; };
  }, []);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title || !form.content) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        content: form.content,
        type: form.type || 'system',
        priority: form.priority === 'high' ? 3 : form.priority === 'normal' ? 2 : 1,
        status: form.published ? 1 : 0,
      };
      if (editing) {
        await workbenchService.noticeUpdate(editing.id, payload);
        setNotices(prev => prev.map(n => n.id === editing.id ? { ...n, ...form } as Notice : n));
      } else {
        const res = await workbenchService.noticeCreate(payload) as any;
        const newId = res?.data?.id || res?.id || Date.now();
        const newNotice: Notice = {
          id: newId,
          title: form.title || '',
          content: form.content || '',
          type: (form.type as any) || 'system',
          priority: (form.priority as any) || 'normal',
          author: '当前用户',
          pinned: form.pinned || false,
          published: form.published || false,
          publishTime: form.published ? new Date().toLocaleString('zh-CN') : '-',
          expireTime: form.expireTime,
          readCount: 0,
        };
        setNotices(prev => [newNotice, ...prev]);
      }
      setShowEditor(false);
      setEditing(null);
      setForm({ type: 'system', priority: 'normal', pinned: false, published: false });
    } catch (e) {
      console.error('保存公告失败', e);
      alert('保存失败，请检查网络');
    } finally {
      setSaving(false);
    }
  };

  const togglePin = (id: number) => {
    setNotices(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  };

  const deleteNotice = async (id: number) => {
    if (!confirm('确定删除该公告？')) return;
    try {
      await workbenchService.noticeDelete(id);
      setNotices(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error('删除公告失败', e);
      alert('删除失败');
    }
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

  const safeNotices = Array.isArray(notices) ? notices : [];
  const sorted = useMemo(() => [...safeNotices].sort((a: any, b: any) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.id - a.id), [safeNotices]);

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
          <span className="text-[10px] text-slate-500">共 {safeNotices.length} 条</span>
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
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs rounded-md flex items-center gap-1.5"><Save className="w-3.5 h-3.5" />{saving ? '保存中...' : '保存'}</button>
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
