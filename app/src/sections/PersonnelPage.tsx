import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/core/ToastContext';
import { personnelService } from '@/api/services';
import { getErrorMessage } from '@/types/api';
import DataContainer from '@/components/DataContainer';
import {
  Users, Search, Plus, Edit3, Trash2, X, Save, Shield,
  UserCheck, UserCog, ClipboardList, Loader2
} from 'lucide-react';

/* ===== Types ===== */
type PersonnelRole = 'manager' | 'duty_officer' | 'safety_officer' | 'operator' | 'inspector';
type PersonnelRoleFilter = PersonnelRole | 'all';

interface PersonnelItem {
  id: string;
  name: string;
  phone: string;
  unitId: string;
  unitName: string;
  role: PersonnelRole;
  certType: string;
  certNo: string;
  status: 'normal' | 'disabled';
}

const ROLE_LABELS: Record<string, string> = {
  manager: '消控室负责人',
  duty_officer: '消控室管理人',
  safety_officer: '消防安全管理人',
  operator: '操作员',
  inspector: '巡查员',
};

const ROLE_TABS: { key: PersonnelRoleFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'manager', label: '消控室负责人' },
  { key: 'duty_officer', label: '消控室管理人' },
  { key: 'safety_officer', label: '消防安全管理人' },
  { key: 'operator', label: '操作员' },
  { key: 'inspector', label: '巡查员' },
];

/* ===== Mock Data Cleared ===== */
const mockPersonnel: PersonnelItem[] = [];

const roleStyle = (role: string) => {
  const map: Record<string, { color: string; bg: string }> = {
    manager: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
    duty_officer: { color: 'text-purple-400', bg: 'bg-purple-500/10' },
    safety_officer: { color: 'text-red-400', bg: 'bg-red-500/10' },
    operator: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    inspector: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
  };
  return map[role] || { color: 'text-slate-400', bg: 'bg-slate-500/10' };
};

const statusStyle = (status: string) => {
  return status === 'normal'
    ? { label: '在职', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' }
    : { label: '停用', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
};

/* ===== Modal ===== */
function PersonnelModal({
  item,
  onSave,
  onClose,
}: {
  item: PersonnelItem | null;
  onSave: (data: Omit<PersonnelItem, 'id'>) => Promise<void> | void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    role: 'operator' as PersonnelRole,
    unitId: '',
    unitName: '',
    certNo: '',
    certType: '消防设施操作员',
    status: 'normal' as 'normal' | 'disabled',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        phone: item.phone,
        role: item.role as PersonnelRole,
        unitId: item.unitId || '',
        unitName: item.unitName,
        certNo: item.certNo,
        certType: item.certType,
        status: item.status,
      });
    }
  }, [item]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            {item ? <Edit3 className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-blue-400" />}
            {item ? '编辑人员' : '新增人员'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200" aria-label="close"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">姓名 <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="输入姓名" className="w-full h-8 px-3 text-xs bg-slate-700/30 border border-slate-600/30 rounded text-slate-200 outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">电话 <span className="text-red-400">*</span></label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="输入联系电话" className="w-full h-8 px-3 text-xs bg-slate-700/30 border border-slate-600/30 rounded text-slate-200 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">角色 <span className="text-red-400">*</span></label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as PersonnelRole })} className="w-full h-8 px-2 text-xs bg-slate-700/30 border border-slate-600/30 rounded text-slate-200 outline-none">
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">状态</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className="w-full h-8 px-2 text-xs bg-slate-700/30 border border-slate-600/30 rounded text-slate-200 outline-none">
                <option value="normal">在职</option>
                <option value="disabled">停用</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">所属单位 <span className="text-red-400">*</span></label>
            <select value={form.unitName} onChange={e => setForm({ ...form, unitName: e.target.value })} className="w-full h-8 px-2 text-xs bg-slate-700/30 border border-slate-600/30 rounded text-slate-200 outline-none">
              <option value="">请选择单位</option>
              <option>万达广场商业中心</option>
              <option>兰州大学第二医院</option>
              <option>兰州中心</option>
              <option>甘肃省博物馆</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">资质证书</label>
              <select value={form.certType} onChange={e => setForm({ ...form, certType: e.target.value })} className="w-full h-8 px-2 text-xs bg-slate-700/30 border border-slate-600/30 rounded text-slate-200 outline-none">
                <option>消防设施操作员</option>
                <option>注册消防工程师</option>
                <option>消防安全管理员</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">证书编号</label>
              <input value={form.certNo} onChange={e => setForm({ ...form, certNo: e.target.value })} placeholder="证书编号" className="w-full h-8 px-3 text-xs bg-slate-700/30 border border-slate-600/30 rounded text-slate-200 outline-none" />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 rounded-md transition-colors disabled:opacity-50">取消</button>
          <button
            onClick={async () => {
              setSaving(true);
              try { await onSave(form); } finally { setSaving(false); }
            }}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded-md flex items-center gap-1.5 transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Delete Confirm ===== */
