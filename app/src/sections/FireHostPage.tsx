import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Server, Search, Plus, Edit2, Trash2, Network, Power, AlertTriangle } from 'lucide-react';
import DataContainer from '@/components/DataContainer';
import { fireHostService } from '@/api/fireHostService';
import type { FireHost } from '@/types/fireHost';
import { toast } from 'sonner';

const STATUS_MAP: Record<number, { label: string; cls: string }> = {
  0: { label: '停用', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  1: { label: '正常', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  2: { label: '故障', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

export default function FireHostPage() {
  const navigate = useNavigate();
  const [hosts, setHosts] = useState<FireHost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FireHost | null>(null);
  const [form, setForm] = useState<Partial<FireHost>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showDelete, setShowDelete] = useState<FireHost | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fireHostService.list({ page, pageSize, keyword });
      setHosts(res.list || []);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ port: 502, status: 1 });
    setShowForm(true);
  };

  const openEdit = (host: FireHost) => {
    setEditing(host);
    setForm({ ...host });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.hostCode?.trim()) { toast.error('请输入主机编号'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        await fireHostService.update(editing.id, form);
        toast.success('更新成功');
      } else {
        await fireHostService.create(form);
        toast.success('新增成功');
      }
      setShowForm(false);
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await fireHostService.delete(showDelete.id);
      toast.success('删除成功');
      setShowDelete(null);
      loadData();
    } catch (e: any) {
      toast.error(e?.message || '删除失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col h-full gap-3 p-4 overflow-hidden">
      {/* Header */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center ring-1 ring-blue-500/30">
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100">报警主机管理</h1>
            <p className="text-[10px] text-slate-500">共 {total} 台主机</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={keyword}
              onChange={e => { setKeyword(e.target.value); setPage(1); }}
              placeholder="搜索编号/品牌/型号/位置..."
              className="pl-8 pr-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-slate-200 w-56 outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 rounded-lg text-xs font-medium transition-all active-press"
          >
            <Plus className="w-3.5 h-3.5" />新增主机
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0">
        <DataContainer loading={loading} error={error} data={hosts} onRetry={loadData} emptyText="暂无报警主机">
          <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 overflow-hidden h-full flex flex-col">
            <div className="overflow-auto flex-1 scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] text-slate-500 border-b border-slate-700/30 bg-slate-800/60 sticky top-0 z-10">
                    <th className="text-left p-2.5 font-medium w-16">编号</th>
                    <th className="text-left p-2.5 font-medium">主机编号</th>
                    <th className="text-left p-2.5 font-medium">品牌</th>
                    <th className="text-left p-2.5 font-medium">型号</th>
                    <th className="text-left p-2.5 font-medium">IP:端口</th>
                    <th className="text-left p-2.5 font-medium">安装位置</th>
                    <th className="text-left p-2.5 font-medium w-16">状态</th>
                    <th className="text-right p-2.5 font-medium w-36">操作</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {hosts.map(host => {
                    const st = STATUS_MAP[host.status] || STATUS_MAP[0];
                    return (
                      <tr key={host.id} className="border-b border-slate-700/20 hover:bg-slate-700/15 transition-colors">
                        <td className="p-2.5 text-slate-400 font-mono">{host.id}</td>
                        <td className="p-2.5 text-slate-200 font-semibold">{host.hostCode}</td>
                        <td className="p-2.5 text-slate-300">{host.brand || '-'}</td>
                        <td className="p-2.5 text-slate-300">{host.model || '-'}</td>
                        <td className="p-2.5 text-slate-400 font-mono">{host.ip}:{host.port}</td>
                        <td className="p-2.5 text-slate-300">{host.location || '-'}</td>
                        <td className="p-2.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/device/fire-host/${host.id}/loop`)}
                              className="flex items-center gap-1 px-2 py-1 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-md text-[10px] transition-colors"
                              title="管理回路"
                            >
                              <Network className="w-3 h-3" />回路
                            </button>
                            <button
                              onClick={() => openEdit(host)}
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setShowDelete(host)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700/30 bg-slate-800/40 flex-shrink-0">
                <span className="text-[10px] text-slate-500">共 {total} 条</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded border border-slate-700/30 transition-colors"
                  >上一页</button>
                  <span className="text-[10px] text-slate-400 px-2">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded border border-slate-700/30 transition-colors"
                  >下一页</button>
                </div>
              </div>
            )}
          </div>
        </DataContainer>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-[480px] max-w-[90vw] max-h-[90vh] overflow-auto">
            <div className="px-5 py-4 border-b border-slate-700/30 bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                {editing ? '编辑报警主机' : '新增报警主机'}
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">主机编号 <span className="text-red-400">*</span></label>
                <input
                  value={form.hostCode || ''}
                  onChange={e => setForm(f => ({ ...f, hostCode: e.target.value }))}
                  placeholder="如：FAS-001"
                  className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">品牌</label>
                  <input
                    value={form.brand || ''}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    placeholder="如：海湾"
                    className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">型号</label>
                  <input
                    value={form.model || ''}
                    onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    placeholder="如：GST5000H"
                    className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">IP 地址</label>
                  <input
                    value={form.ip || ''}
                    onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
                    placeholder="如：192.168.1.100"
                    className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">端口号</label>
                  <input
                    type="number"
                    value={form.port || 502}
                    onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">安装位置</label>
                <input
                  value={form.location || ''}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="如：B1消防控制室"
                  className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">状态</label>
                <div className="flex gap-2">
                  {[
                    { value: 1, label: '正常', icon: Power },
                    { value: 0, label: '停用', icon: Power },
                    { value: 2, label: '故障', icon: AlertTriangle },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all ${
                        form.status === opt.value
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/40'
                          : 'bg-slate-700/30 text-slate-400 border-slate-600/20 hover:border-slate-500/30'
                      }`}
                    >
                      <opt.icon className="w-3 h-3" />{opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-700/30 flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40 transition-colors"
              >取消</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg transition-colors font-medium disabled:opacity-50"
              >{submitting ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDelete(null)} />
          <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-80 p-5 text-center">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-red-500/30">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h4 className="text-sm font-bold text-slate-100 mb-1">确认删除？</h4>
            <p className="text-[11px] text-slate-400 mb-4">删除主机「{showDelete.hostCode}」将同时删除其下的所有回路和设备点位，此操作不可恢复。</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setShowDelete(null)}
                className="px-4 py-2 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40 transition-colors"
              >取消</button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 rounded-lg transition-colors font-medium"
              >确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
