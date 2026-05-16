import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataContainer from '@/components/DataContainer';
import {
  GraduationCap, Calendar, Users, Award,
  Clock
} from 'lucide-react';

const trainingPlansInit: any[] = [];

const certRecordsInit: any[] = [];

export default function TrainingPage() {
  const [tab, setTab] = useState<'plan' | 'cert'>('plan');
  const [trainingPlans, setTrainingPlans] = useState(trainingPlansInit as any);
  const [certRecords, setCertRecords] = useState(certRecordsInit as any);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [courseRes, examRes] = await Promise.all([
        legacyApi.courseList() as any,
        legacyApi.examList() as any,
      ]);
      const courseData = courseRes.data ?? courseRes;
      if (courseData && (Array.isArray(courseData) || typeof courseData === 'object')) {
        const list = Array.isArray(courseData) ? courseData : (courseData.list || []);
        if (list.length) setTrainingPlans(list as any);
      }
      const examData = examRes.data ?? examRes;
      if (examData && (Array.isArray(examData) || typeof examData === 'object')) {
        const list = Array.isArray(examData) ? examData : (examData.list || []);
        if (list.length) setCertRecords(list as any);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  return (
    <DataContainer loading={loading} error={error} data={trainingPlans} onRetry={loadData} emptyText="暂无数据">
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <GraduationCap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">培训考核管理</h2>
            <p className="text-[10px] text-slate-500">消防培训与考核记录</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={tab === 'plan' ? 'default' : 'outline'} onClick={() => setTab('plan')} className="h-7 text-[10px]">
            <Calendar className="w-3 h-3 mr-0.5" />培训计划
          </Button>
          <Button size="sm" variant={tab === 'cert' ? 'default' : 'outline'} onClick={() => setTab('cert')} className="h-7 text-[10px]">
            <Award className="w-3 h-3 mr-0.5" />证书管理
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 flex-shrink-0">
        {[
          { label: '培训计划', value: trainingPlans.length, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: '持证人员', value: certRecords.length, icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: '即将到期', value: certRecords.filter((c: any) => c.status === '即将到期').length, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: '本月培训', value: trainingPlans.filter((t: any) => t.status !== '已完成').length, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((s: any, i: number) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-slate-700/50 bg-slate-800/50">
              <CardContent className="p-2 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}><Icon className={`w-4 h-4 ${s.color}`} /></div>
                <div><div className="text-lg font-bold text-slate-100">{s.value}</div><div className="text-[9px] text-slate-500">{s.label}</div></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tab === 'plan' ? (
        <Card className="flex-1 border-slate-700/50 bg-slate-800/50 min-h-0 flex flex-col">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
              <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-500 px-2">
                <span className="col-span-3">培训名称</span>
                <span className="col-span-1">类型</span>
                <span className="col-span-2">时间/地点</span>
                <span className="col-span-1">讲师</span>
                <span className="col-span-1">人数</span>
                <span className="col-span-1">状态</span>
                <span className="col-span-1">操作</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {trainingPlans.map((p: any) => (
                <div key={p.id} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center">
                  <span className="col-span-3 text-[10px] text-slate-200 font-medium">{p.name}</span>
                  <span className="col-span-1"><Badge variant="outline" className="text-[8px] bg-blue-500/20 text-blue-400 border-blue-500/30 px-1">{p.type}</Badge></span>
                  <div className="col-span-2"><span className="text-[9px] text-slate-400 block">{p.time}</span><span className="text-[8px] text-slate-500">{p.location}</span></div>
                  <span className="col-span-1 text-[10px] text-slate-400">{p.instructor}</span>
                  <span className="col-span-1 text-[10px] text-slate-400">{p.participants}人</span>
                  <span className="col-span-1"><Badge variant="outline" className={`text-[8px] px-1 ${p.status === '已完成' ? 'bg-emerald-500/20 text-emerald-400' : p.status === '即将开始' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>{p.status}</Badge></span>
                  <span className="col-span-1"><Button size="sm" variant="ghost" className="h-6 px-1 text-[8px] text-blue-400">查看</Button></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 border-slate-700/50 bg-slate-800/50 min-h-0 flex flex-col">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
              <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-500 px-2">
                <span className="col-span-1">姓名</span>
                <span className="col-span-2">证书号</span>
                <span className="col-span-1">等级</span>
                <span className="col-span-2">发证日期</span>
                <span className="col-span-2">到期日期</span>
                <span className="col-span-1">状态</span>
                <span className="col-span-1">单位</span>
                <span className="col-span-1">操作</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {certRecords.map((c: any) => (
                <div key={c.id} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center">
                  <span className="col-span-1 text-[10px] text-slate-200">{c.name}</span>
                  <span className="col-span-2 text-[9px] text-slate-400 font-mono">{c.certNo}</span>
                  <span className="col-span-1"><Badge variant="outline" className="text-[8px] px-1 bg-blue-500/20 text-blue-400 border-blue-500/30">{c.level}</Badge></span>
                  <span className="col-span-2 text-[9px] text-slate-400">{c.issueDate}</span>
                  <span className="col-span-2 text-[9px] text-slate-400">{c.expiryDate}</span>
                  <span className="col-span-1"><Badge variant="outline" className={`text-[8px] px-1 ${c.status === '有效' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{c.status}</Badge></span>
                  <span className="col-span-1 text-[9px] text-slate-400">{c.unit}</span>
                  <span className="col-span-1"><Button size="sm" variant="ghost" className="h-6 px-1 text-[8px] text-blue-400">详情</Button></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </DataContainer>
  );
}
