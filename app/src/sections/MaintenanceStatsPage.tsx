import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wrench } from 'lucide-react';

const fallbackData = [
  { name: '已完成', value: 45, color: '#10b981' },
  { name: '进行中', value: 12, color: '#3b82f6' },
  { name: '待执行', value: 8, color: '#f59e0b' },
  { name: '已取消', value: 3, color: '#64748b' },
];

const fallbackTypeData = [
  { name: '定期巡检', value: 35, color: '#3b82f6' },
  { name: '故障维修', value: 20, color: '#ef4444' },
  { name: '保养清洁', value: 13, color: '#10b981' },
];

export default function MaintenanceStatsPage() {
  const [data, setData] = useState(fallbackData as any);
  const [typeData, setTypeData] = useState(fallbackTypeData as any);

  useEffect(() => {
    legacyApi.maintStats().then((res: any) => {
      if (res.data) {
        if (Array.isArray(res.data.data)) setData(res.data.data as any);
        if (Array.isArray(res.data.typeData)) setTypeData(res.data.typeData as any);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {/* Header — glass */}
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
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="text-xs text-slate-200 mb-3">工单状态分布</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}>
                {data.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="text-xs text-slate-200 mb-3">工单类型分布</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}>
                {typeData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
