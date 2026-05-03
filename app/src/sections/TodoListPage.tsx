import { useState } from 'react';
import {
  CheckCircle2, Circle, Clock, Calendar, ChevronRight, Plus, X,
  Trash2, Edit3, Flag, AlertTriangle, Flame, Wrench, ClipboardCheck,
  Save, Filter, SortAsc
} from 'lucide-react';

interface TodoItem {
  id: number;
  title: string;
  desc: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'doing' | 'done';
  category: string;
  dueDate: string;
  createdAt: string;
  tag?: string;
}

const initialTodos: TodoItem[] = [
  { id: 1, title: '处理万达广场火警告警', desc: '1F大厅烟感探测器触发火警，需现场核实', priority: 'high', status: 'pending', category: '告警处理', dueDate: '2026-04-19', createdAt: '2026-04-19 09:15', tag: '火警' },
  { id: 2, title: '喷淋泵维保到期处理', desc: '万达广场喷淋泵维保2天后到期，安排维保人员', priority: 'high', status: 'doing', category: '维保管理', dueDate: '2026-04-21', createdAt: '2026-04-18 16:30', tag: '维保' },
  { id: 3, title: '月度巡检报告审核', desc: '审核4月份各单位巡检报告', priority: 'medium', status: 'pending', category: '巡检管理', dueDate: '2026-04-22', createdAt: '2026-04-18 10:00', tag: '巡检' },
  { id: 4, title: '排烟风机故障维修', desc: '万达广场排烟风机#3轴承异响，需更换轴承', priority: 'medium', status: 'doing', category: '设备维修', dueDate: '2026-04-20', createdAt: '2026-04-18 14:20', tag: '故障' },
  { id: 5, title: '消防栓压力不足排查', desc: 'B2层消防栓压力低于标准值，需排查原因', priority: 'high', status: 'pending', category: '隐患排查', dueDate: '2026-04-19', createdAt: '2026-04-19 08:45', tag: '隐患' },
  { id: 6, title: '新员工消防培训安排', desc: '组织4月份新入职员工消防安全培训', priority: 'low', status: 'pending', category: '培训考核', dueDate: '2026-04-25', createdAt: '2026-04-17 09:00', tag: '培训' },
  { id: 7, title: '设备档案更新', desc: '更新3月份新增设备档案信息', priority: 'low', status: 'done', category: '设备管理', dueDate: '2026-04-18', createdAt: '2026-04-15 10:30', tag: '档案' },
  { id: 8, title: '消防演练方案审核', desc: '审核万达广场第二季度消防演练方案', priority: 'medium', status: 'done', category: '应急预案', dueDate: '2026-04-17', createdAt: '2026-04-14 11:00', tag: '演练' },
];

const categoryColors: Record<string, string> = {
  '告警处理': 'bg-red-500/10 text-red-400',
  '维保管理': 'bg-blue-500/10 text-blue-400',
  '巡检管理': 'bg-green-500/10 text-green-400',
  '设备维修': 'bg-yellow-500/10 text-yellow-400',
  '隐患排查': 'bg-orange-500/10 text-orange-400',
  '培训考核': 'bg-purple-500/10 text-purple-400',
  '设备管理': 'bg-slate-500/10 text-slate-400',
  '应急预案': 'bg-cyan-500/10 text-cyan-400',
};

const tagIcon = (tag: string) => {
  switch (tag) {
    case '火警': return <Flame className="w-3 h-3 text-red-400" />;
    case '维保': return <Wrench className="w-3 h-3 text-blue-400" />;
    case '巡检': return <ClipboardCheck className="w-3 h-3 text-green-400" />;
    case '故障': return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
    case '隐患': return <Flag className="w-3 h-3 text-orange-400" />;
    default: return <Circle className="w-3 h-3 text-slate-400" />;
  }
};

