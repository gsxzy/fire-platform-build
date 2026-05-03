import { useState, useEffect } from 'react';
import { legacyApi } from '@/api/services';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Clock, User, Eye, FileText, Shield, ChevronRight,
  ClipboardList
} from 'lucide-react';

/* ===== Mock Duty Logs ===== */
const fallbackDutyLogs = [
  { id: 1, date: '2025-02-01', shift: '早班', timeRange: '08:00-20:00', dutyOfficer: '张三', assistant: '李四', certNo: '消操证-甘2023-00158', totalAlarms: 8, fireAlarms: 2, faultAlarms: 3, other: 3, patrolRecords: 6, deviceStatus: '正常', handoverNotes: '1F大厅烟感探测器需关注，B1排烟风机轴承异响已报修', nextShiftNotes: '关注消防泵房巡检结果，注意2F走廊手报按钮松动问题' },
  { id: 2, date: '2025-01-31', shift: '晚班', timeRange: '20:00-08:00', dutyOfficer: '王五', assistant: '赵六', certNo: '消操证-甘2022-00087', totalAlarms: 5, fireAlarms: 1, faultAlarms: 2, other: 2, patrolRecords: 6, deviceStatus: '正常', handoverNotes: '夜间兰州石化配电室漏电报警，已通知维保', nextShiftNotes: '确认兰州石化漏电故障处理结果' },
  { id: 3, date: '2025-01-31', shift: '早班', timeRange: '08:00-20:00', dutyOfficer: '李四', assistant: '张三', certNo: '消操证-甘2023-00158', totalAlarms: 3, fireAlarms: 0, faultAlarms: 2, other: 1, patrolRecords: 6, deviceStatus: '正常', handoverNotes: '设备运行正常，无异常', nextShiftNotes: '注意消防水池液位监测' },
  { id: 4, date: '2025-01-30', shift: '晚班', timeRange: '20:00-08:00', dutyOfficer: '赵六', assistant: '王五', certNo: '消操证-甘2022-00087', totalAlarms: 6, fireAlarms: 1, faultAlarms: 3, other: 2, patrolRecords: 6, deviceStatus: '异常', handoverNotes: '应急照明控制器3处通讯中断，已记录', nextShiftNotes: '跟进应急照明维修工单' },
  { id: 5, date: '2025-01-30', shift: '早班', timeRange: '08:00-20:00', dutyOfficer: '张三', assistant: '赵六', certNo: '消操证-甘2023-00158', totalAlarms: 4, fireAlarms: 1, faultAlarms: 2, other: 1, patrolRecords: 6, deviceStatus: '正常', handoverNotes: '万达广场火警确认为误报（灰尘干扰）', nextShiftNotes: '安排烟感探测器清洁保养' },
  { id: 6, date: '2025-01-29', shift: '晚班', timeRange: '20:00-08:00', dutyOfficer: '王五', assistant: '李四', certNo: '消操证-甘2022-00087', totalAlarms: 2, fireAlarms: 0, faultAlarms: 1, other: 1, patrolRecords: 6, deviceStatus: '正常', handoverNotes: '设备运行平稳', nextShiftNotes: '常规巡检' },
];

/* ===== Mock Handover Records ===== */
const fallbackHandoverRecords = [
  { id: 1, date: '2025-02-01 08:00', shiftOut: '晚班', shiftIn: '早班', personOut: '王五/赵六', personIn: '张三/李四', status: '已交接', deviceCheck: '合格', autoStatus: '自动', issues: '兰州石化漏电待跟进' },
  { id: 2, date: '2025-01-31 20:00', shiftOut: '早班', shiftIn: '晚班', personOut: '李四/张三', personIn: '王五/赵六', status: '已交接', deviceCheck: '合格', autoStatus: '自动', issues: '无' },
  { id: 3, date: '2025-01-31 08:00', shiftOut: '晚班', shiftIn: '早班', personOut: '赵六/王五', personIn: '李四/张三', status: '已交接', deviceCheck: '合格', autoStatus: '自动', issues: '消防水池液位偏低' },
  { id: 4, date: '2025-01-30 20:00', shiftOut: '早班', shiftIn: '晚班', personOut: '张三/赵六', personIn: '赵六/王五', status: '已交接', deviceCheck: '异常', autoStatus: '自动', issues: '应急照明3处中断' },
  { id: 5, date: '2025-01-30 08:00', shiftOut: '晚班', shiftIn: '早班', personOut: '王五/李四', personIn: '张三/赵六', status: '已交接', deviceCheck: '合格', autoStatus: '自动', issues: '无' },
];

