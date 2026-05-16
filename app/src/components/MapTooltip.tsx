// src/components/MapTooltip.tsx
import type { MapUnit } from '@/types/map';
import { typeConfig } from '@/types/map';
import { Building2, Wifi, WifiOff, Flame, Wrench, Phone, AlertTriangle } from 'lucide-react';

interface MapTooltipProps {
  unit: MapUnit;
  x: number;
  y: number;
}

export function MapTooltip({ unit, x, y }: MapTooltipProps) {
  const tc = typeConfig(unit.type);

  return (
    <div
      className="absolute z-[100] pointer-events-none"
      style={{ left: x + 22, top: y - 16, transform: 'translateY(-100%)' }}
    >
      <div
        className="bg-slate-900/98 border border-slate-500/30 rounded-2xl shadow-2xl p-5 min-w-[280px] backdrop-blur-md"
        style={{
          boxShadow: `0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px ${tc.color}25, 0 0 30px ${tc.color}12`,
        }}
      >
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700/40">
          <div
            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
            style={{
              background: tc.color,
              boxShadow: `0 0 0 2.5px ${tc.color}50, 0 0 0 5px rgba(15,23,42,0.9), 0 0 14px ${tc.color}`,
            }}
          />
          <span className="text-sm font-extrabold text-slate-50 truncate">
            {unit.name}
          </span>
          <span
            className="text-[10px] px-2.5 py-0.5 rounded-lg font-bold flex-shrink-0"
            style={{
              background: `${tc.color}18`,
              color: tc.color,
              border: `1px solid ${tc.color}35`,
            }}
          >
            {tc.label}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-400 flex items-center gap-2 font-medium">
              <Building2 className="w-4 h-4 text-slate-500" />
              {unit.unitType}
            </span>
            <span className="text-slate-300">{unit.address}</span>
          </div>

          <div className="flex items-center gap-4 text-[13px]">
            <div className="flex items-center gap-2">
              {unit.online ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">在线</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">离线</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400">{unit.devices} 设备</span>
            </div>
          </div>

          {(unit.alarm > 0 || unit.fault > 0) && (
            <div className="flex items-center gap-4 text-[13px]">
              {unit.alarm > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">{unit.alarm} 告警</span>
                </div>
              )}
              {unit.fault > 0 && (
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">{unit.fault} 故障</span>
                </div>
              )}
            </div>
          )}

          {unit.manager && (
            <div className="flex items-center gap-2 text-[13px]">
              <Phone className="w-4 h-4 text-slate-500" />
              <span className="text-slate-400">{unit.manager}</span>
              {unit.managerPhone && (
                <span className="text-slate-300 ml-auto">{unit.managerPhone}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}