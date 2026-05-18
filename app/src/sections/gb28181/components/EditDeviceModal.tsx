import { useState } from 'react';
import { Pencil, X, Save } from 'lucide-react';
import { useToast } from '@/core/ToastContext';
import type { GB28181Device } from '@/types/db';

export default function EditDeviceModal({ device, onClose, onSubmit, units }: {
  device: GB28181Device;
  onClose: () => void;
  onSubmit: (id: string, data: Partial<GB28181Device>) => void;
  units: { id: string; unit_name: string }[];
}) {
  const { warning } = useToast();
  const [form, setForm] = useState({
    deviceId: device.deviceId || '',
    name: device.name || '',
    ip: device.ip || '',
    port: String(device.port || 5060),
    manufacturer: device.manufacturer || '',
    model: device.model || '',
    transport: (device.transport as 'UDP' | 'TCP') || 'UDP',
    username: device.username || '',
    password: device.password || '',
    location: device.location || '',
    unitId: device.unitId || '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const errors: Record<string, string> = {};
    if (!form.deviceId) errors.deviceId = '请填写国标设备编码';
    if (!form.name) errors.name = '请填写设备名称';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      warning('表单校验失败', '请检查红色标注的必填项');
      return;
    }
    setFieldErrors({});
    const unit = units.find(u => String(u.id) === String(form.unitId));
    onSubmit(device.id, {
      ...form,
      port: Number(form.port),
      unitName: unit?.unit_name || '',
      deviceId: form.deviceId || device.deviceId,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2"><Pencil className="w-4 h-4 text-amber-400" />编辑GB28181设备</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
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
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">安装位置</label>
            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="1F大厅" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">所属单位</label>
            <select value={form.unitId} onChange={e => setForm({ ...form, unitId: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none">
              <option value="">-- 请选择单位 --</option>
              {units.map(u => (
                <option key={u.id} value={String(u.id)}>{u.unit_name}</option>
              ))}
            </select>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-400">
            提示：修改国标编码后，如果该摄像头已在平面图中绑定，需要重新绑定关联关系。
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 rounded-md transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={!form.deviceId || !form.name} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs rounded-md flex items-center gap-1.5 transition-colors">
            <Save className="w-3.5 h-3.5" />确认修改
          </button>
        </div>
      </div>
    </div>
  );
}
