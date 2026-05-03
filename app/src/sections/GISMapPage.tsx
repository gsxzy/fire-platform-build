import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DataContainer from '@/components/DataContainer';
import {
  MapPin, Wifi, WifiOff, Flame, Layers, Maximize2, Minimize2,
  Search, Navigation, ZoomIn, ZoomOut, Crosshair, RotateCcw,
  AlertTriangle, Shield, Phone, Building2, Wrench, HardDrive,
  X, AlertCircle, PanelLeftOpen, PanelLeftClose
} from 'lucide-react';

declare global {
  interface Window {
    AMap: any;
    AMapUI: any;
  }
}

/* ══════════════════════════════════════════════�?   Types
   ══════════════════════════════════════════════�?*/
interface MapUnit {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'key' | 'general' | 'nine-small';
  unitType: string;
  address: string;
  online: boolean;
  alarm: number;
  fault: number;
  devices: number;
  controlRoom: boolean;
  manager?: string;
  managerPhone?: string;
  maintenanceStatus?: string;
  lastAlarm?: string;
}

/* ══════════════════════════════════════════════�?   Unit Data - loaded from API
   ══════════════════════════════════════════════�?*/

/* ══════════════════════════════════════════════�?   Type Colors
   ══════════════════════════════════════════════�?*/
const typeConfig = (type: string) => {
  switch (type) {
    case 'key': return { color: '#ef4444', label: '重点单位', pulse: true };
    case 'general': return { color: '#3b82f6', label: '一般单位', pulse: false };
    case 'nine-small': return { color: '#f59e0b', label: '九小场所', pulse: false };
    default: return { color: '#64748b', label: '未知', pulse: false };
  }
};

const alarmBlinkColor = '#22c55e'; // 告警中闪烁色

/* ══════════════════════════════════════════════�?   AMap Loader - v2.0 with darkblue theme
   ══════════════════════════════════════════════�?*/
function loadAMapScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.AMap) { resolve(true); return; }
    const key = '9c3d87511a1702de85d9c04bfd4536ba';
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${key}&plugin=AMap.Scale,AMap.ToolBar,AMap.ControlBar`;
    script.onerror = () => resolve(false);
    script.onload = () => { setTimeout(() => resolve(!!window.AMap), 800); };
    document.head.appendChild(script);
  });
}

/* ══════════════════════════════════════════════�?   Helpers: hash-based stable location for devices without GPS
   ══════════════════════════════════════════════�?*/
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function gbDeviceToMapUnit(device: any): MapUnit {
  const h = hashString(device.deviceId || device.id || '0');
  // Gansu province spread (32.5~43.5N, 92.5~108.5E)
  const lat = 32.5 + (h % 10000) / 10000 * 11.0;
  const lng = 92.5 + ((h >> 16) % 10000) / 10000 * 16.0;
  return {
    id: `cam-${device.deviceId || device.id}`,
    name: device.name || device.deviceId || '未命名设备',
    lat,
    lng,
    type: 'key',
    unitType: '视频监控',
    address: device.location || device.hostAddress || device.ip || 'GB28181设备',
    online: device.status === 'online' || device.onLine === true,
    alarm: 0,
    fault: (device.status !== 'online' && device.status !== 'registering') || device.onLine === false ? 1 : 0,
    devices: device.channelCount || device.channels?.length || 0,
    controlRoom: false,
    manager: device.manufacturer || '',
    managerPhone: '',
    maintenanceStatus: '正常',
  };
}

/* ══════════════════════════════════════════════�?   Tooltip Component
   ══════════════════════════════════════════════�?*/
function UnitTooltip({ unit, x, y }: { unit: MapUnit; x: number; y: number }) {
  const tc = typeConfig(unit.type);
  return (
    <div
      className="absolute z-[100] pointer-events-none"
      style={{ left: x + 22, top: y - 16, transform: 'translateY(-100%)' }}
    >
      <div className="bg-slate-900/98 border border-slate-500/30 rounded-2xl shadow-2xl p-5 min-w-[280px] backdrop-blur-md"
        style={{ boxShadow: `0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px ${tc.color}25, 0 0 30px ${tc.color}12` }}>
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700/40">
          <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: tc.color, boxShadow: `0 0 0 2.5px ${tc.color}50, 0 0 0 5px rgba(15,23,42,0.9), 0 0 14px ${tc.color}` }} />
          <span className="text-sm font-extrabold text-slate-50 truncate">{unit.name}</span>
          <span className="text-[10px] px-2.5 py-0.5 rounded-lg font-bold flex-shrink-0" style={{ background: `${tc.color}18`, color: tc.color, border: `1px solid ${tc.color}35` }}>{tc.label}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-400 flex items-center gap-2 font-medium"><Building2 className="w-4 h-4 text-slate-500" />{unit.unitType}</span>
            <span className={`flex items-center gap-1.5 font-bold ${unit.online ? 'text-emerald-400' : 'text-red-400'}`}>
              {unit.online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}{unit.online ? '在线' : '离线'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-400 flex items-center gap-2 font-medium"><HardDrive className="w-4 h-4 text-slate-500" />设备数量</span>
            <span className="text-slate-100 font-bold">{unit.devices} 台</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-400 flex items-center gap-2 font-medium"><Flame className="w-4 h-4 text-slate-500" />当前告警</span>
            <span className={`font-bold ${unit.alarm > 0 ? 'text-red-400' : 'text-slate-400'}`}>{unit.alarm} 条</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-400 flex items-center gap-2 font-medium"><AlertTriangle className="w-4 h-4 text-slate-500" />故障数量</span>
            <span className={`font-bold ${unit.fault > 0 ? 'text-yellow-400' : 'text-slate-400'}`}>{unit.fault} 条</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-slate-400 flex items-center gap-2 font-medium"><Wrench className="w-4 h-4 text-slate-500" />维保状态</span>
            <span className={`font-bold ${unit.maintenanceStatus === '正常' ? 'text-emerald-400' : unit.maintenanceStatus === '即将到期' ? 'text-yellow-400' : 'text-red-400'}`}>{unit.maintenanceStatus}</span>
          </div>
          {unit.manager && (
            <div className="flex items-center justify-between text-[13px] pt-2 border-t border-slate-700/30">
              <span className="text-slate-400 flex items-center gap-2 font-medium"><Shield className="w-4 h-4 text-slate-500" />{unit.manager}</span>
              <span className="text-slate-300 font-mono">{unit.managerPhone}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════�?   Alarm Popup Component
   ══════════════════════════════════════════════�?*/
function AlarmPopup({ unit, onClose }: { unit: MapUnit; onClose: () => void }) {
  return (
    <div className="absolute top-16 left-4 z-[90] bg-slate-900/98 border border-red-500/50 rounded-2xl shadow-2xl p-5 w-[320px] backdrop-blur-md"
      style={{ boxShadow: '0 12px 48px rgba(239,68,68,0.2), 0 0 0 1px rgba(239,68,68,0.25), 0 0 60px rgba(239,68,68,0.08)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-shrink-0">
          <div className="w-5 h-5 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: '0 0 0 3px rgba(239,68,68,0.25), 0 0 16px rgba(239,68,68,0.5)' }} />
          <div className="absolute inset-0 w-5 h-5 rounded-full bg-red-500 animate-ping opacity-40" />
        </div>
        <span className="text-base font-extrabold text-red-400 whitespace-nowrap tracking-wide">火警告警</span>
        <button onClick={onClose} className="ml-auto text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0 p-1 hover:bg-slate-800 rounded-lg" aria-label="关闭"><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-2.5 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">告警单位</span>
          <span className="text-slate-100 font-bold truncate ml-4 max-w-[180px]">{unit.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">告警时间</span>
          <span className="text-red-400 font-mono font-semibold">{unit.lastAlarm}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">告警数量</span>
          <span className="text-red-400 font-black text-base">{unit.alarm} 条</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">负责人</span>
          <span className="text-slate-200 font-medium">{unit.manager || '-'} {unit.managerPhone && <span className="text-slate-500 ml-1 font-mono">{unit.managerPhone}</span>}</span>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-700/40 flex gap-2.5">
        <button className="flex-1 py-2 bg-red-500/20 text-red-400 text-xs font-bold rounded-xl hover:bg-red-500/30 transition-colors border border-red-500/25 shadow-sm shadow-red-500/10">立即处理</button>
        <button className="flex-1 py-2 bg-slate-700/40 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700/60 transition-colors border border-slate-600/30">查看详情</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════�?   SVG Fallback Map (fully functional)
   ══════════════════════════════════════════════�?*/
function SVGMap({
  filtered,
  selectedUnit,
  onSelect,
  alarmUnits,
}: {
  filtered: MapUnit[];
  selectedUnit: MapUnit | null;
  onSelect: (u: MapUnit) => void;
  alarmUnits: MapUnit[];
}) {
  // Gansu province bounds
  const latMin = 32.5, latMax = 43.5;
  const lngMin = 92.5, lngMax = 108.5;

  const toXY = (lat: number, lng: number) => ({
    x: ((lng - lngMin) / (lngMax - lngMin)) * 100,
    y: 100 - ((lat - latMin) / (latMax - latMin)) * 100,
  });

  const [hovered, setHovered] = useState<{ unit: MapUnit; x: number; y: number } | null>(null);

  return (
    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1e36 50%, #0a1628 100%)' }}>
      {/* Subtle texture background */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" preserveAspectRatio="none">
        <defs><pattern id="gisgrid2" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0 L0 0 0 40" fill="none" stroke="#60a5fa" strokeWidth="0.6"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#gisgrid2)" />
      </svg>

      {/* Simulated city blocks */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        {/* Building blocks */}
        <rect x="5%" y="10%" width="8%" height="12%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="15%" y="8%" width="10%" height="15%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="28%" y="12%" width="6%" height="8%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="40%" y="5%" width="12%" height="10%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="55%" y="15%" width="8%" height="14%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="68%" y="8%" width="10%" height="10%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="82%" y="12%" width="6%" height="12%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="8%" y="32%" width="10%" height="8%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="22%" y="28%" width="7%" height="14%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="35%" y="35%" width="12%" height="10%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="52%" y="30%" width="8%" height="12%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="65%" y="32%" width="10%" height="8%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="80%" y="28%" width="8%" height="14%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="3%" y="50%" width="12%" height="10%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="18%" y="48%" width="8%" height="12%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="32%" y="52%" width="10%" height="8%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="48%" y="45%" width="6%" height="14%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="60%" y="50%" width="12%" height="10%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="76%" y="48%" width="8%" height="12%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="90%" y="52%" width="5%" height="8%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="10%" y="68%" width="8%" height="10%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="25%" y="65%" width="10%" height="12%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="42%" y="70%" width="7%" height="8%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="55%" y="65%" width="12%" height="10%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="72%" y="68%" width="10%" height="12%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="88%" y="70%" width="6%" height="8%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="15%" y="85%" width="10%" height="8%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="35%" y="82%" width="8%" height="10%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="50%" y="85%" width="10%" height="8%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="68%" y="82%" width="8%" height="10%" rx="2" fill="#152238" stroke="#1e3a5f" strokeWidth="0.8" />
        <rect x="82%" y="85%" width="10%" height="8%" rx="2" fill="#121e33" stroke="#1e3a5f" strokeWidth="0.8" />
      </svg>

      {/* Main roads */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        {/* Horizontal main roads */}
        <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#264a7a" strokeWidth="3" />
        <line x1="0" y1="45%" x2="100%" y2="45%" stroke="#264a7a" strokeWidth="3.5" />
        <line x1="0" y1="62%" x2="100%" y2="62%" stroke="#264a7a" strokeWidth="2.5" />
        <line x1="0" y1="80%" x2="100%" y2="80%" stroke="#264a7a" strokeWidth="3" />
        {/* Vertical main roads */}
        <line x1="12%" y1="0" x2="12%" y2="100%" stroke="#264a7a" strokeWidth="3" />
        <line x1="30%" y1="0" x2="30%" y2="100%" stroke="#264a7a" strokeWidth="3.5" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#264a7a" strokeWidth="3" />
        <line x1="72%" y1="0" x2="72%" y2="100%" stroke="#264a7a" strokeWidth="2.5" />
        <line x1="88%" y1="0" x2="88%" y2="100%" stroke="#264a7a" strokeWidth="3" />
        {/* Secondary roads */}
        <line x1="0" y1="18%" x2="100%" y2="18%" stroke="#1a3358" strokeWidth="1.2" strokeDasharray="5,5" />
        <line x1="0" y1="35%" x2="100%" y2="35%" stroke="#1a3358" strokeWidth="1.2" strokeDasharray="5,5" />
        <line x1="0" y1="55%" x2="100%" y2="55%" stroke="#1a3358" strokeWidth="1.2" strokeDasharray="5,5" />
        <line x1="0" y1="72%" x2="100%" y2="72%" stroke="#1a3358" strokeWidth="1.2" strokeDasharray="5,5" />
        <line x1="22%" y1="0" x2="22%" y2="100%" stroke="#1a3358" strokeWidth="1.2" strokeDasharray="5,5" />
        <line x1="40%" y1="0" x2="40%" y2="100%" stroke="#1a3358" strokeWidth="1.2" strokeDasharray="5,5" />
        <line x1="60%" y1="0" x2="60%" y2="100%" stroke="#1a3358" strokeWidth="1.2" strokeDasharray="5,5" />
        <line x1="80%" y1="0" x2="80%" y2="100%" stroke="#1a3358" strokeWidth="1.2" strokeDasharray="5,5" />
        {/* City labels */}
        <text x="48%" y="52%" fill="#3d6aaa" fontSize="9" fontFamily="sans-serif" fontWeight="600">兰州</text>
        <text x="58%" y="65%" fill="#3d6aaa" fontSize="8" fontFamily="sans-serif" fontWeight="500">天水</text>
        <text x="42%" y="38%" fill="#3d6aaa" fontSize="8" fontFamily="sans-serif" fontWeight="500">武威</text>
        <text x="35%" y="32%" fill="#3d6aaa" fontSize="8" fontFamily="sans-serif" fontWeight="500">张掖</text>
        <text x="25%" y="28%" fill="#3d6aaa" fontSize="8" fontFamily="sans-serif" fontWeight="500">酒泉</text>
        <text x="20%" y="25%" fill="#3d6aaa" fontSize="7" fontFamily="sans-serif" fontWeight="500">嘉峪关</text>
        <text x="65%" y="58%" fill="#3d6aaa" fontSize="8" fontFamily="sans-serif" fontWeight="500">平凉</text>
        <text x="72%" y="55%" fill="#3d6aaa" fontSize="8" fontFamily="sans-serif" fontWeight="500">庆阳</text>
        <text x="55%" y="75%" fill="#3d6aaa" fontSize="8" fontFamily="sans-serif" fontWeight="500">陇南</text>
        <text x="2%" y="26%" fill="#3d6aaa" fontSize="8" fontFamily="sans-serif" fontWeight="500">N</text>
      </svg>

      {/* River */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <path d="M0 55 Q15 50, 25 58 T50 52 Q65 48, 80 55 T100 50" fill="none" stroke="#143a66" strokeWidth="5" />
        <path d="M0 55 Q15 50, 25 58 T50 52 Q65 48, 80 55 T100 50" fill="none" stroke="#0c2647" strokeWidth="2" />
        <text x="50%" y="51%" fill="#2a5288" fontSize="7" fontFamily="sans-serif" textAnchor="middle">黄河 · 甘肃</text>
      </svg>

      {/* Green belt / park */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <rect x="38%" y="58%" width="5%" height="4%" rx="2" fill="#0f3d20" opacity="0.5" />
        <rect x="85%" y="20%" width="4%" height="5%" rx="2" fill="#0f3d20" opacity="0.5" />
      </svg>

      {/* Unit Dots */}
      {filtered.map(u => {
        const { x, y } = toXY(u.lat, u.lng);
        const tc = typeConfig(u.type);
        const isAlarm = alarmUnits.some(a => a.id === u.id);
        const isSelected = selectedUnit?.id === u.id;
        return (
          <div
            key={u.id}
            className="absolute"
            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', zIndex: isSelected ? 50 : 20 }}
            onMouseEnter={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const parent = (e.currentTarget as HTMLElement).offsetParent as HTMLElement;
              if (parent) {
                const pRect = parent.getBoundingClientRect();
                setHovered({ unit: u, x: rect.left - pRect.left, y: rect.top - pRect.top });
              }
            }}
            onMouseLeave={() => setHovered(null)}
            onClick={(e) => { e.stopPropagation(); onSelect(u); }}
          >
            {/* Alarm pulse ring */}
            {isAlarm && (
              <div className="absolute inset-0 rounded-full animate-ping" style={{
                width: 64, height: 64, marginLeft: -24, marginTop: -24,
                background: `${alarmBlinkColor}12`, border: `2.5px solid ${alarmBlinkColor}40`
              }} />
            )}
            {/* Selected ring */}
            {isSelected && (
              <div className="absolute inset-0 rounded-full animate-pulse" style={{
                width: 68, height: 68, marginLeft: -26, marginTop: -26,
                background: `${tc.color}10`, border: `3px solid ${tc.color}`,
                boxShadow: `0 0 24px ${tc.color}80`
              }} />
            )}
            {/* Main dot */}
            <div
              className="w-8 h-8 rounded-full border-[3px] border-slate-900 cursor-pointer transition-all hover:scale-125"
              style={{
                background: isAlarm ? alarmBlinkColor : tc.color,
                boxShadow: `0 0 18px ${isAlarm ? alarmBlinkColor : tc.color}a0, 0 0 36px ${isAlarm ? alarmBlinkColor : tc.color}60, inset 0 0 10px rgba(255,255,255,0.35)`,
              }}
            />
            {/* Label on hover or selected */}
            {(isSelected || hovered?.unit.id === u.id) && (
              <div className="absolute left-1/2 -translate-x-1/2 -top-8 whitespace-nowrap pointer-events-none">
                <span className="text-[10px] font-medium text-slate-100 bg-slate-900/90 px-2 py-0.5 rounded-md shadow-lg border border-slate-700/40">{u.name}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Hover tooltip */}
      {hovered && <UnitTooltip unit={hovered.unit} x={hovered.x} y={hovered.y} />}
    </div>
  );
}

/* ══════════════════════════════════════════════�?   AMap Container - 严格按技术规格初始化
   ══════════════════════════════════════════════�?*/
function AMapContainer({
  filtered,
  selectedUnit,
  onSelect,
  alarmUnits,
  mapInstanceRef,
}: {
  filtered: MapUnit[];
  selectedUnit: MapUnit | null;
  onSelect: (u: MapUnit) => void;
  alarmUnits: MapUnit[];
  mapInstanceRef: React.MutableRefObject<any>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  /* ── 1. Init: new AMap.Map() + darkblue + setFeatures ── */
  // Only run once on mount - do NOT depend on [filtered] to avoid re-creating map
  useEffect(() => {
    let destroyed = false;
    const init = async () => {
      const loaded = await loadAMapScript();
      if (!loaded || !containerRef.current || destroyed) return;

      try {
        // 1.1 正确使用构造函数 new AMap.Map()
        const map = new window.AMap.Map(containerRef.current, {
          zoom: 6,
          center: [100.5, 38.0],
          mapStyle: 'amap://styles/darkblue',
          showBuildingBlock: true,
          showLabel: true,
          resizeEnable: true,
          rotateEnable: true,
          pitchEnable: true,
          zooms: [3, 18],
          dragEnable: true,
          zoomEnable: true,
          doubleClickZoom: true,
          scrollWheel: true,
          touchZoom: true,
        });

        mapRef.current = map;
        mapInstanceRef.current = map;

        // 2. 强制开启所有地理要素（解决空白网格问题）
        map.setFeatures(['bg', 'road', 'building', 'label', 'point', 'railway']);

        // Add controls
        map.addControl(new window.AMap.Scale({ position: 'LB' }));
        map.addControl(new window.AMap.ToolBar({
          position: 'RB',
          liteStyle: true,
        }));
        map.addControl(new window.AMap.ControlBar({
          position: 'RT',
          showZoomBar: true,
          showControlButton: true,
        }));

        setMapReady(true);
      } catch (e) {
        console.error('AMap init error:', e);
      }
    };

    init();
    return () => {
      destroyed = true;
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch {}
        mapRef.current = null;
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 4. Update Markers: zIndex 100+置顶 ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.AMap) return;

    // Remove markers not in filtered
    markersRef.current.forEach((marker, id) => {
      if (!filtered.find(u => u.id === id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    // Add/update markers
    filtered.forEach(unit => {
      const tc = typeConfig(unit.type);
      const isAlarm = alarmUnits.some(a => a.id === unit.id);
      const color = isAlarm ? alarmBlinkColor : tc.color;
      const existing = markersRef.current.get(unit.id);

      // Build marker DOM - larger, more professional
      const isSelected = selectedUnit?.id === unit.id;
      const el = document.createElement('div');
      el.style.cssText = 'position:relative;width:44px;height:44px;cursor:pointer;';
      el.innerHTML = `
        ${isAlarm ? `<div style="position:absolute;inset:-10px;border-radius:50%;background:${alarmBlinkColor}15;border:2.5px solid ${alarmBlinkColor}50;animation:amap-ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
        ${isSelected ? `<div style="position:absolute;inset:-12px;border-radius:50%;background:${color}10;border:3px solid ${color};box-shadow:0 0 20px ${color}80, 0 0 40px ${color}40;animation:amap-pulse 2s ease-in-out infinite;"></div>` : ''}
        <div class="amap-dot" style="
          width:28px;height:28px;border-radius:50%;
          background:radial-gradient(circle at 35% 35%, ${color}ee, ${color});
          border:3px solid rgba(15,23,42,0.95);
          box-shadow:0 0 16px ${color}a0, 0 0 32px ${color}60, inset 0 0 8px rgba(255,255,255,0.35);
          position:absolute;top:8px;left:8px;
          transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
        "></div>
      `;

      // Hover scale
      const dot = el.querySelector('.amap-dot') as HTMLElement;
      el.addEventListener('mouseenter', () => { if (dot) dot.style.transform = 'scale(1.5)'; });
      el.addEventListener('mouseleave', () => { if (dot) dot.style.transform = 'scale(1)'; });

      if (existing) {
        existing.setContent(el);
        existing.setPosition([unit.lng, unit.lat]);
        existing.setzIndex(isAlarm ? 300 : isSelected ? 250 : 150);
      } else {
        const marker = new window.AMap.Marker({
          position: [unit.lng, unit.lat],
          offset: new window.AMap.Pixel(-22, -22),
          content: el,
          extData: unit,
          zIndex: isAlarm ? 300 : isSelected ? 250 : 150,
        });
        marker.on('click', () => onSelect(unit));
        marker.setMap(map);
        markersRef.current.set(unit.id, marker);
      }
    });
  }, [filtered, alarmUnits, onSelect, mapReady]);

  /* ── Selected unit: center + infoWindow ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.AMap || !selectedUnit) return;

    // If selected unit is an alarm, zoom in to show detail; otherwise just center
    const isAlarm = alarmUnits.some(a => a.id === selectedUnit.id);
    if (isAlarm) {
      map.setZoomAndCenter(13, [selectedUnit.lng, selectedUnit.lat]);
    } else {
      map.setCenter([selectedUnit.lng, selectedUnit.lat]);
    }

    if (infoWindowRef.current) { infoWindowRef.current.close(); }
    const tc = typeConfig(selectedUnit.type);
    const infoContent = `
      <div style="padding:18px;min-width:280px;font-family:system-ui,-apple-system,sans-serif;background:rgba(11,17,35,0.98);border-radius:16px;border:1px solid rgba(100,116,139,0.2);box-shadow:0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px ${isAlarm ? alarmBlinkColor : tc.color}20, 0 0 40px ${isAlarm ? alarmBlinkColor : tc.color}15;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid rgba(51,65,85,0.35);">
          <div style="width:14px;height:14px;border-radius:50%;background:${isAlarm ? alarmBlinkColor : tc.color};box-shadow:0 0 12px ${isAlarm ? alarmBlinkColor : tc.color}a0, 0 0 24px ${isAlarm ? alarmBlinkColor : tc.color}50;border:2.5px solid rgba(11,17,35,0.95);flex-shrink:0;"></div>
          <span style="font-size:15px;font-weight:800;color:#f8fafc;letter-spacing:0.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${selectedUnit.name}</span>
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:10px;line-height:1.6;word-break:break-all;">${selectedUnit.address}</div>
        <div style="display:flex;gap:8px;font-size:11px;margin-bottom:12px;flex-wrap:wrap;">
          <span style="padding:4px 10px;background:${tc.color}18;color:${tc.color};border-radius:8px;font-weight:600;border:1px solid ${tc.color}30;">${tc.label}</span>
          <span style="padding:4px 10px;background:${selectedUnit.online ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'};color:${selectedUnit.online ? '#34d399' : '#f87171'};border-radius:8px;font-weight:600;border:1px solid ${selectedUnit.online ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.22)'};">${selectedUnit.online ? '● 在线' : '● 离线'}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">
          <div style="padding:8px 4px;background:rgba(30,41,59,0.5);border-radius:10px;border:1px solid rgba(51,65,85,0.25);">
            <div style="font-size:18px;font-weight:900;color:#f1f5f9;">${selectedUnit.devices}</div>
            <div style="font-size:10px;color:#64748b;margin-top:3px;letter-spacing:0.5px;font-weight:500;">设备</div>
          </div>
          <div style="padding:8px 4px;background:${selectedUnit.alarm > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(30,41,59,0.5)'};border-radius:10px;border:1px solid ${selectedUnit.alarm > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(51,65,85,0.25)'};">
            <div style="font-size:18px;font-weight:900;color:${selectedUnit.alarm > 0 ? '#f87171' : '#f1f5f9'};">${selectedUnit.alarm}</div>
            <div style="font-size:10px;color:${selectedUnit.alarm > 0 ? '#f87171' : '#64748b'};margin-top:3px;letter-spacing:0.5px;font-weight:500;">火警</div>
          </div>
          <div style="padding:8px 4px;background:${selectedUnit.fault > 0 ? 'rgba(250,204,21,0.12)' : 'rgba(30,41,59,0.5)'};border-radius:10px;border:1px solid ${selectedUnit.fault > 0 ? 'rgba(250,204,21,0.3)' : 'rgba(51,65,85,0.25)'};">
            <div style="font-size:18px;font-weight:900;color:${selectedUnit.fault > 0 ? '#facc15' : '#f1f5f9'};">${selectedUnit.fault}</div>
            <div style="font-size:10px;color:${selectedUnit.fault > 0 ? '#facc15' : '#64748b'};margin-top:3px;letter-spacing:0.5px;font-weight:500;">故障</div>
          </div>
        </div>
      </div>
    `;
    const infoWindow = new window.AMap.InfoWindow({
      content: infoContent,
      offset: new window.AMap.Pixel(0, -28),
      closeWhenClickMap: true,
    });
    infoWindow.open(map, [selectedUnit.lng, selectedUnit.lat]);
    infoWindowRef.current = infoWindow;
  }, [selectedUnit, alarmUnits]);

  // 3. 容器背景 transparent，Canvas在网格背景之上渲染
  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ zIndex: 1, background: 'transparent' }}
    />
  );
}

/* ══════════════════════════════════════════════�?   Main Page
   ══════════════════════════════════════════════�?*/
