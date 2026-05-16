import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import type { QueryParams } from '@/types/db';
import PageTemplate from '@/sections/PageTemplate';
import DataContainer from '@/components/DataContainer';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const COLUMNS = [
  { key: 'code', label: '报表编号', width: '110px' },
  { key: 'name', label: '报表名称', width: '200px' },
  { key: 'type', label: '报表类型', width: '100px' },
  { key: 'period', label: '统计周期', width: '90px' },
  { key: 'generateDate', label: '生成日期', width: '100px' },
  { key: 'format', label: '格式', width: '60px' },
  { key: 'size', label: '大小', width: '60px' },
  { key: 'status', label: '状态', width: '70px' },
];

const FIELDS = [
  { key: 'code', label: '报表编号', type: 'text' as const, required: true },
  { key: 'name', label: '报表名称', type: 'text' as const, required: true },
  { key: 'type', label: '报表类型', type: 'select' as const, options: ['报警统计', '维保统计', '综合年报', '工单统计', '巡检统计', '隐患统计', '设备统计'] },
  { key: 'period', label: '统计周期', type: 'select' as const, options: ['日度', '月度', '季度', '年度'] },
  { key: 'generateDate', label: '生成日期', type: 'date' as const },
  { key: 'format', label: '格式', type: 'select' as const, options: ['PDF', 'Excel', 'Word'] },
  { key: 'size', label: '大小', type: 'text' as const },
  { key: 'status', label: '状态', type: 'select' as const, options: ['已生成', '生成中', '失败'] },
];

/* ═══════ Chart Data ═══════ */
const monthlyAlarmsInit: any[] = [];

const unitCompareInit: any[] = [];

const typeDistInit: any[] = [];

const workorderTrendInit: any[] = [];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700/50 rounded-lg p-2 shadow-xl">
        <p className="text-[10px] text-slate-300 font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-[9px]" style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

const reportService = {
  list: async (params: QueryParams = {}) => {
    const res = await legacyApi.weeklyReport() as any;
    const data = Array.isArray(res.data) ? res.data : (res.data?.list || []);
    return { code: 200, data: { list: data, total: data.length, page: params?.page || 1, pageSize: params?.pageSize || 10 } } as any;
  }
};

export default function AnalysisReportPage() {
  const [chartTab, setChartTab] = useState('alarm');
  const [monthlyAlarms, setMonthlyAlarms] = useState(monthlyAlarmsInit as any);
  const [unitCompare, setUnitCompare] = useState(unitCompareInit as any);
  const [typeDist, setTypeDist] = useState(typeDistInit as any);
  const [workorderTrend, setWorkorderTrend] = useState(workorderTrendInit as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await legacyApi.weeklyReport() as any;
      const data = res.data ?? res;
      if (data && typeof data === 'object') {
        if (Array.isArray(data.monthlyAlarms)) setMonthlyAlarms(data.monthlyAlarms as any);
        if (Array.isArray(data.unitCompare)) setUnitCompare(data.unitCompare as any);
        if (Array.isArray(data.typeDist)) setTypeDist(data.typeDist as any);
        if (Array.isArray(data.workorderTrend)) setWorkorderTrend(data.workorderTrend as any);
      }
      const maintRes = await legacyApi.maintStats() as any;
      const maintData = maintRes.data ?? maintRes;
      if (maintData && (Array.isArray(maintData) || typeof maintData === 'object')) {
        // maint stats
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const tabs = [
    { key: 'alarm', label: '告警趋势', icon: TrendingUp },
    { key: 'unit', label: '单位对比', icon: BarChart3 },
    { key: 'workorder', label: '工单效率', icon: Calendar },
  ];

  return (
    <DataContainer loading={loading} error={error} data={monthlyAlarms} onRetry={loadData} emptyText="暂无数据">
    <div className="space-y-4">
      <PageTemplate title="统计报表" icon={BarChart3} badge="7份" columns={COLUMNS} service={reportService} fields={FIELDS} addable={false} emptyDescription="固定格式报表由后端生成后在此列出。若为空请确认报表任务已配置或联系管理员开放导出接口。" />

      {/* Charts Section */}
      <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-200">数据可视化分析</span>
          </div>
          <div className="flex items-center gap-2">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setChartTab(t.key)} className={`text-[10px] px-3 py-1.5 rounded flex items-center gap-1 transition-colors ${chartTab === t.key ? 'bg-blue-500 text-white' : 'bg-slate-700/30 text-slate-400'}`}>
                  <Icon className="w-3 h-3" />{t.label}
                </button>
              );
            })}
          </div>
        </div>

        {chartTab === 'alarm' && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <div className="text-[10px] text-slate-400 mb-2">月度告警趋势（2026年1-4月）</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyAlarms}>
                  <defs>
                    <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                    <linearGradient id="c2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                    <linearGradient id="c3" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} iconSize={8} />
                  <Area type="monotone" dataKey="fire" name="火警" stroke="#ef4444" fill="url(#c1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="fault" name="故障" stroke="#f59e0b" fill="url(#c2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="warn" name="预警" stroke="#3b82f6" fill="url(#c3)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 mb-2">告警类型分布</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={typeDist} cx="50%" cy="45%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {typeDist.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {chartTab === 'unit' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-slate-400 mb-2">单位安全能力雷达对比</div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={unitCompare}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: '#64748b' }} angle={30} domain={[0, 100]} />
                  <Radar name="单位A" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="单位B" dataKey="B" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} iconSize={8} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <div className="text-[10px] text-slate-400 mb-2">单位关键指标</div>
              {[].map((u: any, i: number) => (
                <div key={i} className="p-3 bg-slate-900/30 rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-300">{u.label}</span>
                    <span className="text-[10px] font-bold" style={{ color: u.color }}>{u.score}分</span>
                  </div>
                  <div className="h-1.5 bg-slate-700/30 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${u.score}%`, backgroundColor: u.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {chartTab === 'workorder' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-slate-400 mb-2">工单处理趋势</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={workorderTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} iconSize={8} />
                  <Bar dataKey="total" name="工单总数" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={24} />
                  <Bar dataKey="completed" name="已完成" fill="#10b981" radius={[3, 3, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <div className="text-[10px] text-slate-400 mb-2">关键效率指标</div>
              {[
                { label: '工单完成率', value: '92.1%', target: '95%', color: '#10b981' },
                { label: '平均响应时间', value: '3.2min', target: '<5min', color: '#3b82f6' },
                { label: '维保及时率', value: '87.5%', target: '90%', color: '#f59e0b' },
                { label: '巡检覆盖率', value: '98.2%', target: '100%', color: '#10b981' },
              ].map((k: any, i: number) => (
                <div key={i} className="p-3 bg-slate-900/30 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-300">{k.label}</div>
                    <div className="text-[8px] text-slate-500">目标: {k.target}</div>
                  </div>
                  <div className="text-sm font-bold" style={{ color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </DataContainer>
  );
}
