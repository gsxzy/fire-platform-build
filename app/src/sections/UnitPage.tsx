import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Unit } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, MapPin, Phone, Users, Activity } from 'lucide-react';

export default function UnitPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [keyword, setKeyword] = useState('');

  const loadData = async () => {
    try {
      const res: any = await api.getUnits({ size: 100 });
      setUnits((res as any).list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUnits = units.filter(u =>
    !keyword || u.unit_name?.includes(keyword) || u.unit_code?.includes(keyword)
  );

  const riskLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-emerald-500/20 text-emerald-400';
      case 2: return 'bg-yellow-500/20 text-yellow-400';
      case 3: return 'bg-orange-500/20 text-orange-400';
      case 4: return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const riskLevelName = (level: number) => {
    switch (level) {
      case 1: return '低风险';
      case 2: return '一般风险';
      case 3: return '较大风险';
      case 4: return '重大风险';
      default: return '未知';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">单位管理</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input placeholder="搜索单位名称、编号..." value={keyword} onChange={(e) => setKeyword(e.target.value)}
          className="pl-9 bg-slate-800/50 border-slate-700 text-slate-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredUnits.map(unit => (
          <Card key={unit.id} className="border-slate-700/50 bg-slate-800/50 hover:border-slate-600 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-200">{unit.unit_name}</h3>
                    <p className="text-xs text-slate-500 font-mono">{unit.unit_code}</p>
                  </div>
                </div>
                <Badge variant="outline" className={riskLevelColor(unit.risk_level)}>
                  {riskLevelName(unit.risk_level)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{unit.address || '-'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Phone className="w-3 h-3" />
                  <span>{unit.firechief_phone || '-'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Users className="w-3 h-3" />
                  <span>工程师:5 消防员:2</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Activity className="w-3 h-3" />
                  <span>消控室:1</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-700/50">
                <div className="text-center flex-1">
                  <div className="text-sm font-bold text-blue-400">{unit.device_count}</div>
                  <div className="text-[10px] text-slate-500">设备</div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-sm font-bold text-emerald-400">{unit.online_count}</div>
                  <div className="text-[10px] text-slate-500">在线</div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-sm font-bold text-red-400">{unit.alarm_count}</div>
                  <div className="text-[10px] text-slate-500">报警</div>
                </div>
                <div className="text-center flex-1">
                  <div className="text-sm font-bold text-slate-200">{unit.build_count || 0}</div>
                  <div className="text-[10px] text-slate-500">建筑</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredUnits.length === 0 && (
          <div className="col-span-2 text-center py-12 text-slate-500">暂无单位数据</div>
        )}
      </div>
    </div>
  );
}
