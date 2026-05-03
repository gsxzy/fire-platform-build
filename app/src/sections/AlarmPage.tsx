import { useEffect, useState } from 'react';

/* 时间格式化：UTC/ISO → 北京时间 YYYY-MM-DD HH:mm:ss */
function formatAlarmTime(time: string | null | undefined): string {
  if (!time) return '-';
  try {
    const d = new Date(time);
    if (isNaN(d.getTime())) return String(time);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return String(time);
  }
}
import { api } from '@/lib/api';
import type { FireAlarm, FaultAlarm, FeedbackAlarm, AlarmStatistics } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, AlertTriangle, RotateCcw, CheckCircle, XCircle,
  Search, RefreshCw, Clock, MapPin, Cpu, VolumeX, Hand, Shield
} from 'lucide-react';

const levelMap: Record<number, { label: string; color: string }> = {
  1: { label: '提示', color: 'bg-blue-500/20 text-blue-400' },
  2: { label: '一般', color: 'bg-yellow-500/20 text-yellow-400' },
  3: { label: '严重', color: 'bg-orange-500/20 text-orange-400' },
  4: { label: '紧急', color: 'bg-red-500/20 text-red-400' },
};

export default function AlarmPage() {
  const [fireAlarms, setFireAlarms] = useState<FireAlarm[]>([]);
  const [faultAlarms, setFaultAlarms] = useState<FaultAlarm[]>([]);
  const [feedbackAlarms, setFeedbackAlarms] = useState<FeedbackAlarm[]>([]);
  const [statistics, setStatistics] = useState<AlarmStatistics | null>(null);
  const [, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectedAlarm, setSelectedAlarm] = useState<FireAlarm | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fire, fault, feedback, stats]: any = await Promise.all([
        api.getFireAlarms(),
        api.getFaultAlarms(),
        api.getFeedbackAlarms(),
        api.getAlarmStatistics(),
      ]);
      setFireAlarms((fire as any).list);
      setFaultAlarms((fault as any).list);
      setFeedbackAlarms((feedback as any).list);
      setStatistics(stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleConfirm = async (eventCode: string, _result: number) => {
    setConfirmingId(eventCode);
    try { await api.confirmFireAlarm(Number(eventCode)); loadData(); }
    catch (e) { console.error(e); }
    finally { setConfirmingId(null); }
  };

  const handleFault = async (eventCode: string) => {
    try { await api.handleFault(Number(eventCode), '已处理'); loadData(); }
    catch (e) { console.error(e); }
  };

  const filteredFire = fireAlarms.filter(a => !keyword || a.device_name?.includes(keyword) || a.location?.includes(keyword));

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">报警管理</h2>
          <p className="text-xs text-slate-500 mt-0.5">火警确认 · 故障处理 · 反馈跟踪</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="border-slate-600 text-slate-300 hover:bg-slate-700">
          <RefreshCw className="w-4 h-4 mr-1" /> 刷新
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-red-700/30 bg-red-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{statistics?.fireTotal || 0}</div>
              <div className="text-xs text-slate-500">火警总数</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-700/30 bg-yellow-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{statistics?.faultTotal || 0}</div>
              <div className="text-xs text-slate-500">故障总数</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-600/30 bg-red-600/5">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{statistics?.firePending || 0}</div>
              <div className="text-xs text-slate-500">待确认火警</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-600/30 bg-yellow-600/5">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">{statistics?.faultPending || 0}</div>
              <div className="text-xs text-slate-500">待处理故障</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="border-red-700/50 bg-red-500/10 text-red-400 hover:bg-red-500/20" onClick={() => alert('消音操作（演示）')}>
          <VolumeX className="w-4 h-4 mr-1" /> 消音
        </Button>
        <Button size="sm" variant="outline" className="border-orange-700/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20" onClick={() => alert('复位操作（演示）')}>
          <RotateCcw className="w-4 h-4 mr-1" /> 复位
        </Button>
        <Button size="sm" variant="outline" className="border-blue-700/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" onClick={() => alert('切换手/自动模式（演示）')}>
          <Hand className="w-4 h-4 mr-1" /> 手/自动
        </Button>
        <Button size="sm" variant="outline" className="border-yellow-700/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20" onClick={() => alert('屏蔽操作（演示）')}>
          <Shield className="w-4 h-4 mr-1" /> 屏蔽
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input placeholder="搜索设备名称、位置..." value={keyword} onChange={e => setKeyword(e.target.value)}
          className="pl-9 bg-slate-800/50 border-slate-700 text-slate-200" />
      </div>

      <Tabs defaultValue="fire" className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="fire" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <Bell className="w-4 h-4 mr-1" /> 火警 ({filteredFire.length})
          </TabsTrigger>
          <TabsTrigger value="fault" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <AlertTriangle className="w-4 h-4 mr-1" /> 故障 ({faultAlarms.length})
          </TabsTrigger>
          <TabsTrigger value="feedback" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
            <RotateCcw className="w-4 h-4 mr-1" /> 反馈 ({feedbackAlarms.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fire">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Alarm List */}
            <div className="lg:col-span-2 space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
              {filteredFire.map(alarm => (
                <div key={alarm.id}
                  onClick={() => setSelectedAlarm(alarm)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedAlarm?.id === alarm.id
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : alarm.confirm_result == null
                        ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
                        : 'border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${alarm.confirm_result == null ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <div>
                        <div className="text-sm text-slate-200 font-medium">{alarm.device_name}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{alarm.location}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatAlarmTime(alarm.alarm_time)}</span>
                          <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{alarm.alarm_value}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className={levelMap[alarm.alarm_level]?.color || ''}>
                        {levelMap[alarm.alarm_level]?.label || alarm.alarm_level}
                      </Badge>
                      <Badge variant="outline" className={alarm.confirm_result != null ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400 animate-pulse'}>
                        {alarm.confirm_result != null ? '已确认' : '未确认'}
                      </Badge>
                    </div>
                  </div>
                  {alarm.confirm_result == null && (
                    <div className="flex gap-2 mt-2 ml-5">
                      <Button size="sm" variant="ghost" className="h-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        onClick={e => { e.stopPropagation(); handleConfirm(alarm.event_code, 1); }} disabled={confirmingId === alarm.event_code}>
                        <CheckCircle className="w-3.5 h-3.5 mr-0.5" /> 真警
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                        onClick={e => { e.stopPropagation(); handleConfirm(alarm.event_code, 2); }} disabled={confirmingId === alarm.event_code}>
                        <XCircle className="w-3.5 h-3.5 mr-0.5" /> 误报
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {filteredFire.length === 0 && <div className="p-8 text-center text-slate-500">暂无火警数据</div>}
            </div>

            {/* Alarm Detail */}
            <Card className="border-slate-700/50 bg-slate-800/50 h-fit">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">报警详情</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedAlarm ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">事件编号</span>
                      <span className="text-xs text-slate-300 font-mono">{selectedAlarm.event_code}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">设备名称</span>
                      <span className="text-xs text-slate-200">{selectedAlarm.device_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">报警位置</span>
                      <span className="text-xs text-slate-200">{selectedAlarm.location}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">报警时间</span>
                      <span className="text-xs text-slate-300">{formatAlarmTime(selectedAlarm.alarm_time)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">报警值</span>
                      <span className="text-xs text-slate-200">{selectedAlarm.alarm_value}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">报警级别</span>
                      <Badge variant="outline" className={levelMap[selectedAlarm.alarm_level]?.color || ''}>
                        {levelMap[selectedAlarm.alarm_level]?.label || selectedAlarm.alarm_level}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">确认状态</span>
                      <Badge variant="outline" className={selectedAlarm.confirm_result != null ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}>
                        {selectedAlarm.confirm_result != null ? '已确认' : '未确认'}
                      </Badge>
                    </div>
                    {selectedAlarm.confirm_result != null && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">确认人</span>
                          <span className="text-xs text-slate-200">{selectedAlarm.confirm_user}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">确认结果</span>
                          <span className="text-xs text-slate-200">{selectedAlarm.confirm_result === 1 ? '真实火警' : '误报'}</span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 py-8">点击左侧报警查看详情</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fault">
          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3 text-slate-400 font-medium">事件编号</th>
                      <th className="text-left p-3 text-slate-400 font-medium">设备名称</th>
                      <th className="text-left p-3 text-slate-400 font-medium">位置</th>
                      <th className="text-left p-3 text-slate-400 font-medium">故障时间</th>
                      <th className="text-left p-3 text-slate-400 font-medium">故障描述</th>
                      <th className="text-left p-3 text-slate-400 font-medium">状态</th>
                      <th className="text-left p-3 text-slate-400 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faultAlarms.map(fault => (
                      <tr key={fault.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="p-3 text-slate-300 font-mono text-xs">{fault.event_code}</td>
                        <td className="p-3 text-slate-200">{fault.device_name}</td>
                        <td className="p-3 text-slate-400">{fault.location}</td>
                        <td className="p-3 text-slate-400 text-xs">{fault.fault_time}</td>
                        <td className="p-3 text-slate-300">{fault.fault_desc}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={fault.handle_status === 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}>
                            {fault.handle_status === 0 ? '待处理' : '已处理'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {fault.handle_status === 0 && (
                            <Button size="sm" variant="ghost" className="h-7 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              onClick={() => handleFault(fault.event_code)}>处理</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {faultAlarms.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">暂无故障数据</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-3 text-slate-400 font-medium">事件编号</th>
                      <th className="text-left p-3 text-slate-400 font-medium">设备名称</th>
                      <th className="text-left p-3 text-slate-400 font-medium">位置</th>
                      <th className="text-left p-3 text-slate-400 font-medium">反馈时间</th>
                      <th className="text-left p-3 text-slate-400 font-medium">反馈类型</th>
                      <th className="text-left p-3 text-slate-400 font-medium">反馈值</th>
                      <th className="text-left p-3 text-slate-400 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbackAlarms.map(fb => (
                      <tr key={fb.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="p-3 text-slate-300 font-mono text-xs">{fb.event_code}</td>
                        <td className="p-3 text-slate-200">{fb.device_name}</td>
                        <td className="p-3 text-slate-400">{fb.location}</td>
                        <td className="p-3 text-slate-400 text-xs">{fb.feedback_time}</td>
                        <td className="p-3 text-slate-300">{fb.feedback_type === 1 ? '启动反馈' : fb.feedback_type === 2 ? '运行反馈' : '停止反馈'}</td>
                        <td className="p-3 text-slate-300">{fb.feedback_value}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={fb.handle_status === 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}>
                            {fb.handle_status === 0 ? '待处理' : '已处理'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {feedbackAlarms.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">暂无反馈数据</td></tr>}
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
