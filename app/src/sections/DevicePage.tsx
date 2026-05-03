import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Device, DeviceType } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Cpu, Search, RefreshCw, Wrench, Activity
} from 'lucide-react';

export default function DevicePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, fault: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [devs, types]: any = await Promise.all([
        api.getDevices({ size: 100 }),
        api.getDeviceTypes(),
      ]);
      const deviceList: Device[] = (devs as any).list;
      setDevices(deviceList);
      setDeviceTypes(types);
      const online = deviceList.filter((d: Device) => d.status === 1).length;
      setStats({
        total: deviceList.length,
        online,
        offline: deviceList.length - online,
        fault: deviceList.filter((d: Device) => d.status === 2).length
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter((d: Device) => {
    const matchKeyword = !keyword || d.device_name?.includes(keyword) || d.device_code?.includes(keyword);
    const matchType = !selectedType || d.device_type_id.toString() === selectedType;
    return matchKeyword && matchType;
  });

  const statusBadge = (status?: number) => {
    switch (status) {
      case 1: return 'bg-emerald-500/20 text-emerald-400';
      case 2: return 'bg-red-500/20 text-red-400';
      case 3: return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const statusName = (status?: number) => {
    switch (status) {
      case 1: return '正常';
      case 2: return '故障';
      case 3: return '屏蔽';
      default: return '离线';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">设备管理</h2>
        <Button variant="outline" size="sm" onClick={loadData} className="border-slate-600 text-slate-300 hover:bg-slate-700">
          <RefreshCw className="w-4 h-4 mr-1" /> 刷新
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
              <div className="text-xs text-slate-500">设备总数</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{stats.online}</div>
              <div className="text-xs text-slate-500">在线设备</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{stats.offline}</div>
              <div className="text-xs text-slate-500">离线设备</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{stats.fault}</div>
              <div className="text-xs text-slate-500">故障设备</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="搜索设备名称、编号..." value={keyword} onChange={(e) => setKeyword(e.target.value)}
            className="pl-9 bg-slate-800/50 border-slate-700 text-slate-200" />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-slate-200">
            <SelectValue placeholder="设备类型" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="" className="text-slate-200">全部类型</SelectItem>
            {deviceTypes.map(t => (
              <SelectItem key={t.id} value={t.id.toString()} className="text-slate-200">{t.type_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-700/50 bg-slate-800/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-3 text-slate-400 font-medium">设备编号</th>
                  <th className="text-left p-3 text-slate-400 font-medium">设备名称</th>
                  <th className="text-left p-3 text-slate-400 font-medium">类型</th>
                  <th className="text-left p-3 text-slate-400 font-medium">位置</th>
                  <th className="text-left p-3 text-slate-400 font-medium">制造商</th>
                  <th className="text-left p-3 text-slate-400 font-medium">状态</th>
                  <th className="text-left p-3 text-slate-400 font-medium">最后在线</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map(dev => (
                  <tr key={dev.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="p-3 text-slate-300 font-mono text-xs">{dev.device_code}</td>
                    <td className="p-3 text-slate-200">{dev.device_name}</td>
                    <td className="p-3 text-slate-400">{dev.device_type_name || dev.device_type_id}</td>
                    <td className="p-3 text-slate-400">{dev.location || '-'}</td>
                    <td className="p-3 text-slate-400">{dev.manufacturer || '-'}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={statusBadge(dev.status)}>{statusName(dev.status)}</Badge>
                    </td>
                    <td className="p-3 text-slate-400 text-xs">{dev.last_online_time || '-'}</td>
                  </tr>
                ))}
                {filteredDevices.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-500">暂无设备数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
