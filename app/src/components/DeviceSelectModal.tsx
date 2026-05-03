import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeviceDAO } from '@/db/Database';
import type { Device } from '@/types/db';
import { Search, X, Server, CheckSquare, Square } from 'lucide-react';

const typeMap: Record<string, string> = {
  detector: '探测器', button: '手报', pump: '消防泵', fan: '风机',
  sensor: '传感器', monitor: '监控器', controller: '控制器', alarm: '报警器',
  host: '报警主机', elevator: '电梯', broadcast: '广播', camera: '摄像头',
  'gb28181-camera': 'GB28181摄像头', 'fire-controller': '火灾报警控制器',
  water: '水源监测', electrical: '电气火灾', 'smoke-exhaust': '防排烟',
  lighting: '应急照明', 'iot-sensor': 'IoT传感器', 'elec-monitor': '电气监测',
  'pressure-sensor': '压力传感器', 'fan-controller': '风机控制', 'level-sensor': '液位传感器',
};

const typeColorMap: Record<string, string> = {
  host: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  controller: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  detector: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  button: 'text-red-400 bg-red-500/10 border-red-500/20',
  pump: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  fan: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

interface DeviceSelectModalProps {
  unitId?: string;
  unitName?: string;
  onConfirm: (devices: Device[]) => void;
  onClose: () => void;
}

export default function DeviceSelectModal({ unitId, unitName, onConfirm, onClose }: DeviceSelectModalProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    DeviceDAO.getAll().then(list => {
      // 优先显示未绑定单位的设备，或已绑定到当前单位的设备
      const sorted = list.sort((a: Device, b: Device) => {
        const aBound = a.unitId ? 1 : 0;
        const bBound = b.unitId ? 1 : 0;
        return aBound - bBound;
      });
      setDevices(sorted);
      setLoading(false);
    });
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = devices.filter((d: Device) => {
    if (!keyword) return true;
    const q = keyword.toLowerCase();
    return (
      d.name?.toLowerCase().includes(q) ||
      d.id?.toLowerCase().includes(q) ||
      (typeMap[d.type] || d.type)?.includes(q) ||
      d.location?.toLowerCase().includes(q)
    );
  });

  const selectedDevices = devices.filter((d: Device) => selectedIds.has(d.id));
  const hasHost = selectedDevices.some((d: Device) => d.type === 'host');

  const handleConfirm = () => {
    onConfirm(selectedDevices);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700/30 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-200">
              选择消防设备 {unitName ? `（${unitName}）` : ''}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              已选 {selectedIds.size}
            </span>
            {hasHost && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                含报警主机
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200" aria-label="关闭"><X className="w-4 h-4" /></button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-700/30 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="搜索设备名称/编码/类型/位置"
              className="pl-8 h-8 text-xs bg-slate-700/30 border-slate-600/30 text-slate-200"
            />
          </div>
        </div>

        {/* Device List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && (
            <div className="text-center py-8 text-xs text-slate-500">加载中...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-500">
              {keyword ? '未找到匹配的设备' : '设备档案库为空'}
            </div>
          )}
          {filtered.map((device: Device) => {
            const isSelected = selectedIds.has(device.id);
            const typeLabel = typeMap[device.type] || device.type;
            const typeStyle = typeColorMap[device.type] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
            const boundToOther = device.unitId && device.unitId !== unitId;
            return (
              <div
                key={device.id}
                onClick={() => toggleSelect(device.id)}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500/40 bg-blue-500/10'
                    : 'border-slate-700/30 bg-slate-800/40 hover:bg-slate-700/30'
                }`}
              >
                <button
                  onClick={e => { e.stopPropagation(); toggleSelect(device.id); }}
                  className="text-slate-500 hover:text-blue-400 transition-colors flex-shrink-0"
                >
                  {isSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200 truncate">{device.name}</span>
                    <span className={`text-[9px] px-1 py-0.5 rounded border ${typeStyle}`}>{typeLabel}</span>
                    {boundToOther && (
                      <span className="text-[9px] px-1 py-0.5 rounded border border-amber-600/40 text-amber-400">
                        原绑定: {device.unitName || device.unitId}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-slate-500 font-mono">{device.id}</span>
                    <span className="text-[10px] text-slate-500 truncate">{device.location || '-'}</span>
                    <span className="text-[10px] text-slate-500">{device.manufacturer || ''}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/30 flex justify-between items-center flex-shrink-0">
          <div className="text-[10px] text-slate-500">
            {hasHost ? '选择报警主机将自动生成消控室卡片和控制界面' : '请选择该单位关联的消防设备'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-slate-600 text-slate-300" onClick={onClose}>取消</Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-blue-500 hover:bg-blue-600 text-white"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0 ? true : undefined}
            >
              确认添加 ({selectedIds.size})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
