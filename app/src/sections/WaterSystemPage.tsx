import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Droplets, Gauge, CheckCircle, Activity
} from 'lucide-react';

const waterDevices = [
  { name: '消防水池#1', type: '水池', location: '地下泵房', level: 4.2, capacity: 500, status: '正常', unit: '万达广场' },
  { name: '消防水池#2', type: '水池', location: '地下泵房', level: 3.8, capacity: 500, status: '正常', unit: '万达广场' },
  { name: '屋顶水箱#1', type: '水箱', location: '屋顶', level: 12.5, capacity: 18, status: '正常', unit: '万达广场' },
  { name: '消防水泵#1', type: '水泵', location: '泵房', pressure: 0.85, flow: 30, status: '正常', unit: '万达广场' },
  { name: '消防水泵#2', type: '水泵', location: '泵房', pressure: 0.82, flow: 30, status: '正常', unit: '万达广场' },
  { name: '喷淋泵#1', type: '水泵', location: '泵房', pressure: 1.2, flow: 25, status: '正常', unit: '万达广场' },
  { name: '喷淋泵#2', type: '水泵', location: '泵房', pressure: 0, flow: 0, status: '备用', unit: '万达广场' },
  { name: '稳压泵#1', type: '稳压泵', location: '泵房', pressure: 0.25, flow: 5, status: '正常', unit: '万达广场' },
  { name: '管网压力监测#1', type: '压力监测', location: '1F管网', pressure: 0.45, flow: 0, status: '正常', unit: '万达广场' },
  { name: '管网压力监测#2', type: '压力监测', location: 'B1管网', pressure: 0.42, flow: 0, status: '正常', unit: '万达广场' },
];

export default function WaterSystemPage() {
  const normalCount = waterDevices.filter(d => d.status === '正常').length;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-1">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Droplets className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">消防给水系统</h2>
            <p className="text-[10px] text-slate-500">给水设备状态监控</p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">{waterDevices.length}台设备</Badge>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">正常{normalCount}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 flex-shrink-0">
        {[
          { label: '水池平均液位', value: '4.0m', icon: Droplets, max: '5.0m', pct: 80 },
          { label: '管网平均压力', value: '0.44MPa', icon: Gauge, max: '1.0MPa', pct: 44 },
          { label: '水泵运行数', value: '3台', icon: Activity, max: '4台', pct: 75 },
          { label: '系统状态', value: '正常', icon: CheckCircle, pct: 100 },
        ].map((s: any, i: number) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-slate-700/50 bg-slate-800/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] text-slate-500">{s.label}</span>
                </div>
                <div className="text-lg font-bold text-slate-100">{s.value}</div>
                {s.max && <div className="text-[8px] text-slate-600">上限: {s.max}</div>}
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
              <span className="col-span-2">液位/压力</span>
              <span className="col-span-2">容量/流量</span>
              <span className="col-span-1">单位</span>
              <span className="col-span-2">状态</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
            {waterDevices.map((d: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center">
                <span className="col-span-2 text-[10px] text-slate-200">{d.name}</span>
                <span className="col-span-1 text-[9px] text-slate-400">{d.type}</span>
                <span className="col-span-2 text-[9px] text-slate-400">{d.location}</span>
                <span className="col-span-2 text-[10px] text-blue-400 font-mono">{d.level || d.pressure}{d.type === '水池' || d.type === '水箱' ? 'm' : 'MPa'}</span>
                <span className="col-span-2 text-[9px] text-slate-400">{d.capacity || d.flow}{d.type === '水池' || d.type === '水箱' ? 'm³' : 'L/s'}</span>
                <span className="col-span-1 text-[8px] text-slate-500">{d.unit}</span>
                <span className="col-span-2">
                  <Badge variant="outline" className={`text-[8px] px-1 ${d.status === '正常' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : d.status === '备用' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
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
