import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import DataContainer from '@/components/DataContainer';

const alarmStatsInit = [
  { label: '本月报警总数', value: 156, trend: '+12%', up: true },
  { label: '火警', value: 23, trend: '-5%', up: false },
  { label: '故障', value: 89, trend: '+8%', up: true },
  { label: '预警', value: 44, trend: '+15%', up: true },
];

const unitAlarmRankInit = [
  { unit: '万达广场商业中心', fire: 5, fault: 18, warn: 8, total: 31 },
  { unit: '兰州石化', fire: 4, fault: 22, warn: 12, total: 38 },
  { unit: '兰大二院', fire: 3, fault: 12, warn: 6, total: 21 },
  { unit: '兰州中心', fire: 3, fault: 14, warn: 7, total: 24 },
  { unit: '西北师范大学', fire: 4, fault: 16, warn: 9, total: 29 },
  { unit: '靖煤酒店', fire: 2, fault: 7, warn: 2, total: 11 },
  { unit: '红星美凯龙', fire: 2, fault: 10, warn: 5, total: 17 },
];

const typeDistributionInit = [
  { type: '烟感报警', count: 45 },
  { type: '温感报警', count: 18 },
  { type: '手报报警', count: 12 },
  { type: '电气火灾', count: 28 },
  { type: '水压异常', count: 22 },
  { type: '风机故障', count: 15 },
  { type: '设备离线', count: 16 },
];

export default function AnalysisAlarmPage() {
  const [alarmStats, setAlarmStats] = useState(alarmStatsInit as any);
  const [unitAlarmRank, setUnitAlarmRank] = useState(unitAlarmRankInit as any);
  const [typeDistribution, setTypeDistribution] = useState(typeDistributionInit as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [analysisRes, statsRes] = await Promise.all([
        legacyApi.alarmAnalysis() as any,
        legacyApi.alarmStats() as any,
      ]);
      const analysisData = analysisRes.data ?? analysisRes;
      if (analysisData && typeof analysisData === 'object') {
        if (Array.isArray(analysisData.unitAlarmRank)) setUnitAlarmRank(analysisData.unitAlarmRank as any);
        if (Array.isArray(analysisData.typeDistribution)) setTypeDistribution(analysisData.typeDistribution as any);
      }
      const statsData = statsRes.data ?? statsRes;
      if (statsData && (Array.isArray(statsData) || typeof statsData === 'object')) setAlarmStats(statsData as any);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  return (
    <DataContainer loading={loading} error={error} data={alarmStats} onRetry={loadData} emptyText="暂无数据">
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20">
            <BarChart3 className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">报警分析</h2>
            <p className="text-[10px] text-slate-500">报警数据统计与分析</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {alarmStats.map((s: any, i: number) => (
          <Card key={i} className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">{s.label}</span>
                {s.up ? <TrendingUp className="w-3.5 h-3.5 text-red-400" /> : <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-xl font-bold text-slate-100">{s.value}</span>
                <span className={`text-[10px] ${s.up ? 'text-red-400' : 'text-emerald-400'}`}>{s.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        <Card className="border-slate-700/50 bg-slate-800/50 flex flex-col">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
              <span className="text-xs text-slate-300 font-medium">单位报警排名（TOP7）</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {unitAlarmRank.map((u: any, i: number) => (
                <div key={i} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center">
                  <span className="col-span-4 text-[10px] text-slate-200">{u.unit}</span>
                  <span className="col-span-2 text-[9px] text-red-400">火警{u.fire}</span>
                  <span className="col-span-2 text-[9px] text-yellow-400">故障{u.fault}</span>
                  <span className="col-span-2 text-[9px] text-blue-400">预警{u.warn}</span>
                  <span className="col-span-2 text-[10px] text-slate-300 font-bold">{u.total}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-700/50 bg-slate-800/50 flex flex-col">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
              <span className="text-xs text-slate-300 font-medium">报警类型分布</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {typeDistribution.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30">
                  <span className="text-[10px] text-slate-200 w-20">{t.type}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${(t.count / 45) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 w-8 text-right">{t.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </DataContainer>
  );
}
