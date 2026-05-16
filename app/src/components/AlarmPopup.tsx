/**
 * ═══════════════════════════════════════════════════════════════════
 * 系统级火警报警弹窗 - 全局覆盖层
 * 当火警发生时覆盖在所有页面之上
 * ═══════════════════════════════════════════════════════════════════
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Flame,
  Phone,
  User,
  MapPin,
  Clock,
  Video,
  X,
  CheckCircle,
  Send,
  AlertTriangle,
  Building2,
  ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/core/ToastContext';
import { useAlarmPopup } from '@/core/AlarmPopupContext';

/* ───── Constants ───── */
const SECONDARY_PWD = import.meta.env.VITE_SECONDARY_VERIFY_PWD || ''; // 二次验证密码，生产环境必须在 .env 中设置

const LEVEL_MAP: Record<string, { label: string; color: string }> = {
  urgent: { label: '紧急', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
  high:   { label: '高',   color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  normal: { label: '中',   color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  low:    { label: '低',   color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
};

const TYPE_MAP: Record<string, string> = {
  fire: '火警',
  fault: '故障',
  supervisory: '监管',
  warning: '预警',
  test: '测试',
};

/* ───── Helpers ───── */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getTimerColor(seconds: number): string {
  if (seconds < 60) return 'text-emerald-400';
  if (seconds < 180) return 'text-yellow-400';
  if (seconds < 300) return 'text-orange-400';
  return 'text-red-500 animate-pulse';
}

function fmtTime(t?: string): string {
  if (!t) return '-';
  // 兼容 'YYYY-MM-DD HH:mm:ss'、ISO 8601、含毫秒等多种格式
  let normalized = t.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    normalized = normalized.replace(' ', 'T');
  }
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return t;
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${M}-${D} ${h}:${m}:${s}`;
}

/* ───── Sub-component: Personnel Card ───── */
function PersonnelCard({
  role,
  name,
  phone,
  onCall,
}: {
  role: string;
  name?: string;
  phone?: string;
  onCall: (phone: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700/30 bg-slate-800/50 px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700/50">
          <User className="h-4 w-4 text-slate-400" />
        </div>
        <div>
          <div className="text-[10px] text-slate-400">{role}</div>
          <div className="text-sm font-medium text-slate-200">
            {name || '未设置'}
          </div>
        </div>
      </div>
      {phone && (
        <button
          onClick={() => onCall(phone)}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400 transition-colors hover:bg-emerald-500/25"
          title={`拨打 ${phone}`}
          aria-label={`拨打 ${phone}`}
        >
          <Phone className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */
export default function AlarmPopup() {
  const { isOpen, closeAlarm: onClose, confirmAlarm: onConfirm, currentAlarm: data } = useAlarmPopup();
  const navigate = useNavigate();
  const { success, info, warning } = useToast();

  /* Timer */
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Password dialog */
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdError, setPwdError] = useState(false);

  /* 119 confirm dialog */
  const [call119Open, setCall119Open] = useState(false);

  /* Floor plan dialog */
  const [floorPlanOpen, setFloorPlanOpen] = useState(false);

  /* ───── Timer control ───── */
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startTimer();
    } else {
      stopTimer();
      setElapsed(0);
    }
    return () => stopTimer();
  }, [isOpen, startTimer, stopTimer]);

  /* ───── Keyboard: Escape closes (no confirm) ───── */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  /* ───── Handlers ───── */
  const handleBackdropClick = () => {
    onClose();
  };

  const openPwdDialog = () => {
    setPwdOpen(true);
    setPwdInput('');
    setPwdError(false);
  };

  const checkPwd = () => {
    if (pwdInput === SECONDARY_PWD) {
      setPwdOpen(false);
      setPwdInput('');
      setPwdError(false);
      onConfirm();
      success('值守确认成功', '报警已确认为值守状态');
    } else {
      setPwdError(true);
      warning('密码错误', '请输入正确的二级密码');
    }
  };

  const handleDispatch = () => {
    onClose();
    navigate('/duty/dispatch');
  };

  const handleCall119 = () => {
    setCall119Open(true);
  };

  const confirmCall119 = () => {
    setCall119Open(false);
    info('正在拨打 119...', '模拟火警电话已拨出');
    setTimeout(() => {
      success('拨打 119', '已模拟拨通火警电话');
    }, 1200);
  };

  const handlePhoneCall = (phone: string) => {
    if (!phone || phone === '未设置') return;
    window.location.href = `tel:${phone}`;
  };

  /* ───── Render guards ───── */
  if (!isOpen || !data) return null;

  const { alarm, unitName, unitAddress, snapshots, relatedCameras } = data;
  const levelCfg = LEVEL_MAP[alarm.level] || { label: alarm.level, color: 'bg-slate-700 text-slate-300' };
  const timerColor = getTimerColor(elapsed);
  const snapshot = snapshots[0];

  return (
    <>
      {/* ═════ Overlay ═════ */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />

        {/* Content Panel */}
        <div className="relative z-10 mx-4 w-full max-w-[900px] rounded-xl border border-red-500/30 bg-slate-900 shadow-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex max-h-[85vh] overflow-hidden rounded-xl">
            {/* ═════ Left Panel (60%) ═════ */}
            <div className="flex w-[60%] flex-col gap-3 border-r border-slate-800 p-5">
              {/* Header */}
              <div className="flex items-center gap-3">
                <Flame className="h-6 w-6 text-red-400" />
                <h2 className="text-xl font-bold text-red-400">🚨 火警报警</h2>
                <Badge
                  variant="outline"
                  className={`text-[11px] ${levelCfg.color}`}
                >
                  {levelCfg.label}
                </Badge>
              </div>

              {/* Unit name */}
              <div className="text-2xl font-extrabold tracking-tight text-slate-100">
                {unitName || alarm.unitName || '未知单位'}
              </div>

              {/* Countdown timer */}
              <div className="flex items-center gap-3 rounded-lg border border-slate-700/30 bg-slate-800/50 px-4 py-3">
                <Clock className="h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-[10px] text-slate-400">已持续时长</div>
                  <div className={`font-mono text-2xl font-bold ${timerColor}`}>
                    {formatElapsed(elapsed)}
                  </div>
                </div>
                {/* Milestone dots */}
                <div className="ml-auto flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${elapsed < 60 ? 'bg-emerald-400' : 'bg-emerald-400/30'}`} />
                  <div className={`h-2 w-2 rounded-full ${elapsed >= 60 && elapsed < 180 ? 'bg-yellow-400' : 'bg-yellow-400/30'}`} />
                  <div className={`h-2 w-2 rounded-full ${elapsed >= 180 && elapsed < 300 ? 'bg-orange-400' : 'bg-orange-400/30'}`} />
                  <div className={`h-2 w-2 rounded-full ${elapsed >= 300 ? 'bg-red-500 animate-pulse' : 'bg-red-500/30'}`} />
                </div>
              </div>

              {/* Alarm meta */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-700/30 bg-slate-800/50 px-3 py-2">
                  <div className="text-[10px] text-slate-400">报警时间</div>
                  <div className="text-sm text-slate-200">{fmtTime(alarm.createdAt)}</div>
                </div>
                <div className="rounded-lg border border-slate-700/30 bg-slate-800/50 px-3 py-2">
                  <div className="text-[10px] text-slate-400">报警类型</div>
                  <div className="text-sm text-slate-200">{TYPE_MAP[alarm.type] || alarm.type}</div>
                </div>
                <div className="col-span-2 rounded-lg border border-slate-700/30 bg-slate-800/50 px-3 py-2">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <MapPin className="h-3 w-3" />
                    报警位置
                  </div>
                  <div className="text-sm text-slate-200">{alarm.location}</div>
                  {unitAddress && (
                    <div className="text-[11px] text-slate-500">{unitAddress}</div>
                  )}
                </div>
              </div>

              {/* Device name */}
              {alarm.deviceName && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-700/30 bg-slate-800/50 px-3 py-2">
                  <Video className="h-4 w-4 text-slate-500" />
                  <div>
                    <div className="text-[10px] text-slate-400">报警设备</div>
                    <div className="text-sm font-medium text-slate-200">{alarm.deviceName}</div>
                  </div>
                </div>
              )}

              {/* Snapshot */}
              <div className="flex-1 min-h-0">
                {snapshot?.imageUrl ? (
                  <div className="relative h-full min-h-[140px] overflow-hidden rounded-lg border border-slate-700/30">
                    <img
                      src={snapshot.imageUrl}
                      alt={snapshot.cameraName || '报警抓拍'}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {snapshot.cameraName && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-[10px] text-slate-300">
                        {snapshot.cameraName}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700/40 bg-slate-800/30">
                    <ImageIcon className="h-8 w-8 text-slate-600" />
                    <span className="text-[11px] text-slate-500">暂无抓拍图片</span>
                  </div>
                )}
              </div>

              {/* Floor plan button */}
              <Button
                variant="outline"
                className="h-9 w-full border-slate-600 bg-slate-800/50 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                onClick={() => setFloorPlanOpen(true)}
              >
                <Building2 className="mr-1.5 h-3.5 w-3.5" />
                建筑平面图
              </Button>
            </div>

            {/* ═════ Right Panel (40%) ═════ */}
            <div className="flex w-[40%] flex-col gap-3 p-5">
              {/* Personnel section */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  值班人员信息
                </div>
                <div className="flex flex-col gap-2">
                  <PersonnelCard
                    role="消控室负责人"
                    name={data.managerName}
                    phone={data.managerPhone}
                    onCall={handlePhoneCall}
                  />
                  <PersonnelCard
                    role="消控室管理人"
                    name={data.dutyOfficerName}
                    phone={data.dutyOfficerPhone}
                    onCall={handlePhoneCall}
                  />
                  <PersonnelCard
                    role="消防安全管理人"
                    name={data.safetyOfficerName}
                    phone={data.safetyOfficerPhone}
                    onCall={handlePhoneCall}
                  />
                </div>
              </div>

              {/* Actions section */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <CheckCircle className="h-3.5 w-3.5 text-slate-400" />
                  操作
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    className="h-10 w-full justify-center gap-2 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                    onClick={openPwdDialog}
                  >
                    <CheckCircle className="h-4 w-4" />
                    值守确认
                  </Button>
                  <Button
                    className="h-10 w-full justify-center gap-2 bg-blue-600 text-xs text-white hover:bg-blue-700"
                    onClick={handleDispatch}
                  >
                    <Send className="h-4 w-4" />
                    派单处置
                  </Button>
                  <Button
                    className="h-10 w-full justify-center gap-2 bg-red-600 text-xs text-white hover:bg-red-700"
                    onClick={handleCall119}
                  >
                    <Phone className="h-4 w-4" />
                    拨打 119
                  </Button>
                </div>
              </div>

              {/* Related cameras */}
              {relatedCameras.length > 0 && (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Video className="h-3.5 w-3.5 text-slate-400" />
                    相关摄像头
                    <span className="rounded-full bg-slate-700/50 px-1.5 py-0 text-[10px] text-slate-400">
                      {relatedCameras.length}
                    </span>
                  </div>
                  <div className="flex max-h-[140px] flex-col gap-1 overflow-y-auto pr-1">
                    {relatedCameras.map(cam => (
                      <div
                        key={cam.id}
                        className="flex items-center gap-2 rounded-md border border-slate-700/20 bg-slate-800/30 px-2.5 py-1.5"
                      >
                        <Video className="h-3 w-3 flex-shrink-0 text-slate-500" />
                        <span className="truncate text-[11px] text-slate-300">{cam.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═════ Password Dialog (值守确认) ═════ */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="border-slate-700 bg-slate-900 text-slate-100 sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-slate-100">
              值守确认 - 二级密码验证
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Label className="mb-1.5 block text-[11px] text-slate-400">
              请输入二级密码
            </Label>
            <Input
              type="password"
              value={pwdInput}
              onChange={e => {
                setPwdInput(e.target.value);
                setPwdError(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') checkPwd();
              }}
              placeholder="请输入密码"
              className={`h-9 border-slate-600 bg-slate-800 text-sm text-slate-100 placeholder:text-slate-500 ${
                pwdError ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
              autoFocus
            />
            {pwdError && (
              <p className="mt-1.5 text-[11px] text-red-400">密码错误，请重新输入</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPwdOpen(false);
                setPwdInput('');
                setPwdError(false);
              }}
              className="h-8 border-slate-600 text-xs text-slate-300 hover:bg-slate-800"
            >
              取消
            </Button>
            <Button
              onClick={checkPwd}
              className="h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═════ Call 119 Confirm Dialog ═════ */}
      <Dialog open={call119Open} onOpenChange={setCall119Open}>
        <DialogContent className="border-red-500/20 bg-slate-900 text-slate-100 sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-red-400">
              <AlertTriangle className="h-4 w-4" />
              确认拨打 119
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs leading-relaxed text-slate-400">
            <p>您即将拨打火警电话 <strong className="text-slate-200">119</strong>。</p>
            <p className="mt-1">请确认现场确实发生火灾或紧急情况后再拨打。</p>
            <div className="mt-2 rounded-md border border-red-500/20 bg-red-500/10 p-2 text-[11px] text-red-300">
              单位：{unitName || alarm.unitName || '未知单位'}
              <br />
              位置：{alarm.location}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCall119Open(false)}
              className="h-8 border-slate-600 text-xs text-slate-300 hover:bg-slate-800"
            >
              取消
            </Button>
            <Button
              onClick={confirmCall119}
              className="h-8 bg-red-600 text-xs text-white hover:bg-red-700"
            >
              确认拨打
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═════ Floor Plan Dialog ═════ */}
      <Dialog open={floorPlanOpen} onOpenChange={setFloorPlanOpen}>
        <DialogContent className="max-h-[80vh] max-w-[720px] border-slate-700 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Building2 className="h-4 w-4 text-slate-400" />
              建筑平面图
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed border-slate-700/40 bg-slate-800/30 py-8 relative overflow-hidden">
            {data.floorPlan?.image_url ? (
              <img
                src={data.floorPlan.image_url}
                alt="建筑平面图"
                className="w-full h-full object-contain max-h-[400px]"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="text-center">
                <Building2 className="mx-auto h-10 w-10 text-slate-600" />
                <p className="mt-2 text-xs text-slate-500">暂无建筑平面图</p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  单位：{unitName || alarm.unitName || '未知单位'}
                </p>
              </div>
            )}
            {data.floorPlan?.x !== undefined && data.floorPlan?.y !== undefined && (
              <div
                className="absolute w-4 h-4 rounded-full bg-red-500 border-2 border-white animate-pulse"
                style={{ left: `${data.floorPlan.x}%`, top: `${data.floorPlan.y}%`, transform: 'translate(-50%, -50%)' }}
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFloorPlanOpen(false)}
              className="h-8 border-slate-600 text-xs text-slate-300 hover:bg-slate-800"
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
