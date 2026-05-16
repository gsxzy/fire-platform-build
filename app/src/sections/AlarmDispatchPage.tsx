import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

import { alarmService } from '@/api/services';
import type { Alarm } from '@/types/db';
import DataContainer from '@/components/DataContainer';
import {
  PhoneCall, Flame, CheckCircle, XCircle, Clock, MapPin,
  User, Phone, Shield, ChevronRight,
  Pause, RotateCcw, FileText,
  Navigation, Users, Send
} from 'lucide-react';

/* ===== 135 Timer Hook ===== */
function use135Timer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => { setRunning(false); setElapsed(0); }, []);

  const m1 = elapsed >= 60;
  const m3 = elapsed >= 180;
  const m5 = elapsed >= 300;

  const fmt = (s: number) => {
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return { elapsed, running, start, pause, reset, fmt, m1, m3, m5 };
}

const LEVEL_LABEL: Record<string, string> = {
  urgent: '紧急', high: '严重', normal: '一般', low: '低',
};

/** 告警列表 → 接警处置列表展示结构 */
function alarmToDispatchOrder(a: Alarm) {
  const typeLabel = a.type === 'fire' ? '火警' : a.type === 'fault' ? '故障' : '预警';
  const levelLabel = LEVEL_LABEL[a.level] || a.level;
  let phase = 'receive';
  let status = 'pending';
  if (a.status === 'confirmed') {
    phase = 'verify';
    status = 'handling';
  }
  if (a.status === 'handled') {
    phase = 'archive';
    status = 'resolved';
  }
  if (a.status === 'ignored') {
    phase = 'archive';
    status = 'confirmed_false';
  }
  return {
    id: `JJ-${a.id}`,
    alarmId: a.alarmNo || String(a.id),
    type: typeLabel,
    unit: a.unitName,
    device: a.deviceName,
    phase,
    handler: a.handler || '-',
    alarmTime: a.createdAt,
    status,
    level: levelLabel,
    location: a.location,
    message: a.message,
    contact: '-/-',
    security: '-/-',
  };
}

const phaseLabels: Record<string, { label: string; color: string }> = {
  receive: { label: '接警登记', color: 'bg-blue-500/20 text-blue-400' },
  confirm: { label: '火警确认', color: 'bg-orange-500/20 text-orange-400' },
  verify: { label: '现场核实', color: 'bg-purple-500/20 text-purple-400' },
  judge:   { label: '警情判定', color: 'bg-yellow-500/20 text-yellow-400' },
  response:{ label: '应急响应', color: 'bg-red-500/20 text-red-400' },
  track:   { label: '处置跟踪', color: 'bg-cyan-500/20 text-cyan-400' },
  archive: { label: '结案归档', color: 'bg-emerald-500/20 text-emerald-400' },
};

