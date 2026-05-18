import { Card, CardContent } from '@/components/ui/card';
import {
  X, Building2, MapPin, Wifi, WifiOff, Flame, AlertTriangle, Phone
} from 'lucide-react';
import { typeConfig } from '@/types/map';
import type { MapUnit } from '@/types/map';

export default function UnitDetailCard({
  unit,
  onClose,
}: {
  unit: MapUnit;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-4 right-4 z-20 w-96">
      <Card className="bg-slate-900/95 backdrop-blur-md border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ background: typeConfig(unit.type).color }}
              />
              <div>
                <h3 className="font-bold text-slate-100">{unit.name}</h3>
                <span className="text-xs text-slate-400">{typeConfig(unit.type).label}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="text-slate-400">{unit.unitType}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span className="text-slate-400">{unit.address}</span>
            </div>
            <div className="flex items-center gap-2">
              {unit.online ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <span className={unit.online ? 'text-green-400' : 'text-red-400'}>
                {unit.online ? '在线' : '离线'}
              </span>
              {(!unit.lng || !unit.lat || Number.isNaN(unit.lng) || Number.isNaN(unit.lat)) && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">未定位</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-slate-400">
                <Flame className="w-4 h-4 text-orange-400" />
                {unit.devices} 设备
              </span>
              {unit.alarm > 0 && (
                <span className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  {unit.alarm} 告警
                </span>
              )}
            </div>
            {'manager' in unit && (unit as any).manager && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">{(unit as any).manager}</span>
                {'managerPhone' in unit && (unit as any).managerPhone && (
                  <span className="text-slate-300 ml-auto">{(unit as any).managerPhone}</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
