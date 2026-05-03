import { useState, useEffect } from 'react';
import { deviceService } from '@/api/services';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Zap, AlertTriangle, Activity
} from 'lucide-react';

const fallbackElecDevices = [
  { name: '电气火灾监控器#1', type: '监控器', location: '配电室A', leakage: 156, tempA: 42, tempB: 38, status: '正常', unit: '万达广场' },
  { name: '剩余电流互感器#1', type: '互感器', location: '配电室A-1回路', leakage: 298, tempA: 0, tempB: 0, status: '预警', unit: '万达广场' },
  { name: '剩余电流互感器#2', type: '互感器', location: '配电室A-2回路', leakage: 89, tempA: 0, tempB: 0, status: '正常', unit: '万达广场' },
  { name: '电气火灾监控器#2', type: '监控器', location: '配电室B', leakage: 203, tempA: 55, tempB: 48, status: '正常', unit: '万达广场' },
  { name: '温度传感器#1', type: '温度传感器', location: '配电室A母排', leakage: 0, tempA: 62, tempB: 0, status: '正常', unit: '万达广场' },
  { name: '温度传感器#2', type: '温度传感器', location: '配电室B母排', leakage: 0, tempA: 68, tempB: 0, status: '预警', unit: '万达广场' },
  { name: '剩余电流互感器#3', type: '互感器', location: '配电室B-1回路', leakage: 412, tempA: 0, tempB: 0, status: '报警', unit: '万达广场' },
  { name: '电气火灾监控器#3', type: '监控器', location: '柴油发电机房', leakage: 45, tempA: 35, tempB: 32, status: '正常', unit: '万达广场' },
];

export default function ElecFirePage() {
  const [elecDevices, setElecDevices] = useState(fallbackElecDevices as any);

  useEffect(() => {
    deviceService.list().then((res: any) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      if (list.length > 0) setElecDevices(list);
    }).catch(() => {});
  }, []);

  const normalCount = elecDevices.filter((d: any) => d.status === '正常').length;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-1">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Zap className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">电气火灾监控系统</h2>
            <p className="text-[10px] text-slate-500">电气火灾实时监测</p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{elecDevices.length}台设备</Badge>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">正常{normalCount}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 flex-shrink-0">
        {[
          { label: '平均剩余电流', value: '187mA', icon: Zap, max: '500mA', pct: 37 },
          { label: '最高线缆温度', value: '68°C', icon: AlertTriangle, max: '80°C', pct: 85 },
          { label: '预警设备', value: '2台', icon: Activity, color: 'text-yellow-400' },
          { label: '报警设备', value: '1台', icon: AlertTriangle, color: 'text-red-400' },
        ].map((s: any, i: number) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-slate-700/50 bg-slate-800/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${s.color || 'text-yellow-400'}`} />
                  <span className="text-[10px] text-slate-500">{s.label}</span>
                </div>
                <div className="text-lg font-bold text-slate-100">{s.value}</div>
                {s.max && <div className="text-[8px] text-slate-600">阈值: {s.max}</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="flex-1 border-slate-700/50 bg-slate-800/50 min-h-0 flex flex-col">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
            <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-500 px-2">
              <span className="col-span-2">设备名称</span>
              <span className="col-span-1">类型</span>
              <span className="col-span-2">位置</span>
              <span className="col-span-2">剩余电流</span>
              <span className="col-span-2">线缆温度</span>
              <span className="col-span-1">单位</span>
              <span className="col-span-2">状态</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
            {elecDevices.map((d: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center">
                <span className="col-span-2 text-[10px] text-slate-200">{d.name}</span>
                <span className="col-span-1 text-[9px] text-slate-400">{d.type}</span>
                <span className="col-span-2 text-[9px] text-slate-400">{d.location}</span>
                <span className="col-span-2 text-[10px] font-mono">
                  {d.leakage > 0 ? (
                    <span className={d.leakage > 300 ? 'text-red-400' : d.leakage > 200 ? 'text-yellow-400' : 'text-emerald-400'}>{d.leakage}mA</span>
                  ) : '-'}
                </span>
                <span className="col-span-2 text-[10px] font-mono">
                  {d.tempA > 0 ? (
                    <span className={d.tempA > 70 ? 'text-red-400' : d.tempA > 60 ? 'text-yellow-400' : 'text-emerald-400'}>{d.tempA}°C</span>
                  ) : '-'}
                </span>
                <span className="col-span-1 text-[8px] text-slate-500">{d.unit}</span>
                <span className="col-span-2">
                  <Badge variant="outline" className={`text-[8px] px-1 ${d.status === '正常' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : d.status === '预警' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                    {d.status}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
