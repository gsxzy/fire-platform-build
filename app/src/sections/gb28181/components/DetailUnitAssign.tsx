import { useState } from 'react';
import { useToast } from '@/core/ToastContext';
import type { GB28181Device } from '@/types/db';

export default function DetailUnitAssign({ device, units, onAssign }: {
  device: GB28181Device;
  units: { id: string; unit_name: string }[];
  onAssign: (unitId: string, unitName: string) => void;
}) {
  const [unitId, setUnitId] = useState(device.unitId || '');
  const [saving, setSaving] = useState(false);
  const { success, warning } = useToast();

  const currentUnit = units.find(u => String(u.id) === String(device.unitId));
  const hasUnit = !!currentUnit;

  const handleSave = async () => {
    if (!unitId) {
      warning('请选择单位', '所属单位不能为空');
      return;
    }
    const unit = units.find(u => String(u.id) === String(unitId));
    if (!unit) return;
    setSaving(true);
    try {
      await onAssign(String(unit.id), unit.unit_name);
      success('分配成功', `已分配到 ${unit.unit_name}`);
    } catch (e) {
      warning('分配失败', '请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-2.5 rounded-lg bg-slate-700/20 border border-slate-700/20 text-[10px]">
      <span className="text-slate-500 block mb-1">所属单位</span>
      <div className="flex items-center gap-2">
        <select
          value={unitId}
          onChange={e => setUnitId(e.target.value)}
          className="flex-1 bg-slate-800/50 border border-slate-600/30 rounded px-2 py-1 text-xs text-slate-200 outline-none"
        >
          <option value="">-- 请选择单位 --</option>
          {units.map(u => (
            <option key={u.id} value={String(u.id)}>{u.unit_name}</option>
          ))}
        </select>
        {(!hasUnit || unitId !== String(device.unitId || '')) && (
          <button
            onClick={handleSave}
            disabled={saving || !unitId}
            className="px-2 py-1 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20 rounded text-[10px] transition-colors disabled:opacity-40"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        )}
      </div>
      {hasUnit && unitId === String(device.unitId || '') && (
        <span className="text-emerald-400 mt-1 block">✓ 已分配: {currentUnit.unit_name}</span>
      )}
    </div>
  );
}
