import { useState, useEffect } from 'react';
import { useToast } from '@/core/ToastContext';
import { unitService, deviceService } from '@/api/services';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Building2, Cpu, Bell, Activity, Loader2 } from 'lucide-react';
import EmptyState from '@/components/EmptyState';

// const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const fallbackUnitStats = {
  unit: { total: 0, general: 0, keyUnit: 0, nineSmall: 0 },
  device: { total: 0, normal: 0, fault: 0, offline: 0 },
  alarm: { total30d: 0, unresolved: 0 },
};

export default function UnitStatsPage() {
  const { error: showError } = useToast();
  const [overview, setOverview] = useState(fallbackUnitStats);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [unitRes, deviceRes] = await Promise.all([
        unitService.getOverviewStats().catch(() => null),
        deviceService.getStats().catch(() => null),
      ]);

      if (unitRes?.code === 200 && unitRes.data) {
        setOverview(unitRes.data);
      }
      if (deviceRes?.code === 200 && deviceRes.data) {
        setCategoryStats(deviceRes.data.category || []);
      }
    } catch (e) { showError('加载失败', '统计数据加载出错'); console.error(e); }
    setLoading(false);
  };

  const u = overview.unit;
  const d = overview.device;
  const a = overview.alarm;

  const unitTypeData = [
    { name: '一般单位', value: u.general, color: '#3b82f6' },
    { name: '重点单位', value: u.keyUnit, color: '#ef4444' },
    { name: '九小场所', value: u.nineSmall, color: '#10b981' },
  ].filter(x => x.value > 0);

  const topStats = [
    { label: '联网单位', value: `${u.total}家`, icon: Building2, color: 'text-blue-400' },
    { label: '设备总数', value: `${d.total}台`, icon: Cpu, color: 'text-emerald-400' },
    { label: '本月告警', value: `${a.total30d}条`, icon: Bell, color: 'text-red-400' },
    { label: '平均在线率', value: d.total > 0 ? `${Math.round((d.normal / d.total) * 100)}%` : '0%', icon: Activity, color: 'text-cyan-400' },
  ];

  return (
    <div className="space-y-4 h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">单位统计</h2>
            <p className="text-[10px] text-slate-500">联网单位数据统计与消防健康度分析</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-600/30 transition-colors"
        >
          刷新数据
        </button>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-4 gap-3">
        {topStats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${s.color}`} />
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* 图表区 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {/* 单位类型分布 */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="text-xs font-medium text-slate-200 mb-3">单位类型分布</div>
          {loading ? (
            <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
              <span className="text-xs">统计数据加载中…</span>
            </div>
          ) : unitTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={unitTypeData}
                  cx="50%" cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {unitTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <EmptyState
                type="data"
                title="暂无单位类型分布"
                description="请在「单位管理」中补录一般单位、重点单位或九小场所后，本图将自动汇总展示。"
                className="py-4"
              />
            </div>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {unitTypeData.map((d, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <span className="text-[10px] text-slate-400">{d.name} {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 设备分类统计 */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="text-xs font-medium text-slate-200 mb-3">设备分类统计</div>
          {loading ? (
            <div className="h-[250px] flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
              <span className="text-xs">设备统计加载中…</span>
            </div>
          ) : categoryStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryStats.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => {
                    const map: Record<string, string> = { detector: '烟感', button: '手报', pump: '消防泵', fan: '风机', host: '主机', camera: '摄像头', water: '水源', 'elec-monitor': '电气' };
                    return map[v] || v;
                  }}
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }} />
                <Bar dataKey="count" name="总数" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={20} />
                <Bar dataKey="normal" name="正常" fill="#10b981" radius={[3, 3, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center">
              <EmptyState
                type="data"
                title="暂无设备分类统计"
                description="设备接入并上报状态后，将按类型汇总展示。可先检查「设备档案 / 设备接入」是否已有数据。"
                className="py-4"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
