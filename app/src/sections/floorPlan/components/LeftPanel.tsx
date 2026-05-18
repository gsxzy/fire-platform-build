import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import type { UnmarkedDevice } from '../types';

interface LeftPanelProps {
  unmarked: UnmarkedDevice[];
  filteredUnmarked: UnmarkedDevice[];
  activeDevice: UnmarkedDevice | null;
  batchMode: boolean;
  batchIndex: number;
  batchQueue: UnmarkedDevice[];
  onSelectDevice: (d: UnmarkedDevice) => void;
  onClearActive: () => void;
}

export default function LeftPanel({
  unmarked, filteredUnmarked, activeDevice, batchMode, batchIndex, batchQueue,
  onSelectDevice, onClearActive,
}: LeftPanelProps) {
  const STATUS_COLOR: Record<number, string> = {
    1: '#10b981', 2: '#f59e0b', 3: '#ef4444', 4: '#64748b',
  };
  const currentBatchDevice = batchQueue[batchIndex];

  return (
    <Card className="w-64 flex-shrink-0 border-slate-700/50 bg-slate-800/50 flex flex-col">
      <CardContent className="p-3 flex flex-col h-full">
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <span className="text-xs font-medium text-slate-200">未标点设备</span>
          <Badge variant="outline" className="text-[9px] bg-slate-700/30 text-slate-400">{unmarked.length}</Badge>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
          {filteredUnmarked.map((d) => (
            <div
              key={d.id}
              className={`flex items-center gap-2 p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                activeDevice?.device_id === d.device_id ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-slate-700/20 hover:bg-slate-700/40'
              }`}
              onClick={() => onSelectDevice(d)}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[d.status] || '#64748b' }} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-slate-300 truncate">{d.device_name}</div>
                <div className="text-[8px] text-slate-500">{d.device_code}</div>
              </div>
            </div>
          ))}
          {unmarked.length > 0 && filteredUnmarked.length === 0 && (
            <div className="text-[10px] text-slate-500 py-3 text-center">无匹配设备，请调整筛选关键词</div>
          )}
          {unmarked.length === 0 && (
            <EmptyState
              type="data"
              title="暂无待标点设备"
              description="当前楼层设备均已上图，或设备清单为空。可切换楼层或先在设备档案中绑定本建筑。"
              className="py-4 px-1"
            />
          )}
        </div>
        {activeDevice && !batchMode && (
          <div className="mt-2 p-2 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400">
            已选中：<b>{activeDevice.device_name}</b>，请在平面图上点击位置
            <button className="ml-2 text-slate-500 hover:text-slate-300" onClick={onClearActive}>
              <X className="w-3 h-3 inline" />
            </button>
          </div>
        )}
        {batchMode && currentBatchDevice && (
          <div className="mt-2 p-2 rounded bg-orange-500/10 border border-orange-500/20 text-[10px] text-orange-400">
            连续标点：<b>{currentBatchDevice.device_name}</b> ({batchIndex + 1}/{batchQueue.length})
          </div>
        )}
      </CardContent>
    </Card>
  );
}
