import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Flame } from 'lucide-react';
import { typeConfig } from '@/types/map';
import type { MapUnit } from '@/types/map';

export default function UnitSidebar({
  open,
  units,
  selectedUnit,
  onUnitClick,
}: {
  open: boolean;
  units: MapUnit[];
  selectedUnit: MapUnit | null;
  onUnitClick: (unit: MapUnit) => void;
}) {
  return (
    <div
      className={`absolute left-4 top-20 bottom-4 z-20 transition-all duration-300 ${
        open ? 'w-80' : 'w-0 overflow-hidden'
      }`}
    >
      <Card className="h-full bg-slate-900/90 backdrop-blur-md border-slate-700 overflow-hidden flex flex-col">
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {units.map((unit) => (
              <div
                key={unit.id}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedUnit?.id === unit.id
                    ? 'bg-blue-600/30 border border-blue-500/50'
                    : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'
                }`}
                onClick={() => onUnitClick(unit)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: typeConfig(unit.type).color }}
                    />
                    <span className="text-sm font-medium text-slate-200 truncate">
                      {unit.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {(!unit.lng || !unit.lat || Number.isNaN(unit.lng) || Number.isNaN(unit.lat)) && (
                      <Badge className="bg-slate-600 text-[10px]">未定位</Badge>
                    )}
                    {unit.alarm > 0 && (
                      <Badge className="bg-red-600 text-xs">{unit.alarm}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    {unit.online ? (
                      <Wifi className="w-3 h-3 text-green-400" />
                    ) : (
                      <WifiOff className="w-3 h-3 text-red-400" />
                    )}
                    {unit.online ? '在线' : '离线'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" />
                    {unit.devices} 设备
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
