/**
 * ═══════════════════════════════════════════════════════════════════
 * 系统级报警弹窗 - 全局覆盖层（新版设计）
 * ═══════════════════════════════════════════════════════════════════
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Flame, Phone, X, MapPin, Clock, Video, CheckCircle2, Circle,
  Building2, Mic, ChevronRight, Play, Volume2, Radio,
  FileText, LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/core/ToastContext';
import { useAlarmPopup } from '@/core/AlarmPopupContext';
import { alarmService } from '@/api/services';
import { getErrorMessage } from '@/types/api';
import { logger } from '@/lib/logger';

/* ───── 类型映射 ───── */
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: '待处理', color: 'text-red-400', bg: 'bg-red-500/10' },
  confirmed: { label: '确认中', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  handled: { label: '已处理', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ignored: { label: '误报', color: 'text-slate-400', bg: 'bg-slate-500/10' },
};

const ALARM_TYPE_MAP: Record<string, { label: string; color: string }> = {
  fire: { label: '火警', color: 'text-red-400' },
  fault: { label: '故障', color: 'text-amber-400' },
  warning: { label: '预警', color: 'text-orange-400' },
  supervisory: { label: '屏蔽', color: 'text-slate-400' },
  test: { label: '测试', color: 'text-blue-400' },
};

const TYPE_NAME_MAP: Record<string, string> = {
  fire: '火警', fault: '故障', supervisory: '监管', warning: '预警', test: '测试',
};

/* ───── 辅助函数 ───── */
function fmtDateTime(t?: string | Date): string {
  if (!t) return '-';
  const d = new Date(t);
  if (isNaN(d.getTime())) return String(t);
  const y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${M}-${D} ${h}:${m}:${s}`;
}

function fmtShortDate(t?: string | Date): string {
  if (!t) return '-';
  const d = new Date(t);
  if (isNaN(d.getTime())) return String(t);
  const y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}/${M}/${D} ${h}:${m}:${s}`;
}

/* ───── 流程步骤组件 ───── */
function FlowSteps({ status }: { status: string }) {
  // status: 'new'=待处理 'confirmed'=确认中 'handled'=已处理 'ignored'=误报
  const steps = [
    { title: '已接警', desc: '发生报警值守人员进行报警', icon: CheckCircle2 },
    { title: '电话拨打', desc: '拨打单位/场所相关人员电话进行火警通知', icon: Phone },
    { title: '电话再次确认', desc: '若未进行火警确认则三分钟后继续电话确认', icon: Phone },
    { title: '值守确认', desc: '填写经与现场值守确认信息', icon: CheckCircle2 },
  ];

  // 根据 status 确定当前步骤索引
  let currentIdx = 0;
  if (status === 'new') currentIdx = 1; // 待处理 -> 电话拨打进行中
  else if (status === 'confirmed') currentIdx = 2; // 确认中 -> 电话再次确认进行中
  else if (status === 'handled' || status === 'ignored') currentIdx = 3; // 已处理/误报 -> 值守确认完成

  return (
    <div className="flex items-start justify-between gap-2 px-4 py-3">
      {steps.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const Icon = step.icon;
        return (
          <div key={idx} className="flex flex-1 flex-col items-center text-center">
            <div className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
              isDone
                ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                : isCurrent
                ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                : 'border-slate-600 bg-slate-800/50 text-slate-500'
            }`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className={`text-xs font-medium ${isCurrent ? 'text-amber-400' : isDone ? 'text-blue-400' : 'text-slate-500'}`}>
              {step.title}
            </div>
            <div className="mt-0.5 text-[10px] leading-tight text-slate-500 max-w-[140px]">
              {step.desc}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───── 信息行组件 ───── */
function InfoRow({
  label, value, icon, highlight, green, onClick, fullWidth
}: {
  label: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
  highlight?: boolean;
  green?: boolean;
  onClick?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 py-2 ${fullWidth ? 'col-span-2' : ''}`}>
      <span className="w-20 shrink-0 text-xs text-slate-400">{label}</span>
      <span
        className={`flex-1 text-sm font-medium ${
          highlight ? 'text-red-400' : green ? 'text-emerald-400' : 'text-slate-200'
        } ${onClick ? 'cursor-pointer hover:underline' : ''}`}
        onClick={onClick}
      >
        {icon && <span className="mr-1 inline-flex align-text-bottom">{icon}</span>}
        {value || '-'}
      </span>
    </div>
  );
}

/* ───── 时间线组件 ───── */
function Timeline({ records }: { records: any[] }) {
  // 预定义工作流步骤
  const workflowSteps = [
    { key: 'receive', title: '接警', desc: '接到报警通知', icon: CheckCircle2 },
    { key: 'notify', title: '通知', desc: '拨打单位值班电话通知火警', icon: CheckCircle2 },
    { key: 'verify', title: '确认', desc: '现场值守人员确认报警信息', icon: Clock },
    { key: 'handle', title: '处置', desc: '等待处理', icon: Clock },
  ];

  // 根据 dispatchRecords 判断各步骤状态
  const stepStatus = new Map<string, { done: boolean; doing: boolean; detail?: string; time?: string; handler?: string }>();

  // 默认状态：接警已完成（alarm创建即算接警）
  stepStatus.set('receive', { done: true, doing: false });
  stepStatus.set('notify', { done: false, doing: false });
  stepStatus.set('verify', { done: false, doing: false });
  stepStatus.set('handle', { done: false, doing: false });

  // 根据实际 dispatchRecords 更新状态
  records.forEach((r) => {
    if (r.phase === 'receive') {
      stepStatus.set('receive', {
        done: true,
        doing: false,
        detail: r.dispatch_note || `接到${r.unit_name || ''}报警`,
        time: r.created_at,
        handler: r.handler_name || '系统',
      });
    } else if (r.phase === 'verify') {
      stepStatus.set('notify', { done: true, doing: false, detail: '拨打单位值班电话通知火警', handler: '系统' });
      stepStatus.set('verify', {
        done: r.status === 'resolved' || r.status === 'confirmed_false',
        doing: r.status === 'handling',
        detail: r.verify_note || '现场值守人员确认报警信息',
        time: r.verify_time || r.created_at,
        handler: r.handler_name || '系统',
      });
    } else if (r.phase === 'archive') {
      stepStatus.set('handle', {
        done: true,
        doing: false,
        detail: r.resolve_note || '已处理',
        time: r.resolve_time || r.created_at,
        handler: r.handler_name || '系统',
      });
    }
  });

  // 如果 verify 在处理中，notify 应该已完成
  const verifyStatus = stepStatus.get('verify');
  if (verifyStatus?.doing || verifyStatus?.done) {
    stepStatus.set('notify', { done: true, doing: false, detail: '拨打单位值班电话通知火警', handler: '系统' });
  }

  return (
    <div className="flex flex-col gap-0 py-2">
      {workflowSteps.map((step, idx) => {
        const status = stepStatus.get(step.key) || { done: false, doing: false };
        const isLast = idx === workflowSteps.length - 1;
        const Icon = status.done ? CheckCircle2 : status.doing ? Radio : Clock;
        return (
          <div key={step.key} className="flex gap-3">
            {/* 左侧时间线 */}
            <div className="flex flex-col items-center">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                status.done
                  ? 'bg-blue-500/20 text-blue-400'
                  : status.doing
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-slate-700/30 text-slate-500'
              }`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              {!isLast && <div className="my-1 h-full w-px bg-slate-700/30" />}
            </div>
            {/* 右侧内容 */}
            <div className={`pb-4 ${isLast ? '' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">{step.title}</span>
                {status.done && (
                  <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-400">已完成</span>
                )}
                {status.doing && (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">进行中</span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                {status.detail || step.desc}
              </div>
              {(status.handler || status.time) && (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                  {status.handler && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded-full bg-slate-600 text-center text-[8px] leading-3 text-slate-300">👤</span>
                      {status.handler}
                    </span>
                  )}
                  {status.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {status.time}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───── 处理记录组件 ───── */
function HandleRecords({ records }: { records: any[] }) {
  if (!records || records.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-500">
        <FileText className="h-8 w-8 text-slate-600" />
        <span className="text-xs">暂无处理记录</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      {records.map((r) => {
        const phaseMap: Record<string, string> = {
          receive: '接警', verify: '核实', handling: '处置', archive: '归档',
        };
        const statusMap: Record<string, string> = {
          pending: '待处理', handling: '处理中', resolved: '已解决', confirmed_false: '确认误报',
        };
        return (
          <div key={r.id} className="rounded-lg border border-slate-700/20 bg-slate-800/30 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">{phaseMap[r.phase] || r.phase}</span>
              <span className="text-[11px] text-slate-400">{statusMap[r.status] || r.status}</span>
            </div>
            {r.handler_name && (
              <div className="mt-1 text-xs text-slate-400">处理人：{r.handler_name}</div>
            )}
            {r.dispatch_note && (
              <div className="mt-1 text-xs text-slate-400">备注：{r.dispatch_note}</div>
            )}
            {r.created_at && (
              <div className="mt-1 text-[11px] text-slate-500">{r.created_at}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */
export default function AlarmPopup() {
  const { isOpen, closeAlarm: onClose, currentAlarm: data } = useAlarmPopup();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  /* ───── 状态 ───── */
  const [activeTab, setActiveTab] = useState<'duty' | 'handle'>('duty');
  const [confirmType, setConfirmType] = useState<'fire' | 'false' | 'test' | 'maint'>('fire');
  const [remark, setRemark] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [floorPlanOpen, setFloorPlanOpen] = useState(false);

  /* ───── 录音 ───── */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        logger.info('[AlarmPopup] 录音完成', { size: blob.size });
        // TODO: 上传录音
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      logger.error('[AlarmPopup] 录音失败', err);
      showError('录音失败', '请检查麦克风权限');
    }
  }, [showError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
  }, []);

  /* ───── 键盘 Escape ───── */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  /* ───── 提交值守确认 ───── */
  const handleSubmit = useCallback(async () => {
    if (!data) return;
    setIsSubmitting(true);
    try {
      const resultMap: Record<string, string> = {
        fire: '真实火警',
        false: '误报',
        test: '测试',
        maint: '维保测试',
      };
      const resultText = `${resultMap[confirmType]}${remark ? ' - ' + remark : ''}`;

      // 根据类型调用不同接口
      if (confirmType === 'false') {
        await alarmService.dismiss(data.alarm.id, resultText);
      } else {
        await alarmService.handle(data.alarm.id, resultText);
      }

      success('提交成功', '值守确认已提交');
      onClose();
    } catch (err) {
      logger.error('值守确认提交失败', err);
      showError('提交失败', getErrorMessage(err, '请检查网络或稍后重试'));
    } finally {
      setIsSubmitting(false);
    }
  }, [data, confirmType, remark, success, showError, onClose]);

  /* ───── 拨打电话 ───── */
  const handleCall = (phone?: string) => {
    if (!phone || phone === '-') return;
    window.location.href = `tel:${phone}`;
  };

  /* ───── Render guards ───── */
  if (!isOpen || !data) return null;

  const { alarm, unitName, unitAddress, relatedCameras, floorPlan, dispatchRecords = [] } = data;
  const statusCfg = STATUS_MAP[alarm.status as string] || STATUS_MAP['new'];
  const typeCfg = ALARM_TYPE_MAP[alarm.type as string] || { label: TYPE_NAME_MAP[alarm.type as string] || String(alarm.type), color: 'text-slate-400' };

  // 消控室信息
  const controlRoomName = data.controlRoom?.roomName;
  const controlRoomManager = data.controlRoom?.dutyPerson || data.controlRoom?.dutyPhone;
  const dutyPhone = data.controlRoom?.dutyPhone || data.controlRoom?.duty_phone;

  // 单位联系人
  const unitContactName = data.unitContactName || data.managerName;
  const unitContactPhone = data.unitContactPhone || data.managerPhone;

  return (
    <>
      {/* ═════ Overlay ═════ */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" role="dialog" aria-modal="true">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

        {/* Content Panel */}
        <div className="relative z-10 mx-4 flex h-[90vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-slate-700/50 bg-[#1a1f2e] shadow-2xl">
          {/* ═════ Header ═════ */}
          <div className="flex items-center justify-between border-b border-slate-700/30 px-5 py-3">
            <div className="flex items-center gap-3">
              <Flame className="h-5 w-5 text-red-400" />
              <span className="text-base font-bold text-slate-100">报警详情</span>
              <span className="text-xs text-slate-500">工单编号：{alarm.alarmNo || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-slate-600 bg-slate-800/50 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                onClick={() => setFloorPlanOpen(true)}
              >
                <LayoutDashboard className="mr-1 h-3.5 w-3.5" />
                查看平面图
              </Button>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ═════ Flow Steps ═════ */}
          <div className="border-b border-slate-700/30">
            <FlowSteps status={alarm.status as string} />
          </div>

          {/* ═════ Main Content ═════ */}
          <div className="flex flex-1 overflow-hidden">
            {/* ═════ Left Panel ═════ */}
            <div className="flex w-[55%] flex-col border-r border-slate-700/30">
              {/* 信息网格 */}
              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-x-4">
                  <InfoRow label="报警单位" value={unitName || alarm.unitName || '未知单位'} />
                  <InfoRow
                    label="处理状态"
                    value={statusCfg.label}
                    highlight={alarm.status === 'new'}
                  />
                  <InfoRow label="报警时间" value={fmtDateTime(alarm.createdAt)} />
                  <InfoRow
                    label="报警类型"
                    value={
                      <span className="flex items-center gap-1">
                        <span className={typeCfg.color}>{typeCfg.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                      </span>
                    }
                    onClick={() => navigate('/alarms/history')}
                  />
                  <InfoRow
                    label="报警位置"
                    value={alarm.location || '-'}
                    icon={<MapPin className="h-3.5 w-3.5 text-red-400" />}
                    fullWidth
                  />
                  <InfoRow
                    label="消控室"
                    value={controlRoomName || '未配置消控室'}
                  />
                  <InfoRow label="消控室负责人" value={controlRoomManager} />
                  <InfoRow label="值班电话" value={dutyPhone} />
                  <InfoRow label="单位联系人" value={unitContactName} />
                  <InfoRow label="手机号" value={data.dutyOfficerPhone} />
                  <InfoRow
                    label="单位地址"
                    value={unitAddress || '-'}
                    icon={<Building2 className="h-3.5 w-3.5 text-slate-400" />}
                    fullWidth
                  />
                  <InfoRow
                    label="联系电话"
                    value={unitContactPhone}
                    icon={<Phone className="h-3.5 w-3.5 text-emerald-400" />}
                    green
                    onClick={() => handleCall(unitContactPhone)}
                  />
                </div>
              </div>

              {/* 值守确认区域 */}
              <div className="border-t border-slate-700/30 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">值守确认</span>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
                      isRecording
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <Mic className="h-3.5 w-3.5" />
                    {isRecording ? '停止录音' : '录音'}
                  </button>
                </div>

                {/* 单选 */}
                <div className="mb-3 flex flex-wrap gap-3">
                  {[
                    { key: 'fire' as const, label: '真实火警' },
                    { key: 'false' as const, label: '误报' },
                    { key: 'test' as const, label: '测试' },
                    { key: 'maint' as const, label: '维保测试' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700/30 bg-slate-800/30 px-3 py-2 transition-colors hover:bg-slate-800/50"
                      onClick={() => setConfirmType(item.key)}
                    >
                      {confirmType === item.key ? (
                        <CheckCircle2 className="h-4 w-4 text-blue-400" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-500" />
                      )}
                      <span className={`text-xs ${confirmType === item.key ? 'text-slate-200' : 'text-slate-400'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>

                {/* 备注 */}
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="请输入备注信息..."
                  className="h-16 w-full resize-none rounded-lg border border-slate-700/30 bg-slate-800/30 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
                />
              </div>
            </div>

            {/* ═════ Right Panel ═════ */}
            <div className="flex w-[45%] flex-col">
              {/* 地址+时间 */}
              <div className="flex items-center justify-between border-b border-slate-700/30 px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-blue-400" />
                  <span className="truncate">{unitAddress || '未设置地址'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{fmtShortDate(new Date())}</span>
                </div>
              </div>

              {/* 视频区域 */}
              <div className="relative m-4 flex-1 overflow-hidden rounded-lg border border-slate-700/30 bg-black">
                {/* 视频头部 */}
                <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    <span className="text-[10px] font-medium text-white">REC</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Camera 01</span>
                </div>

                {/* 视频内容 */}
                {relatedCameras.length > 0 && relatedCameras[0].streamUrl ? (
                  <video
                    src={relatedCameras[0].streamUrl}
                    className="h-full w-full object-contain"
                    autoPlay
                    muted
                    playsInline
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2">
                    <Video className="h-10 w-10 text-slate-600" />
                    <span className="text-sm text-slate-500">未配置关联摄像头</span>
                    <span className="text-xs text-slate-600">请在设备管理中绑定摄像头</span>
                  </div>
                )}

                {/* 视频控制栏 */}
                {relatedCameras.length > 0 && relatedCameras[0].streamUrl && (
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/50 px-3 py-2">
                    <button className="text-white/70 hover:text-white">
                      <Play className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-white/70" />
                    </div>
                  </div>
                )}

                {/* 消控室标签 */}
                <div className="absolute bottom-4 left-3 rounded bg-black/60 px-2 py-1 text-[10px] text-slate-300">
                  消控室
                </div>
              </div>

              {/* 标签页 */}
              <div className="mx-4 mb-2 flex border-b border-slate-700/30">
                <button
                  onClick={() => setActiveTab('duty')}
                  className={`relative px-4 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'duty' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  值守记录
                  {activeTab === 'duty' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('handle')}
                  className={`relative px-4 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'handle' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  处理记录
                  {activeTab === 'handle' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
                  )}
                </button>
              </div>

              {/* 标签页内容 */}
              <div className="mx-4 mb-4 flex-1 overflow-y-auto">
                {activeTab === 'duty' ? (
                  <Timeline records={dispatchRecords} />
                ) : (
                  <HandleRecords records={dispatchRecords} />
                )}
              </div>
            </div>
          </div>

          {/* ═════ Footer ═════ */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-700/30 px-5 py-3">
            <Button
              variant="outline"
              className="h-9 border-slate-600 bg-slate-800/50 px-6 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              onClick={onClose}
            >
              关闭
            </Button>
            <Button
              className="h-9 bg-blue-600 px-6 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? '提交中...' : '提交'}
            </Button>
          </div>
        </div>
      </div>

      {/* ═════ Floor Plan Dialog ═════ */}
      {floorPlanOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFloorPlanOpen(false)} />
          <div className="relative z-10 w-full max-w-[720px] rounded-xl border border-slate-700 bg-[#1a1f2e] p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Building2 className="h-4 w-4 text-slate-400" />
                建筑平面图
              </div>
              <button onClick={() => setFloorPlanOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed border-slate-700/40 bg-slate-800/30 py-8 relative overflow-hidden">
              {floorPlan?.image_url ? (
                <img
                  src={floorPlan.image_url}
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
              {floorPlan?.x !== undefined && floorPlan?.y !== undefined && (
                <div
                  className="absolute w-4 h-4 rounded-full bg-red-500 border-2 border-white animate-pulse"
                  style={{ left: `${floorPlan.x}%`, top: `${floorPlan.y}%`, transform: 'translate(-50%, -50%)' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
