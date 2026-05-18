import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { HardDrive, Play, Square, Shield } from 'lucide-react';
import { controlRoomService } from '@/api/services';
import type { BusPoint } from '../types';
import { SECONDARY_PWD } from '../utils';

interface BusCardProps {
  point: BusPoint;
  hostId?: number;
  btnSize?: 'sm' | 'md' | 'lg';
  api?: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultApi: any = controlRoomService;

const sizeConfig = {
  sm: { pad: 'p-1.5', text: 'text-[10px]', subText: 'text-[9px]', btnText: 'text-[9px]', btnPy: 'py-0.5', icon: 'w-3 h-3', indicator: 'w-1.5 h-1.5' },
  md: { pad: 'p-2', text: 'text-[11px]', subText: 'text-[10px]', btnText: 'text-[10px]', btnPy: 'py-1', icon: 'w-3.5 h-3.5', indicator: 'w-2 h-2' },
  lg: { pad: 'p-2.5', text: 'text-xs', subText: 'text-[11px]', btnText: 'text-[11px]', btnPy: 'py-1.5', icon: 'w-4 h-4', indicator: 'w-2.5 h-2.5' },
};

export default function BusCard({ point, hostId, btnSize = 'md', api = defaultApi }: BusCardProps) {
  const [running, setRunning] = useState(point.status === 1);
  const [feedback, setFeedback] = useState(point.status === 1);
  const [confirmAction, setConfirmAction] = useState<'start' | 'stop' | null>(null);
  const [needPwd, setNeedPwd] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdError, setPwdError] = useState(false);
  const [execLoading, setExecLoading] = useState(false);
  const [execResult, setExecResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [opAnim, setOpAnim] = useState(false);

  const checkPwd = () => {
    if (pwdInput === SECONDARY_PWD) {
      setNeedPwd(false); setPwdInput(''); setPwdError(false);
      confirmAction === 'start' ? doStart() : doStop();
    } else { setPwdError(true); }
  };

  const doStart = async () => {
    setExecLoading(true); setOpAnim(true);
    try {
      await api.controlBus(hostId ?? 0, point.id, 'start');
      setRunning(true); setFeedback(true);
      setExecResult({ type: 'success', msg: '启动指令下发成功' });
    } catch (e) { setExecResult({ type: 'error', msg: '启动指令下发失败' }); }
    finally { setExecLoading(false); setTimeout(() => { setExecResult(null); setOpAnim(false); }, 3000); }
  };
  const doStop = async () => {
    setExecLoading(true); setOpAnim(true);
    try {
      await api.controlBus(hostId ?? 0, point.id, 'stop');
      setRunning(false); setFeedback(false);
      setExecResult({ type: 'success', msg: '停止指令下发成功' });
    } catch (e) { setExecResult({ type: 'error', msg: '停止指令下发失败' }); }
    finally { setExecLoading(false); setTimeout(() => { setExecResult(null); setOpAnim(false); }, 3000); }
  };

  const statusColor = point.status === 1 ? 'led-red-v2 led-blink' : point.status === 2 ? 'led-yellow-v2' : point.status === 3 ? 'bg-slate-400' : running ? 'led-green-v2 led-pulse' : 'bg-slate-600';
  const statusLabel = point.status === 1 ? '火警' : point.status === 2 ? '故障' : point.status === 3 ? '屏蔽' : running ? '启动' : '正常';

  const s = sizeConfig[btnSize];

  return (
    <div className={`relative tech-card-v2 ${s.pad} flex flex-col gap-1 hover:scale-[1.01] corner-accent-v2 ${opAnim ? 'animate-scale-in' : ''}`}>
      {execResult && (
        <div className={`absolute top-1 left-1 right-1 z-20 text-center ${s.btnText} py-0.5 rounded font-medium ${execResult.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>{execResult.msg}</div>
      )}
      <div className="flex items-center gap-1.5">
        <HardDrive className={`${s.icon} text-slate-500 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className={`${s.text} text-slate-300 font-medium truncate`}>{point.point_name}</div>
          <div className={`${s.subText} text-slate-500 truncate`}>回路{point.loop_no}_点{point.point_no}</div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0"><div className={`${s.indicator} rounded-full ${statusColor}`} /><span className={`${s.subText} text-slate-500`}>{statusLabel}</span></div>
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => setConfirmAction('start')} disabled={running || execLoading} className={`btn-hmi-danger flex-1 flex items-center justify-center gap-1 ${s.btnPy} rounded ${s.btnText} bg-red-600/25 text-red-300 hover:bg-red-600/40 disabled:opacity-30 transition-colors border border-red-500/30 active-press`}><Play className={btnSize === 'sm' ? 'w-2.5 h-2.5' : btnSize === 'md' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />启动</button>
        <button onClick={() => setConfirmAction('stop')} disabled={!running || execLoading} className={`flex-1 flex items-center justify-center gap-1 ${s.btnPy} rounded ${s.btnText} bg-orange-600/25 text-orange-300 hover:bg-orange-600/40 disabled:opacity-30 transition-colors border border-orange-500/30 active-press`}><Square className={btnSize === 'sm' ? 'w-2.5 h-2.5' : btnSize === 'md' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />停止</button>
      </div>
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${running ? 'led-green-v2 led-pulse' : 'bg-slate-700'}`} /><span className={`${s.subText} ${running ? 'text-emerald-400' : 'text-slate-600'}`}>启动</span></div>
        <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${feedback ? 'led-blue-v2' : 'bg-slate-700'}`} /><span className={`${s.subText} ${feedback ? 'text-blue-400' : 'text-slate-600'}`}>反馈</span></div>
      </div>
      <Dialog open={!!confirmAction && !needPwd} onOpenChange={v => { if (!v) setConfirmAction(null); }}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md backdrop-blur-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-yellow-400" />设备操作确认</DialogTitle></DialogHeader>
          <div className="py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-yellow-500/30">{confirmAction === 'start' ? <Play className="w-6 h-6 text-red-400" /> : <Square className="w-6 h-6 text-orange-400" />}</div>
            <p className="text-sm text-slate-300 mb-1">{confirmAction === 'start' ? '确认启动' : '确认停止'}「<span className="text-slate-100 font-semibold">{point.point_name}</span>」？</p>
            <p className="text-xs text-slate-500">此操作需要二级密码验证</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} className="border-slate-600 text-slate-300 h-9 text-sm">取消</Button>
            <Button onClick={() => setNeedPwd(true)} className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/40 h-9 text-sm">继续</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={needPwd} onOpenChange={v => { if (!v) { setNeedPwd(false); setPwdInput(''); setPwdError(false); setConfirmAction(null); } }}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md backdrop-blur-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg"><Shield className="w-5 h-5 text-yellow-400" />二级密码验证</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-400 text-center">执行<span className="text-slate-200 font-medium">{confirmAction === 'start' ? '启动' : '停止'}</span>操作前请输入二级密码</p>
            <Input type="password" value={pwdInput} onChange={e => { setPwdInput(e.target.value); setPwdError(false); }} onKeyDown={e => e.key === 'Enter' && checkPwd()} placeholder="请输入二级密码" autoFocus className={`bg-slate-700 border ${pwdError ? 'border-red-500 text-red-300' : 'border-slate-600 text-slate-200'} text-center text-base h-11`} />
            {pwdError && <p className="text-sm text-red-400 text-center">密码错误，请重新输入</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNeedPwd(false); setPwdInput(''); setPwdError(false); setConfirmAction(null); }} className="border-slate-600 text-slate-300 h-9 text-sm">取消</Button>
            <Button onClick={checkPwd} className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/40 h-9 text-sm font-medium">验证并执行</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
