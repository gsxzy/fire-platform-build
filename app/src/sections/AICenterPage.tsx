import { useState, useEffect } from 'react';
import {
  Brain, Flame, TrendingUp, MapPin, AlertTriangle,
  Zap, Clock, Wind,
  Users, CheckCircle, XCircle,
  Sparkles, Route, Lightbulb,
  RefreshCw, Settings,
  Target, Bot
} from 'lucide-react';

/* ═══════════════ Types ═══════════════ */
interface FireRiskAssessment {
  level: 'critical' | 'high' | 'medium' | 'low';
  score: number;
  unit: string;
  location: string;
  factors: RiskFactor[];
  trend: 'rising' | 'stable' | 'falling';
}

interface RiskFactor {
  name: string;
  weight: number;
  value: string;
  status: 'danger' | 'warning' | 'normal';
}

interface SpreadPrediction {
  time: string;
  area: string;
  confidence: number;
  direction: string;
  speed: string;
}

interface EvacuationRoute {
  id: number;
  name: string;
  from: string;
  to: string;
  distance: string;
  time: string;
  capacity: number;
  safety: number;
  blocked: boolean;
  recommended: boolean;
}

interface AIDecision {
  id: number;
  time: string;
  type: string;
  trigger: string;
  decision: string;
  actions: string[];
  confidence: number;
  autoExecuted: boolean;
  status: 'executed' | 'pending' | 'review';
}

interface RealTimeMetric {
  label: string;
  value: string;
  change: string;
  icon: typeof Flame;
  color: string;
}

/* ═══════════════ Mock Data ═══════════════ */
const riskAssessment: FireRiskAssessment = {
  level: 'high', score: 78, unit: '万达广场商业中心', location: '1F大厅',
  trend: 'rising',
  factors: [
    { name: '烟雾浓度', weight: 0.25, value: '380 ppm', status: 'danger' },
    { name: '温度上升速率', weight: 0.20, value: '12°C/min', status: 'danger' },
    { name: 'CO浓度', weight: 0.20, value: '85 ppm', status: 'warning' },
    { name: '探测器密度', weight: 0.15, value: '3个/100m²', status: 'normal' },
    { name: '通风条件', weight: 0.10, value: '中等', status: 'warning' },
    { name: '可燃物载荷', weight: 0.10, value: '高', status: 'danger' },
  ]
};

const spreadPredictions: SpreadPrediction[] = [
  { time: 'T+2min', area: '1F大厅东侧', confidence: 95, direction: '向东/向上', speed: '3-5 m/min' },
  { time: 'T+5min', area: '1F大厅全区域', confidence: 88, direction: '全面扩散', speed: '5-8 m/min' },
  { time: 'T+8min', area: '2F走廊区域', confidence: 72, direction: '通过楼梯间向上', speed: '8-12 m/min' },
  { time: 'T+15min', area: 'B1停车场', confidence: 45, direction: '通过电梯井向下', speed: '潜在风险' },
];

const evacuationRoutes: EvacuationRoute[] = [
  { id: 1, name: '主疏散通道A', from: '1F大厅', to: '东广场集合点', distance: '85m', time: '2分30秒', capacity: 500, safety: 92, blocked: false, recommended: true },
  { id: 2, name: '备用疏散通道B', from: '1F大厅', to: '南广场集合点', distance: '120m', time: '3分15秒', capacity: 300, safety: 85, blocked: false, recommended: false },
  { id: 3, name: '西侧安全楼梯', from: '1F西侧', to: '西广场集合点', distance: '150m', time: '4分00秒', capacity: 200, safety: 78, blocked: true, recommended: false },
  { id: 4, name: '北侧消防通道', from: '1F北侧', to: '北广场集合点', distance: '95m', time: '2分50秒', capacity: 400, safety: 88, blocked: false, recommended: false },
];

const aiDecisions: AIDecision[] = [
  { id: 1, time: '2026-04-19 09:15:22', type: '火情等级评估', trigger: '1F大厅烟感报警', decision: '评估为二级火警（高风险），建议立即启动应急预案', actions: ['启动排烟风机', '释放门禁', '播放疏散广播', '通知消防控制室'], confidence: 92, autoExecuted: true, status: 'executed' },
  { id: 2, time: '2026-04-19 09:15:25', type: '联动策略推荐', trigger: '火情等级二级', decision: '执行标准联动策略-商场火警预案A', actions: ['门禁释放→电梯迫降→排烟启动→广播播放'], confidence: 95, autoExecuted: true, status: 'executed' },
  { id: 3, time: '2026-04-19 09:15:30', type: '疏散路线优化', trigger: '人员密度分析', decision: '推荐主疏散通道A为最优路线，预计疏散时间2分30秒', actions: ['开启东广场应急照明', '引导人员向东疏散', '关闭西侧通道（维护中）'], confidence: 88, autoExecuted: true, status: 'executed' },
  { id: 4, time: '2026-04-19 09:16:00', type: '蔓延趋势预测', trigger: '环境监测数据分析', decision: '预测火源将在5分钟内蔓延至1F全区域，建议扩大疏散范围', actions: ['启动全楼广播', '扩大疏散区域至2F', '通知119'], confidence: 82, autoExecuted: false, status: 'review' },
];

