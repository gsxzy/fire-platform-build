import { useState } from 'react';
import { Video, X, Save } from 'lucide-react';
import { useToast } from '@/core/ToastContext';
import type { Device } from '@/types/db';
import type { GB28181Device } from '@/types/db';

export default function AddDeviceModal({ onClose, onSubmit, archiveDevices, gbDevices, sipRunning, units }: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  archiveDevices: Device[];
  gbDevices: GB28181Device[];
  sipRunning: boolean;
  units: { id: string; unit_name: string }[];
}) {
  const { warning } = useToast();
  const [selectedArchiveId, setSelectedArchiveId] = useState('');
  const [form, setForm] = useState({
    deviceId: '', name: '', ip: '', port: '5060', manufacturer: '', model: '',
    transport: 'UDP' as 'UDP' | 'TCP', username: '', password: '', unitId: '',
    location: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSelectArchive = (id: string) => {
    setSelectedArchiveId(id);
    setFieldErrors({});
    const d = archiveDevices.find(x => x.id === id);
    if (d) {
      setForm(prev => ({
        ...prev,
        name: d.name,
        unitId: d.unitId,
        location: d.location || '',
        manufacturer: d.manufacturer || '',
        model: d.model || '',
      }));
    }
  };

  const handleSubmit = () => {
    const errors: Record<string, string> = {};
    if (!sipRunning) {
      warning('SIP服务已停止', '请先启动SIP服务后再添加设备');
      return;
    }
    if (!form.deviceId) errors.deviceId = '请填写国标设备编码';
    if (!form.name) errors.name = '请填写设备名称';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    const data = {
      id: `GB-${Date.now()}`,
      ...form,
      port: Number(form.port),
      status: 'offline',
      registerTime: null,
      lastKeepalive: null,
      channelCount: 0,
      channels: [],
      catalogSynced: false,
      ptzSupport: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;
    if (selectedArchiveId) {
      data.archiveId = selectedArchiveId;
    }
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2"><Video className="w-4 h-4 text-indigo-400" />添加GB28181设备</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          {/* Archive Device Selection */}
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">从设备档案选择 <span className="text-red-400">*</span></label>
            <select
              value={selectedArchiveId}
              onChange={e => handleSelectArchive(e.target.value)}
              className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none"
            >
              <option value="">请选择档案设备</option>
              {archiveDevices
                .filter(d => (d.type === 'gb28181-camera' || d.type === 'camera') && !gbDevices.some(dev => dev.id === d.id))
                .map(d => (
                  <option key={d.id} value={d.id}>{d.id} - {d.name} ({d.unitName || d.unitId} / {d.location})</option>
                ))}
            </select>
            {archiveDevices.filter(d => (d.type === 'gb28181-camera' || d.type === 'camera') && !gbDevices.some(dev => dev.id === d.id)).length === 0 && (
              <div className="mt-1.5 text-[10px] text-amber-400">
                无可用的 GB28181 档案设备，请先前往 <a href="#/device-archive" className="underline hover:text-amber-300">设备档案</a> 创建「GB28181摄像头」类型设备并入库。
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">国标设备编码 <span className="text-red-400">*</span></label>
              <input value={form.deviceId} onChange={e => { setForm({ ...form, deviceId: e.target.value }); if (fieldErrors.deviceId) setFieldErrors(prev => { const n = { ...prev }; delete n.deviceId; return n; }); }} placeholder="34020000001320000001" className={`w-full bg-slate-700/30 border rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono ${fieldErrors.deviceId ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-slate-600/30'}`} />
              {fieldErrors.deviceId && <span className="text-[10px] text-red-400 mt-0.5 block">{fieldErrors.deviceId}</span>}
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">设备名称 <span className="text-red-400">*</span></label>
              <input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); if (fieldErrors.name) setFieldErrors(prev => { const n = { ...prev }; delete n.name; return n; }); }} placeholder="大厅摄像头" className={`w-full bg-slate-700/30 border rounded px-3 py-2 text-xs text-slate-200 outline-none ${fieldErrors.name ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-slate-600/30'}`} />
              {fieldErrors.name && <span className="text-[10px] text-red-400 mt-0.5 block">{fieldErrors.name}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">IP地址</label>
              <input value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.xxx" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">端口</label>
              <input value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">厂商</label>
              <input value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} placeholder="海康威视" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">型号</label>
              <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="DS-2CD3T25" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">传输协议</label>
              <select value={form.transport} onChange={e => setForm({ ...form, transport: e.target.value as 'UDP' | 'TCP' })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none">
                <option>UDP</option><option>TCP</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">所属单位 <span className="text-red-400">*</span></label>
              <select
                value={form.unitId}
                onChange={e => setForm({ ...form, unitId: e.target.value })}
                className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none"
              >
                <option value="">请选择单位</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.unit_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">安装位置</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="1F大厅" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 rounded-md transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={!form.deviceId || !form.name} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs rounded-md flex items-center gap-1.5 transition-colors">
            <Save className="w-3.5 h-3.5" />确认添加
          </button>
        </div>
      </div>
    </div>
  );
}
