import { useState, useEffect, useCallback } from 'react';
import { aiService, type AIDecisionOverview } from '@/api/services/ai.service';
import { BrainCircuit, Flame, AlertTriangle, TrendingUp, Shield, Zap, Activity, BarChart3, ChevronRight, RefreshCw, Lightbulb, CheckCircle } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';

const typeConfig: Record<string, { icon: typeof Flame; color: string; bg: string; label: string }> = {
  fire: { icon: Flame, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: '火警决策' },
  fault: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: '故障分析' },
  warning: { icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', label: '预警建议' },
  analysis: { icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: '风险分析' },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: 'text-emerald-400 bg-emerald-500/10', label: '执行中' },
  pending: { color: 'text-yellow-400 bg-yellow-500/10', label: '待执行' },
  handled: { color: 'text-slate-400 bg-slate-500/10', label: '已处理' },
};

export default function AIDecisionPage() {
  const [radarData, setRadarData] = useState<AIDecisionOverview['radarData']>([]);
  const [decisions, setDecisions] = useState<AIDecisionOverview['decisions']>([]);
  const [stats, setStats] = useState<AIDecisionOverview['stats'] | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setError('');
    try {
      const res = await aiService.overview();
      const data = (res as any)?.data ?? res;
      if (data && typeof data === 'object') {
        if (Array.isArray(data.radarData)) setRadarData(data.radarData);
        if (Array.isArray(data.decisions)) setDecisions(data.decisions);
        if (data.stats) setStats(data.stats);
      }
    } catch (e: any) {
      setError(e?.message || '加载失败');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setTimeout(() => setRefreshing(false), 400);
  }, [loadData]);

  const handleExecute = async (id: number) => {
    try {
      const res = await aiService.executeDecision(id);
      const data = (res as any)?.data ?? res;
      alert(data?.message || '执行成功');
      // 刷新状态
      setDecisions((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'active' } : d)));
    } catch (e: any) {
      alert(e?.message || '执行失败');
    }
  };

  const statItems = [
    { label: '今日决策', value: stats?.todayDecision ?? '--', icon: BrainCircuit, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { label: '执行中', value: stats?.active ?? '--', icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: '已处理', value: stats?.handled ?? '--', icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: '平均置信度', value: stats ? `${stats.avgConfidence}%` : '--', icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { label: '响应时间', value: stats?.responseTime ?? '--', icon: Activity, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between glass rounded-xl px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
            <BrainCircuit className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-100 leading-tight">AI决策中心</h2>
            <p className="text-[10px] text-slate-500">智能分析与自动决策</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className={`text-[10px] px-3 py-1.5 glass rounded-lg hover:text-slate-200 flex items-center gap-1.5 transition-all border border-slate-700/30 ${refreshing ? 'animate-pulse' : 'text-slate-400'}`}
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />刷新分析
        </button>
      </div>

      {error && (
        <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statItems.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={`glass rounded-xl p-3 border ${s.border} hover-lift card-shine transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400">{s.label}</span>
                <div className={`w-7 h-7 rounded-lg ${s.bg} ${s.border} border flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                </div>
              </div>
              <div className={`text-xl font-bold ${s.color} tabular-nums`}>{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left: Decision List */}
        <div className="col-span-2 space-y-2">
          <div className="text-xs font-medium text-slate-200 mb-2">AI决策建议</div>
          {decisions.length === 0 && (
            <div className="text-[11px] text-slate-500 bg-slate-800/30 rounded-lg p-4 text-center border border-slate-700/20">
              暂无 AI 决策建议，可点击「刷新分析」或前往「风险研判」触发分析。
            </div>
          )}
          {decisions.map((d) => {
            const tc = typeConfig[d.type] || typeConfig.analysis;
            const Icon = tc.icon;
            const sc = statusConfig[d.status] || statusConfig.pending;
            const isExpanded = selectedDecision === d.id;
            return (
              <div
                key={d.id}
                onClick={() => setSelectedDecision(isExpanded ? null : d.id)}
                className={`bg-slate-800/50 rounded-lg border transition-all cursor-pointer ${tc.bg} ${isExpanded ? 'border-opacity-50' : ''}`}
              >
                <div className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tc.bg}`}>
                    <Icon className={`w-4 h-4 ${tc.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-200">{d.title}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded ${sc.color}`}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[9px] ${tc.color}`}>{tc.label}</span>
                      <span className="text-[9px] text-slate-500">置信度: {d.confidence}%</span>
                      <span className="text-[9px] text-slate-600">{d.time}</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3 ml-12">
                    <div className="bg-slate-900/50 rounded-lg p-3 text-[11px] text-slate-300 leading-relaxed border border-slate-700/20 whitespace-pre-line">
                      {d.content}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExecute(d.id); }}
                        className="text-[10px] px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
                      >
                        执行建议
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDecisions((prev) => prev.filter((x) => x.id !== d.id)); }}
                        className="text-[10px] px-3 py-1.5 bg-slate-700/30 text-slate-400 rounded hover:bg-slate-700/50 transition-colors"
                      >
                        忽略
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); alert(JSON.stringify(d.analysis, null, 2)); }}
                        className="text-[10px] px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Radar + Tips */}
        <div className="space-y-3">
          <div className="glass rounded-xl border border-slate-700/30 p-3 hover-lift transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className="text-xs font-medium text-slate-200">单位安全能力对比</span>
            </div>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <PolarRadiusAxis tick={{ fontSize: 8, fill: '#64748b' }} angle={30} domain={[0, 100]} />
                  <Radar name="本月" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="上月" dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: '9px' }} iconSize={6} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-[11px] text-slate-500">
                暂无雷达图数据
              </div>
            )}
          </div>

          <div className="glass rounded-xl border border-slate-700/30 p-3 hover-lift transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
              </div>
              <span className="text-xs font-medium text-slate-200">AI洞察</span>
            </div>
            <div className="space-y-2">
              {decisions.slice(0, 3).map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px] text-slate-400">
                  <div className="w-1 h-1 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                  <span>{tip.title}</span>
                </div>
              ))}
              {decisions.length === 0 && (
                <div className="text-[10px] text-slate-500">暂无洞察数据</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