const realtimeMetrics: RealTimeMetric[] = [
  { label: 'AI处理中', value: '12', change: '队列正常', icon: Brain, color: 'purple' },
  { label: '自动执行', value: '89%', change: '较昨日+3%', icon: Zap, color: 'emerald' },
  { label: '平均响应', value: '1.2s', change: '优于标准', icon: Clock, color: 'blue' },
  { label: '预测准确率', value: '94.5%', change: '持续提升', icon: Target, color: 'cyan' },
];

/* ═══════════════ Helpers ═══════════════ */
const levelConfig = (level: string) => {
  switch (level) {
    case 'critical': return { label: '危急', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', bar: 'bg-red-500' };
    case 'high': return { label: '高风险', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', bar: 'bg-orange-500' };
    case 'medium': return { label: '中风险', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', bar: 'bg-yellow-500' };
    case 'low': return { label: '低风险', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', bar: 'bg-emerald-500' };
    default: return { label: '未知', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', bar: 'bg-slate-500' };
  }
};

const factorStatus = (status: string) => {
  switch (status) {
    case 'danger': return 'text-red-400 bg-red-500/10';
    case 'warning': return 'text-yellow-400 bg-yellow-500/10';
    case 'normal': return 'text-emerald-400 bg-emerald-500/10';
    default: return 'text-slate-400 bg-slate-500/10';
  }
};

const factorGradient = (status: string) => {
  switch (status) {
    case 'danger': return 'bg-gradient-to-r from-red-500 to-red-400';
    case 'warning': return 'bg-gradient-to-r from-yellow-500 to-amber-400';
    case 'normal': return 'bg-gradient-to-r from-emerald-500 to-emerald-400';
    default: return 'bg-slate-500';
  }
};

/* ═══════════════ Main ═══════════════ */
export default function AICenterPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'decisions'>('overview');
  const [selectedRoute, setSelectedRoute] = useState<EvacuationRoute | null>(evacuationRoutes[0]);
  const [thinking, setThinking] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setThinking(false), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="p-4 space-y-4">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">AI决策中心</h2>
            <p className="text-[10px] text-slate-500">智能分析与决策支持</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">AI系统运行中</span>
          </div>
          <button className="text-[10px] px-2.5 py-1.5 bg-slate-800/40 backdrop-blur-sm text-slate-400 rounded-xl border border-slate-700/30 hover:text-slate-200 hover:bg-slate-700/40 transition-all flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />刷新模型
          </button>
        </div>
      </div>

      {/* AI Metrics */}
      <div className="grid grid-cols-4 gap-3">
        {realtimeMetrics.map((m, i) => (
          <div
            key={i}
            className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-4 border border-slate-700/30 transition-all duration-300 hover:bg-slate-700/40 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-slate-400 font-medium">{m.label}</span>
              <div className={`w-7 h-7 rounded-lg bg-${m.color}-500/10 border border-${m.color}-500/20 flex items-center justify-center`}>
                <m.icon className={`w-4 h-4 text-${m.color}-400`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-100">{m.value}</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">{m.change}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/40 backdrop-blur-sm rounded-xl w-fit border border-slate-700/30">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs rounded-lg transition-all flex items-center gap-1.5 font-medium ${
            activeTab === 'overview'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />AI态势感知
        </button>
        <button
          onClick={() => setActiveTab('decisions')}
          className={`px-4 py-2 text-xs rounded-lg transition-all flex items-center gap-1.5 font-medium ${
            activeTab === 'decisions'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />AI决策记录
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-4">
          {/* Fire Risk Assessment */}
          <div className="grid grid-cols-2 gap-4">
            {/* Risk Card */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/30 p-4 transition-all hover:bg-slate-700/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-slate-200 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-red-400" />
                  </div>
                  火情风险评估
                </h3>
                <span className="text-[9px] text-slate-500">AI实时分析</span>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="35" fill="none" stroke="#1e293b" strokeWidth="6" />
                    <circle cx="40" cy="40" r="35" fill="none" stroke="#f97316" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${riskAssessment.score * 2.2} 220`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-orange-400">{riskAssessment.score}</span>
                  </div>
                </div>
                <div>
                  <div className={`text-sm font-bold ${levelConfig(riskAssessment.level).color}`}>{levelConfig(riskAssessment.level).label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{riskAssessment.unit}</div>
                  <div className="text-[10px] text-slate-500">{riskAssessment.location}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className={`w-3 h-3 ${riskAssessment.trend === 'rising' ? 'text-red-400' : 'text-emerald-400'}`} />
                    <span className={`text-[9px] ${riskAssessment.trend === 'rising' ? 'text-red-400' : 'text-emerald-400'}`}>
                      风险{riskAssessment.trend === 'rising' ? '上升' : '下降'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {riskAssessment.factors.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 w-20 truncate">{f.name}</span>
                    <div className="flex-1 h-1.5 bg-slate-700/30 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${factorGradient(f.status)}`} style={{ width: `${f.weight * 400}%` }} />
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${factorStatus(f.status)}`}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Spread Prediction */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/30 p-4 transition-all hover:bg-slate-700/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-slate-200 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-orange-400" />
                  </div>
                  蔓延趋势预测
                </h3>
                <span className="text-[9px] text-slate-500">AI模型预测</span>
              </div>
              <div className="space-y-2">
                {spreadPredictions.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/30 border border-slate-700/20 backdrop-blur-sm transition-all hover:bg-slate-700/20 hover:scale-[1.01]"
                  >
                    <div className="w-12 text-center flex-shrink-0">
                      <div className="text-[10px] text-slate-500 font-medium">{p.time}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-slate-200 font-medium">{p.area}</div>
                      <div className="text-[9px] text-slate-500 flex items-center gap-1">
                        <Wind className="w-2.5 h-2.5" />{p.direction}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] text-slate-300">{p.speed}</div>
                      <div className="text-[9px] text-blue-400 font-medium">置信度{p.confidence}%</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2.5 bg-orange-500/5 border border-orange-500/10 rounded-xl backdrop-blur-sm">
                <div className="text-[10px] text-orange-400 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3 h-3" />AI建议: 建议立即扩大疏散范围至2F，通知119
                </div>
              </div>
            </div>
          </div>

          {/* Evacuation Routes + AI Recommendations */}
          <div className="grid grid-cols-2 gap-4">
            {/* Evacuation Routes */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/30 p-4 transition-all hover:bg-slate-700/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-slate-200 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Route className="w-4 h-4 text-blue-400" />
                  </div>
                  最优疏散路线
                </h3>
                <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20 font-medium">AI实时计算</span>
              </div>
              <div className="space-y-2 mb-3">
                {evacuationRoutes.map(route => (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRoute(route)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${
                      selectedRoute?.id === route.id
                        ? 'border-blue-500/40 bg-blue-500/10 shadow-sm shadow-blue-500/5'
                        : route.recommended
                          ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                          : route.blocked
                            ? 'border-red-500/20 bg-red-500/5 opacity-60 hover:opacity-80'
                            : 'border-slate-700/30 bg-slate-800/20 hover:bg-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {route.recommended && <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-medium">AI推荐</span>}
                        {route.blocked && <span className="text-[8px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded font-medium">已封锁</span>}
                        <span className="text-[11px] text-slate-200 font-medium">{route.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">安全指数: <span className="text-blue-400 font-medium">{route.safety}%</span></div>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-slate-500">
                      <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{route.from} → {route.to}</span>
                      <span>{route.distance}</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{route.time}</span>
                      <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />容量{route.capacity}人</span>
                    </div>
                  </div>
                ))}
              </div>
              {selectedRoute && (
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl backdrop-blur-sm">
                  <div className="text-[10px] text-blue-400 font-medium mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />AI分析: {selectedRoute.name}
                  </div>
                  <div className="text-[9px] text-slate-400 space-y-0.5">
                    <div>• 预计疏散时间: {selectedRoute.time}（基于当前人员密度计算）</div>
                    <div>• 通道容量: {selectedRoute.capacity}人（当前负载率约65%）</div>
                    <div>• 安全系数: {selectedRoute.safety}%（{selectedRoute.safety > 90 ? '极高' : selectedRoute.safety > 80 ? '高' : '中'}）</div>
                    <div>• AI建议: {selectedRoute.recommended ? '优先使用该通道疏散' : selectedRoute.blocked ? '该通道不可用，请选择备用通道' : '可作为备用疏散通道'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Thinking Process */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/30 p-4 transition-all hover:bg-slate-700/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-slate-200 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-400" />
                  </div>
                  AI决策推理过程
                </h3>
                {thinking && (
                  <span className="text-[9px] text-purple-400 animate-pulse flex items-center gap-1 font-medium">
                    <Bot className="w-3 h-3" />分析中...
                  </span>
                )}
              </div>

              {thinking ? (
                <div className="space-y-3 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <div className="h-2 bg-slate-700/30 rounded w-3/4 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="h-2 bg-slate-700/30 rounded w-1/2 animate-pulse" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                    <div className="h-2 bg-slate-700/30 rounded w-2/3 animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {[
                    { step: 1, label: '数据采集', desc: '收集8个探测器、3个摄像头、2个温感实时数据', done: true },
                    { step: 2, label: '火情识别', desc: '烟雾浓度380ppm，温度上升12°C/min，判定为二级火警', done: true },
                    { step: 3, label: '蔓延预测', desc: '基于CFD模型预测5分钟内扩散至1F全区域', done: true },
                    { step: 4, label: '路线计算', desc: '对比4条疏散通道，推荐主疏散通道A（安全指数92%）', done: true },
                    { step: 5, label: '联动策略', desc: '生成8步联动执行链，置信度95%', done: true },
                    { step: 6, label: '自动执行', desc: '已自动执行6项联动动作，2项待人工确认', done: true },
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${s.done ? 'bg-emerald-500/20' : 'bg-slate-700/30'}`}>
                        {s.done ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-slate-500" />}
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-200 font-medium">{s.label}</div>
                        <div className="text-[9px] text-slate-500">{s.desc}</div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-3 p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl backdrop-blur-sm">
                    <div className="text-[10px] text-purple-400 font-medium mb-1 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />AI综合决策建议
                    </div>
                    <div className="text-[10px] text-slate-300 leading-relaxed">
                      当前火情处于<b className="text-orange-400">二级高风险</b>状态，AI已完成全部6项分析，自动生成联动策略并执行。
                      建议<b className="text-blue-400">人工复核</b>第4项决策（扩大疏散范围），确认是否通知119。
                      预计疏散时间<b className="text-emerald-400">2分30秒</b>，当前进度正常。
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* AI Decisions Tab */
        <div className="space-y-3">
          {aiDecisions.map(d => (
            <div
              key={d.id}
              className={`bg-slate-800/40 backdrop-blur-sm rounded-xl border transition-all hover:scale-[1.01] hover:bg-slate-700/30 ${d.autoExecuted ? 'border-emerald-500/20' : 'border-slate-700/30'}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${d.autoExecuted ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                      {d.autoExecuted ? <Zap className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-200 font-medium">{d.type}</span>
                        {d.autoExecuted ? <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 font-medium">自动执行</span> : <span className="text-[8px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded border border-yellow-500/20 font-medium">待确认</span>}
                      </div>
                      <div className="text-[9px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{d.time}</span>
                        <span>触发: {d.trigger}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-blue-400 font-medium">置信度 {d.confidence}%</div>
                    <div className={`text-[9px] font-medium ${d.status === 'executed' ? 'text-emerald-400' : d.status === 'pending' ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {d.status === 'executed' ? '已执行' : d.status === 'pending' ? '等待中' : '人工复核'}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900/30 rounded-xl border border-slate-700/20 mb-2 backdrop-blur-sm">
                  <div className="text-[10px] text-slate-400 mb-1">AI决策</div>
                  <div className="text-[11px] text-slate-200">{d.decision}</div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {d.actions.map((a, i) => (
                    <span key={i} className="text-[9px] px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20 flex items-center gap-1 transition-all hover:bg-blue-500/20">
                      <CheckCircle className="w-2.5 h-2.5" />{a}
                    </span>
                  ))}
                </div>

                {d.status === 'review' && (
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1 font-medium">
                      <CheckCircle className="w-3 h-3" />确认执行
                    </button>
                    <button className="flex-1 py-1.5 bg-red-500/10 text-red-400 text-[10px] rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-1 font-medium">
                      <XCircle className="w-3 h-3" />拒绝
                    </button>
                    <button className="flex-1 py-1.5 bg-blue-500/10 text-blue-400 text-[10px] rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center justify-center gap-1 font-medium">
                      <Settings className="w-3 h-3" />修改策略
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
