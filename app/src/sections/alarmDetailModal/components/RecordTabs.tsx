import { Clock, CheckCircle, MessageSquare, User } from 'lucide-react';
import type { DutyRecord } from '../types';

interface RecordTabsProps {
  activeTab: 'duty' | 'handle';
  onTabChange: (tab: 'duty' | 'handle') => void;
  dutyRecords: DutyRecord[];
  detail: any;
}

export default function RecordTabs({ activeTab, onTabChange, dutyRecords, detail }: RecordTabsProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-700/50 flex-shrink-0 px-3">
        <button
          onClick={() => onTabChange('duty')}
          className={`px-4 py-2 text-[11px] font-medium transition-colors border-b-2 ${
            activeTab === 'duty' ? 'text-blue-400 border-blue-400' : 'text-slate-500 border-transparent hover:text-slate-300'
          }`}
        >
          值守记录
        </button>
        <button
          onClick={() => onTabChange('handle')}
          className={`px-4 py-2 text-[11px] font-medium transition-colors border-b-2 ${
            activeTab === 'handle' ? 'text-blue-400 border-blue-400' : 'text-slate-500 border-transparent hover:text-slate-300'
          }`}
        >
          处理记录
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeTab === 'duty' ? (
          <>
            {dutyRecords.map((r, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    r.completed ? 'bg-blue-500/20' : 'bg-slate-700/30'
                  }`}>
                    {r.completed ? (
                      <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                  {i < dutyRecords.length - 1 && <div className="w-0.5 h-full bg-slate-700/30 mt-1" />}
                </div>
                <div className="pb-3 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[11px] font-medium ${r.completed ? 'text-slate-200' : 'text-slate-500'}`}>{r.stage}</span>
                    {r.completed && <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">已完成</span>}
                  </div>
                  <p className="text-[10px] text-slate-400">{r.action}</p>
                  {r.person !== '-' && (
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500">
                      <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{r.person}</span>
                      {r.time !== '-' && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{r.time}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-slate-700/20 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] text-slate-200 font-medium">处理备注</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {detail.handle_result || detail.handle_note || '暂无处理记录'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-700/20 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] text-slate-200 font-medium">处理人员</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {detail.handler_name || detail.handler || '待分配'}
              </p>
            </div>
            {detail.confirm_time && (
              <div className="p-3 rounded-lg bg-slate-700/20 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] text-slate-200 font-medium">确认时间</span>
                </div>
                <p className="text-[10px] text-slate-400">{detail.confirm_time}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
