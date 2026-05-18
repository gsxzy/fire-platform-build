import { MapPin } from 'lucide-react';

interface FloorPlanPanelProps {
  floorPlan?: { image_url?: string; x?: number; y?: number } | null;
  location: string;
}

export default function FloorPlanPanel({ floorPlan, location }: FloorPlanPanelProps) {
  return (
    <div className="rounded-lg border border-slate-700/30 overflow-hidden">
      <div className="px-3 py-2 bg-slate-700/20 border-b border-slate-700/30 flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5 text-red-400" />
        <span className="text-[11px] text-slate-200 font-medium">报警位置平面图</span>
        <span className="text-[9px] text-slate-500">{location}</span>
      </div>
      <div className="p-3 bg-slate-900/50 relative" style={{ height: 220 }}>
        {floorPlan?.image_url ? (
          <img
            src={floorPlan.image_url}
            alt="平面图"
            className="w-full h-full object-contain rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <svg viewBox="0 0 400 180" className="w-full h-full">
            <rect x="20" y="20" width="360" height="140" fill="none" stroke="#475569" strokeWidth="1" rx="4" />
            <rect x="30" y="30" width="80" height="50" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
            <text x="70" y="57" textAnchor="middle" fill="#64748b" fontSize="8">大厅</text>
            <rect x="120" y="30" width="80" height="50" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
            <text x="160" y="57" textAnchor="middle" fill="#64748b" fontSize="8">走廊</text>
            <rect x="210" y="30" width="80" height="50" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
            <text x="250" y="57" textAnchor="middle" fill="#64748b" fontSize="8">配电室</text>
            <rect x="300" y="30" width="70" height="50" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
            <text x="335" y="57" textAnchor="middle" fill="#64748b" fontSize="8">楼梯间</text>
            <rect x="30" y="90" width="120" height="60" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
            <text x="90" y="123" textAnchor="middle" fill="#64748b" fontSize="8">停车场</text>
            <rect x="160" y="90" width="100" height="60" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
            <text x="210" y="123" textAnchor="middle" fill="#64748b" fontSize="8">设备间</text>
            <rect x="270" y="90" width="100" height="60" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
            <text x="320" y="123" textAnchor="middle" fill="#64748b" fontSize="8">消防控制室</text>
            <circle cx="160" cy="55" r="8" fill="#ef4444" opacity="0.8">
              <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <text x="160" y="20" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="bold">报警位置</text>
          </svg>
        )}
        {floorPlan?.x !== undefined && floorPlan?.y !== undefined && (
          <div
            className="absolute w-3 h-3 rounded-full bg-red-500 border-2 border-white animate-pulse"
            style={{ left: `${floorPlan.x}%`, top: `${floorPlan.y}%`, transform: 'translate(-50%, -50%)' }}
          />
        )}
      </div>
    </div>
  );
}
