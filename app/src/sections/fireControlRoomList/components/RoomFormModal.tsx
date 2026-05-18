import { useState, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Edit3, Save } from 'lucide-react';
import type { ControlRoom } from '../types';

export default function RoomFormModal({
  room,
  mode,
  units,
  onSave,
  onClose,
}: {
  room: ControlRoom | null;
  mode: 'add' | 'edit';
  units: Array<{ id: string | number; name: string }>;
  onSave: (room: ControlRoom) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ControlRoom & { unitId?: string }>({
    id: '',
    unitId: '',
    unitName: '',
    controllerModel: '',
    hostNo: '',
    busDevices: 0,
    busPoints: 0,
    multilineDevices: 0,
    multilinePoints: 0,
    serviceStart: '',
    serviceEnd: '',
    online: true,
  });

  useLayoutEffect(() => {
    if (room) setForm({ ...room });
    else setForm({
      id: 'CR' + Date.now(),
      unitId: '',
      unitName: '',
      controllerModel: '',
      hostNo: '主机1',
      busDevices: 0,
      busPoints: 0,
      multilineDevices: 0,
      multilinePoints: 0,
      serviceStart: '',
      serviceEnd: '',
      online: true,
    });
  }, [room]);

  const isAdd = mode === 'add';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            {isAdd ? <Plus className="w-4 h-4 text-blue-400" /> : <Edit3 className="w-4 h-4 text-blue-400" />}
            {isAdd ? '新增消控室' : '编辑消控室'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 transition-colors" aria-label="关闭"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">单位名称 <span className="text-red-400">*</span></label>
            <select value={form.unitId || ''} onChange={e => {
              const u = units.find(x => String(x.id) === e.target.value);
              setForm({ ...form, unitId: e.target.value, unitName: u?.name || '' });
            }} className="h-8 text-xs bg-slate-800/40 border border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40 w-full px-2">
              <option value="">请选择单位</option>
              {units.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">控制器型号 <span className="text-red-400">*</span></label>
            <Input value={form.controllerModel} onChange={e => setForm({ ...form, controllerModel: e.target.value })} placeholder="输入控制器型号" className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">主机编号</label>
            <Input value={form.hostNo} onChange={e => setForm({ ...form, hostNo: e.target.value })} placeholder="如：主机1" className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">总线设备</label>
              <Input type="number" value={form.busDevices} onChange={e => setForm({ ...form, busDevices: Number(e.target.value) })} className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">设备点位</label>
              <Input type="number" value={form.busPoints} onChange={e => setForm({ ...form, busPoints: Number(e.target.value) })} className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">多线设备</label>
              <Input type="number" value={form.multilineDevices} onChange={e => setForm({ ...form, multilineDevices: Number(e.target.value) })} className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">多线点位</label>
              <Input type="number" value={form.multilinePoints} onChange={e => setForm({ ...form, multilinePoints: Number(e.target.value) })} className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">服务开始</label>
              <Input type="date" value={form.serviceStart} onChange={e => setForm({ ...form, serviceStart: e.target.value })} className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">服务结束</label>
              <Input type="date" value={form.serviceEnd} onChange={e => setForm({ ...form, serviceEnd: e.target.value })} className="h-8 text-xs bg-slate-800/40 border-slate-700/30 text-slate-200 rounded-lg focus:border-blue-500/40" />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs border-slate-700 text-slate-300 hover:bg-slate-800/60 rounded-lg">取消</Button>
          <Button size="sm" onClick={() => {
            if (!form.unitName?.trim()) {
              alert('单位名称不能为空');
              return;
            }
            onSave(form);
          }} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 rounded-lg">
            <Save className="w-3.5 h-3.5" />保存
          </Button>
        </div>
      </div>
    </div>
  );
}
