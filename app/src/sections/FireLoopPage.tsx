import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Network, Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Cpu, Power } from 'lucide-react';
import DataContainer from '@/components/DataContainer';
import { fireHostService, fireLoopService } from '@/api/fireHostService';
import type { FireHost, FireLoop } from '@/types/fireHost';
import { toast } from 'sonner';

const STATUS_MAP: Record<number, { label: string; cls: string }> = {
  0: { label: '停用', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  1: { label: '正常', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
};

export default function FireLoopPage() {
  const { hostId } = useParams<{ hostId: string }>();
  const navigate = useNavigate();
  const [host, setHost] = useState<FireHost | null>(null);
  const [loops, setLoops] = useState<FireLoop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FireLoop | null>(null);
  const [form, setForm] = useState<Partial<FireLoop>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showDelete, setShowDelete] = useState<FireLoop | null>(null);

  const loadHost = useCallback(async () => {
    if (!hostId) return;
    try {
      const h = await fireHostService.get(hostId);
      setHost(h);
    } catch { /* ignore */ }
  }, [hostId]);

  const loadData = useCallback(async () => {
    if (!hostId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fireLoopService.list(hostId, { page, pageSize, keyword });
      setLoops(res.list || []);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [hostId, page, keyword]);

  useEffect(() => { loadHost(); }, [loadHost]);
  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({ status: 1 });
    setShowForm(true);
  };

  const openEdit = (loop: FireLoop) => {
    setEditing(loop);
    setForm({ ...loop });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!hostId) return;
    if (!form.loopNo || form.loopNo <= 0) { toast.error('请输入回路编号'); return; }
    setSubmitting(true);
    try {
      if (editing) {
        await fireLoopService.update(hostId, editing.id, form);
        toast.success('更新成功');
      } else {
        await fireLoopService.create(hostId, form);
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
    if (!hostId || !showDelete) return;
    try {
      await fireLoopService.delete(hostId, showDelete.id);
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
      {/* Breadcrumb + Header */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/device/fire-host')}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 rounded-lg transition-colors"
            title="返回主机列表"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-700/50" />
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span className="hover:text-slate-300 cursor-pointer" onClick={() => navigate('/device/fire-host')}>报警主机</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-300 font-medium">{host?.hostCode || hostId}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-indigo-300 font-medium">回路管理</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={keyword}
              onChange={e => { setKeyword(e.target.value); setPage(1); }}
              placeholder="搜索回路名称/编号..."
              className="pl-8 pr-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-slate-200 w-48 outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-lg text-xs font-medium transition-all active-press"
          >
            <Plus className="w-3.5 h-3.5" />新增回路
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0">
        <DataContainer loading={loading} error={error} data={loops} onRetry={loadData} emptyText="暂无回路数据">
          <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 overflow-hidden h-full flex flex-col">
            <div className="overflow-auto flex-1 scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] text-slate-500 border-b border-slate-700/30 bg-slate-800/60 sticky top-0 z-10">
                    <th className="text-left p-2.5 font-medium w-16">编号</th>
                    <th className="text-left p-2.5 font-medium">回路编号</th>
                    <th className="text-left p-2.5 font-medium">回路名称</th>
                    <th className="text-left p-2.5 font-medium">所属主机</th>
                    <th className="text-left p-2.5 font-medium w-16">状态</th>
                    <th className="text-right p-2.5 font-medium w-36">操作</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {loops.map(loop => {
                    const st = STATUS_MAP[loop.status] || STATUS_MAP[0];
                    return (
                      <tr key={loop.id} className="border-b border-slate-700/20 hover:bg-slate-700/15 transition-colors">
                        <td className="p-2.5 text-slate-400 font-mono">{loop.id}</td>
                        <td className="p-2.5 text-slate-200 font-semibold">{loop.loopNo}</td>
                        <td className="p-2.5 text-slate-300">{loop.loopName || '-'}</td>
                        <td className="p-2.5 text-slate-400">{host?.hostCode || '-'}</td>
                        <td className="p-2.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/device/fire-host/${hostId}/loop/${loop.loopNo}/device`)}
                              className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-md text-[10px] transition-colors"
                              title="管理设备点位"
                            >
                              <Cpu className="w-3 h-3" />设备
                            </button>
                            <button
                              onClick={() => openEdit(loop)}
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setShowDelete(loop)}
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700/30 bg-slate-800/40 flex-shrink-0">
                <span className="text-[10px] text-slate-500">共 {total} 条</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded border border-slate-700/30 transition-colors">上一页</button>
                  <span className="text-[10px] text-slate-400 px-2">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded border border-slate-700/30 transition-colors">下一页</button>
                </div>
              </div>
            )}
          </div>
        </DataContainer>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-[420px] max-w-[90vw]">
            <div className="px-5 py-4 border-b border-slate-700/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Network className="w-4 h-4 text-indigo-400" />
                {editing ? '编辑回路' : '新增回路'}
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">回路编号 <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={form.loopNo || ''}
                    onChange={e => setForm(f => ({ ...f, loopNo: Number(e.target.value) }))}
                    placeholder="如：1"
                    className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">回路名称</label>
                  <input
                    value={form.loopName || ''}
                    onChange={e => setForm(f => ({ ...f, loopName: e.target.value }))}
                    placeholder="如：1层大厅回路"
                    className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">状态</label>
                <div className="flex gap-2">
                  {[
                    { value: 1, label: '正常' },
                    { value: 0, label: '停用' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all ${
                        form.status === opt.value
                          ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
                          : 'bg-slate-700/30 text-slate-400 border-slate-600/20 hover:border-slate-500/30'
                      }`}
                    >
                      <Power className="w-3 h-3" />{opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-700/30 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40 transition-colors">取消</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-4 py-2 text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 rounded-lg transition-colors font-medium disabled:opacity-50">
                {submitting ? '保存中...' : '保存'}
              </button>
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
            <p className="text-[11px] text-slate-400 mb-4">删除回路「{showDelete.loopName || showDelete.loopNo}」将同时删除该回路下的所有设备点位。</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setShowDelete(null)}
                className="px-4 py-2 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40 transition-colors">取消</button>
              <button onClick={handleDelete}
                className="px-4 py-2 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 rounded-lg transition-colors font-medium">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
