import { useState, useEffect } from 'react';
import { inspectionService } from '@/api/services';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardCheck, CheckCircle, XCircle, AlertTriangle,
  FileText, Star
} from 'lucide-react';

const fallbackCheckItems = [
  { id: 1, category: '消防控制室', item: '值班人员持证在岗', standard: '24小时双人持证值班', status: 'pass', unit: '万达广场' },
  { id: 2, category: '消防控制室', item: '控制器自动状态', standard: '火灾报警控制器处于自动状态', status: 'pass', unit: '万达广场' },
  { id: 3, category: '消防控制室', item: '报警记录完整', standard: '报警/故障/处理记录完整', status: 'pass', unit: '万达广场' },
  { id: 4, category: '消防给水', item: '消防水池水位正常', standard: '水位不低于最低有效水位', status: 'pass', unit: '万达广场' },
  { id: 5, category: '消防给水', item: '管网压力正常', standard: '最不利点压力≥0.07MPa', status: 'fail', unit: '万达广场' },
  { id: 6, category: '消防给水', item: '水泵运行正常', standard: '主备泵可正常启停', status: 'pass', unit: '万达广场' },
  { id: 7, category: '电气安全', item: '剩余电流正常', standard: '剩余电流≤300mA', status: 'warning', unit: '万达广场' },
  { id: 8, category: '电气安全', item: '线缆温度正常', standard: '线缆温度≤70°C', status: 'pass', unit: '万达广场' },
  { id: 9, category: '防排烟', item: '排烟风机运行', standard: '风机可正常启停', status: 'pass', unit: '万达广场' },
  { id: 10, category: '防排烟', item: '防火阀状态正常', standard: '防火阀处于正确开闭状态', status: 'pass', unit: '万达广场' },
  { id: 11, category: '疏散设施', item: '疏散通道畅通', standard: '通道无堵塞', status: 'pass', unit: '万达广场' },
  { id: 12, category: '疏散设施', item: '应急照明正常', standard: '应急照明可正常点亮', status: 'fail', unit: '万达广场' },
];

const fallbackCheckRecords = [
  { id: 1, date: '2025-02-01', unit: '万达广场商业中心', checker: '王师傅', items: 24, pass: 22, fail: 2, score: 91.7, result: '合格' },
  { id: 2, date: '2025-01-28', unit: '兰州大学第二医院', checker: '李师傅', items: 36, pass: 35, fail: 1, score: 97.2, result: '合格' },
  { id: 3, date: '2025-01-25', unit: '兰州石化', checker: '张师傅', items: 42, pass: 38, fail: 4, score: 90.5, result: '合格' },
  { id: 4, date: '2025-01-20', unit: '西北师范大学', checker: '赵师傅', items: 30, pass: 28, fail: 2, score: 93.3, result: '合格' },
];

export default function InspectionPage() {
  const [tab, setTab] = useState<'standard' | 'record'>('standard');
  const [checkItems, setCheckItems] = useState(fallbackCheckItems as any);
  const [checkRecords, setCheckRecords] = useState(fallbackCheckRecords as any);

  useEffect(() => {
    inspectionService.list().then((res: any) => {
      if (res.data) {
        if (Array.isArray(res.data.checkItems)) setCheckItems(res.data.checkItems as any);
        if (Array.isArray(res.data.checkRecords)) setCheckRecords(res.data.checkRecords as any);
      }
    }).catch(() => {});
  }, []);

  const passCount = checkItems.filter((i: any) => i.status === 'pass').length;
  const failCount = checkItems.filter((i: any) => i.status === 'fail').length;
  const warnCount = checkItems.filter((i: any) => i.status === 'warning').length;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <ClipboardCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">消防检查管理</h2>
            <p className="text-[10px] text-slate-500">日常巡检与隐患管理</p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{checkItems.length}项标准</Badge>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={tab === 'standard' ? 'default' : 'outline'} onClick={() => setTab('standard')} className="h-7 text-[10px]">
            <ClipboardCheck className="w-3 h-3 mr-0.5" />检查标准
          </Button>
          <Button size="sm" variant={tab === 'record' ? 'default' : 'outline'} onClick={() => setTab('record')} className="h-7 text-[10px]">
            <FileText className="w-3 h-3 mr-0.5" />检查记录
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 flex-shrink-0">
        {[
          { label: '合格项', value: passCount, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: '不合格', value: failCount, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: '预警项', value: warnCount, icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: '合格率', value: `${Math.round((passCount / checkItems.length) * 100)}%`, icon: Star, color: 'text-blue-400', bg: 'bg-blue-500/10' },
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

      {tab === 'standard' ? (
        <Card className="flex-1 border-slate-700/50 bg-slate-800/50 min-h-0 flex flex-col">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
              <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-500 px-2">
                <span className="col-span-2">检查类别</span>
                <span className="col-span-3">检查项</span>
                <span className="col-span-4">检查标准</span>
                <span className="col-span-2">状态</span>
                <span className="col-span-1">单位</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {checkItems.map((item: any) => (
                <div key={item.id} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center">
                  <span className="col-span-2 text-[10px] text-slate-300">{item.category}</span>
                  <span className="col-span-3 text-[10px] text-slate-200">{item.item}</span>
                  <span className="col-span-4 text-[9px] text-slate-400">{item.standard}</span>
                  <span className="col-span-2">
                    <Badge variant="outline" className={`text-[8px] px-1 ${item.status === 'pass' ? 'bg-emerald-500/20 text-emerald-400' : item.status === 'fail' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {item.status === 'pass' ? '合格' : item.status === 'fail' ? '不合格' : '预警'}
                    </Badge>
                  </span>
                  <span className="col-span-1 text-[8px] text-slate-500">{item.unit}</span>
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
                <span className="col-span-2">检查日期</span>
                <span className="col-span-3">单位</span>
                <span className="col-span-1">检查人</span>
                <span className="col-span-1">总项</span>
                <span className="col-span-1">合格</span>
                <span className="col-span-1">不合格</span>
                <span className="col-span-1">得分</span>
                <span className="col-span-1">结果</span>
                <span className="col-span-1">操作</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {checkRecords.map((r: any) => (
                <div key={r.id} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center">
                  <span className="col-span-2 text-[10px] text-slate-400">{r.date}</span>
                  <span className="col-span-3 text-[10px] text-slate-200">{r.unit}</span>
                  <span className="col-span-1 text-[10px] text-slate-400">{r.checker}</span>
                  <span className="col-span-1 text-[10px] text-slate-400 text-center">{r.items}</span>
                  <span className="col-span-1 text-[10px] text-emerald-400 text-center">{r.pass}</span>
                  <span className="col-span-1 text-[10px] text-red-400 text-center">{r.fail}</span>
                  <span className="col-span-1 text-[10px] text-blue-400 font-bold">{r.score}</span>
                  <span className="col-span-1"><Badge variant="outline" className="text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-1">{r.result}</Badge></span>
                  <span className="col-span-1"><Button size="sm" variant="ghost" className="h-6 px-1 text-[8px] text-blue-400">详情</Button></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
