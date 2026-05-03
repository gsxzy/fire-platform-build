import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { PatrolTask, Hazard } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Route, ClipboardList, AlertTriangle, Calendar, CheckCircle
} from 'lucide-react';

export default function PatrolPage() {
  const [tasks, setTasks] = useState<PatrolTask[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [t, h, p]: any = await Promise.all([
        api.getPatrolTasks({ size: 50 }),
        api.getHazards({ size: 50 }),
        api.getPatrolPlans(),
      ]);
      setTasks(t.list);
      setHazards(h.list);
      setPlans(p);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const taskStatusBadge = (status: number) => {
    switch (status) {
      case 0: return 'bg-slate-500/20 text-slate-400';
      case 1: return 'bg-blue-500/20 text-blue-400';
      case 2: return 'bg-emerald-500/20 text-emerald-400';
      case 3: return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const taskStatusName = (status: number) => {
    switch (status) {
      case 0: return '未开始';
      case 1: return '进行中';
      case 2: return '已完成';
      case 3: return '已超时';
      default: return '未知';
    }
  };

  const hazardStatusBadge = (status: number) => {
    switch (status) {
      case 0: return 'bg-red-500/20 text-red-400';
      case 1: return 'bg-yellow-500/20 text-yellow-400';
      case 2: return 'bg-emerald-500/20 text-emerald-400';
      case 3: return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const hazardStatusName = (status: number) => {
    switch (status) {
      case 0: return '待整改';
      case 1: return '整改中';
      case 2: return '已整改';
      case 3: return '已关闭';
      default: return '未知';
    }
  };

  const hazardLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-yellow-500/20 text-yellow-400';
      case 2: return 'bg-orange-500/20 text-orange-400';
      case 3: return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">巡检管理</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{plans.length}</div>
              <div className="text-xs text-slate-500">巡检计划</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{tasks.length}</div>
              <div className="text-xs text-slate-500">巡检任务</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{hazards.filter(h => h.status < 2).length}</div>
              <div className="text-xs text-slate-500">待整改隐患</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{hazards.filter(h => h.status >= 2).length}</div>
              <div className="text-xs text-slate-500">已整改隐患</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="plans" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <Calendar className="w-4 h-4 mr-1" /> 巡检计划
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <Route className="w-4 h-4 mr-1" /> 巡检任务
          </TabsTrigger>
          <TabsTrigger value="hazards" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <AlertTriangle className="w-4 h-4 mr-1" /> 隐患管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3 text-slate-400 font-medium">计划编号</th>
                      <th className="text-left p-3 text-slate-400 font-medium">计划名称</th>
                      <th className="text-left p-3 text-slate-400 font-medium">类型</th>
                      <th className="text-left p-3 text-slate-400 font-medium">巡检内容</th>
                      <th className="text-left p-3 text-slate-400 font-medium">周期</th>
                      <th className="text-left p-3 text-slate-400 font-medium">执行人</th>
                      <th className="text-left p-3 text-slate-400 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map(plan => (
                      <tr key={plan.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="p-3 text-slate-300 font-mono text-xs">{plan.plan_code}</td>
                        <td className="p-3 text-slate-200">{plan.plan_name}</td>
                        <td className="p-3 text-slate-400">{plan.plan_type === 1 ? '日常巡检' : '专项检查'}</td>
                        <td className="p-3 text-slate-400 max-w-xs truncate">{plan.patrol_content}</td>
                        <td className="p-3 text-slate-400">{plan.cycle_type === 1 ? '每日' : plan.cycle_type === 2 ? '每周' : '每月'}</td>
                        <td className="p-3 text-slate-400">{plan.executor_names}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={plan.status === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}>
                            {plan.status === 1 ? '启用' : '停用'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {plans.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-500">暂无巡检计划</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3 text-slate-400 font-medium">任务编号</th>
                      <th className="text-left p-3 text-slate-400 font-medium">任务名称</th>
                      <th className="text-left p-3 text-slate-400 font-medium">执行人</th>
                      <th className="text-left p-3 text-slate-400 font-medium">计划日期</th>
                      <th className="text-left p-3 text-slate-400 font-medium">进度</th>
                      <th className="text-left p-3 text-slate-400 font-medium">异常</th>
                      <th className="text-left p-3 text-slate-400 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="p-3 text-slate-300 font-mono text-xs">{task.task_code}</td>
                        <td className="p-3 text-slate-200">{task.task_name}</td>
                        <td className="p-3 text-slate-400">{task.executor_name}</td>
                        <td className="p-3 text-slate-400">{task.plan_date}</td>
                        <td className="p-3 text-slate-300">{task.completed_count}/{task.total_count}</td>
                        <td className="p-3 text-red-400">{task.abnormal_count}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={taskStatusBadge(task.status)}>
                            {taskStatusName(task.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {tasks.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-500">暂无巡检任务</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hazards">
          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3 text-slate-400 font-medium">隐患编号</th>
                      <th className="text-left p-3 text-slate-400 font-medium">设备</th>
                      <th className="text-left p-3 text-slate-400 font-medium">描述</th>
                      <th className="text-left p-3 text-slate-400 font-medium">位置</th>
                      <th className="text-left p-3 text-slate-400 font-medium">级别</th>
                      <th className="text-left p-3 text-slate-400 font-medium">发现人</th>
                      <th className="text-left p-3 text-slate-400 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hazards.map(h => (
                      <tr key={h.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="p-3 text-slate-300 font-mono text-xs">{h.hazard_code}</td>
                        <td className="p-3 text-slate-200">{h.device_name || '-'}</td>
                        <td className="p-3 text-slate-300 max-w-xs truncate">{h.hazard_desc}</td>
                        <td className="p-3 text-slate-400">{h.hazard_location || '-'}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={hazardLevelColor(h.hazard_level)}>
                            {h.hazard_level === 1 ? '一般' : h.hazard_level === 2 ? '较大' : '重大'}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-400">{h.discover_user}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={hazardStatusBadge(h.status)}>
                            {hazardStatusName(h.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {hazards.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-500">暂无隐患数据</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