function DeleteModal({ name, onConfirm, onClose, loading }: { name: string; onConfirm: () => void; onClose: () => void; loading?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden p-4 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-sm font-medium text-slate-200 mb-1">确认删除</h3>
        <p className="text-xs text-slate-400">确定要删除 <span className="text-red-400 font-medium">{name}</span> 吗？</p>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} disabled={loading} className="flex-1 h-8 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 rounded-md transition-colors disabled:opacity-50">取消</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-md transition-colors flex items-center justify-center gap-1.5">
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Main Page ===== */
export default function PersonnelPage() {
  const { success, error: showError } = useToast();
  const [list, setList] = useState<PersonnelItem[]>(mockPersonnel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [keyword, setKeyword] = useState('');
  const [activeRole, setActiveRole] = useState<PersonnelRoleFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PersonnelItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<PersonnelItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await personnelService.list({ keyword, page: 1, pageSize: 100 });
      const data = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      if (data.length > 0) setList(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error(getErrorMessage(e)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [keyword]);

  const filtered = useMemo(() => {
    return list.filter(p => {
      if (activeRole !== 'all' && p.role !== activeRole) return false;
      if (keyword && !p.name.includes(keyword) && !p.phone.includes(keyword) && !p.unitName.includes(keyword)) return false;
      return true;
    });
  }, [list, activeRole, keyword]);

  const stats = useMemo(() => ({
    total: list.length,
    manager: list.filter(p => p.role === 'manager').length,
    duty_officer: list.filter(p => p.role === 'duty_officer').length,
    safety_officer: list.filter(p => p.role === 'safety_officer').length,
    operator: list.filter(p => p.role === 'operator').length,
  }), [list]);

  const handleSave = async (data: Omit<PersonnelItem, 'id'>) => {
    const now = new Date().toISOString();
    const payload = {
      ...data,
      unitId: data.unitId || 'U-001',
      createdAt: now,
      updatedAt: now,
    };
    try {
      if (editingItem) {
        await personnelService.update(editingItem.id, payload as any);
        success('保存成功', `${data.name} 的信息已更新`);
        setList(prev => prev.map(p => p.id === editingItem.id ? { ...p, ...payload } : p));
      } else {
        const res: any = await personnelService.create(payload as any);
        const newId = res?.data?.id || `P-${Date.now()}`;
        const newItem: PersonnelItem = { ...data, id: String(newId), unitId: data.unitId || 'U-001' };
        setList(prev => [newItem, ...prev]);
        success('新增成功', `${data.name} 已添加`);
      }
    } catch (e: unknown) {
      console.error('人员保存API失败:', e);
      showError('保存失败', getErrorMessage(e, '请检查网络或稍后重试'));
      return;
    }
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleteLoading(true);
    try {
      await personnelService.delete(deletingItem.id);
      success('删除成功', `${deletingItem.name} 已删除`);
      setList(prev => prev.filter(p => p.id !== deletingItem.id));
      setDeletingItem(null);
    } catch (e: unknown) {
      showError('删除失败', getErrorMessage(e, '请检查网络或稍后重试'));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">人员管理</h2>
            <p className="text-[10px] text-slate-500">消防人员信息与资质</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded">{filtered.length}人</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索姓名/电话/单位" className="pl-8 h-8 w-48 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 outline-none" />
          </div>
          <button onClick={() => { setEditingItem(null); setModalOpen(true); }} className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1.5 transition-colors">
            <Plus className="w-3.5 h-3.5" />新增人员
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 flex-shrink-0">
        {[
          { label: '总人数', value: stats.total, icon: Users, color: 'blue' },
          { label: '消控室负责人', value: stats.manager, icon: Shield, color: 'blue' },
          { label: '管理人', value: stats.duty_officer, icon: UserCog, color: 'purple' },
          { label: '安全员', value: stats.safety_officer, icon: UserCheck, color: 'red' },
          { label: '操作员', value: stats.operator, icon: ClipboardList, color: 'emerald' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-1"><s.icon className={`w-3.5 h-3.5 text-${s.color}-400`} /><span className="text-[10px] text-slate-400">{s.label}</span></div>
            <div className={`text-xl font-bold text-${s.color}-400`}>{s.value}<span className="text-[9px] font-normal text-slate-500 ml-0.5">人</span></div>
          </div>
        ))}
      </div>

      {/* Role Tabs */}
      <div className="flex gap-1 flex-shrink-0">
        {ROLE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveRole(tab.key)}
            className={`text-[10px] px-3 py-1.5 rounded transition-colors ${activeRole === tab.key ? 'bg-blue-500 text-white' : 'bg-slate-700/30 text-slate-400 hover:text-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 bg-slate-800/50 rounded-lg border border-slate-700/30 overflow-hidden flex flex-col min-h-0">
        <DataContainer loading={loading} error={error} data={filtered} onRetry={fetchData}>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-800/90 backdrop-blur z-10">
                <tr className="text-[10px] text-slate-500 border-b border-slate-700/30">
                  <th className="text-left p-2.5 font-medium">姓名</th>
                  <th className="text-left p-2.5 font-medium">电话</th>
                  <th className="text-left p-2.5 font-medium">所属单位</th>
                  <th className="text-left p-2.5 font-medium">角色</th>
                  <th className="text-left p-2.5 font-medium">资质证书</th>
                  <th className="text-left p-2.5 font-medium">证书编号</th>
                  <th className="text-left p-2.5 font-medium">状态</th>
                  <th className="text-left p-2.5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                {filtered.map(p => {
                  const rs = roleStyle(p.role);
                  const ss = statusStyle(p.status);
                  return (
                    <tr key={p.id} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                      <td className="p-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center"><Users className="w-3 h-3 text-blue-400" /></div>
                          <span className="text-slate-200 font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-slate-400">{p.phone}</td>
                      <td className="p-2.5 text-slate-400">{p.unitName}</td>
                      <td className="p-2.5"><span className={`text-[9px] px-1.5 py-0.5 rounded ${rs.color} ${rs.bg}`}>{ROLE_LABELS[p.role] || p.role}</span></td>
                      <td className="p-2.5 text-slate-400">{p.certType}</td>
                      <td className="p-2.5 text-slate-500 font-mono">{p.certNo}</td>
                      <td className="p-2.5"><span className={`text-[9px] px-1.5 py-0.5 rounded border ${ss.color} ${ss.bg} ${ss.border}`}>{ss.label}</span></td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingItem(p); setModalOpen(true); }} className="p-1 text-slate-500 hover:text-blue-400 rounded hover:bg-blue-500/10 transition-colors" title="编辑"><Edit3 className="w-3 h-3" /></button>
                          <button onClick={() => setDeletingItem(p)} className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors" title="删除"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DataContainer>
      </div>

      {modalOpen && <PersonnelModal item={editingItem} onSave={handleSave} onClose={() => { setModalOpen(false); setEditingItem(null); }} />}
      {deletingItem && <DeleteModal name={deletingItem.name} onConfirm={handleDelete} onClose={() => setDeletingItem(null)} loading={deleteLoading} />}
    </div>
  );
}
