import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import DataContainer from '@/components/DataContainer';
import {
  Brain, AlertTriangle, Flame,
  BarChart3, CheckCircle
} from 'lucide-react';

const riskUnitsInit = [
  { id: 1, name: '万达广场商业中心', riskScore: 82, riskLevel: '高风险', factors: ['设备老化率15%', '近30天故障12次', '报警响应延迟'], trend: 'up' },
  { id: 2, name: '兰州石化', riskScore: 68, riskLevel: '中风险', factors: ['化工原料存储', '漏电报警频发', '维保周期临近'], trend: 'up' },
  { id: 3, name: '兰州中心', riskScore: 45, riskLevel: '低风险', factors: ['消防泵通讯故障', '部分应急照明离线'], trend: 'stable' },
  { id: 4, name: '靖煤酒店', riskScore: 55, riskLevel: '中风险', factors: ['消控室离线', '设备在线率低', '维保到期'], trend: 'up' },
  { id: 5, name: '西北师范大学', riskScore: 35, riskLevel: '低风险', factors: ['疏散指示2处不亮', '灭火器需年检'], trend: 'stable' },
];

const predictionRulesInit = [
  { id: 1, name: '设备故障提前预警', desc: '基于设备运行数据，提前48小时预测可能故障', accuracy: '92%', enabled: true },
  { id: 2, name: '电气火灾风险预测', desc: '根据电流/温度趋势，预测电气火灾隐患', accuracy: '88%', enabled: true },
  { id: 3, name: '水压异常趋势预警', desc: '监测管网压力变化趋势，提前预警水压异常', accuracy: '95%', enabled: true },
  { id: 4, name: '设备老化评估', desc: '综合设备使用年限/故障率，评估老化风险', accuracy: '85%', enabled: false },
  { id: 5, name: '季节性火灾风险', desc: '结合季节/天气/历史数据，评估季节性风险', accuracy: '80%', enabled: true },
  { id: 6, name: '单位综合风险评估', desc: '多维度评分模型，综合评估单位消防风险', accuracy: '90%', enabled: true },
];

const scoreColor = (s: number) => s >= 80 ? 'text-red-400' : s >= 60 ? 'text-orange-400' : s >= 40 ? 'text-yellow-400' : 'text-emerald-400';
const scoreBg = (s: number) => s >= 80 ? 'bg-red-500' : s >= 60 ? 'bg-orange-500' : s >= 40 ? 'bg-yellow-500' : 'bg-emerald-500';

export default function SmartWarningPage() {
  const [riskUnits, setRiskUnits] = useState(riskUnitsInit as any);
  const [rules, setRules] = useState(predictionRulesInit as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const toggle = (id: number) => setRules((p: any) => p.map((r: any) => r.id === id ? { ...r, enabled: !r.enabled } : r));

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await legacyApi.smartAlertList() as any;
      const data = res.data ?? res;
      if (data && typeof data === 'object') {
        if (Array.isArray(data.riskUnits)) setRiskUnits(data.riskUnits as any);
        if (Array.isArray(data.predictionRules)) setRules(data.predictionRules as any);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  return (
    <DataContainer loading={loading} error={error} data={riskUnits} onRetry={loadData} emptyText="暂无数据">
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-1">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">智能预警分析</h2>
            <p className="text-[10px] text-slate-500">AI智能预警与风险评估</p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">AI驱动</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '高风险单位', value: 1, icon: Flame, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: '中风险单位', value: 2, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          { label: '预警准确率', value: '90%', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: '活跃预警规则', value: rules.filter((r: any) => r.enabled).length, icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((s: any, i: number) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-slate-700/50 bg-slate-800/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}><Icon className={`w-5 h-5 ${s.color}`} /></div>
                <div><div className="text-xl font-bold text-slate-100">{s.value}</div><div className="text-[10px] text-slate-500">{s.label}</div></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Risk Ranking */}
      <Card className="border-slate-700/50 bg-slate-800/50">
        <CardContent className="p-0">
          <div className="p-2 border-b border-slate-700/50 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-red-400" />
            <span className="text-xs font-medium text-slate-200">单位风险排名</span>
          </div>
          <div className="p-2 space-y-2">
            {riskUnits.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded border border-slate-700/30 bg-slate-800/30">
                <div className={`text-lg font-bold w-8 text-center ${scoreColor(u.riskScore)}`}>{u.riskScore}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-200 font-medium">{u.name}</span>
                    <Badge variant="outline" className={`text-[8px] px-1 ${u.riskLevel === '高风险' ? 'bg-red-500/20 text-red-400 border-red-500/30' : u.riskLevel === '中风险' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>{u.riskLevel}</Badge>
                  </div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {u.factors.map((f: any, i: number) => <span key={i} className="text-[8px] px-1 py-0.5 rounded bg-slate-700/50 text-slate-400">{f}</span>)}
                  </div>
                </div>
                <div className="w-20">
                  <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBg(u.riskScore)}`} style={{ width: `${u.riskScore}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prediction Rules */}
      <Card className="border-slate-700/50 bg-slate-800/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-slate-200">智能预警规则</span>
          </div>
          <div className="space-y-2">
            {rules.map((r: any) => (
              <div key={r.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${r.enabled ? 'border-slate-700/40 bg-slate-800/30' : 'border-slate-700/20 bg-slate-800/20 opacity-50'}`}>
                <div className="flex items-center gap-2">
                  <Brain className={`w-4 h-4 ${r.enabled ? 'text-purple-400' : 'text-slate-600'}`} />
                  <div>
                    <div className="text-[11px] text-slate-200 font-medium">{r.name}</div>
                    <div className="text-[9px] text-slate-500">{r.desc}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-1">准确率{r.accuracy}</Badge>
                  <Switch checked={r.enabled} onCheckedChange={() => toggle(r.id)} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </DataContainer>
  );
}