export default function GISMapPage() {
  const mapInstanceRef = useRef<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<MapUnit | null>(null);
  const [filter, setFilter] = useState<'all' | 'key' | 'general' | 'nine'>('all');
  const [search, setSearch] = useState('');
  const [useAMap, setUseAMap] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dismissedAlarms, setDismissedAlarms] = useState<string[]>([]);
  const [mapUnits, setMapUnits] = useState<MapUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // 响应式检测
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setShowSidebar(false);
      else setShowSidebar(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { gisService } = await import('@/api/services');
      const res = await gisService.getPoints();
      let units: MapUnit[] = [];
      if (res.code === 200) {
        units = (res.data || []) as any;
      }

      // Load real WVP cameras and append as map points
      if (import.meta.env.VITE_WVP_ENABLED === 'true') {
        try {
          const wvp = await import('@/services/wvpService');
          const resp = await wvp.getDeviceList({ page: 1, count: 999 });
          const devices = resp.list || [];
          const cameraUnits = devices.map(d => gbDeviceToMapUnit(d));
          units = [...units, ...cameraUnits];
        } catch (e) {
          console.error('WVP camera load error', e);
        }
      }

      setMapUnits(units);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      console.error('GIS load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Derived data
  const filtered = useMemo(() => {
    return mapUnits.filter(u => {
      if (filter === 'key') return u.type === 'key';
      if (filter === 'general') return u.type === 'general';
      if (filter === 'nine') return u.type === 'nine-small';
      return true;
    }).filter(u => !search || u.name.includes(search) || u.address.includes(search));
  }, [mapUnits, filter, search]);

  const alarmUnits = useMemo(() =>
    mapUnits.filter(u => u.alarm > 0 && !dismissedAlarms.includes(u.id)),
    [mapUnits, dismissedAlarms]
  );

  const stats = {
    total: mapUnits.length,
    online: mapUnits.filter(u => u.online).length,
    offline: mapUnits.filter(u => !u.online).length,
    alarm: mapUnits.filter(u => u.alarm > 0).length,
    key: mapUnits.filter(u => u.type === 'key').length,
  };

  // Auto-focus on new alarms: when new alarm units appear, auto-select and zoom to them
  const prevAlarmIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentIds = new Set(alarmUnits.map(u => u.id));
    const newAlarms = alarmUnits.filter(u => !prevAlarmIdsRef.current.has(u.id));
    if (newAlarms.length > 0 && useAMap) {
      setSelectedUnit(newAlarms[0]);
    }
    prevAlarmIdsRef.current = currentIds;
  }, [alarmUnits, useAMap]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  return (
    <DataContainer loading={loading} error={error} data={mapUnits} onRetry={loadData} emptyText="暂无地图点位数据">
      <div className={`${isFullscreen ? 'fixed inset-0 z-[100]' : 'h-[calc(100vh-7rem)]'} flex flex-col gap-3`}>
      {/* Header - glass style + responsive */}
      <div className="flex items-center justify-between flex-shrink-0 glass rounded-xl px-3 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile sidebar toggle */}
          {isMobile && (
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700/40 border border-slate-600/30 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-all"
              title="切换列表"
            >
              {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shadow-sm shadow-blue-500/10 flex-shrink-0">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-xl font-extrabold text-slate-50 tracking-tight truncate">甘肃GIS地图监控</h2>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5 hidden sm:block">全省设备点位 · 实时告警联动</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 ml-2 flex-shrink-0">
            <Badge variant="outline" className="text-xs px-3 py-1 bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold shadow-sm">{stats.total} 个单位</Badge>
            <Badge variant="outline" className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold shadow-sm">在线 {stats.online}</Badge>
            {stats.alarm > 0 && <Badge variant="outline" className="text-xs px-3 py-1 bg-red-500/10 text-red-400 border-red-500/20 font-bold animate-pulse shadow-sm shadow-red-500/10">火警 {stats.alarm}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索单位/地址..."
              className="pl-9 h-9 w-44 lg:w-56 text-sm bg-slate-800/80 border-slate-700/50 text-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const match = mapUnits.find(u => u.name.includes(search) || u.address.includes(search));
                  if (match) { setSelectedUnit(match); setFilter('all'); }
                }
              }}
            />
          </div>
          {/* Map mode toggle */}
          <button
            onClick={() => setUseAMap(!useAMap)}
            className={`text-xs px-3 py-2 rounded-xl border transition-all flex items-center gap-2 font-bold ${
              useAMap ? 'bg-blue-500/15 text-blue-400 border-blue-500/25 shadow-sm shadow-blue-500/10' : 'bg-slate-700/30 text-slate-400 border-slate-600/30 hover:bg-slate-700/50'
            }`} aria-label="切换地图">
            <Layers className="w-4 h-4" />
            <span className="hidden lg:inline">{useAMap ? '高德地图' : '系统地图'}</span>
          </button>
          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="text-xs px-3 py-2 rounded-xl border bg-slate-700/30 text-slate-400 border-slate-600/30 hover:text-slate-200 hover:bg-slate-700/50 transition-all flex items-center gap-2 font-bold" aria-label="退出全屏">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden lg:inline">{isFullscreen ? '退出' : '全屏'}</span>
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-1 min-h-0 relative">
        {/* Left Sidebar: Unit List - responsive overlay on mobile */}
        <Card className={`${isMobile ? 'absolute inset-y-0 left-0 z-[85] w-72' : 'w-80 relative'} border-slate-700/40 bg-slate-800/50 flex flex-col flex-shrink-0 backdrop-blur-md shadow-xl transition-transform duration-300 ${isMobile && !showSidebar ? '-translate-x-full' : 'translate-x-0'}`}>
          <CardContent className="p-0 flex flex-col h-full">
            {/* Filter Tabs */}
            <div className="p-3 border-b border-slate-700/40 flex gap-2 flex-shrink-0">
              {[{ k: 'all' as const, l: '全部' }, { k: 'key' as const, l: '重点' }, { k: 'general' as const, l: '一般' }, { k: 'nine' as const, l: '九小' }].map(t => (
                <button key={t.k} onClick={() => setFilter(t.k)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${filter === t.k ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10' : 'bg-slate-800/40 text-slate-500 border border-slate-700/30 hover:bg-slate-700/40 hover:text-slate-400'}`}>{t.l}</button>
              ))}
            </div>
            {/* Alarm alert */}
            {alarmUnits.length > 0 && (
              <div className="mx-3 mt-3 p-3.5 rounded-xl border border-red-500/30 bg-red-500/8 flex-shrink-0 shadow-sm shadow-red-500/10">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="relative">
                    <Flame className="w-4 h-4 text-red-400" />
                    <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-30" />
                  </div>
                  <span className="text-xs text-red-400 font-extrabold">{alarmUnits.length} 个单位火警</span>
                </div>
                {alarmUnits.slice(0, 2).map(u => (
                  <div key={u.id} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-slate-400 truncate font-medium">{u.name}</span>
                    <button onClick={() => setSelectedUnit(u)} className="text-red-400 hover:text-red-300 font-bold text-[11px] px-2 py-0.5 rounded-md hover:bg-red-500/10 transition-colors">定位</button>
                  </div>
                ))}
              </div>
            )}
            {/* Unit List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2.5 space-y-2">
              {filtered.map(u => {
                const tc = typeConfig(u.type);
                const isAlarm = u.alarm > 0;
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUnit(u)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${selectedUnit?.id === u.id ? 'border-blue-500/40 bg-blue-500/10 shadow-md shadow-blue-500/10' : isAlarm ? 'border-red-500/25 bg-red-500/8 hover:bg-red-500/12 hover:border-red-500/30' : 'border-slate-700/25 bg-slate-800/30 hover:bg-slate-700/30 hover:border-slate-600/30'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-4 h-4 rounded-full" style={{ background: isAlarm ? alarmBlinkColor : tc.color, boxShadow: isAlarm ? `0 0 10px ${alarmBlinkColor}a0` : `0 0 8px ${tc.color}90` }} />
                        {isAlarm && <div className="absolute inset-0 w-4 h-4 rounded-full bg-green-500 animate-ping opacity-40" />}
                      </div>
                      <span className="text-sm text-slate-100 font-bold truncate flex-1">{u.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold flex-shrink-0" style={{ background: `${tc.color}18`, color: tc.color, border: `1px solid ${tc.color}30` }}>{tc.label}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-2 truncate ml-7 font-medium">{u.address}</div>
                    <div className="flex items-center gap-3 mt-2 ml-7">
                      {u.online ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
                      {isAlarm && <span className="flex items-center gap-1 text-[11px] text-red-400 font-bold"><Flame className="w-3.5 h-3.5" />{u.alarm} 条火警</span>}
                      {u.fault > 0 && <span className="flex items-center gap-1 text-[11px] text-yellow-400 font-bold"><AlertTriangle className="w-3.5 h-3.5" />{u.fault} 故障</span>}
                      <span className="text-[11px] text-slate-500 ml-auto font-medium">{u.devices} 台设备</span>
                    </div>
                    {u.maintenanceStatus && u.maintenanceStatus !== '正常' && (
                      <div className="mt-2 ml-7">
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${u.maintenanceStatus === '即将到期' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25' : 'bg-red-500/10 text-red-400 border border-red-500/25'}`}>
                          维保{u.maintenanceStatus}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-sm text-slate-500">
                  <MapPin className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                  <p className="font-medium">未找到匹配单位</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Map Area: DOM层级 - #0b1a2f背景(最底层) → 高德Canvas底图 → Marker置顶 */}
        <div className="flex-1 relative rounded-2xl border border-slate-700/40 overflow-hidden shadow-2xl">
          {/* Layer 0: #0b1a2f 纯色底层背景 */}
          <div className="absolute inset-0" style={{ background: '#0b1a2f', zIndex: 0 }} />

          {/* Layer 1: AMap darkblue 原生Canvas底图 (transparent bg, 覆盖在纯色层之上) */}
          {useAMap && (
            <AMapContainer filtered={filtered} selectedUnit={selectedUnit} onSelect={setSelectedUnit} alarmUnits={alarmUnits} mapInstanceRef={mapInstanceRef} />
          )}

          {/* Layer 1b: SVG fallback (AMap未加载时显示) */}
          {!useAMap && (
            <SVGMap filtered={filtered} selectedUnit={selectedUnit} onSelect={setSelectedUnit} alarmUnits={alarmUnits} />
          )}

          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-[80]">
            <button
              onClick={() => mapInstanceRef.current?.zoomIn?.()}
              className="w-11 h-11 rounded-xl bg-slate-900/95 border border-slate-600/40 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-500/50 transition-all backdrop-blur-md shadow-lg active:scale-95" aria-label="放大">
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => mapInstanceRef.current?.zoomOut?.()}
              className="w-11 h-11 rounded-xl bg-slate-900/95 border border-slate-600/40 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-500/50 transition-all backdrop-blur-md shadow-lg active:scale-95" aria-label="缩小">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setSelectedUnit(null);
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setZoomAndCenter(6, [100.5, 38.0]);
                }
              }}
              className="w-11 h-11 rounded-xl bg-slate-900/95 border border-slate-600/40 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-500/50 transition-all backdrop-blur-md shadow-lg active:scale-95"
              title="复位到甘肃全景" aria-label="复位视图">
              <Crosshair className="w-5 h-5" />
            </button>
            <button
              onClick={() => setUseAMap(prev => !prev)}
              className="w-10 h-10 rounded-xl bg-slate-900/95 border border-slate-600/40 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all backdrop-blur-md shadow-lg"
              title="切换地图" aria-label="切换地图">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Alarm Popup */}
          {alarmUnits.length > 0 && !dismissedAlarms.includes(alarmUnits[0].id) && (
            <AlarmPopup
              unit={alarmUnits[0]}
              onClose={() => setDismissedAlarms(prev => [...prev, alarmUnits[0].id])}
            />
          )}

          {/* Legend - Bottom Left */}
          <div className="absolute bottom-4 left-4 z-[80] p-3.5 rounded-2xl glass shadow-2xl">
            <div className="text-xs text-slate-300 mb-2.5 font-extrabold tracking-wide">图例说明</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full" style={{ background: '#ef4444', boxShadow: '0 0 0 2px #ef444440, 0 0 0 4px rgba(15,23,42,0.95), 0 0 10px #ef444490' }} />
                <span className="text-xs text-slate-200 font-semibold">重点单位</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full" style={{ background: '#3b82f6', boxShadow: '0 0 0 2px #3b82f640, 0 0 0 4px rgba(15,23,42,0.95), 0 0 10px #3b82f690' }} />
                <span className="text-xs text-slate-200 font-semibold">一般单位</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full" style={{ background: '#f59e0b', boxShadow: '0 0 0 2px #f59e0b40, 0 0 0 4px rgba(15,23,42,0.95), 0 0 10px #f59e0b90' }} />
                <span className="text-xs text-slate-200 font-semibold">九小场所</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full animate-pulse" style={{ background: '#22c55e', boxShadow: '0 0 0 2px #22c55e40, 0 0 0 4px rgba(15,23,42,0.95), 0 0 12px #22c55e90' }} />
                <span className="text-xs text-slate-200 font-semibold">告警中</span>
              </div>
            </div>
          </div>

          {/* Selected Unit Info Panel - Bottom Right */}
          {selectedUnit && (
            <div className="absolute bottom-4 right-4 z-[80] w-72 md:w-80 rounded-2xl glass shadow-2xl">
              <div className="p-4 border-b border-slate-700/40 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{
                    background: selectedUnit.alarm > 0 ? alarmBlinkColor : typeConfig(selectedUnit.type).color,
                    boxShadow: `0 0 0 2.5px ${selectedUnit.alarm > 0 ? alarmBlinkColor : typeConfig(selectedUnit.type).color}50, 0 0 0 5px rgba(15,23,42,0.95), 0 0 14px ${selectedUnit.alarm > 0 ? alarmBlinkColor : typeConfig(selectedUnit.type).color}90`
                  }} />
                  <span className="text-sm font-extrabold text-slate-50 truncate">{selectedUnit.name}</span>
                </div>
                <button onClick={() => setSelectedUnit(null)} className="text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0 p-1 hover:bg-slate-800 rounded-lg ml-2" aria-label="关闭"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-xs text-slate-400 leading-relaxed font-medium">{selectedUnit.address}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[11px] px-2.5 py-1 bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold">{selectedUnit.unitType}</Badge>
                  {selectedUnit.online
                    ? <Badge variant="outline" className="text-[11px] px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 inline-block" />在线</Badge>
                    : <Badge variant="outline" className="text-[11px] px-2.5 py-1 bg-red-500/10 text-red-400 border-red-500/20 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5 inline-block" />离线</Badge>
                  }
                  {selectedUnit.controlRoom && <Badge variant="outline" className="text-[11px] px-2.5 py-1 bg-purple-500/10 text-purple-400 border-purple-500/20 font-bold">有消控室</Badge>}
                  {selectedUnit.maintenanceStatus !== '正常' && (
                    <Badge variant="outline" className={`text-[11px] px-2.5 py-1 font-bold ${selectedUnit.maintenanceStatus === '即将到期' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      维保{selectedUnit.maintenanceStatus}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/25">
                    <div className="text-lg font-black text-slate-50">{selectedUnit.devices}</div>
                    <div className="text-[10px] text-slate-500 mt-1 tracking-wide font-bold">设备</div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${selectedUnit.alarm > 0 ? 'bg-red-500/10 border-red-500/25' : 'bg-slate-800/50 border-slate-700/25'}`}>
                    <div className={`text-lg font-black ${selectedUnit.alarm > 0 ? 'text-red-400' : 'text-slate-50'}`}>{selectedUnit.alarm}</div>
                    <div className={`text-[10px] mt-1 tracking-wide font-bold ${selectedUnit.alarm > 0 ? 'text-red-400/70' : 'text-slate-500'}`}>火警</div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${selectedUnit.fault > 0 ? 'bg-yellow-500/10 border-yellow-500/25' : 'bg-slate-800/50 border-slate-700/25'}`}>
                    <div className={`text-lg font-black ${selectedUnit.fault > 0 ? 'text-yellow-400' : 'text-slate-50'}`}>{selectedUnit.fault}</div>
                    <div className={`text-[10px] mt-1 tracking-wide font-bold ${selectedUnit.fault > 0 ? 'text-yellow-400/70' : 'text-slate-500'}`}>故障</div>
                  </div>
                </div>
                {selectedUnit.manager && (
                  <div className="pt-3 border-t border-slate-700/35 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-2 font-medium"><Shield className="w-4 h-4 text-slate-500" />负责人</span>
                      <span className="text-slate-200 font-bold">{selectedUnit.manager}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-2 font-medium"><Phone className="w-4 h-4 text-slate-500" />联系电话</span>
                      <span className="text-slate-400 font-mono font-medium">{selectedUnit.managerPhone || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-2 font-medium"><Wrench className="w-4 h-4 text-slate-500" />维保状态</span>
                      <span className={`font-bold ${selectedUnit.maintenanceStatus === '正常' ? 'text-emerald-400' : selectedUnit.maintenanceStatus === '即将到期' ? 'text-yellow-400' : 'text-red-400'}`}>{selectedUnit.maintenanceStatus}</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2.5 pt-1">
                  <button className="flex-1 py-2.5 bg-blue-500/15 text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-500/25 transition-colors flex items-center justify-center gap-2 border border-blue-500/20 shadow-sm shadow-blue-500/5">
                    <Navigation className="w-4 h-4" />导航
                  </button>
                  <button className="flex-1 py-2.5 bg-slate-700/30 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700/50 transition-colors flex items-center justify-center gap-2 border border-slate-600/25">
                    <AlertCircle className="w-4 h-4" />详情
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </DataContainer>
  );
}