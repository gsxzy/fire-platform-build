import { BellOff, Eye } from 'lucide-react';
import type { FireAlarm, FaultAlarm, ShieldItem, FeedbackAlarm } from '../types';

interface AlarmTableProps {
  alarmTab: 'all' | 'fire' | 'fault' | 'shield' | 'feedback';
  fireAlarms: FireAlarm[];
  faultAlarms: FaultAlarm[];
  shieldItems: ShieldItem[];
  feedbackAlarms: FeedbackAlarm[];
  fmtTime: (t?: string) => string;
  cell: string;
  confirmingId: string | null;
  handleConfirm: (id: string, result: number) => void;
}

export default function AlarmTable({
  alarmTab, fireAlarms, faultAlarms, shieldItems, feedbackAlarms,
  fmtTime, cell, confirmingId, handleConfirm,
}: AlarmTableProps) {
  const renderRows = () => {
    const rows: React.ReactNode[] = [];
    if (alarmTab === 'all' || alarmTab === 'fire') {
      fireAlarms.slice(0, 4).forEach((a: FireAlarm) => rows.push(
        <div key={`fire-${a.id}`} className={`grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row-v2 fire-table-row-red-v2 border-b border-slate-700/10 items-center group ${a.status === 0 ? 'alarm-critical-v2 animate-red-pulse' : ''}`}>
          <div className="flex items-center">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${a.alarm_type === 1 ? 'text-red-400 bg-red-500/15 border-red-500/30' : a.alarm_type === 2 ? 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' : 'text-purple-400 bg-purple-500/15 border-purple-500/30'}`}>{a.alarm_type === 1 ? '火警' : a.alarm_type === 2 ? '故障' : '预警'}</span>
          </div>
          <span className={`${cell} text-slate-500`}>{fmtTime(a.created_at)}</span>
          <span className={`${cell} text-slate-200 font-semibold`}>{a.device_name}</span>
          <span className={`${cell} text-slate-500`}>{a.device_point}</span>
          <span className={`${cell} text-slate-500 font-mono`}>1</span>
          <span className={`${cell} text-slate-500 font-mono`}>{a.device_code}</span>
          <span className={`text-[10px] leading-none text-center font-semibold ${a.status === 0 ? 'text-red-400 glow-text-red-v2' : a.status === 1 ? 'text-blue-400' : a.status === 2 ? 'text-emerald-400' : 'text-slate-400'}`}>{a.status === 0 ? '未处理' : a.status === 1 ? '已确认' : a.status === 2 ? '已处理' : '误报'}</span>
          <div className="flex items-center justify-center">
            {a.status === 0 ? (
              <button onClick={() => handleConfirm(String(a.id), 1)} disabled={confirmingId === String(a.id)} className="text-[10px] px-2 py-1 bg-blue-500/15 text-blue-400 rounded-md hover:bg-blue-500/25 transition-all border border-blue-500/20 font-medium disabled:opacity-40">{confirmingId === String(a.id) ? '中' : '确认'}</button>
            ) : (
              <button className="text-[10px] px-2 py-1 bg-slate-700/40 text-slate-400 rounded-md hover:bg-slate-700/60 transition-all border border-slate-600/30 flex items-center gap-1"><Eye className="w-3 h-3" />查看</button>
            )}
          </div>
        </div>
      ));
    }
    if (alarmTab === 'all' || alarmTab === 'fault') {
      faultAlarms.slice(0, 4).forEach((f: FaultAlarm) => rows.push(
        <div key={`fault-${f.id}`} className={`grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row-v2 fire-table-row-amber-v2 border-b border-slate-700/10 items-center group ${f.status === 0 ? 'alarm-critical-v2' : ''}`}>
          <div className="flex items-center"><span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20">故障</span></div>
          <span className={`${cell} text-slate-500`}>{fmtTime(f.created_at)}</span>
          <span className={`${cell} text-slate-200 font-semibold`}>{f.device_name}</span>
          <span className={`${cell} text-slate-500`}>{f.device_type}</span>
          <span className={`${cell} text-slate-500 font-mono`}>1</span>
          <span className={`${cell} text-slate-500 font-mono`}>{f.alarm_no}</span>
          <span className={`text-[10px] leading-none text-center font-semibold ${f.status === 0 ? 'text-yellow-400 glow-text-yellow-v2' : 'text-emerald-400'}`}>{f.status === 0 ? '未处理' : '已处理'}</span>
          <div className="flex items-center justify-center"><button className="text-[10px] px-2 py-1 bg-slate-700/40 text-slate-400 rounded-md hover:bg-slate-700/60 transition-all border border-slate-600/30 flex items-center gap-1"><Eye className="w-3 h-3" />查看</button></div>
        </div>
      ));
    }
    if (alarmTab === 'all' || alarmTab === 'shield') {
      shieldItems.slice(0, 4).forEach((s: ShieldItem) => rows.push(
        <div key={`shield-${s.id}`} className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row-v2 fire-table-row-purple-v2 border-b border-slate-700/10 items-center group">
          <div className="flex items-center"><span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20">屏蔽</span></div>
          <span className={`${cell} text-slate-500`}>{fmtTime(s.shield_time)}</span>
          <span className={`${cell} text-slate-200 font-semibold`}>{s.point_name}</span>
          <span className={`${cell} text-slate-500`}>{s.device_type}</span>
          <span className={`${cell} text-slate-500 font-mono`}>1</span>
          <span className={`${cell} text-slate-500 font-mono`}>—</span>
          <span className="text-[10px] leading-none text-center font-semibold text-purple-400">屏蔽中</span>
          <div className="flex items-center justify-center"><button className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-400 rounded-md hover:bg-purple-500/20 transition-all border border-purple-500/20 font-medium">解除</button></div>
        </div>
      ));
    }
    if (alarmTab === 'all' || alarmTab === 'feedback') {
      feedbackAlarms.slice(0, 4).forEach((fb: FeedbackAlarm) => rows.push(
        <div key={`fb-${fb.id}`} className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row-v2 fire-table-row-cyan-v2 border-b border-slate-700/10 items-center group">
          <div className="flex items-center"><span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20">反馈</span></div>
          <span className={`${cell} text-slate-500`}>{fmtTime(fb.created_at)}</span>
          <span className={`${cell} text-slate-200 font-semibold`}>{fb.device_name}</span>
          <span className={`${cell} text-slate-500`}>{fb.feedback_desc}</span>
          <span className={`${cell} text-slate-500 font-mono`}>1</span>
          <span className={`${cell} text-slate-500 font-mono`}>—</span>
          <span className="text-[10px] leading-none text-center font-semibold text-blue-400">正常</span>
          <div className="flex items-center justify-center"><button className="text-[10px] px-2 py-1 bg-slate-700/40 text-slate-400 rounded-md hover:bg-slate-700/60 transition-all border border-slate-600/30 flex items-center gap-1"><Eye className="w-3 h-3" />查看</button></div>
        </div>
      ));
    }
    if (rows.length === 0) {
      return <div className="h-[120px] flex flex-col items-center justify-center gap-2 text-slate-600"><BellOff className="w-6 h-6 text-slate-700" /><span className="text-xs">暂无数据</span></div>;
    }
    return rows;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 tech-card-v2 rounded-t-none overflow-hidden corner-accent-v2">
      <div className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-8 glass flex-shrink-0 items-center border-b border-slate-700/20">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">类型</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">时间</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">设备名称</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">点位</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">主机</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">编码</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center">状态</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center">操作</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {renderRows()}
      </div>
    </div>
  );
}