/* ===== Phase Indicator ===== */
function PhaseIndicator({ currentPhase }: { currentPhase: string }) {
  const phases = ['receive', 'confirm', 'verify', 'judge', 'response', 'track', 'archive'];
  const idx = phases.indexOf(currentPhase);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {phases.map((p: any, i: number) => (
        <div key={p} className="flex items-center flex-shrink-0">
          <div className={`flex flex-col items-center px-2 py-1 rounded border transition-all ${
            i < idx ? 'border-emerald-500/40 bg-emerald-500/10' :
            i === idx ? 'border-blue-500/60 bg-blue-500/15 shadow-[0_0_6px_rgba(59,130,246,0.15)]' :
            'border-slate-700/40 bg-slate-800/30 opacity-50'
          }`}>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
              i < idx ? 'bg-emerald-500 text-white' :
              i === idx ? 'bg-blue-500 text-white animate-pulse' :
              'bg-slate-700 text-slate-500'
            }`}>{i < idx ? '✓' : i + 1}</div>
            <span className={`text-[8px] mt-0.5 whitespace-nowrap ${i <= idx ? 'text-slate-200' : 'text-slate-600'}`}>{phaseLabels[p]?.label}</span>
          </div>
          {i < phases.length - 1 && (
            <div className={`w-3 h-0.5 ${i < idx ? 'bg-emerald-500/40' : 'bg-slate-700/40'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ===== 135 Response Timer Card ===== */
function ResponseTimer135() {
  const { elapsed, running, start, pause, reset, fmt, m1, m3, m5 } = use135Timer();

  return (
    <Card className="border-slate-700/50 bg-slate-800/50">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold text-slate-200">"135"应急响应计时</span>
          </div>
          <div className="text-2xl font-mono font-bold text-red-400">{fmt(elapsed)}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className={`p-2 rounded border text-center ${m1 ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-700/40 bg-slate-800/30'}`}>
            <div className="text-[10px] text-slate-500">1分钟</div>
            <div className="text-[9px] text-slate-400">确认火警</div>
            <div className={`text-[10px] font-bold mt-0.5 ${m1 ? 'text-emerald-400' : 'text-slate-600'}`}>{m1 ? '✓ 已完成' : '进行中'}</div>
          </div>
          <div className={`p-2 rounded border text-center ${m3 ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-700/40 bg-slate-800/30'}`}>
            <div className="text-[10px] text-slate-500">3分钟</div>
            <div className="text-[9px] text-slate-400">力量到场</div>
            <div className={`text-[10px] font-bold mt-0.5 ${m3 ? 'text-emerald-400' : m1 ? 'text-yellow-400' : 'text-slate-600'}`}>{m3 ? '✓ 已完成' : m1 ? '进行中' : '待启动'}</div>
          </div>
          <div className={`p-2 rounded border text-center ${m5 ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-700/40 bg-slate-800/30'}`}>
            <div className="text-[10px] text-slate-500">5分钟</div>
            <div className="text-[9px] text-slate-400">协同对接</div>
            <div className={`text-[10px] font-bold mt-0.5 ${m5 ? 'text-emerald-400' : m3 ? 'text-yellow-400' : 'text-slate-600'}`}>{m5 ? '✓ 已完成' : m3 ? '进行中' : '待启动'}</div>
          </div>
        </div>
        <div className="flex gap-1">
          {!running ? (
            <Button size="sm" onClick={start} className="h-7 flex-1 text-[10px] bg-red-600 hover:bg-red-700"><Send className="w-3 h-3 mr-0.5" />启动计时</Button>
          ) : (
            <Button size="sm" onClick={pause} variant="outline" className="h-7 flex-1 text-[10px] border-yellow-600 text-yellow-400"><Pause className="w-3 h-3 mr-0.5" />暂停</Button>
          )}
          <Button size="sm" onClick={reset} variant="outline" className="h-7 text-[10px] border-slate-600 text-slate-400"><RotateCcw className="w-3 h-3 mr-0.5" />重置</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ===== Main Page ===== */
export default function AlarmDispatchPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await alarmService.list({ pageNum: 1, pageSize: 100 });
      if (res.code === 200 && Array.isArray(res.data?.list)) {
        setOrders(res.data.list.map(alarmToDispatchOrder));
      } else {
        setOrders([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState('');
  const [remark, setRemark] = useState('');

  const openDetail = (o: any) => { setSelectedOrder(o); setDetailOpen(true); };
  const openAction = (o: any, action: string) => { setSelectedOrder(o); setActionDialog(action); setRemark(''); };

  const pendingCount = orders.filter((o: any) => o.status === 'pending').length;
  const handlingCount = orders.filter((o: any) => o.status === 'handling').length;

  return (
    <DataContainer loading={loading} error={error} data={orders} onRetry={loadData} emptyText="暂无接警数据">
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between flex-shrink-0 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20">
            <PhoneCall className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="text-base font-bold text-slate-100 leading-tight">接警处置流程</h2>
          <Badge variant="outline" className="text-[10px] bg-red-500/20 text-red-400 border-red-500/30">{pendingCount}条待处理</Badge>
          <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">{handlingCount}条处置中</Badge>
        </div>
        <Button size="sm" className="h-8 text-[10px] bg-red-600 hover:bg-red-700"><PhoneCall className="w-3.5 h-3.5 mr-1" />模拟接警</Button>
      </div>

      {/* 135 Timer */}
      <ResponseTimer135 />

      {/* Process Legend */}
      <Card className="border-slate-700/50 bg-slate-800/50 flex-shrink-0">
        <CardContent className="p-2.5">
          <div className="text-[10px] text-slate-400 mb-1.5 font-medium">标准处置流程（依据《城市消防远程监控中心管理制度》）</div>
          <div className="flex items-center gap-1 flex-wrap text-[9px] text-slate-500">
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">①接警登记</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">②火警确认(1min)</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">③现场核实(3min)</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">④警情判定</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">⑤应急响应(5min)</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">⑥处置跟踪</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">⑦结案归档</span>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card className="flex-1 border-slate-700/50 bg-slate-800/50 min-h-0 flex flex-col">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
            <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-500 px-2">
              <span className="col-span-2">接警编号/报警编号</span>
              <span className="col-span-1">类型</span>
              <span className="col-span-2">单位/设备</span>
              <span className="col-span-1">当前阶段</span>
              <span className="col-span-1">值班员</span>
              <span className="col-span-2">报警时间</span>
              <span className="col-span-1">状态</span>
              <span className="col-span-2">操作</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1">
            {orders.map((o: any) => (
              <div key={o.id} className="grid grid-cols-12 gap-1 p-2 rounded-lg border border-slate-700/30 bg-slate-800/30 hover:bg-slate-700/20 transition-all">
                <div className="col-span-2">
                  <span className="text-[9px] text-slate-500 font-mono block">{o.id}</span>
                  <span className="text-[8px] text-slate-600 font-mono">{o.alarmId}</span>
                </div>
                <span className="col-span-1">
                  <Badge className={`text-[8px] px-1 ${o.type === '火警' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>{o.type}</Badge>
                </span>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-200 truncate block">{o.unit}</span>
                  <span className="text-[8px] text-slate-500 truncate block">{o.device}</span>
                </div>
                <span className="col-span-1">
                  <Badge variant="outline" className={`text-[8px] px-1 ${phaseLabels[o.phase]?.color || ''}`}>{phaseLabels[o.phase]?.label}</Badge>
                </span>
                <span className="col-span-1 text-[10px] text-slate-400">{o.handler}</span>
                <span className="col-span-2 text-[9px] text-slate-400 font-mono">{o.alarmTime}</span>
                <span className="col-span-1">
                  <Badge variant="outline" className={`text-[8px] px-1 ${
                    o.status === 'pending' ? 'bg-red-500/20 text-red-400' :
                    o.status === 'confirmed_true' ? 'bg-red-500/20 text-red-400' :
                    o.status === 'confirmed_false' ? 'bg-yellow-500/20 text-yellow-400' :
                    o.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {o.status === 'pending' ? '待处理' : o.status === 'confirmed_true' ? '真警' : o.status === 'confirmed_false' ? '误报' : o.status === 'resolved' ? '已处理' : '处理中'}
                  </Badge>
                </span>
                <span className="col-span-2 flex gap-0.5">
                  <Button size="sm" variant="ghost" onClick={() => openDetail(o)} className="h-6 px-1 text-[8px] text-slate-400 hover:text-blue-400"><FileText className="w-3 h-3 mr-0.5" />详情</Button>
                  {o.status === 'pending' && (
                    <Button size="sm" variant="ghost" onClick={() => openAction(o, 'confirm')} className="h-6 px-1 text-[8px] text-slate-400 hover:text-red-400"><CheckCircle className="w-3 h-3 mr-0.5" />确认</Button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog - Full Dispatch Flow */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><PhoneCall className="w-5 h-5 text-red-400" />接警处置详情</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              {/* Phase Flow */}
              <PhaseIndicator currentPhase={selectedOrder.phase} />

              {/* Basic Info */}
              <div className="p-3 rounded border border-slate-700/50 bg-slate-800/50">
                <div className="text-[10px] text-slate-400 font-medium mb-2">基本信息</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><Label className="text-slate-500">接警编号</Label><div className="text-slate-200 font-mono">{selectedOrder.id}</div></div>
                  <div><Label className="text-slate-500">报警编号</Label><div className="text-slate-200 font-mono">{selectedOrder.alarmId}</div></div>
                  <div><Label className="text-slate-500">报警类型</Label><div className="text-slate-200">{selectedOrder.type}</div></div>
                  <div><Label className="text-slate-500">告警等级</Label><div className="text-slate-200">{selectedOrder.level}</div></div>
                  <div className="col-span-2"><Label className="text-slate-500">报警设备</Label><div className="text-slate-200">{selectedOrder.device}</div></div>
                  <div className="col-span-2"><Label className="text-slate-500">所属单位</Label><div className="text-slate-200">{selectedOrder.unit}</div></div>
                  <div><Label className="text-slate-500">安装位置</Label><div className="text-slate-200 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-500" />{selectedOrder.location}</div></div>
                  <div><Label className="text-slate-500">报警时间</Label><div className="text-slate-200 font-mono">{selectedOrder.alarmTime}</div></div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="p-3 rounded border border-slate-700/50 bg-slate-800/50">
                <div className="text-[10px] text-slate-400 font-medium mb-2">联系人信息</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><Label className="text-slate-500">单位负责人</Label><div className="text-slate-200 flex items-center gap-1"><User className="w-3 h-3 text-slate-500" />{selectedOrder.contact?.split('/')?.[0] ?? '-'}</div></div>
                  <div><Label className="text-slate-500">联系电话</Label><div className="text-slate-200 flex items-center gap-1"><Phone className="w-3 h-3 text-slate-500" />{selectedOrder.contact?.split('/')?.[1] ?? '-'}</div></div>
                  <div><Label className="text-slate-500">安保负责人</Label><div className="text-slate-200 flex items-center gap-1"><Shield className="w-3 h-3 text-slate-500" />{selectedOrder.security?.split('/')?.[0] ?? '-'}</div></div>
                  <div><Label className="text-slate-500">安保电话</Label><div className="text-slate-200 flex items-center gap-1"><Phone className="w-3 h-3 text-slate-500" />{selectedOrder.security?.split('/')?.[1] ?? '-'}</div></div>
                </div>
              </div>

              {/* 135 Response Record */}
              <div className="p-3 rounded border border-slate-700/50 bg-slate-800/50">
                <div className="text-[10px] text-slate-400 font-medium mb-2">"135"应急响应记录</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-[8px] text-red-400 font-bold">1</div>
                    <span className="text-slate-400 w-20">1分钟确认</span>
                    <span className="text-slate-200 flex-1">火警确认并启动预案，调派首批力量</span>
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-[8px] text-orange-400 font-bold">3</div>
                    <span className="text-slate-400 w-20">3分钟到场</span>
                    <span className="text-slate-200 flex-1">微型消防站或第二应急力量到场扑救</span>
                    {selectedOrder.phase !== 'receive' && selectedOrder.phase !== 'confirm' ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-yellow-400" />}
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] text-blue-400 font-bold">5</div>
                    <span className="text-slate-400 w-20">5分钟对接</span>
                    <span className="text-slate-200 flex-1">与到场消防救援力量协同对接</span>
                    {selectedOrder.phase === 'response' || selectedOrder.phase === 'track' || selectedOrder.phase === 'archive' ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-slate-600" />}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button size="sm" className="h-8 flex-1 text-[10px] bg-red-600 hover:bg-red-700"><Phone className="w-3 h-3 mr-0.5" />拨打119</Button>
                <Button size="sm" variant="outline" className="h-8 flex-1 text-[10px] border-orange-600 text-orange-400"><Phone className="w-3 h-3 mr-0.5" />联系现场</Button>
                <Button size="sm" variant="outline" className="h-8 flex-1 text-[10px] border-blue-600 text-blue-400"><Navigation className="w-3 h-3 mr-0.5" />救援路线</Button>
                <Button size="sm" variant="outline" className="h-8 flex-1 text-[10px] border-slate-600 text-slate-400"><Users className="w-3 h-3 mr-0.5" />通知人员</Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailOpen(false)} className="h-8 text-xs bg-blue-600 hover:bg-blue-700">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog('')}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><CheckCircle className="w-5 h-5 text-red-400" /> 火警确认</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">设备：<span className="text-slate-200">{selectedOrder.device}</span></p>
              <p className="text-sm text-slate-400">单位：<span className="text-slate-200">{selectedOrder.unit}</span></p>
              <div><Label className="text-slate-300 text-xs">确认结果</Label>
                <div className="flex gap-2 mt-1">
                  <button className="flex-1 p-2 rounded border border-red-500/60 bg-red-500/10 text-red-300 text-xs text-center"><Flame className="w-4 h-4 mx-auto mb-0.5" />真实火情</button>
                  <button className="flex-1 p-2 rounded border border-yellow-500/60 bg-yellow-500/10 text-yellow-300 text-xs text-center"><XCircle className="w-4 h-4 mx-auto mb-0.5" />误报</button>
                </div>
              </div>
              <div><Label className="text-slate-300 text-xs">备注</Label><Textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="请输入确认备注" className="bg-slate-700 border-slate-600 text-slate-200 mt-0.5 text-xs min-h-[50px]" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog('')} className="h-8 text-xs border-slate-600 text-slate-300">取消</Button>
            <Button onClick={() => setActionDialog('')} className="h-8 text-xs bg-red-600 hover:bg-red-700">确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DataContainer>
  );
}