export default function TodoListPage() {
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<TodoItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'doing' | 'done'>('all');
  const [form, setForm] = useState<Partial<TodoItem>>({ priority: 'medium', status: 'pending', category: '告警处理' });

  const filtered = todos.filter(t => filter === 'all' || t.status === filter);

  const toggleStatus = (id: number) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = t.status === 'pending' ? 'doing' : t.status === 'doing' ? 'done' : 'pending';
      return { ...t, status: next };
    }));
  };

  const handleSave = () => {
    if (!form.title) return;
    if (editing) {
      setTodos(prev => prev.map(t => t.id === editing.id ? { ...t, ...form } as TodoItem : t));
    } else {
      const newTodo: TodoItem = {
        id: Date.now(),
        title: form.title || '',
        desc: form.desc || '',
        priority: (form.priority as any) || 'medium',
        status: (form.status as any) || 'pending',
        category: form.category || '其他',
        dueDate: form.dueDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toLocaleString('zh-CN'),
        tag: form.tag,
      };
      setTodos(prev => [newTodo, ...prev]);
    }
    setShowAdd(false);
    setEditing(null);
    setForm({ priority: 'medium', status: 'pending', category: '告警处理' });
  };

  const openEdit = (t: TodoItem) => {
    setEditing(t);
    setForm({ ...t });
    setShowAdd(true);
  };

  const deleteTodo = (id: number) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const statusCount = (s: string) => todos.filter(t => t.status === s).length;

  const priorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'text-red-400 border-red-400/30 bg-red-400/10';
      case 'medium': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'low': return 'text-green-400 border-green-400/30 bg-green-400/10';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>工作台</span><ChevronRight className="w-3 h-3" /><span className="text-slate-300">我的待办</span>
        </div>
        <button onClick={() => { setEditing(null); setForm({ priority: 'medium', status: 'pending', category: '告警处理' }); setShowAdd(true); }} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition-colors flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />新建待办
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '全部', value: todos.length, filter: 'all' as const, icon: ClipboardCheck, color: 'blue' },
          { label: '待处理', value: statusCount('pending'), filter: 'pending' as const, icon: Clock, color: 'yellow' },
          { label: '进行中', value: statusCount('doing'), filter: 'doing' as const, icon: Circle, color: 'purple' },
          { label: '已完成', value: statusCount('done'), filter: 'done' as const, icon: CheckCircle2, color: 'green' },
        ].map((s: any) => (
          <button key={s.filter} onClick={() => setFilter(s.filter)} className={`bg-slate-800/50 rounded-lg p-4 border transition-all text-left ${filter === s.filter ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700/30 hover:border-slate-600'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">{s.label}</span>
              <s.icon className={`w-4 h-4 text-${s.color}-400`} />
            </div>
            <div className="text-2xl font-bold text-slate-100">{s.value}</div>
          </button>
        ))}
      </div>

      {/* Filter & Sort */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <div className="flex gap-1">
          {(['all', 'pending', 'doing', 'done'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`text-[10px] px-2.5 py-1 rounded transition-colors ${filter === f ? 'bg-blue-500 text-white' : 'bg-slate-700/30 text-slate-400 hover:text-slate-200'}`}>
              {f === 'all' ? '全部' : f === 'pending' ? '待处理' : f === 'doing' ? '进行中' : '已完成'}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1">
          <SortAsc className="w-3 h-3" />按优先级排序
        </button>
      </div>

      {/* Todo List */}
      <div className="space-y-2">
        {filtered.map(t => (
          <div key={t.id} className={`bg-slate-800/50 rounded-lg border transition-all group ${
            t.status === 'done' ? 'border-slate-700/20 opacity-60' : 'border-slate-700/30 hover:border-slate-600'
          }`}>
            <div className="p-3 flex items-start gap-3">
              <button onClick={() => toggleStatus(t.id)} className="mt-0.5">
                {t.status === 'done' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : t.status === 'doing' ? (
                  <Circle className="w-5 h-5 text-purple-400" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-500" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${t.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{t.title}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${priorityColor(t.priority)}`}>
                    {t.priority === 'high' ? '紧急' : t.priority === 'medium' ? '重要' : '一般'}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${categoryColors[t.category] || 'bg-slate-500/10 text-slate-400'}`}>{t.category}</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-1.5">{t.desc}</p>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">{tagIcon(t.tag || '')}{t.tag}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />截止 {t.dueDate}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.createdAt}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-blue-400"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteTodo(t.id)} className="p-1.5 text-slate-400 hover:text-red-400" aria-label="删除"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">暂无待办事项</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 w-full max-w-md">
            <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-200">{editing ? '编辑待办' : '新建待办'}</h3>
              <button onClick={() => { setShowAdd(false); setEditing(null); }} className="text-slate-500 hover:text-slate-300" aria-label="关闭"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">标题</label>
                <input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500" placeholder="输入待办标题" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">描述</label>
                <textarea value={form.desc || ''} onChange={e => setForm({ ...form, desc: e.target.value })} rows={3} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500 resize-none" placeholder="输入描述" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">优先级</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 outline-none">
                    <option value="high">紧急</option>
                    <option value="medium">重要</option>
                    <option value="low">一般</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">分类</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 outline-none">
                    {Object.keys(categoryColors).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">截止日期</label>
                  <input type="date" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">标签</label>
                  <input value={form.tag || ''} onChange={e => setForm({ ...form, tag: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded-md px-3 py-2 text-xs text-slate-200 outline-none" placeholder="如：火警、维保" />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
              <button onClick={() => { setShowAdd(false); setEditing(null); }} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-600/30 rounded-md">取消</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md flex items-center gap-1.5"><Save className="w-3.5 h-3.5" />保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
