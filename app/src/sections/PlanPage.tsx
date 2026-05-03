import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Preplan } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Activity, BookOpen, Clock, Users, Phone } from 'lucide-react';

export default function PlanPage() {
  const [preplans, setPreplans] = useState<Preplan[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [p, r]: any = await Promise.all([
        api.getPreplans({ size: 50 }),
        api.getPlanRecords(),
      ]);
      setPreplans(p.list);
      setRecords(Array.isArray(r) ? r : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const levelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-red-500/20 text-red-400';
      case 2: return 'bg-orange-500/20 text-orange-400';
      case 3: return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">应急预案</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{preplans.length}</div>
              <div className="text-xs text-slate-500">预案总数</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{preplans.filter(p => p.status === 1).length}</div>
              <div className="text-xs text-slate-500">生效中</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{records.length}</div>
              <div className="text-xs text-slate-500">演练记录</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">0</div>
              <div className="text-xs text-slate-500">本月演练</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="library" className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="library" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <BookOpen className="w-4 h-4 mr-1" /> 预案库
          </TabsTrigger>
          <TabsTrigger value="drill" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <Activity className="w-4 h-4 mr-1" /> 演练记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {preplans.map(plan => (
              <Card key={plan.id} className="border-slate-700/50 bg-slate-800/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-medium text-slate-200">{plan.preplan_name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{plan.preplan_code}</p>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline" className={levelColor(plan.level)}>
                        {plan.level === 1 ? '一级' : plan.level === 2 ? '二级' : '三级'}
                      </Badge>
                      <Badge variant="outline" className={plan.status === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}>
                        {plan.status === 1 ? '生效' : '过期'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs mb-3">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Users className="w-3 h-3" />
                      <span>适用单位: {plan.org_name || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <FileText className="w-3 h-3" />
                      <span>适用场景: {plan.applicable_scene || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3 h-3" />
                      <span>版本: {plan.version || 'V1.0'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-slate-600 text-slate-300 hover:bg-slate-700">
                      查看详情
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-blue-600 text-blue-400 hover:bg-blue-500/10">
                      启动预案
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {preplans.length === 0 && (
              <div className="col-span-2 text-center py-12 text-slate-500">暂无预案数据</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="drill">
          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3 text-slate-400 font-medium">预案名称</th>
                      <th className="text-left p-3 text-slate-400 font-medium">触发类型</th>
                      <th className="text-left p-3 text-slate-400 font-medium">开始时间</th>
                      <th className="text-left p-3 text-slate-400 font-medium">结束时间</th>
                      <th className="text-left p-3 text-slate-400 font-medium">时长</th>
                      <th className="text-left p-3 text-slate-400 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(rec => (
                      <tr key={rec.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="p-3 text-slate-200">{rec.preplan_name}</td>
                        <td className="p-3 text-slate-400">{rec.trigger_type === 1 ? '真实事件' : '模拟演练'}</td>
                        <td className="p-3 text-slate-400 text-xs">{rec.start_time}</td>
                        <td className="p-3 text-slate-400 text-xs">{rec.end_time || '-'}</td>
                        <td className="p-3 text-slate-400">{rec.duration || '-'}分钟</td>
                        <td className="p-3">
                          <Badge variant="outline" className={rec.status === 2 ? 'bg-emerald-500/20 text-emerald-400' : rec.status === 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}>
                            {rec.status === 2 ? '已完成' : rec.status === 1 ? '进行中' : '已终止'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">暂无演练记录</td></tr>
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
