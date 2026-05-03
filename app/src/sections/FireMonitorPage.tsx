import DataContainer from '@/components/DataContainer';
import StatCard from '@/components/StatCard';
import { useState, useEffect, useCallback } from 'react';
import {
  Bell, Shield, Clock, MapPin, WifiOff,
  Eye, Flame, AlertTriangle,
  ChevronUp
} from 'lucide-react';
import { alarmService } from '@/api/services';
import type { Alarm } from '@/types/db';

interface FireAlarm {
  id: string;
  device: string;
  type: 'fire' | 'fault' | 'supervisory' | 'test';
  unit: string;
  location: string;
  time: string;
  status: 'new' | 'confirmed' | 'handled';
  level: 'urgent' | 'high' | 'normal';
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  fire: { label: '火警', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Flame },
  fault: { label: '故障', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: WifiOff },
  supervisory: { label: '监管', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Shield },
  test: { label: '测试', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Clock },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  new: { label: '未处理', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  confirmed: { label: '已确认', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  handled: { label: '已处理', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: '紧急', color: 'text-red-400' },
  high: { label: '高', color: 'text-orange-400' },
  normal: { label: '一般', color: 'text-blue-400' },
};

const TYPE_FILTERS = [
  { k: 'all', l: '全部类型' },
  { k: 'fire', l: '火警' },
  { k: 'fault', l: '故障' },
  { k: 'supervisory', l: '监管' },
  { k: 'test', l: '测试' },
];

const STATUS_FILTERS = [
  { k: 'all', l: '全部状态' },
  { k: 'new', l: '未处理' },
  { k: 'confirmed', l: '已确认' },
  { k: 'handled', l: '已处理' },
];

export default function FireMonitorPage() {
  const [alarms, setAlarms] = useState<FireAlarm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState({ type: 'all', status: 'all' });
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchAlarms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await alarmService.list({ pageSize: 50 });
      if (res.code === 200) {
        const mapped: FireAlarm[] = (res.data?.list || []).map((a: Alarm) => ({
          id: a.id,
          device: a.deviceName || a.deviceId,
          type: (a.type === 'warning' ? 'test' : a.type) as FireAlarm['type'],
          unit: a.unitName || a.unitId,
          location: a.location,
          time: a.createdAt,
          status: a.status as FireAlarm['status'],
          level: a.level as FireAlarm['level'],
        }));
        setAlarms(mapped);
      }
    } catch (e: any) {
      console.error('加载告警失败', e);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  const filtered = alarms.filter(a => {
    if (filter.type !== 'all' && a.type !== filter.type) return false;
    if (filter.status !== 'all' && a.status !== filter.status) return false;
    return true;
  });

  const stats = {
    fire: alarms.filter(a => a.type === 'fire').length,
    fault: alarms.filter(a => a.type === 'fault').length,
    supervisory: alarms.filter(a => a.type === 'supervisory').length,
    unhandled: alarms.filter(a => a.status === 'new').length,
  };

  const confirmAlarm = async (id: string) => {
    try {
      await alarmService.confirm(id, '当前用户');
      fetchAlarms();
    } catch (e) {
      console.error('确认失败', e);
    }
  };

  const handleAlarm = async (id: string) => {
    try {
      await alarmService.handle(id, '当前用户');
      fetchAlarms();
    } catch (e) {
      console.error('处理失败', e);
    }
  };

  return (
    <DataContainer loading={loading} error={error} data={alarms} onRetry={fetchAlarms} emptyText="暂无告警数据">
      <div className="p-4 space-y-4 h-full overflow-y-auto scrollbar-thin">
        {/* Header — glass */}
        <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20">
              <Bell className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 leading-tight">火灾报警监控</h2>
              <p className="text-[10px] text-slate-500">实时火警信号监控与处置</p>
            </div>
          </div>
          {stats.unhandled > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
              </span>
              <span className="text-[10px] text-red-400 font-medium">{stats.unhandled} 条未处理</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="火警" value={stats.fire} color="red" icon={<Flame className="w-3.5 h-3.5" />} unit="条" />
          <StatCard label="故障" value={stats.fault} color="yellow" icon={<WifiOff className="w-3.5 h-3.5" />} unit="条" />
          <StatCard label="监管" value={stats.supervisory} color="blue" icon={<Shield className="w-3.5 h-3.5" />} unit="条" />
          <StatCard label="未处理" value={stats.unhandled} color="emerald" icon={<AlertTriangle className="w-3.5 h-3.5" />} unit="条" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg border border-slate-700/40 p-0.5">
            {TYPE_FILTERS.map(f => (
              <button
                key={f.k}
                onClick={() => setFilter(prev => ({ ...prev, type: f.k }))}
                className={`text-[10px] px-2.5 py-1.5 rounded-md transition-all duration-200 font-medium ${
                  filter.type === f.k
                    ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                }`}
              >
                {f.l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg border border-slate-700/40 p-0.5">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.k}
                onClick={() => setFilter(prev => ({ ...prev, status: f.k }))}
                className={`text-[10px] px-2.5 py-1.5 rounded-md transition-all duration-200 font-medium ${
                  filter.status === f.k
                    ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                }`}
              >
                {f.l}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-600 ml-auto">
            共 {filtered.length} 条记录
          </span>
        </div>

        {/* Alarm List */}
        <div className="space-y-2.5">
          {filtered.map(alarm => {
            const tc = TYPE_CONFIG[alarm.type] || TYPE_CONFIG.test;
            const sc = STATUS_CONFIG[alarm.status] || STATUS_CONFIG.new;
            const lc = LEVEL_CONFIG[alarm.level] || LEVEL_CONFIG.normal;
            const isExpanded = expanded === alarm.id;
            const TypeIcon = tc.icon;

            return (
              <div
                key={alarm.id}
                className={`rounded-xl border transition-all duration-300 ${
                  alarm.status === 'new'
                    ? 'border-red-500/20 bg-slate-800/50 shadow-sm shadow-red-500/5'
                    : 'border-slate-700/30 bg-slate-800/30 hover:border-slate-600/40'
                }`}
              >
                <div className="p-3 flex items-center gap-3">
                  {/* Type icon */}
                  <div className={`w-9 h-9 rounded-xl ${tc.bg} flex items-center justify-center flex-shrink-0 border ${tc.border}`}>
                    <TypeIcon className={`w-4 h-4 ${tc.color}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-200">{alarm.device}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium border ${tc.color} ${tc.bg} ${tc.border}`}>
                        {tc.label}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium border ${sc.color} ${sc.bg} ${sc.border}`}>
                        {sc.label}
                      </span>
                      {alarm.level === 'urgent' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-medium text-red-400 bg-red-500/10 border border-red-500/20 animate-pulse">
                          紧急
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {alarm.unit} · {alarm.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {alarm.time}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {alarm.status === 'new' && (
                      <button
                        onClick={() => confirmAlarm(alarm.id)}
                        className="text-[10px] px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-sm shadow-blue-500/20 font-medium"
                      >
                        确认
                      </button>
                    )}
                    {alarm.status === 'confirmed' && (
                      <button
                        onClick={() => handleAlarm(alarm.id)}
                        className="text-[10px] px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all shadow-sm shadow-emerald-500/20 font-medium"
                      >
                        处理
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : alarm.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                      aria-label="查看"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-3 pb-3 ml-12">
                    <div className="bg-slate-900/60 rounded-lg p-3.5 text-[10px] text-slate-400 space-y-1.5 border border-slate-700/20">
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-slate-500">告警ID:</span> <span className="text-slate-300 font-mono">{alarm.id}</span></div>
                        <div><span className="text-slate-500">设备名称:</span> <span className="text-slate-300">{alarm.device}</span></div>
                        <div><span className="text-slate-500">告警类型:</span> <span className={tc.color}>{tc.label}</span></div>
                        <div><span className="text-slate-500">严重程度:</span> <span className={lc.color}>{lc.label}</span></div>
                        <div><span className="text-slate-500">联网单位:</span> <span className="text-slate-300">{alarm.unit}</span></div>
                        <div><span className="text-slate-500">具体位置:</span> <span className="text-slate-300">{alarm.location}</span></div>
                        <div><span className="text-slate-500">告警时间:</span> <span className="text-slate-300">{alarm.time}</span></div>
                        <div><span className="text-slate-500">处理状态:</span> <span className={sc.color}>{sc.label}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DataContainer>
  );
}


