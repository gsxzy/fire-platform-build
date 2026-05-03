import { useState, useEffect } from 'react';
import { deviceService } from '@/api/services';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Wind, Fan, CheckCircle, Thermometer
} from 'lucide-react';

const fallbackVentDevices = [
  { name: '排烟风机#1', type: '排烟风机', location: '屋顶机房A', speed: 2800, current: 15.2, temp: 45, status: '运行', unit: '万达广场' },
  { name: '排烟风机#2', type: '排烟风机', location: '屋顶机房A', speed: 0, current: 0, temp: 22, status: '停止', unit: '万达广场' },
  { name: '排烟风机#3', type: '排烟风机', location: '屋顶机房B', speed: 2900, current: 16.8, temp: 52, status: '运行', unit: '万达广场' },
  { name: '正压送风机#1', type: '送风机', location: '屋顶机房C', speed: 1450, current: 8.5, temp: 38, status: '运行', unit: '万达广场' },
  { name: '正压送风机#2', type: '送风机', location: '屋顶机房C', speed: 0, current: 0, temp: 20, status: '停止', unit: '万达广场' },
  { name: '排烟防火阀#1', type: '防火阀', location: '1F排烟管道', open: true, fault: false, status: '开启', unit: '万达广场' },
  { name: '排烟防火阀#2', type: '防火阀', location: '2F排烟管道', open: true, fault: false, status: '开启', unit: '万达广场' },
  { name: '排烟口#1', type: '排烟口', location: 'B1车库', open: true, fault: false, status: '开启', unit: '万达广场' },
  { name: '补风机#1', type: '补风机', location: '地下机房', speed: 960, current: 5.2, temp: 35, status: '运行', unit: '万达广场' },
  { name: '补风机#2', type: '补风机', location: '地下机房', speed: 0, current: 0, temp: 18, status: '停止', unit: '万达广场' },
];

export default function VentilationPage() {
  const [ventDevices, setVentDevices] = useState(fallbackVentDevices as any);

  useEffect(() => {
    deviceService.list().then((res: any) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      if (list.length > 0) setVentDevices(list);
    }).catch(() => {});
  }, []);

  const runningCount = ventDevices.filter((d: any) => d.status === '运行' || d.status === '开启').length;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-1">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Wind className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">防排烟监控系统</h2>
            <p className="text-[10px] text-slate-500">防排烟设备实时监控</p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/30">{ventDevices.length}台设备</Badge>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">运行{runningCount}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 flex-shrink-0">
        {[
          { label: '运行风机', value: '4台', icon: Fan, color: 'text-cyan-400' },
          { label: '停止风机', value: '4台', icon: Wind, color: 'text-slate-400' },
          { label: '开启风阀', value: '3个', icon: CheckCircle, color: 'text-emerald-400' },
          { label: '最高温度', value: '52°C', icon: Thermometer, color: 'text-yellow-400' },
        ].map((s: any, i: number) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-slate-700/50 bg-slate-800/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-[10px] text-slate-500">{s.label}</span>
                </div>
                <div className="text-lg font-bold text-slate-100">{s.value}</div>
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
              <span className="col-span-2">转速/状态</span>
              <span className="col-span-1">电流</span>
              <span className="col-span-1">温度</span>
              <span className="col-span-1">单位</span>
              <span className="col-span-2">状态</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
            {ventDevices.map((d: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center">
                <span className="col-span-2 text-[10px] text-slate-200">{d.name}</span>
                <span className="col-span-1 text-[9px] text-slate-400">{d.type}</span>
                <span className="col-span-2 text-[9px] text-slate-400">{d.location}</span>
                <span className="col-span-2 text-[10px] font-mono">
                  {d.speed !== undefined ? (
                    <span className={d.speed > 0 ? 'text-cyan-400' : 'text-slate-500'}>{d.speed > 0 ? `${d.speed}rpm` : '停止'}</span>
                  ) : (
                    <span className={d.open ? 'text-emerald-400' : 'text-slate-500'}>{d.open ? '开启' : '关闭'}</span>
                  )}
                </span>
                <span className="col-span-1 text-[9px] text-slate-400 font-mono">{d.current || '-'}{d.current ? 'A' : ''}</span>
                <span className="col-span-1 text-[9px] font-mono">
                  {d.temp !== undefined ? (
                    <span className={d.temp > 50 ? 'text-yellow-400' : 'text-emerald-400'}>{d.temp}°C</span>
                  ) : '-'}
                </span>
                <span className="col-span-1 text-[8px] text-slate-500">{d.unit}</span>
                <span className="col-span-2">
                  <Badge variant="outline" className={`text-[8px] px-1 ${d.status === '运行' || d.status === '开启' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-slate-700 text-slate-500'}`}>
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
