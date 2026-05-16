import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import { TrendingUp } from 'lucide-react';
import DataContainer from '@/components/DataContainer';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';

export default function AnalysisTrendPage() {
  const [tab, setTab] = useState<'alarm' | 'device'>('alarm');
  const [monthlyData, setMonthlyData] = useState([] as any);
  const [deviceOnlineData, setDeviceOnlineData] = useState([] as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [alarmRes, deviceRes] = await Promise.all([
        legacyApi.alarmTrend() as any,
        legacyApi.deviceAnalysis() as any,
      ]);
      const alarmData = alarmRes.data ?? alarmRes;
      if (alarmData && (Array.isArray(alarmData) || typeof alarmData === 'object')) setMonthlyData(alarmData as any);
      const deviceData = deviceRes.data ?? deviceRes;
      if (deviceData && (Array.isArray(deviceData) || typeof deviceData === 'object')) setDeviceOnlineData(deviceData as any);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  return (
    <DataContainer loading={loading} error={error} data={monthlyData} onRetry={loadData} emptyText="暂无数据">
    <div className="space-y-4">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">趋势分析</h2>
            <p className="text-[10px] text-slate-500">消防数据趋势与预测</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setTab('alarm')} className={`text-[10px] px-3 py-1.5 rounded ${tab === 'alarm' ? 'bg-blue-500 text-white' : 'bg-slate-700/30 text-slate-400'}`}>告警趋势</button>
        <button onClick={() => setTab('device')} className={`text-[10px] px-3 py-1.5 rounded ${tab === 'device' ? 'bg-blue-500 text-white' : 'bg-slate-700/30 text-slate-400'}`}>设备在线率</button>
      </div>

      {tab === 'alarm' && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="text-xs text-slate-200 mb-3">月度告警趋势</div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Area type="monotone" dataKey="total" name="告警总数" stroke="#3b82f6" fillOpacity={0} strokeWidth={2} />
              <Area type="monotone" dataKey="fire" name="火警" stroke="#ef4444" fill="url(#gt)" strokeWidth={2} />
              <Area type="monotone" dataKey="fault" name="故障" stroke="#f59e0b" fillOpacity={0} strokeWidth={2} />
              <Area type="monotone" dataKey="supervisory" name="监管" stroke="#10b981" fillOpacity={0} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'device' && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="text-xs text-slate-200 mb-3">设备在线率趋势</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={deviceOnlineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[90, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
              <Line type="monotone" dataKey="rate" name="在线率%" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
    </DataContainer>
  );
}
