import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, User, Phone,
  Clock, Calendar
} from 'lucide-react';

interface DutyShift {
  id: string;
  name: string;
  phone: string;
  role: string;
  date: string;
  shift: 'day' | 'night';
  status: 'on' | 'off' | 'leave';
}

const staff: DutyShift[] = [
  { id: 'DS-001', name: '张明', phone: '138****1234', role: '值班长', date: '2026-04-19', shift: 'day', status: 'on' },
  { id: 'DS-002', name: '李强', phone: '139****5678', role: '值班员', date: '2026-04-19', shift: 'day', status: 'on' },
  { id: 'DS-003', name: '王芳', phone: '137****9012', role: '值班员', date: '2026-04-19', shift: 'night', status: 'on' },
  { id: 'DS-004', name: '赵磊', phone: '136****3456', role: '值班长', date: '2026-04-19', shift: 'night', status: 'on' },
  { id: 'DS-005', name: '刘洋', phone: '135****7890', role: '备班', date: '2026-04-19', shift: 'day', status: 'off' },
  { id: 'DS-006', name: '陈静', phone: '134****2345', role: '备班', date: '2026-04-19', shift: 'night', status: 'leave' },
];

const statusCfg = (s: string) => {
  switch (s) {
    case 'on': return { label: '在岗', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    case 'off': return { label: '休息', color: 'text-slate-400', bg: 'bg-slate-500/10' };
    case 'leave': return { label: '请假', color: 'text-red-400', bg: 'bg-red-500/10' };
    default: return { label: s, color: 'text-slate-400', bg: 'bg-slate-500/10' };
  }
};

export default function DutySchedulePage() {
  const [date] = useState('2026-04-19');
  const [shifts, setShifts] = useState<DutyShift[]>(staff);

  const dayShifts = shifts.filter(s => s.shift === 'day');
  const nightShifts = shifts.filter(s => s.shift === 'night');

  const toggleStatus = (id: string) => {
    setShifts(prev => prev.map((s: any) => {
      if (s.id !== id) return s;
      const order: Array<'on' | 'off' | 'leave'> = ['on', 'off', 'leave'];
      const idx = order.indexOf(s.status);
      return { ...s, status: order[(idx + 1) % 3] };
    }));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">值班排班</h2>
            <p className="text-[10px] text-slate-500">值班人员排班表</p>
          </div>
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg border border-slate-700/30 p-3">
        <button className="p-1 text-slate-400 hover:text-slate-200" aria-label="上一页"><ChevronLeft className="w-4 h-4" /></button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-slate-200 font-mono">{date}</span>
        </div>
        <button className="p-1 text-slate-400 hover:text-slate-200" aria-label="下一页"><ChevronRight className="w-4 h-4" /></button>
        <span className="text-xs text-slate-500 ml-2">今日</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '白班人数', value: dayShifts.filter(s => s.status === 'on').length, color: 'blue' },
          { label: '夜班人数', value: nightShifts.filter(s => s.status === 'on').length, color: 'purple' },
          { label: '在岗', value: shifts.filter(s => s.status === 'on').length, color: 'emerald' },
          { label: '请假/休息', value: shifts.filter(s => s.status !== 'on').length, color: 'slate' },
        ].map((s: any) => (
          <div key={s.label} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
            <span className="text-xs text-slate-400">{s.label}</span>
            <div className={`text-xl font-bold text-${s.color}-400 mt-1`}>{s.value}<span className="text-xs text-slate-500 ml-1">人</span></div>
          </div>
        ))}
      </div>

      {/* Shift Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Day Shift */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-slate-200">白班 (08:00-20:00)</span>
          </div>
          <div className="space-y-2">
            {dayShifts.map((s: any) => {
              const sc = statusCfg(s.status);
              return (
                <div key={s.id} className="flex items-center gap-3 p-2.5 bg-slate-700/20 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-200">{s.name}</span>
                      <span className="text-[9px] text-slate-500">{s.role}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Phone className="w-3 h-3" />{s.phone}
                    </div>
                  </div>
                  <button onClick={() => toggleStatus(s.id)} className={`text-[9px] px-2 py-0.5 rounded ${sc.color} ${sc.bg} cursor-pointer hover:opacity-80 transition-opacity`}>
                    {sc.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Night Shift */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-slate-200">夜班 (20:00-08:00)</span>
          </div>
          <div className="space-y-2">
            {nightShifts.map((s: any) => {
              const sc = statusCfg(s.status);
              return (
                <div key={s.id} className="flex items-center gap-3 p-2.5 bg-slate-700/20 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-200">{s.name}</span>
                      <span className="text-[9px] text-slate-500">{s.role}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Phone className="w-3 h-3" />{s.phone}
                    </div>
                  </div>
                  <button onClick={() => toggleStatus(s.id)} className={`text-[9px] px-2 py-0.5 rounded ${sc.color} ${sc.bg} cursor-pointer hover:opacity-80 transition-opacity`}>
                    {sc.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