export default function DutyLogPage() {
  const [activeTab, setActiveTab] = useState<'log' | 'handover'>('log');
  const [logDetailOpen, setLogDetailOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<typeof fallbackDutyLogs[0] | null>(null);
  const [dutyLogs, setDutyLogs] = useState(fallbackDutyLogs as any);
  const [handoverRecords, setHandoverRecords] = useState(fallbackHandoverRecords as any);

  useEffect(() => {
    legacyApi.dutyLogs().then((res: any) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      if (list.length > 0) setDutyLogs(list);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    legacyApi.dutyCurrent().then((res: any) => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.list || []);
      if (list.length > 0) setHandoverRecords(list);
    }).catch(() => {});
  }, []);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <ClipboardList className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">值班日志与交接班</h2>
            <p className="text-[10px] text-slate-500">班次记录与交接管理</p>
          </div>
          <Badge variant="outline" className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">{dutyLogs.length}条日志</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant={activeTab === 'log' ? 'default' : 'outline'} onClick={() => setActiveTab('log')} className="h-7 text-[10px]">
            <FileText className="w-3 h-3 mr-0.5" />值班日志
          </Button>
          <Button size="sm" variant={activeTab === 'handover' ? 'default' : 'outline'} onClick={() => setActiveTab('handover')} className="h-7 text-[10px]">
            <ChevronRight className="w-3 h-3 mr-0.5" />交接班登记
          </Button>
        </div>
      </div>

      {/* Current Shift Status Card */}
      <Card className="border-slate-700/50 bg-slate-800/50 flex-shrink-0">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-200 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-400" />当前值班：早班 (08:00-20:00)</span>
            <Badge variant="outline" className="text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">值班中</Badge>
          </div>
          <div className="grid grid-cols-4 gap-3 text-[10px]">
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-slate-500" />
              <span className="text-slate-500">值班长：</span><span className="text-slate-200">张三</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-slate-500" />
              <span className="text-slate-500">证书号：</span><span className="text-slate-200 font-mono">消操证-甘2023-00158</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-slate-500" />
              <span className="text-slate-500">助理：</span><span className="text-slate-200">李四</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-slate-500" />
              <span className="text-slate-500">证书号：</span><span className="text-slate-200 font-mono">消操证-甘2023-00158</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeTab === 'log' ? (
        <Card className="flex-1 border-slate-700/50 bg-slate-800/50 min-h-0 flex flex-col">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
              <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-500 px-2">
                <span className="col-span-1">日期</span>
                <span className="col-span-1">班次</span>
                <span className="col-span-2">值班人员</span>
                <span className="col-span-1">证书号</span>
                <span className="col-span-1">火警</span>
                <span className="col-span-1">故障</span>
                <span className="col-span-1">巡检</span>
                <span className="col-span-1">设备状态</span>
                <span className="col-span-2">交接备注</span>
                <span className="col-span-1">操作</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {dutyLogs.map((log: any) => (
                <div key={log.id} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 hover:bg-slate-700/20 transition-all items-center">
                  <span className="col-span-1 text-[10px] text-slate-400">{log.date}</span>
                  <span className="col-span-1 text-[10px]">
                    <Badge variant="outline" className={`text-[8px] px-1 ${log.shift === '早班' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'}`}>{log.shift}</Badge>
                  </span>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-200 block">{log.dutyOfficer}/{log.assistant}</span>
                    <span className="text-[8px] text-slate-500">{log.timeRange}</span>
                  </div>
                  <span className="col-span-1 text-[8px] text-slate-500 font-mono">{log.certNo.slice(-6)}</span>
                  <span className="col-span-1 text-[10px] text-red-400 font-bold">{log.fireAlarms}</span>
                  <span className="col-span-1 text-[10px] text-yellow-400">{log.faultAlarms}</span>
                  <span className="col-span-1 text-[10px] text-slate-400">{log.patrolRecords}次</span>
                  <span className="col-span-1">
                    <Badge variant="outline" className={`text-[8px] px-1 ${log.deviceStatus === '正常' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{log.deviceStatus}</Badge>
                  </span>
                  <span className="col-span-2 text-[9px] text-slate-500 truncate">{log.handoverNotes}</span>
                  <span className="col-span-1">
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedLog(log); setLogDetailOpen(true); }} className="h-6 px-1 text-[8px] text-slate-400 hover:text-blue-400"><Eye className="w-3 h-3 mr-0.5" />查看</Button>
                  </span>
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
                <span className="col-span-2">交接时间</span>
                <span className="col-span-1">交班</span>
                <span className="col-span-1">接班</span>
                <span className="col-span-2">交班人员</span>
                <span className="col-span-2">接班人员</span>
                <span className="col-span-1">设备检查</span>
                <span className="col-span-1">自动状态</span>
                <span className="col-span-1">遗留问题</span>
                <span className="col-span-1">状态</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
              {handoverRecords.map((h: any) => (
                <div key={h.id} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 items-center">
                  <span className="col-span-2 text-[10px] text-slate-400 font-mono">{h.date}</span>
                  <span className="col-span-1 text-[10px]"><Badge variant="outline" className="text-[8px] bg-slate-700 text-slate-400 px-1">{h.shiftOut}</Badge></span>
                  <span className="col-span-1 text-[10px]"><Badge variant="outline" className="text-[8px] bg-blue-500/20 text-blue-400 border-blue-500/30 px-1">{h.shiftIn}</Badge></span>
                  <span className="col-span-2 text-[10px] text-slate-200">{h.personOut}</span>
                  <span className="col-span-2 text-[10px] text-slate-200">{h.personIn}</span>
                  <span className="col-span-1">
                    <Badge variant="outline" className={`text-[8px] px-1 ${h.deviceCheck === '合格' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{h.deviceCheck}</Badge>
                  </span>
                  <span className="col-span-1 text-[10px] text-emerald-400">{h.autoStatus}</span>
                  <span className="col-span-1 text-[9px] text-slate-500 truncate">{h.issues}</span>
                  <span className="col-span-1"><Badge variant="outline" className="text-[8px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-1">{h.status}</Badge></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Detail Dialog */}
      <Dialog open={logDetailOpen} onOpenChange={setLogDetailOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><FileText className="w-5 h-5 text-blue-400" />值班日志详情</DialogTitle></DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><Label className="text-slate-500">日期</Label><div className="text-slate-200">{selectedLog.date}</div></div>
                <div><Label className="text-slate-500">班次</Label><div className="text-slate-200">{selectedLog.shift} ({selectedLog.timeRange})</div></div>
                <div><Label className="text-slate-500">值班长</Label><div className="text-slate-200">{selectedLog.dutyOfficer}</div></div>
                <div><Label className="text-slate-500">助理值班员</Label><div className="text-slate-200">{selectedLog.assistant}</div></div>
                <div className="col-span-2"><Label className="text-slate-500">消防设施操作员证书号</Label><div className="text-slate-200 font-mono">{selectedLog.certNo}</div></div>
              </div>
              <div className="border-t border-slate-700/30 pt-2">
                <Label className="text-slate-500 text-[10px]">报警统计</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  <div className="p-2 rounded bg-slate-700/30 text-center"><div className="text-sm font-bold text-slate-100">{selectedLog.totalAlarms}</div><div className="text-[8px] text-slate-500">报警总数</div></div>
                  <div className="p-2 rounded bg-red-500/10 text-center"><div className="text-sm font-bold text-red-400">{selectedLog.fireAlarms}</div><div className="text-[8px] text-slate-500">火警</div></div>
                  <div className="p-2 rounded bg-yellow-500/10 text-center"><div className="text-sm font-bold text-yellow-400">{selectedLog.faultAlarms}</div><div className="text-[8px] text-slate-500">故障</div></div>
                  <div className="p-2 rounded bg-blue-500/10 text-center"><div className="text-sm font-bold text-blue-400">{selectedLog.patrolRecords}</div><div className="text-[8px] text-slate-500">巡检</div></div>
                </div>
              </div>
              <div className="border-t border-slate-700/30 pt-2">
                <Label className="text-slate-500 text-[10px]">设备状态</Label>
                <div className="text-[11px] text-slate-200 mt-1 p-2 rounded bg-slate-700/30">{selectedLog.deviceStatus}</div>
              </div>
              <div className="border-t border-slate-700/30 pt-2">
                <Label className="text-slate-500 text-[10px]">当班交接备注</Label>
                <div className="text-[11px] text-slate-200 mt-1 p-2 rounded bg-slate-700/30">{selectedLog.handoverNotes}</div>
              </div>
              <div className="border-t border-slate-700/30 pt-2">
                <Label className="text-slate-500 text-[10px]">下班交接备注</Label>
                <div className="text-[11px] text-slate-200 mt-1 p-2 rounded bg-slate-700/30">{selectedLog.nextShiftNotes}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setLogDetailOpen(false)} className="h-8 text-xs bg-blue-600 hover:bg-blue-700">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
