import { useState, useEffect, useMemo } from 'react';
import { workOrderService } from '@/api/services';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wrench, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import StatCard from '@/components/StatCard';
import type { WorkOrder } from '@/types/db';

interface StatsData {
  name: string;
  value: number;
  color: string;
}

export default function MaintenanceStatsPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState<StatsData[]>([]);
  const [typeData, setTypeData] = useState<StatsData[]>([]);

  useEffect(() => {
    setLoading(true);
    workOrderService.list({ page: 1, pageSize: 1000 })
      .then((res) => {
        if (res.code === 200 && res.data?.list) {
          const list = res.data.list as WorkOrder[];
          setOrders(list);

          // Compute distributions
          const statusCounts: Record<string, number> = {};
          const typeCounts: Record<string, number> = {};
          list.forEach((o) => {
            statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
            typeCounts[o.type] = (typeCounts[o.type] || 0) + 1;
          });

          const statusColors: Record<string, string> = {
            completed: '#10b981',
            processing: '#3b82f6',
            pending: '#f59e0b',
            cancelled: '#64748b',
          };
          const statusNames: Record<string, string> = {
            completed: '已完成',
            processing: '进行中',
            pending: '待处理',
            cancelled: '已取消',
          };

          const typeColors: Record<string, string> = {
            inspection: '#3b82f6',
            repair: '#ef4444',
            maintenance: '#10b981',
            replacement: '#a855f7',
          };
          const typeNames: Record<string, string> = {
            inspection: '定期巡检',
            repair: '故障维修',
            maintenance: '保养清洁',
            replacement: '部件更换',
          };

          const sData = Object.entries(statusCounts).map(([k, v]) => ({
            name: statusNames[k] || k,
            value: v,
            color: statusColors[k] || '#94a3b8',
          }));
          if (sData.length > 0) setStatusData(sData);

          const tData = Object.entries(typeCounts).map(([k, v]) => ({
            name: typeNames[k] || k,
            value: v,
            color: typeColors[k] || '#94a3b8',
          }));
          if (tData.length > 0) setTypeData(tData);
        }
      })
      .catch(() => {
        // silently ignore stats load errors
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'pending').length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    const overdue = orders.filter((o) => {
      if (o.status === 'completed' || o.status === 'cancelled') return false;
      if (!o.planDate) return false;
      const plan = new Date(o.planDate);
      return !isNaN(plan.getTime()) && plan < new Date();
    }).length;
    return { pending, completed, overdue, total: orders.length };
  }, [orders]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Wrench className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">维保统计</h2>
            <p className="text-[10px] text-slate-500">设备维保数据分析</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="待处理工单"
          value={stats.pending}
          unit="个"
          Icon={Clock}
          color="yellow"
          layout="horizontal"
        />
        <StatCard
          label="已完成工单"
          value={stats.completed}
          unit="个"
          Icon={CheckCircle2}
          color="emerald"
          layout="horizontal"
        />
        <StatCard
          label="超时工单"
          value={stats.overdue}
          unit="个"
          Icon={AlertTriangle}
          color="red"
          layout="horizontal"
        />
        <StatCard
          label="工单总数"
          value={stats.total}
          unit="个"
          Icon={Wrench}
          color="blue"
          layout="horizontal"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="text-xs text-slate-200 mb-3 font-medium">工单状态分布</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-status-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f1f5f9',
                }}
                formatter={(value: number) => [`${value} 个`, '数量']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="text-xs text-slate-200 mb-3 font-medium">工单类型分布</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-type-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f1f5f9',
                }}
                formatter={(value: number) => [`${value} 个`, '数量']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8 text-slate-500 text-sm">
          加载统计数据中…
        </div>
      )}
    </div>
  );
}
