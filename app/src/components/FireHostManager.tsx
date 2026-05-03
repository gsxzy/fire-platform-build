import { useState, useEffect, useCallback } from 'react';
import {
  Server, Search, Plus, Edit2, Trash2, ChevronLeft, Network, Cpu,
  Power, AlertTriangle, Flame, MapPin
} from 'lucide-react';
import DataContainer from '@/components/DataContainer';
import { fireHostService, fireLoopService, fireDeviceService } from '@/api/fireHostService';
import type { FireHost, FireLoop, FireDevice } from '@/types/fireHost';
import { toast } from 'sonner';

/* ── Status maps ── */
const HOST_STATUS: Record<number, { label: string; cls: string }> = {
  0: { label: '停用', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  1: { label: '正常', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  2: { label: '故障', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
};
const LOOP_STATUS: Record<number, { label: string; cls: string }> = {
  0: { label: '停用', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  1: { label: '正常', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
};
const DEVICE_STATUS: Record<number, { label: string; cls: string }> = {
  0: { label: '停用', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  1: { label: '正常', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  2: { label: '故障', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  3: { label: '报警', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
};
const DEVICE_TYPES = [
  '烟感探测器', '温感探测器', '手动报警按钮', '声光报警器',
  '输入输出模块', '消火栓按钮', '防火门监控', '电气火灾探测器',
  '可燃气体探测器', '消防广播', '应急照明', '其他',
];

type View = 'host' | 'loop' | 'device';

export default function FireHostManager() {
  const [view, setView] = useState<View>('host');

  /* ── Host state ── */
  const [hosts, setHosts] = useState<FireHost[]>([]);
  const [hostLoading, setHostLoading] = useState(false);
  const [hostError, setHostError] = useState<Error | null>(null);
  const [hostKeyword, setHostKeyword] = useState('');
  const [hostPage, setHostPage] = useState(1);
  const [hostTotal, setHostTotal] = useState(0);
  const hostPageSize = 10;

  /* ── Loop state ── */
  const [selectedHost, setSelectedHost] = useState<FireHost | null>(null);
  const [loops, setLoops] = useState<FireLoop[]>([]);
  const [loopLoading, setLoopLoading] = useState(false);
  const [loopError, setLoopError] = useState<Error | null>(null);
  const [loopKeyword, setLoopKeyword] = useState('');
  const [loopPage, setLoopPage] = useState(1);
  const [loopTotal, setLoopTotal] = useState(0);
  const loopPageSize = 10;

  /* ── Device state ── */
  const [selectedLoop, setSelectedLoop] = useState<FireLoop | null>(null);
  const [devices, setDevices] = useState<FireDevice[]>([]);
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState<Error | null>(null);
  const [devKeyword, setDevKeyword] = useState('');
  const [devPage, setDevPage] = useState(1);
  const [devTotal, setDevTotal] = useState(0);
  const devPageSize = 10;

  /* ── Form / Delete state ── */
  const [showHostForm, setShowHostForm] = useState(false);
  const [editingHost, setEditingHost] = useState<FireHost | null>(null);
  const [hostForm, setHostForm] = useState<Partial<FireHost>>({});
  const [hostSubmitting, setHostSubmitting] = useState(false);
  const [showHostDelete, setShowHostDelete] = useState<FireHost | null>(null);

  const [showLoopForm, setShowLoopForm] = useState(false);
  const [editingLoop, setEditingLoop] = useState<FireLoop | null>(null);
  const [loopForm, setLoopForm] = useState<Partial<FireLoop>>({});
  const [loopSubmitting, setLoopSubmitting] = useState(false);
  const [showLoopDelete, setShowLoopDelete] = useState<FireLoop | null>(null);

  const [showDevForm, setShowDevForm] = useState(false);
  const [editingDev, setEditingDev] = useState<FireDevice | null>(null);
  const [devForm, setDevForm] = useState<Partial<FireDevice>>({});
  const [devSubmitting, setDevSubmitting] = useState(false);
  const [showDevDelete, setShowDevDelete] = useState<FireDevice | null>(null);

  /* ── Load data ── */
  const loadHosts = useCallback(async () => {
    setHostLoading(true); setHostError(null);
    try {
      const res = await fireHostService.list({ page: hostPage, pageSize: hostPageSize, keyword: hostKeyword });
      setHosts(res.list || []); setHostTotal(res.total || 0);
    } catch (e) { setHostError(e as Error); }
    finally { setHostLoading(false); }
  }, [hostPage, hostKeyword]);

  const loadLoops = useCallback(async () => {
    if (!selectedHost) return;
    setLoopLoading(true); setLoopError(null);
    try {
      const res = await fireLoopService.list(selectedHost.id, { page: loopPage, pageSize: loopPageSize, keyword: loopKeyword });
      setLoops(res.list || []); setLoopTotal(res.total || 0);
    } catch (e) { setLoopError(e as Error); }
    finally { setLoopLoading(false); }
  }, [selectedHost, loopPage, loopKeyword]);

  const loadDevices = useCallback(async () => {
    if (!selectedHost || !selectedLoop) return;
    setDevLoading(true); setDevError(null);
    try {
      const res = await fireDeviceService.list(selectedHost.id, selectedLoop.loopNo, { page: devPage, pageSize: devPageSize, keyword: devKeyword });
      setDevices(res.list || []); setDevTotal(res.total || 0);
    } catch (e) { setDevError(e as Error); }
    finally { setDevLoading(false); }
  }, [selectedHost, selectedLoop, devPage, devKeyword]);

  useEffect(() => { if (view === 'host') loadHosts(); }, [loadHosts, view]);
  useEffect(() => { if (view === 'loop') loadLoops(); }, [loadLoops, view]);
  useEffect(() => { if (view === 'device') loadDevices(); }, [loadDevices, view]);

  /* ── Host handlers ── */
  const openHostAdd = () => { setEditingHost(null); setHostForm({ port: 502, status: 1 }); setShowHostForm(true); };
  const openHostEdit = (h: FireHost) => { setEditingHost(h); setHostForm({ ...h }); setShowHostForm(true); };
  const submitHost = async () => {
    if (!hostForm.hostCode?.trim()) { toast.error('请输入主机编号'); return; }
    setHostSubmitting(true);
    try {
      if (editingHost) { await fireHostService.update(editingHost.id, hostForm); toast.success('更新成功'); }
      else { await fireHostService.create(hostForm); toast.success('新增成功'); }
      setShowHostForm(false); loadHosts();
    } catch (e: any) { toast.error(e?.message || '操作失败'); }
    finally { setHostSubmitting(false); }
  };
  const deleteHost = async () => {
    if (!showHostDelete) return;
    try { await fireHostService.delete(showHostDelete.id); toast.success('删除成功'); setShowHostDelete(null); loadHosts(); }
    catch (e: any) { toast.error(e?.message || '删除失败'); }
  };

  /* ── Loop handlers ── */
  const openLoopAdd = () => { setEditingLoop(null); setLoopForm({ status: 1 }); setShowLoopForm(true); };
  const openLoopEdit = (l: FireLoop) => { setEditingLoop(l); setLoopForm({ ...l }); setShowLoopForm(true); };
  const submitLoop = async () => {
    if (!selectedHost || !loopForm.loopNo || loopForm.loopNo <= 0) { toast.error('请输入回路编号'); return; }
    setLoopSubmitting(true);
    try {
      if (editingLoop) { await fireLoopService.update(selectedHost.id, editingLoop.id, loopForm); toast.success('更新成功'); }
      else { await fireLoopService.create(selectedHost.id, loopForm); toast.success('新增成功'); }
      setShowLoopForm(false); loadLoops();
    } catch (e: any) { toast.error(e?.message || '操作失败'); }
    finally { setLoopSubmitting(false); }
  };
  const deleteLoop = async () => {
    if (!selectedHost || !showLoopDelete) return;
    try { await fireLoopService.delete(selectedHost.id, showLoopDelete.id); toast.success('删除成功'); setShowLoopDelete(null); loadLoops(); }
    catch (e: any) { toast.error(e?.message || '删除失败'); }
  };

  /* ── Device handlers ── */
  const openDevAdd = () => { setEditingDev(null); setDevForm({ status: 1 }); setShowDevForm(true); };
  const openDevEdit = (d: FireDevice) => { setEditingDev(d); setDevForm({ ...d }); setShowDevForm(true); };
  const submitDev = async () => {
    if (!selectedHost || !selectedLoop) return;
    if (!devForm.address || devForm.address <= 0) { toast.error('请输入地址码'); return; }
    if (!devForm.deviceType?.trim()) { toast.error('请选择设备类型'); return; }
    setDevSubmitting(true);
    try {
      if (editingDev) { await fireDeviceService.update(selectedHost.id, selectedLoop.loopNo, editingDev.id, devForm); toast.success('更新成功'); }
      else { await fireDeviceService.create(selectedHost.id, selectedLoop.loopNo, devForm); toast.success('新增成功'); }
      setShowDevForm(false); loadDevices();
    } catch (e: any) { toast.error(e?.message || '操作失败'); }
    finally { setDevSubmitting(false); }
  };
  const deleteDev = async () => {
    if (!selectedHost || !selectedLoop || !showDevDelete) return;
    try { await fireDeviceService.delete(selectedHost.id, selectedLoop.loopNo, showDevDelete.id); toast.success('删除成功'); setShowDevDelete(null); loadDevices(); }
    catch (e: any) { toast.error(e?.message || '删除失败'); }
  };

  /* ═══════════════════════════════════════════════════════════════
     HOST LIST VIEW
     ═══════════════════════════════════════════════════════════════ */
  if (view === 'host') {
    const totalPages = Math.ceil(hostTotal / hostPageSize);
    return (
      <div className="flex flex-col h-full gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={hostKeyword} onChange={e => { setHostKeyword(e.target.value); setHostPage(1); }}
                placeholder="搜索编号/品牌/型号/位置..."
                className="pl-8 pr-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-xs text-slate-200 w-56 outline-none focus:border-blue-500/50" />
            </div>
          </div>
          <button onClick={openHostAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30 rounded-lg text-xs font-medium transition-all active-press">
            <Plus className="w-3.5 h-3.5" />新增主机
          </button>
        </div>
        <DataContainer loading={hostLoading} error={hostError} data={hosts} onRetry={loadHosts} emptyText="暂无报警主机">
          <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 overflow-hidden flex-1 flex flex-col">
            <div className="overflow-auto flex-1 scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] text-slate-500 border-b border-slate-700/30 bg-slate-800/60 sticky top-0 z-10">
                    <th className="text-left p-2.5 font-medium w-14">ID</th>
                    <th className="text-left p-2.5 font-medium">主机编号</th>
                    <th className="text-left p-2.5 font-medium">品牌</th>
                    <th className="text-left p-2.5 font-medium">型号</th>
                    <th className="text-left p-2.5 font-medium">IP:端口</th>
                    <th className="text-left p-2.5 font-medium">安装位置</th>
                    <th className="text-left p-2.5 font-medium w-14">状态</th>
                    <th className="text-right p-2.5 font-medium w-32">操作</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {hosts.map(h => {
                    const st = HOST_STATUS[h.status] || HOST_STATUS[0];
                    return (
                      <tr key={h.id} className="border-b border-slate-700/20 hover:bg-slate-700/15 transition-colors">
                        <td className="p-2.5 text-slate-400 font-mono">{h.id}</td>
                        <td className="p-2.5 text-slate-200 font-semibold">{h.hostCode}</td>
                        <td className="p-2.5 text-slate-300">{h.brand || '-'}</td>
                        <td className="p-2.5 text-slate-300">{h.model || '-'}</td>
                        <td className="p-2.5 text-slate-400 font-mono">{h.ip}:{h.port}</td>
                        <td className="p-2.5 text-slate-300">{h.location || '-'}</td>
                        <td className="p-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded border ${st.cls}`}>{st.label}</span></td>
                        <td className="p-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setSelectedHost(h); setView('loop'); setLoopPage(1); setLoopKeyword(''); }}
                              className="flex items-center gap-1 px-2 py-1 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-md text-[10px] transition-colors">
                              <Network className="w-3 h-3" />回路
                            </button>
                            <button onClick={() => openHostEdit(h)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setShowHostDelete(h)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
                <span className="text-[10px] text-slate-500">共 {hostTotal} 条</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setHostPage(p => Math.max(1, p - 1))} disabled={hostPage === 1}
                    className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded border border-slate-700/30 transition-colors">上一页</button>
                  <span className="text-[10px] text-slate-400 px-2">{hostPage} / {totalPages}</span>
                  <button onClick={() => setHostPage(p => Math.min(totalPages, p + 1))} disabled={hostPage === totalPages}
                    className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded border border-slate-700/30 transition-colors">下一页</button>
                </div>
              </div>
            )}
          </div>
        </DataContainer>

        {/* Host Form Modal */}
        {showHostForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHostForm(false)} />
            <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-[460px] max-w-[90vw]">
              <div className="px-5 py-4 border-b border-slate-700/30 bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2"><Server className="w-4 h-4 text-blue-400" />{editingHost ? '编辑报警主机' : '新增报警主机'}</h3>
              </div>
              <div className="p-5 space-y-3">
                <div><label className="text-[11px] text-slate-400 block mb-1">主机编号 <span className="text-red-400">*</span></label>
                  <input value={hostForm.hostCode || ''} onChange={e => setHostForm(f => ({ ...f, hostCode: e.target.value }))} placeholder="如：FAS-001"
                    className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] text-slate-400 block mb-1">品牌</label>
                    <input value={hostForm.brand || ''} onChange={e => setHostForm(f => ({ ...f, brand: e.target.value }))} placeholder="如：海湾"
                      className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50" /></div>
                  <div><label className="text-[11px] text-slate-400 block mb-1">型号</label>
                    <input value={hostForm.model || ''} onChange={e => setHostForm(f => ({ ...f, model: e.target.value }))} placeholder="如：GST5000H"
                      className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] text-slate-400 block mb-1">IP 地址</label>
                    <input value={hostForm.ip || ''} onChange={e => setHostForm(f => ({ ...f, ip: e.target.value }))} placeholder="如：192.168.1.100"
                      className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50" /></div>
                  <div><label className="text-[11px] text-slate-400 block mb-1">端口号</label>
                    <input type="number" value={hostForm.port || 502} onChange={e => setHostForm(f => ({ ...f, port: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50" /></div>
                </div>
                <div><label className="text-[11px] text-slate-400 block mb-1">安装位置</label>
                  <input value={hostForm.location || ''} onChange={e => setHostForm(f => ({ ...f, location: e.target.value }))} placeholder="如：B1消防控制室"
                    className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50" /></div>
                <div><label className="text-[11px] text-slate-400 block mb-1">状态</label>
                  <div className="flex gap-2">
                    {[{ value: 1, label: '正常' }, { value: 0, label: '停用' }, { value: 2, label: '故障' }].map(opt => (
                      <button key={opt.value} onClick={() => setHostForm(f => ({ ...f, status: opt.value }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all ${hostForm.status === opt.value ? 'bg-blue-500/15 text-blue-300 border-blue-500/40' : 'bg-slate-700/30 text-slate-400 border-slate-600/20 hover:border-slate-500/30'}`}>
                        <Power className="w-3 h-3" />{opt.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-700/30 flex justify-end gap-2">
                <button onClick={() => setShowHostForm(false)} className="px-4 py-2 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40 transition-colors">取消</button>
                <button onClick={submitHost} disabled={hostSubmitting} className="px-4 py-2 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg transition-colors font-medium disabled:opacity-50">{hostSubmitting ? '保存中...' : '保存'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Host Delete Modal */}
        {showHostDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHostDelete(null)} />
            <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-80 p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-red-500/30"><Trash2 className="w-5 h-5 text-red-400" /></div>
              <h4 className="text-sm font-bold text-slate-100 mb-1">确认删除？</h4>
              <p className="text-[11px] text-slate-400 mb-4">删除主机「{showHostDelete.hostCode}」将同时删除其下的所有回路和设备点位。</p>
              <div className="flex justify-center gap-2">
                <button onClick={() => setShowHostDelete(null)} className="px-4 py-2 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40 transition-colors">取消</button>
                <button onClick={deleteHost} className="px-4 py-2 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 rounded-lg transition-colors font-medium">确认删除</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     LOOP LIST VIEW
     ═══════════════════════════════════════════════════════════════ */
  if (view === 'loop') {
    const totalPages = Math.ceil(loopTotal / loopPageSize);
    return (
      <div className="flex flex-col h-full gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => { setView('host'); setSelectedHost(null); }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 border border-slate-600/30 rounded-lg hover:bg-slate-700/40 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />返回主机
            </button>
            <div className="w-px h-5 bg-slate-700/50" />
            <span className="text-xs text-slate-400">主机 <span className="text-slate-200 font-semibold">{selectedHost?.hostCode}</span> 的回路</span>
          </div>
          <button onClick={openLoopAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-lg text-xs font-medium transition-all active-press">
            <Plus className="w-3.5 h-3.5" />新增回路
          </button>
        </div>
        <DataContainer loading={loopLoading} error={loopError} data={loops} onRetry={loadLoops} emptyText="暂无回路数据">
          <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 overflow-hidden flex-1 flex flex-col">
            <div className="overflow-auto flex-1 scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] text-slate-500 border-b border-slate-700/30 bg-slate-800/60 sticky top-0 z-10">
                    <th className="text-left p-2.5 font-medium w-14">ID</th>
                    <th className="text-left p-2.5 font-medium">回路编号</th>
                    <th className="text-left p-2.5 font-medium">回路名称</th>
                    <th className="text-left p-2.5 font-medium">所属主机</th>
                    <th className="text-left p-2.5 font-medium w-14">状态</th>
                    <th className="text-right p-2.5 font-medium w-32">操作</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {loops.map(l => {
                    const st = LOOP_STATUS[l.status] || LOOP_STATUS[0];
                    return (
                      <tr key={l.id} className="border-b border-slate-700/20 hover:bg-slate-700/15 transition-colors">
                        <td className="p-2.5 text-slate-400 font-mono">{l.id}</td>
                        <td className="p-2.5 text-slate-200 font-semibold">{l.loopNo}</td>
                        <td className="p-2.5 text-slate-300">{l.loopName || '-'}</td>
                        <td className="p-2.5 text-slate-400">{selectedHost?.hostCode || '-'}</td>
                        <td className="p-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded border ${st.cls}`}>{st.label}</span></td>
                        <td className="p-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setSelectedLoop(l); setView('device'); setDevPage(1); setDevKeyword(''); }}
                              className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-md text-[10px] transition-colors">
                              <Cpu className="w-3 h-3" />设备
                            </button>
                            <button onClick={() => openLoopEdit(l)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setShowLoopDelete(l)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
                <span className="text-[10px] text-slate-500">共 {loopTotal} 条</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setLoopPage(p => Math.max(1, p - 1))} disabled={loopPage === 1}
                    className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded border border-slate-700/30 transition-colors">上一页</button>
                  <span className="text-[10px] text-slate-400 px-2">{loopPage} / {totalPages}</span>
                  <button onClick={() => setLoopPage(p => Math.min(totalPages, p + 1))} disabled={loopPage === totalPages}
                    className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded border border-slate-700/30 transition-colors">下一页</button>
                </div>
              </div>
            )}
          </div>
        </DataContainer>

        {/* Loop Form Modal */}
        {showLoopForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLoopForm(false)} />
            <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-[400px] max-w-[90vw]">
              <div className="px-5 py-4 border-b border-slate-700/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2"><Network className="w-4 h-4 text-indigo-400" />{editingLoop ? '编辑回路' : '新增回路'}</h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] text-slate-400 block mb-1">回路编号 <span className="text-red-400">*</span></label>
                    <input type="number" value={loopForm.loopNo || ''} onChange={e => setLoopForm(f => ({ ...f, loopNo: Number(e.target.value) }))} placeholder="如：1"
                      className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-indigo-500/50" /></div>
                  <div><label className="text-[11px] text-slate-400 block mb-1">回路名称</label>
                    <input value={loopForm.loopName || ''} onChange={e => setLoopForm(f => ({ ...f, loopName: e.target.value }))} placeholder="如：1层大厅回路"
                      className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-indigo-500/50" /></div>
                </div>
                <div><label className="text-[11px] text-slate-400 block mb-1">状态</label>
                  <div className="flex gap-2">
                    {[{ value: 1, label: '正常' }, { value: 0, label: '停用' }].map(opt => (
                      <button key={opt.value} onClick={() => setLoopForm(f => ({ ...f, status: opt.value }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all ${loopForm.status === opt.value ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40' : 'bg-slate-700/30 text-slate-400 border-slate-600/20 hover:border-slate-500/30'}`}>
                        <Power className="w-3 h-3" />{opt.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-700/30 flex justify-end gap-2">
                <button onClick={() => setShowLoopForm(false)} className="px-4 py-2 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40 transition-colors">取消</button>
                <button onClick={submitLoop} disabled={loopSubmitting} className="px-4 py-2 text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 rounded-lg transition-colors font-medium disabled:opacity-50">{loopSubmitting ? '保存中...' : '保存'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Loop Delete Modal */}
        {showLoopDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLoopDelete(null)} />
            <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-80 p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-red-500/30"><Trash2 className="w-5 h-5 text-red-400" /></div>
              <h4 className="text-sm font-bold text-slate-100 mb-1">确认删除？</h4>
              <p className="text-[11px] text-slate-400 mb-4">删除回路「{showLoopDelete.loopName || showLoopDelete.loopNo}」将同时删除该回路下的所有设备点位。</p>
              <div className="flex justify-center gap-2">
                <button onClick={() => setShowLoopDelete(null)} className="px-4 py-2 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40 transition-colors">取消</button>
                <button onClick={deleteLoop} className="px-4 py-2 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 rounded-lg transition-colors font-medium">确认删除</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     DEVICE LIST VIEW
     ═══════════════════════════════════════════════════════════════ */
  const totalPages = Math.ceil(devTotal / devPageSize);
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => { setView('loop'); setSelectedLoop(null); }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 border border-slate-600/30 rounded-lg hover:bg-slate-700/40 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />返回回路
          </button>
          <div className="w-px h-5 bg-slate-700/50" />
          <span className="text-xs text-slate-400">主机 <span className="text-slate-200 font-semibold">{selectedHost?.hostCode}</span> / 回路 <span className="text-slate-200 font-semibold">{selectedLoop?.loopNo}</span> 的设备点位</span>
        </div>
        <button onClick={openDevAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg text-xs font-medium transition-all active-press">
          <Plus className="w-3.5 h-3.5" />新增设备
        </button>
      </div>
      <DataContainer loading={devLoading} error={devError} data={devices} onRetry={loadDevices} emptyText="暂无设备点位">
        <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 overflow-hidden flex-1 flex flex-col">
          <div className="overflow-auto flex-1 scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-slate-500 border-b border-slate-700/30 bg-slate-800/60 sticky top-0 z-10">
                  <th className="text-left p-2.5 font-medium w-12">ID</th>
                  <th className="text-left p-2.5 font-medium w-14">地址码</th>
                  <th className="text-left p-2.5 font-medium">设备类型</th>
                  <th className="text-left p-2.5 font-medium">安装位置</th>
                  <th className="text-left p-2.5 font-medium w-14">状态</th>
                  <th className="text-left p-2.5 font-medium">备注</th>
                  <th className="text-right p-2.5 font-medium w-20">操作</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {devices.map(d => {
                  const st = DEVICE_STATUS[d.status] || DEVICE_STATUS[0];
                  return (
                    <tr key={d.id} className="border-b border-slate-700/20 hover:bg-slate-700/15 transition-colors">
                      <td className="p-2.5 text-slate-400 font-mono">{d.id}</td>
                      <td className="p-2.5 text-slate-200 font-semibold">{d.address}</td>
                      <td className="p-2.5 text-slate-300">{d.deviceType || '-'}</td>
                      <td className="p-2.5 text-slate-300">{d.location || '-'}</td>
                      <td className="p-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded border ${st.cls}`}>{st.label}</span></td>
                      <td className="p-2.5 text-slate-400 max-w-[180px] truncate">{d.remark || '-'}</td>
                      <td className="p-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openDevEdit(d)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setShowDevDelete(d)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
              <span className="text-[10px] text-slate-500">共 {devTotal} 条</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setDevPage(p => Math.max(1, p - 1))} disabled={devPage === 1}
                  className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded border border-slate-700/30 transition-colors">上一页</button>
                <span className="text-[10px] text-slate-400 px-2">{devPage} / {totalPages}</span>
                <button onClick={() => setDevPage(p => Math.min(totalPages, p + 1))} disabled={devPage === totalPages}
                  className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded border border-slate-700/30 transition-colors">下一页</button>
              </div>
            </div>
          )}
        </div>
      </DataContainer>

      {/* Device Form Modal */}
      {showDevForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDevForm(false)} />
          <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-[440px] max-w-[90vw] max-h-[90vh] overflow-auto">
            <div className="px-5 py-4 border-b border-slate-700/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2"><Cpu className="w-4 h-4 text-cyan-400" />{editingDev ? '编辑设备点位' : '新增设备点位'}</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] text-slate-400 block mb-1">地址码 <span className="text-red-400">*</span></label>
                  <input type="number" value={devForm.address || ''} onChange={e => setDevForm(f => ({ ...f, address: Number(e.target.value) }))} placeholder="如：1"
                    className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500/50" /></div>
                <div><label className="text-[11px] text-slate-400 block mb-1">设备类型 <span className="text-red-400">*</span></label>
                  <select value={devForm.deviceType || ''} onChange={e => setDevForm(f => ({ ...f, deviceType: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500/50">
                    <option value="">请选择</option>
                    {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
              </div>
              <div><label className="text-[11px] text-slate-400 block mb-1">安装位置</label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input value={devForm.location || ''} onChange={e => setDevForm(f => ({ ...f, location: e.target.value }))} placeholder="如：1F大厅东侧"
                    className="w-full pl-8 pr-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500/50" />
                </div>
              </div>
              <div><label className="text-[11px] text-slate-400 block mb-1">备注</label>
                <textarea value={devForm.remark || ''} onChange={e => setDevForm(f => ({ ...f, remark: e.target.value }))} placeholder="可选填" rows={2}
                  className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500/50 resize-none" /></div>
              <div><label className="text-[11px] text-slate-400 block mb-1">状态</label>
                <div className="flex gap-2 flex-wrap">
                  {[{ value: 1, label: '正常', icon: Power }, { value: 0, label: '停用', icon: Power }, { value: 2, label: '故障', icon: AlertTriangle }, { value: 3, label: '报警', icon: Flame }].map(opt => (
                    <button key={opt.value} onClick={() => setDevForm(f => ({ ...f, status: opt.value }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all ${devForm.status === opt.value ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' : 'bg-slate-700/30 text-slate-400 border-slate-600/20 hover:border-slate-500/30'}`}>
                      <opt.icon className="w-3 h-3" />{opt.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-700/30 flex justify-end gap-2">
              <button onClick={() => setShowDevForm(false)} className="px-4 py-2 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40 transition-colors">取消</button>
              <button onClick={submitDev} disabled={devSubmitting} className="px-4 py-2 text-xs bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg transition-colors font-medium disabled:opacity-50">{devSubmitting ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Device Delete Modal */}
      {showDevDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDevDelete(null)} />
          <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-80 p-5 text-center">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-red-500/30"><Trash2 className="w-5 h-5 text-red-400" /></div>
            <h4 className="text-sm font-bold text-slate-100 mb-1">确认删除？</h4>
            <p className="text-[11px] text-slate-400 mb-4">删除设备「地址码 {showDevDelete.address} - {showDevDelete.deviceType}」后不可恢复。</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setShowDevDelete(null)} className="px-4 py-2 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40 transition-colors">取消</button>
              <button onClick={deleteDev} className="px-4 py-2 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 rounded-lg transition-colors font-medium">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
