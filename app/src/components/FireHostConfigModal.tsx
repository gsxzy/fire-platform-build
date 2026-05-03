import { useState, useEffect, useCallback } from 'react';
import {
  Server, X, Plus, Edit2, Trash2, Network, Cpu, Power,
  AlertTriangle, Flame, MapPin, Settings
} from 'lucide-react';
import { fireHostService, fireLoopService, fireDeviceService } from '@/api/fireHostService';
import type { FireHost, FireLoop, FireDevice } from '@/types/fireHost';
import { toast } from 'sonner';

type SubTab = 'host' | 'loop' | 'device';

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

interface Props {
  deviceId: string;
  deviceName: string;
  onClose: () => void;
}

export default function FireHostConfigModal({ deviceId, deviceName, onClose }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('host');

  /* ── Host state ── */
  const [host, setHost] = useState<FireHost | null>(null);
  const [hostLoading, setHostLoading] = useState(true);
  const [hostForm, setHostForm] = useState<Partial<FireHost>>({});
  const [hostSubmitting, setHostSubmitting] = useState(false);

  /* ── Loop state ── */
  const [loops, setLoops] = useState<FireLoop[]>([]);
  const [loopLoading, setLoopLoading] = useState(false);
  const [showLoopForm, setShowLoopForm] = useState(false);
  const [editingLoop, setEditingLoop] = useState<FireLoop | null>(null);
  const [loopForm, setLoopForm] = useState<Partial<FireLoop>>({});
  const [loopSubmitting, setLoopSubmitting] = useState(false);
  const [showLoopDelete, setShowLoopDelete] = useState<FireLoop | null>(null);

  /* ── Device state ── */
  const [devices, setDevices] = useState<FireDevice[]>([]);
  const [devLoading, setDevLoading] = useState(false);
  const [selectedLoopNo, setSelectedLoopNo] = useState<number | null>(null);
  const [showDevForm, setShowDevForm] = useState(false);
  const [editingDev, setEditingDev] = useState<FireDevice | null>(null);
  const [devForm, setDevForm] = useState<Partial<FireDevice>>({});
  const [devSubmitting, setDevSubmitting] = useState(false);
  const [showDevDelete, setShowDevDelete] = useState<FireDevice | null>(null);

  /* ── Load host by deviceId ── */
  const loadHost = useCallback(async () => {
    setHostLoading(true);
    try {
      const res = await fireHostService.getByDeviceId(deviceId);
      if (res) {
        setHost(res);
        setHostForm({ ...res });
      } else {
        // 未创建，显示创建表单
        setHost(null);
        setHostForm({ deviceId, hostCode: deviceId, port: 502, status: 1, brand: '', model: '', ip: '', location: '' });
      }
    } catch (e: any) {
      toast.error(e?.message || '加载失败');
    } finally {
      setHostLoading(false);
    }
  }, [deviceId]);

  useEffect(() => { loadHost(); }, [loadHost]);

  /* ── Load loops & devices ── */
  const loadLoops = useCallback(async () => {
    if (!host) { setLoops([]); return; }
    setLoopLoading(true);
    try {
      const res = await fireLoopService.list(host.id, { pageSize: 999 });
      setLoops(res.list || []);
    } catch (e: any) { toast.error(e?.message || '加载回路失败'); }
    finally { setLoopLoading(false); }
  }, [host]);

  const loadDevices = useCallback(async () => {
    if (!host) { setDevices([]); return; }
    setDevLoading(true);
    try {
      let allDevs: FireDevice[] = [];
      for (const loop of loops) {
        const res = await fireDeviceService.list(host.id, loop.loopNo, { pageSize: 999 });
        allDevs = [...allDevs, ...(res.list || [])];
      }
      setDevices(allDevs);
    } catch (e: any) { toast.error(e?.message || '加载设备失败'); }
    finally { setDevLoading(false); }
  }, [host, loops]);

  useEffect(() => { if (subTab === 'loop' || subTab === 'device') loadLoops(); }, [loadLoops, subTab]);
  useEffect(() => { if (subTab === 'device') loadDevices(); }, [loadDevices, subTab, loops]);

  /* ── Host save ── */
  const saveHost = async () => {
    if (!hostForm.hostCode?.trim()) { toast.error('请输入主机编号'); return; }
    setHostSubmitting(true);
    try {
      if (host) {
        await fireHostService.update(host.id, hostForm);
        toast.success('更新成功');
        loadHost();
      } else {
        const created = await fireHostService.create(hostForm);
        toast.success('创建成功');
        setHost(created);
        setHostForm({ ...created });
      }
    } catch (e: any) { toast.error(e?.message || '保存失败'); }
    finally { setHostSubmitting(false); }
  };

  /* ── Loop handlers ── */
  const openLoopAdd = () => { setEditingLoop(null); setLoopForm({ status: 1 }); setShowLoopForm(true); };
  const openLoopEdit = (l: FireLoop) => { setEditingLoop(l); setLoopForm({ ...l }); setShowLoopForm(true); };
  const submitLoop = async () => {
    if (!host || !loopForm.loopNo || loopForm.loopNo <= 0) { toast.error('请输入回路编号'); return; }
    setLoopSubmitting(true);
    try {
      if (editingLoop) { await fireLoopService.update(host.id, editingLoop.id, loopForm); toast.success('更新成功'); }
      else { await fireLoopService.create(host.id, loopForm); toast.success('新增成功'); }
      setShowLoopForm(false); loadLoops();
    } catch (e: any) { toast.error(e?.message || '操作失败'); }
    finally { setLoopSubmitting(false); }
  };
  const deleteLoop = async () => {
    if (!host || !showLoopDelete) return;
    try { await fireLoopService.delete(host.id, showLoopDelete.id); toast.success('删除成功'); setShowLoopDelete(null); loadLoops(); }
    catch (e: any) { toast.error(e?.message || '删除失败'); }
  };

  /* ── Device handlers ── */
  const openDevAdd = () => { setEditingDev(null); setDevForm({ status: 1 }); setShowDevForm(true); };
  const openDevEdit = (d: FireDevice) => { setEditingDev(d); setDevForm({ ...d }); setShowDevForm(true); };
  const submitDev = async () => {
    if (!host) return;
    if (!devForm.address || devForm.address <= 0) { toast.error('请输入地址码'); return; }
    if (!devForm.deviceType?.trim()) { toast.error('请选择设备类型'); return; }
    if (!devForm.loopNo || devForm.loopNo <= 0) { toast.error('请选择所属回路'); return; }
    setDevSubmitting(true);
    try {
      if (editingDev) { await fireDeviceService.update(host.id, editingDev.loopNo, editingDev.id, devForm); toast.success('更新成功'); }
      else { await fireDeviceService.create(host.id, devForm.loopNo!, devForm); toast.success('新增成功'); }
      setShowDevForm(false); loadDevices();
    } catch (e: any) { toast.error(e?.message || '操作失败'); }
    finally { setDevSubmitting(false); }
  };
  const deleteDev = async () => {
    if (!host || !showDevDelete) return;
    try { await fireDeviceService.delete(host.id, showDevDelete.loopNo, showDevDelete.id); toast.success('删除成功'); setShowDevDelete(null); loadDevices(); }
    catch (e: any) { toast.error(e?.message || '删除失败'); }
  };

  const filteredDevices = selectedLoopNo === null ? devices : devices.filter(d => d.loopNo === selectedLoopNo);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-[720px] max-w-[95vw] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-3 border-b border-slate-700/30 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-slate-100">报警主机配置</h3>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-400">{deviceName}</span>
            {host && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">已配置</span>}
            {!host && !hostLoading && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20">未配置</span>}
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-700/50 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Sub tabs */}
        <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2 border-b border-slate-700/30 bg-slate-800/60">
          {[
            { key: 'host' as SubTab, label: '主机信息', icon: Server },
            { key: 'loop' as SubTab, label: '回路管理', icon: Network },
            { key: 'device' as SubTab, label: '设备点位', icon: Cpu },
          ].map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${subTab === t.key ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-700/30'}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto p-4 scrollbar-thin">
          {/* ═══════ 主机信息 ═══════ */}
          {subTab === 'host' && (
            <div className="space-y-3">
              {hostLoading ? (
                <div className="flex items-center justify-center h-40 text-slate-400 text-sm"><Settings className="w-5 h-5 animate-spin mr-2" />加载中...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] text-slate-400 block mb-1">主机编号 <span className="text-red-400">*</span></label>
                      <input value={hostForm.hostCode || ''} onChange={e => setHostForm(f => ({ ...f, hostCode: e.target.value }))} placeholder="如：FAS-001"
                        className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50" /></div>
                    <div><label className="text-[11px] text-slate-400 block mb-1">品牌</label>
                      <input value={hostForm.brand || ''} onChange={e => setHostForm(f => ({ ...f, brand: e.target.value }))} placeholder="如：海湾"
                        className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] text-slate-400 block mb-1">型号</label>
                      <input value={hostForm.model || ''} onChange={e => setHostForm(f => ({ ...f, model: e.target.value }))} placeholder="如：GST5000H"
                        className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-blue-500/50" /></div>
                    <div><label className="text-[11px] text-slate-400 block mb-1">安装位置</label>
                      <input value={hostForm.location || ''} onChange={e => setHostForm(f => ({ ...f, location: e.target.value }))} placeholder="如：B1消防控制室"
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
                  <div><label className="text-[11px] text-slate-400 block mb-1">状态</label>
                    <div className="flex gap-2">
                      {[{ value: 1, label: '正常' }, { value: 0, label: '停用' }, { value: 2, label: '故障' }].map(opt => (
                        <button key={opt.value} onClick={() => setHostForm(f => ({ ...f, status: opt.value }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all ${hostForm.status === opt.value ? 'bg-blue-500/15 text-blue-300 border-blue-500/40' : 'bg-slate-700/30 text-slate-400 border-slate-600/20 hover:border-slate-500/30'}`}>
                          <Power className="w-3 h-3" />{opt.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <button onClick={saveHost} disabled={hostSubmitting}
                      className="px-4 py-2 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg transition-colors font-medium disabled:opacity-50">
                      {hostSubmitting ? '保存中...' : host ? '保存修改' : '创建配置'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════ 回路管理 ═══════ */}
          {subTab === 'loop' && (
            <div className="space-y-3">
              {!host ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  <span>请先完成主机信息配置</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-end">
                    <button onClick={openLoopAdd}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30 rounded-lg text-xs font-medium transition-all">
                      <Plus className="w-3.5 h-3.5" />新增回路
                    </button>
                  </div>
                  <div className="rounded-lg border border-slate-700/30 bg-slate-800/40 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="text-[10px] text-slate-500 border-b border-slate-700/30 bg-slate-800/60">
                          <th className="text-left p-2.5 font-medium w-14">ID</th>
                          <th className="text-left p-2.5 font-medium">回路编号</th>
                          <th className="text-left p-2.5 font-medium">回路名称</th>
                          <th className="text-left p-2.5 font-medium w-14">状态</th>
                          <th className="text-right p-2.5 font-medium w-24">操作</th>
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
                              <td className="p-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded border ${st.cls}`}>{st.label}</span></td>
                              <td className="p-2.5">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => { setSelectedLoopNo(l.loopNo); setSubTab('device'); }}
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
                        {loops.length === 0 && !loopLoading && (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-500 text-xs">暂无回路数据</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════ 设备点位 ═══════ */}
          {subTab === 'device' && (
            <div className="space-y-3">
              {!host ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  <span>请先完成主机信息配置</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedLoopNo(null)}
                        className={`px-2.5 py-1 rounded-md text-[11px] border transition-all ${selectedLoopNo === null ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'text-slate-400 border-slate-600/20 hover:border-slate-500/30'}`}>
                        全部回路
                      </button>
                      {loops.map(l => (
                        <button key={l.id} onClick={() => setSelectedLoopNo(l.loopNo)}
                          className={`px-2.5 py-1 rounded-md text-[11px] border transition-all ${selectedLoopNo === l.loopNo ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'text-slate-400 border-slate-600/20 hover:border-slate-500/30'}`}>
                          回路{l.loopNo}
                        </button>
                      ))}
                    </div>
                    <button onClick={openDevAdd}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-lg text-xs font-medium transition-all">
                      <Plus className="w-3.5 h-3.5" />新增设备
                    </button>
                  </div>
                  <div className="rounded-lg border border-slate-700/30 bg-slate-800/40 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="text-[10px] text-slate-500 border-b border-slate-700/30 bg-slate-800/60">
                          <th className="text-left p-2.5 font-medium w-12">ID</th>
                          <th className="text-left p-2.5 font-medium w-14">地址码</th>
                          <th className="text-left p-2.5 font-medium">设备类型</th>
                          <th className="text-left p-2.5 font-medium">安装位置</th>
                          <th className="text-left p-2.5 font-medium w-14">状态</th>
                          <th className="text-left p-2.5 font-medium">回路</th>
                          <th className="text-right p-2.5 font-medium w-20">操作</th>
                        </tr>
                      </thead>
                      <tbody className="text-[11px]">
                        {filteredDevices.map(d => {
                          const st = DEVICE_STATUS[d.status] || DEVICE_STATUS[0];
                          return (
                            <tr key={d.id} className="border-b border-slate-700/20 hover:bg-slate-700/15 transition-colors">
                              <td className="p-2.5 text-slate-400 font-mono">{d.id}</td>
                              <td className="p-2.5 text-slate-200 font-semibold">{d.address}</td>
                              <td className="p-2.5 text-slate-300">{d.deviceType || '-'}</td>
                              <td className="p-2.5 text-slate-300">{d.location || '-'}</td>
                              <td className="p-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded border ${st.cls}`}>{st.label}</span></td>
                              <td className="p-2.5 text-slate-400">{d.loopNo}</td>
                              <td className="p-2.5">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => openDevEdit(d)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setShowDevDelete(d)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredDevices.length === 0 && !devLoading && (
                          <tr><td colSpan={7} className="p-8 text-center text-slate-500 text-xs">暂无设备点位</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ═══════ Modals ═══════ */}
        {/* Loop Form */}
        {showLoopForm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowLoopForm(false)}>
            <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-[360px] p-5" onClick={e => e.stopPropagation()}>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3"><Network className="w-4 h-4 text-indigo-400" />{editingLoop ? '编辑回路' : '新增回路'}</h4>
              <div className="space-y-3">
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all ${loopForm.status === opt.value ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40' : 'bg-slate-700/30 text-slate-400 border-slate-600/20'}`}>
                        <Power className="w-3 h-3" />{opt.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowLoopForm(false)} className="px-3 py-1.5 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40">取消</button>
                <button onClick={submitLoop} disabled={loopSubmitting} className="px-3 py-1.5 text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 rounded-lg font-medium disabled:opacity-50">{loopSubmitting ? '保存中...' : '保存'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Loop Delete */}
        {showLoopDelete && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowLoopDelete(null)}>
            <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-72 p-5 text-center" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-red-500/30"><Trash2 className="w-5 h-5 text-red-400" /></div>
              <h4 className="text-sm font-bold text-slate-100 mb-1">确认删除？</h4>
              <p className="text-[11px] text-slate-400 mb-4">删除回路「{showLoopDelete.loopName || showLoopDelete.loopNo}」将同时删除该回路下的所有设备点位。</p>
              <div className="flex justify-center gap-2">
                <button onClick={() => setShowLoopDelete(null)} className="px-4 py-2 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40">取消</button>
                <button onClick={deleteLoop} className="px-4 py-2 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 rounded-lg font-medium">确认删除</button>
              </div>
            </div>
          </div>
        )}

        {/* Device Form */}
        {showDevForm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDevForm(false)}>
            <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-[400px] p-5" onClick={e => e.stopPropagation()}>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3"><Cpu className="w-4 h-4 text-cyan-400" />{editingDev ? '编辑设备点位' : '新增设备点位'}</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] text-slate-400 block mb-1">地址码 <span className="text-red-400">*</span></label>
                    <input type="number" value={devForm.address || ''} onChange={e => setDevForm(f => ({ ...f, address: Number(e.target.value) }))} placeholder="如：1"
                      className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500/50" /></div>
                  <div><label className="text-[11px] text-slate-400 block mb-1">所属回路 <span className="text-red-400">*</span></label>
                    <select value={devForm.loopNo || ''} onChange={e => setDevForm(f => ({ ...f, loopNo: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500/50">
                      <option value="">请选择</option>
                      {loops.map(l => <option key={l.id} value={l.loopNo}>回路{l.loopNo} {l.loopName}</option>)}
                    </select></div>
                </div>
                <div><label className="text-[11px] text-slate-400 block mb-1">设备类型 <span className="text-red-400">*</span></label>
                  <select value={devForm.deviceType || ''} onChange={e => setDevForm(f => ({ ...f, deviceType: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500/50">
                    <option value="">请选择</option>
                    {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all ${devForm.status === opt.value ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' : 'bg-slate-700/30 text-slate-400 border-slate-600/20'}`}>
                        <opt.icon className="w-3 h-3" />{opt.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowDevForm(false)} className="px-3 py-1.5 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40">取消</button>
                <button onClick={submitDev} disabled={devSubmitting} className="px-3 py-1.5 text-xs bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg font-medium disabled:opacity-50">{devSubmitting ? '保存中...' : '保存'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Device Delete */}
        {showDevDelete && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDevDelete(null)}>
            <div className="relative bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl w-72 p-5 text-center" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-red-500/30"><Trash2 className="w-5 h-5 text-red-400" /></div>
              <h4 className="text-sm font-bold text-slate-100 mb-1">确认删除？</h4>
              <p className="text-[11px] text-slate-400 mb-4">删除设备「地址码 {showDevDelete.address} - {showDevDelete.deviceType}」后不可恢复。</p>
              <div className="flex justify-center gap-2">
                <button onClick={() => setShowDevDelete(null)} className="px-4 py-2 text-xs text-slate-300 border border-slate-600/40 rounded-lg hover:bg-slate-700/40">取消</button>
                <button onClick={deleteDev} className="px-4 py-2 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 rounded-lg font-medium">确认删除</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
