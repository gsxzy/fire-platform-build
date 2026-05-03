import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieIcon, Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalysisPage() {
  const [stats, setStats] = useState<any>(null);

  const loadData = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const monthlyData = [
    { month: '1月', fire: 12, fault: 35, patrol: 98 },
    { month: '2月', fire: 8, fault: 28, patrol: 95 },
    { month: '3月', fire: 15, fault: 42, patrol: 97 },
    { month: '4月', fire: 10, fault: 30, patrol: 99 },
  ];

  const typeDistribution = stats?.deviceTypes || [
    { name: '火灾报警', count: 1000 },
    { name: '消防给水', count: 300 },
    { name: '防排烟', count: 400 },
    { name: '消防联动', count: 500 },
    { name: '视频监控', count: 700 },
    { name: '电气火灾', count: 200 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">数据分析</h2>
      </div>

      <Tabs defaultValue="alarm" className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="alarm" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <TrendingUp className="w-4 h-4 mr-1" /> 报警分析
          </TabsTrigger>
          <TabsTrigger value="trend" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <Activity className="w-4 h-4 mr-1" /> 趋势分析
          </TabsTrigger>
          <TabsTrigger value="report" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <BarChart3 className="w-4 h-4 mr-1" /> 统计报表
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alarm" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-red-400" />
                  报警趋势 (近7天)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats?.alarmTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #1e293b', borderRadius: 8 }} />
                    <Bar dataKey="fire" fill="#ef4444" radius={[4, 4, 0, 0]} name="火警" />
                    <Bar dataKey="fault" fill="#f59e0b" radius={[4, 4, 0, 0]} name="故障" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-cyan-400" />
                  单位报警统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats?.unitAlarmStats || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={80} />
                    <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #1e293b', borderRadius: 8 }} />
                    <Bar dataKey="fire" fill="#ef4444" radius={[0, 4, 4, 0]} name="火警" />
                    <Bar dataKey="fault" fill="#f59e0b" radius={[0, 4, 4, 0]} name="故障" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">报警时段分布</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={[
                  { hour: '00:00', count: 2 }, { hour: '02:00', count: 1 }, { hour: '04:00', count: 0 },
                  { hour: '06:00', count: 1 }, { hour: '08:00', count: 3 }, { hour: '10:00', count: 5 },
                  { hour: '12:00', count: 4 }, { hour: '14:00', count: 6 }, { hour: '16:00', count: 4 },
                  { hour: '18:00', count: 3 }, { hour: '20:00', count: 2 }, { hour: '22:00', count: 1 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #1e293b', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="count" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="报警数" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend" className="space-y-4">
          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-300">月度报警趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #1e293b', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="fire" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="火警" />
                  <Line type="monotone" dataKey="fault" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="故障" />
                  <Line type="monotone" dataKey="patrol" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="巡检完成率" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">设备类型分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={typeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="count" nameKey="name">
                      {typeDistribution.map((_dt: any, index: number) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #1e293b', borderRadius: 8 }} />
                    <Legend fontSize={11} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">设备在线率</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={typeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #1e293b', borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
