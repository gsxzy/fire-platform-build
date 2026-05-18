import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { HardDrive, Play, Square, Shield } from 'lucide-react';
import { controlRoomService } from '@/api/services';
import type { MultilinePoint } from '../types';
import { SECONDARY_PWD } from '../utils';

interface MultilineCardProps {
  point: MultilinePoint;
  hostId?: number;
  btnSize?: 'sm' | 'md' | 'lg';
  api?: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultApi: any = controlRoomService;

const sizeConfig = {
  sm: { pad: 'p-1.5', gap: 'gap-1', icon: 'w-3 h-3', text: 'text-[10px]', btnText: 'text-[9px]', btnPy: 'py-0.5', btnIcon: 'w-2.5 h-2.5', indicator: 'w-1.5 h-1.5', indicatorText: 'text-[7px]' },
  md: { pad: 'p-2', gap: 'gap-1.5', icon: 'w-3.5 h-3.5', text: 'text-[11px]', btnText: 'text-[10px]', btnPy: 'py-1', btnIcon: 'w-3 h-3', indicator: 'w-2 h-2', indicatorText: 'text-[8px]' },
  lg: { pad: 'p-2.5', gap: 'gap-2', icon: 'w-4 h-4', text: 'text-xs', btnText: 'text-[11px]', btnPy: 'py-1.5', btnIcon: 'w-3.5 h-3.5', indicator: 'w-2.5 h-2.5', indicatorText: 'text-[9px]' },
};

export default function MultilineCard({ point, hostId, btnSize = 'md', api = defaultApi }: MultilineCardProps) {
  const [running, setRunning] = useState(point.status === 1);
  const [feedback, setFeedback] = useState(point.feedback_status === 1);
  const [fault] = useState(point.fault_status === 1);
  const [confirmAction, setConfirmAction] = useState<'start' | 'stop' | null>(null);
  const [needPwd, setNeedPwd] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdError, setPwdError] = useState(false);
  const [execLoading, setExecLoading] = useState(false);
  const [execResult, setExecResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [opAnim, setOpAnim] = useState(false);

  const s = sizeConfig[btnSize];

  const checkPwd = () => {
    if (pwdInput === SECONDARY_PWD) {
      setNeedPwd(false); setPwdInput(''); setPwdError(false);
      confirmAction === 'start' ? doStart() : doStop();
    } else { setPwdError(true); }
  };

  const doStart = async () => {
    setExecLoading(true); setOpAnim(true);
    try {
      await api.controlMultiline(hostId ?? 0, point.id, 'start');
      setRunning(true); setFeedback(true);
      setExecResult({ type: 'success', msg: '启动指令下发成功' });
    } catch (e) { setExecResult({ type: 'error', msg: '启动指令下发失败' }); }
    finally { setExecLoading(false); setTimeout(() => { setExecResult(null); setOpAnim(false); }, 3000); }
  };
  const doStop = async () => {
    setExecLoading(true); setOpAnim(true);
    try {
      await api.controlMultiline(hostId ?? 0, point.id, 'stop');
      setRunning(false); setFeedback(false);
      setExecResult({ type: 'success', msg: '停止指令下发成功' });
    } catch (e) { setExecResult({ type: 'error', msg: '停止指令下发失败' }); }
    finally { setExecLoading(false); setTimeout(() => { setExecResult(null); setOpAnim(false); }, 3000); }
  };

  return (
    <div className={`relative tech-card-v2 ${s.pad} flex flex-col ${s.gap} hover:scale-[1.01] corner-accent-v2 ${opAnim ? 'animate-scale-in' : ''}`}>
      {execResult && (
        <div className={`absolute top-1 left-1 right-1 z-20 text-center ${s.btnText} py-0.5 rounded font-medium ${execResult.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>{execResult.msg}</div>
      )}
      <div className="flex items-center justify-between">
        <HardDrive className={`${s.icon} text-slate-500`} />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${running ? 'led-green-v2 led-pulse' : 'bg-slate-700'}`} /><span className={`${s.indicatorText} ${running ? 'text-emerald-400' : 'text-slate-500'}`}>启</span></div>
          <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${feedback ? 'led-blue-v2' : 'bg-slate-700'}`} /><span className={`${s.indicatorText} ${feedback ? 'text-blue-400' : 'text-slate-500'}`}>反</span></div>
          <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${fault ? 'led-red-v2 led-blink' : 'bg-slate-700'}`} /><span className={`${s.indicatorText} ${fault ? 'text-red-400' : 'text-slate-500'}`}>故</span></div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <HardDrive className={`${s.icon} text-slate-500 flex-shrink-0`} />
        <div className={`${s.text} text-slate-300 font-medium truncate leading-tight`}>{point.point_name}</div>
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => setConfirmAction('start')} disabled={running || execLoading} className={`btn-hmi-danger flex-1 flex items-center justify-center gap-1 ${s.btnPy} rounded ${s.btnText} bg-red-600/25 text-red-300 hover:bg-red-600/40 disabled:opacity-30 transition-colors border border-red-500/30 active-press`}><Play className={s.btnIcon} />启动</button>
        <button onClick={() => setConfirmAction('stop')} disabled={!running || execLoading} className={`flex-1 flex items-center justify-center gap-1 ${s.btnPy} rounded ${s.btnText} bg-orange-600/25 text-orange-300 hover:bg-orange-600/40 disabled:opacity-30 transition-colors border border-orange-500/30 active-press`}><Square className={s.btnIcon} />停止</button>
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
