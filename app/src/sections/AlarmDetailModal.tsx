import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Phone, MapPin, Video, Play, Clock, User,
  CheckCircle, ChevronRight, Flame, AlertTriangle, Bell,
  Shield, Radio, MessageSquare, Mic, Square,
  Loader2, Building2, MapPinned
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { alarmService } from '@/api/services';
import { getStream } from '@/api/videoService';
import { useToast } from '@/core/ToastContext';

/* ===== Types ===== */
interface DutyRecord {
  stage: string;
  person: string;
  time: string;
  action: string;
  completed: boolean;
}

interface ProcessStep {
  label: string;
  desc: string;
  completed: boolean;
  active: boolean;
}

interface AlarmDetailModalProps {
  alarm: any;
  onClose: () => void;
}

/* ===== Helper: generate process steps ===== */
function generateProcess(alarmStatus: string): ProcessStep[] {
  const st = alarmStatus || 'new';
  return [
    { label: '已接警', desc: '发生报警值守人员进行报警', completed: true, active: false },
    { label: '电话拨打', desc: '拨打单位/场所相关人员电话进行火警通知', completed: st !== 'new', active: st === 'new' },
    { label: '电话再次确认', desc: '若未进行火警确认则三分钟后继续电话确认', completed: st === 'confirmed' || st === 'handled' || st === 'ignored', active: st === 'handling' },
    { label: '值守确认', desc: '填写经与现场值守确认信息', completed: st === 'confirmed' || st === 'handled' || st === 'ignored', active: false },
  ];
}

/* ===== Helper: generate duty records ===== */
function generateDutyRecords(detail: any): DutyRecord[] {
  const unitName = detail.unit_name || detail.unit?.unit_name || '未知单位';
  const deviceName = detail.device_name || '未知设备';
  const st = detail.status;
  const handler = detail.handler_name || detail.handler || '-';
  const createdAt = detail.createdAt || '-';
  return [
    { stage: '接警', person: '系统', time: createdAt, action: `接到${unitName}${deviceName}报警`, completed: true },
    { stage: '通知', person: '系统', time: '-', action: '拨打单位值班电话通知火警', completed: st !== 'new' },
    { stage: '确认', person: handler, time: detail.confirm_time || '-', action: '现场值守人员确认报警信息', completed: st === 'confirmed' || st === 'handled' || st === 'ignored' },
    { stage: '处置', person: handler, time: detail.handle_time || '-', action: st === 'confirmed' ? '确认为真实火警，启动应急预案' : st === 'ignored' ? '确认为误报，记录归档' : '等待处理', completed: st === 'handled' || st === 'ignored' },
  ];
}

/* ===== Status label/color helper ===== */
function getStatusInfo(status: string | number) {
  const s = String(status).toLowerCase();
  if (s === 'new' || s === '0') return { label: '待处理', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  if (s === 'confirmed' || s === '1') return { label: '已确认', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
  if (s === 'handled' || s === '2') return { label: '已处理', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  if (s === 'ignored' || s === '3') return { label: '已忽略', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
  return { label: '待处理', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
}

/* ===== Type badge helper ===== */
function getAlarmTypeInfo(type: string | number) {
  const t = String(type).toLowerCase();
  if (t === 'fire' || t === '1') return { label: '火警', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Flame };
  if (t === 'fault' || t === '2') return { label: '故障', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertTriangle };
  if (t === 'warning' || t === '3') return { label: '预警', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Shield };
  if (t === 'supervisory' || t === '4') return { label: '监管', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Bell };
  return { label: '未知', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Radio };
}

export default function AlarmDetailModal({ alarm, onClose }: AlarmDetailModalProps) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'duty' | 'handle'>('duty');
  const [confirmType, setConfirmType] = useState<string>('');
  const [remark, setRemark] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { error: showError } = useToast();

  /* ── fetch detail ── */
  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await alarmService.getDetail(String(alarm.id));
      if (res.code === 200 && res.data) {
        setDetail(res.data);
        setConfirmType('');
        setRemark('');
        // load video stream if camera available
        const cameras = res.data.relatedCameras || [];
        if (cameras.length > 0) {
          const cam = cameras[0];
          if (cam.deviceId && cam.channelId) {
            loadVideoStream(cam.deviceId, cam.channelId);
          }
        }
      } else {
        showError('加载失败', res.msg || '无法获取告警详情');
      }
    } catch (e: any) {
      showError('加载告警详情失败', e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  }, [alarm.id, showError]);

  useEffect(() => {
    fetchDetail();
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [fetchDetail, onClose]);

  /* ── video stream ── */
  const loadVideoStream = async (deviceId: string, channelId: string) => {
    setVideoLoading(true);
    try {
      const stream = await getStream(deviceId, channelId);
      const url = stream.streamUrl || stream.flv || stream.hls || stream.wsFlv || '';
      setVideoUrl(url);
    } catch (e: any) {
      console.error('[Video] 加载视频流失败:', e.message);
    } finally {
      setVideoLoading(false);
    }
  };

  /* ── phone call ── */
  const handleCall = (phone: string) => {
    if (!phone || phone === '-') return;
    window.location.href = `tel:${phone}`;
  };

  /* ── recording ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setRecording(true);
    } catch (e: any) {
      showError('无法启动录音', '请检查浏览器麦克风权限');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const playRecording = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);
    audio.play();
  };

  /* ── derived data ── */
  const processSteps = detail ? generateProcess(detail.status) : [];
  const dutyRecords = detail ? generateDutyRecords(detail) : [];
  const statusInfo = detail ? getStatusInfo(detail.status) : getStatusInfo('new');
  const typeInfo = detail ? getAlarmTypeInfo(detail.alarm_type || detail.type) : getAlarmTypeInfo('unknown');
  const TypeIcon = typeInfo.icon;

  const unitName = detail?.unit_name || detail?.unit?.unit_name || '未知单位';
  // const deviceName = detail?.device_name || '未知设备';
  const alarmTime = detail?.createdAt || '-';
  const location = detail?.location || '-';
  // const alarmDesc = detail?.alarm_desc || detail?.message || '-';
  const controlRoom = detail?.controlRoom;
  const floorPlan = detail?.floorPlan;
  const cameras = detail?.relatedCameras || [];
  const dutyPhone = controlRoom?.duty_phone || '-';
  // const dutyPerson = controlRoom?.duty_person || '-';
  const crManager = controlRoom?.duty_person || '-';
  const crManagerPhone = controlRoom?.duty_phone || '-';

  /* ── submit handler ── */
  const handleSubmit = async () => {
    if (!confirmType) {
      showError('请确认警情类型', '真实火警/误报/测试/维保测试 至少选择一项');
      return;
    }
    try {
      await alarmService.confirm(String(alarm.id), '当前用户', remark, confirmType);
      showError('提交成功', '警情确认已提交'); // toast success
      onClose();
    } catch (e: any) {
      showError('提交失败', e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[1100px] max-h-[92vh] bg-slate-800/95 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden flex flex-col m-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Flame className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-slate-100">报警详情</h3>
            <span className="text-[10px] text-slate-500 font-mono">工单编号：{detail?.alarm_no || alarm?.alarmNo || alarm?.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFloorPlan(!showFloorPlan)}
              className="text-[10px] px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md hover:bg-blue-500/30 transition-colors flex items-center gap-1"
            >
              <MapPinned className="w-3 h-3" />{showFloorPlan ? '隐藏' : '查看'}平面图
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors" aria-label="关闭">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===== Loading State ===== */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-500">加载告警详情...</span>
            </div>
          </div>
        )}

        {/* ===== Content ===== */}
        {!loading && detail && (
          <>
            {/* Process Timeline */}
            <div className="px-5 py-3 border-b border-slate-700/50 flex-shrink-0 bg-slate-800/50">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-[11px] left-8 right-8 h-0.5 bg-slate-700/50 z-0" />
                {processSteps.map((step, i) => (
                  <div key={i} className="relative z-10 flex flex-col items-center gap-1" style={{ width: '22%' }}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                      step.completed
                        ? 'bg-blue-500 border-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.4)]'
                        : step.active
                        ? 'bg-amber-500 border-amber-400 animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-700 border-slate-600'
                    }`}>
                      {step.completed && <CheckCircle className="w-3 h-3 text-white" />}
                      {step.active && <Radio className="w-3 h-3 text-white" />}
                      {!step.completed && !step.active && <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />}
                    </div>
                    <span className={`text-[10px] font-medium ${step.completed ? 'text-blue-400' : step.active ? 'text-amber-400' : 'text-slate-500'}`}>{step.label}</span>
                    <span className="text-[8px] text-slate-600 text-center leading-tight px-1">{step.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex gap-0 min-h-0">
                {/* ===== LEFT: Detail Info ===== */}
                <div className={`${showFloorPlan ? 'w-[40%]' : 'w-[58%]'} border-r border-slate-700/50 p-4 space-y-3 transition-all`}>
                  {/* Info Grid */}
                  <div className="rounded-lg border border-slate-700/30 overflow-hidden">
                    {/* Row 1: 报警单位 + 处理状态 */}
                    <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
                      <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">报警单位</div>
                      <div className="px-3 py-2 text-[11px] text-slate-200 font-medium flex items-center">{unitName}</div>
                      <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">处理状态</div>
                      <div className="px-3 py-2 text-[11px] flex items-center">
                        <span className={`${statusInfo.color} font-medium`}>{statusInfo.label}</span>
                      </div>
                    </div>
                    {/* Row 2: 报警时间 + 报警类型 */}
                    <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
                      <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">报警时间</div>
                      <div className="px-3 py-2 text-[11px] text-slate-200 font-mono flex items-center">{alarmTime}</div>
                      <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">报警类型</div>
                      <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center gap-1">
                        <TypeIcon className="w-3.5 h-3.5" />
                        <span>{typeInfo.label}</span>
                        <ChevronRight className="w-3 h-3 text-blue-400" />
                      </div>
                    </div>
                    {/* Row 3: 报警位置 */}
                    <div className="grid grid-cols-[100px_1fr] border-b border-slate-700/30">
                      <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">报警位置</div>
                      <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-400" />{location}
                      </div>
                    </div>
                    {/* Row 4: 消控室 + 值班电话 */}
                    <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
                      <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">消控室</div>
                      <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center">
                        {controlRoom?.room_name || '未配置消控室'}
                      </div>
                      <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">值班电话</div>
                      <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center gap-1">
                        {dutyPhone !== '-' ? (
                          <button onClick={() => handleCall(dutyPhone)} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors">
                            <Phone className="w-3 h-3" />{dutyPhone}
                          </button>
                        ) : '-'}
                      </div>
                    </div>
                    {/* Row 5: 消控室负责人 + 手机号 */}
                    <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
                      <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">消控室负责人</div>
                      <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center justify-between">
                        <span>{crManager}</span>
                        {crManagerPhone !== '-' && (
                          <button onClick={() => handleCall(crManagerPhone)} className="text-emerald-400 hover:text-emerald-300" aria-label="拨打">
                            <Phone className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">手机号</div>
                      <div className="px-3 py-2 text-[11px] text-slate-200 font-mono flex items-center gap-1">
                        {crManagerPhone !== '-' ? (
                          <button onClick={() => handleCall(crManagerPhone)} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors">
                            <Phone className="w-3 h-3" />{crManagerPhone}
                          </button>
                        ) : '-'}
                      </div>
                    </div>
                    {/* Row 6-7: more contacts if available */}
                    {detail.unit?.contact_name && (
                      <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
                        <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">单位联系人</div>
                        <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center">{detail.unit.contact_name}</div>
                        <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">联系电话</div>
                        <div className="px-3 py-2 text-[11px] text-slate-200 font-mono flex items-center gap-1">
                          {detail.unit.contact_phone ? (
                            <button onClick={() => handleCall(detail.unit.contact_phone)} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors">
                              <Phone className="w-3 h-3" />{detail.unit.contact_phone}
                            </button>
                          ) : '-'}
                        </div>
                      </div>
                    )}
                    {detail.unit?.address && (
                      <div className="grid grid-cols-[100px_1fr]">
                        <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">单位地址</div>
                        <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-500" />{detail.unit.address}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Floor Plan */}
                  {showFloorPlan && (
                    <div className="rounded-lg border border-slate-700/30 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-700/20 border-b border-slate-700/30 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-[11px] text-slate-200 font-medium">报警位置平面图</span>
                        <span className="text-[9px] text-slate-500">{location}</span>
                      </div>
                      <div className="p-3 bg-slate-900/50 relative" style={{ height: 220 }}>
                        {floorPlan?.image_url ? (
                          <img
                            src={floorPlan.image_url}
                            alt="平面图"
                            className="w-full h-full object-contain rounded"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <svg viewBox="0 0 400 180" className="w-full h-full">
                            <rect x="20" y="20" width="360" height="140" fill="none" stroke="#475569" strokeWidth="1" rx="4" />
                            <rect x="30" y="30" width="80" height="50" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
                            <text x="70" y="57" textAnchor="middle" fill="#64748b" fontSize="8">大厅</text>
                            <rect x="120" y="30" width="80" height="50" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
                            <text x="160" y="57" textAnchor="middle" fill="#64748b" fontSize="8">走廊</text>
                            <rect x="210" y="30" width="80" height="50" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
                            <text x="250" y="57" textAnchor="middle" fill="#64748b" fontSize="8">配电室</text>
                            <rect x="300" y="30" width="70" height="50" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
                            <text x="335" y="57" textAnchor="middle" fill="#64748b" fontSize="8">楼梯间</text>
                            <rect x="30" y="90" width="120" height="60" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
                            <text x="90" y="123" textAnchor="middle" fill="#64748b" fontSize="8">停车场</text>
                            <rect x="160" y="90" width="100" height="60" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
                            <text x="210" y="123" textAnchor="middle" fill="#64748b" fontSize="8">设备间</text>
                            <rect x="270" y="90" width="100" height="60" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
                            <text x="320" y="123" textAnchor="middle" fill="#64748b" fontSize="8">消防控制室</text>
                            <circle cx="160" cy="55" r="8" fill="#ef4444" opacity="0.8">
                              <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
                              <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                            <text x="160" y="20" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="bold">报警位置</text>
                          </svg>
                        )}
                        {floorPlan?.x !== undefined && floorPlan?.y !== undefined && (
                          <div
                            className="absolute w-3 h-3 rounded-full bg-red-500 border-2 border-white animate-pulse"
                            style={{ left: `${floorPlan.x}%`, top: `${floorPlan.y}%`, transform: 'translate(-50%, -50%)' }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Confirm Section */}
                  <div className="rounded-lg border border-slate-700/30 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-700/20 border-b border-slate-700/30 flex items-center justify-between">
                      <span className="text-[11px] text-slate-200 font-medium">值守确认</span>
                      {/* Recording controls */}
                      <div className="flex items-center gap-1.5">
                        {recording ? (
                          <button
                            onClick={stopRecording}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] border border-red-500/30 hover:bg-red-500/30 transition-colors"
                          >
                            <Square className="w-2.5 h-2.5" />停止录音
                          </button>
                        ) : (
                          <button
                            onClick={startRecording}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                          >
                            <Mic className="w-2.5 h-2.5" />录音
                          </button>
                        )}
                        {recordedBlob && (
                          <button
                            onClick={playRecording}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                          >
                            <Play className="w-2.5 h-2.5" />播放
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-3 space-y-3">
                      {/* Radio options */}
                      <div className="flex flex-wrap gap-3">
                        {['真实火警', '误报', '测试', '维保测试'].map(opt => (
                          <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                            <div
                              onClick={() => setConfirmType(opt)}
                              className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${
                                confirmType === opt ? 'border-blue-400' : 'border-slate-600'
                              }`}
                            >
                              {confirmType === opt && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                            </div>
                            <span className={`text-[11px] ${confirmType === opt ? 'text-blue-400' : 'text-slate-400'}`}>{opt}</span>
                          </label>
                        ))}
                      </div>
                      {/* Remark */}
                      <Textarea
                        value={remark}
                        onChange={e => setRemark(e.target.value)}
                        placeholder="请输入备注信息..."
                        className="bg-slate-700/30 border-slate-600/30 text-slate-200 text-xs min-h-[50px] resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* ===== RIGHT: Video + Records ===== */}
                <div className={`${showFloorPlan ? 'w-[60%]' : 'w-[42%]'} flex flex-col`}>
                  {/* Address & Time */}
                  <div className="px-4 py-2.5 border-b border-slate-700/50 flex items-center gap-2 bg-slate-800/30 flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] text-slate-200">{detail.unit?.address || location}</span>
                    <span className="text-[9px] text-slate-500 ml-auto font-mono">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date().toLocaleString('zh-CN')}
                    </span>
                  </div>

                  {/* Video Monitor */}
                  <div className="flex-shrink-0 p-3">
                    <div className="relative rounded-lg border border-slate-700/50 overflow-hidden bg-slate-900" style={{ height: 200 }}>
                      {videoLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                        </div>
                      ) : videoUrl ? (
                        <>
                          <video
                            ref={videoRef}
                            src={videoUrl}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            onClick={() => {
                              if (videoRef.current) {
                                if (videoRef.current.paused) {
                                  videoRef.current.play();
                                  setVideoPlaying(true);
                                } else {
                                  videoRef.current.pause();
                                  setVideoPlaying(false);
                                }
                              }
                            }}
                          />
                          {/* Play overlay when paused */}
                          {!videoPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <button
                                onClick={() => {
                                  videoRef.current?.play();
                                  setVideoPlaying(true);
                                }}
                                className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/60 transition-all"
                              >
                                <Play className="w-5 h-5 text-white ml-0.5" />
                              </button>
                            </div>
                          )}
                        </>
                      ) : cameras.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <Video className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-[10px] text-slate-500">未配置关联摄像头</p>
                            <p className="text-[9px] text-slate-600 mt-1">请在设备管理中绑定摄像头</p>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <Video className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-[10px] text-slate-500">视频加载失败</p>
                          </div>
                        </div>
                      )}
                      {/* Top bar */}
                      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-1.5 bg-gradient-to-b from-black/40 to-transparent">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[7px] text-red-400 font-bold">REC</span>
                        </div>
                        <span className="text-[8px] text-slate-400 font-mono">
                          {cameras[0]?.name || 'Camera 01'}
                        </span>
                      </div>
                      {/* Bottom bar */}
                      <div className="absolute bottom-0 left-0 right-0 z-20 p-1.5 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-between">
                        <span className="text-[8px] text-slate-300">{controlRoom?.room_name || '消控室'}</span>
                        <div className="flex items-center gap-1">
                          {cameras.map((cam: any, i: number) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${cam.online_status === 'online' ? 'bg-emerald-500' : 'bg-slate-600'}`}
                              title={cam.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-slate-700/50 flex-shrink-0 px-3">
                    <button
                      onClick={() => setActiveTab('duty')}
                      className={`px-4 py-2 text-[11px] font-medium transition-colors border-b-2 ${
                        activeTab === 'duty' ? 'text-blue-400 border-blue-400' : 'text-slate-500 border-transparent hover:text-slate-300'
                      }`}
                    >
                      值守记录
                    </button>
                    <button
                      onClick={() => setActiveTab('handle')}
                      className={`px-4 py-2 text-[11px] font-medium transition-colors border-b-2 ${
                        activeTab === 'handle' ? 'text-blue-400 border-blue-400' : 'text-slate-500 border-transparent hover:text-slate-300'
                      }`}
                    >
                      处理记录
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {activeTab === 'duty' ? (
                      <>
                        {dutyRecords.map((r, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="flex flex-col items-center flex-shrink-0">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                r.completed ? 'bg-blue-500/20' : 'bg-slate-700/30'
                              }`}>
                                {r.completed ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                                )}
                              </div>
                              {i < dutyRecords.length - 1 && <div className="w-0.5 h-full bg-slate-700/30 mt-1" />}
                            </div>
                            <div className="pb-3 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[11px] font-medium ${r.completed ? 'text-slate-200' : 'text-slate-500'}`}>{r.stage}</span>
                                {r.completed && <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">已完成</span>}
                              </div>
                              <p className="text-[10px] text-slate-400">{r.action}</p>
                              {r.person !== '-' && (
                                <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500">
                                  <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{r.person}</span>
                                  {r.time !== '-' && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{r.time}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-slate-700/20 border border-slate-700/30">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[11px] text-slate-200 font-medium">处理备注</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {detail.handle_result || detail.handle_note || '暂无处理记录'}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-700/20 border border-slate-700/30">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[11px] text-slate-200 font-medium">处理人员</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {detail.handler_name || detail.handler || '待分配'}
                          </p>
                        </div>
                        {detail.confirm_time && (
                          <div className="p-3 rounded-lg bg-slate-700/20 border border-slate-700/30">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                              <span className="text-[11px] text-slate-200 font-medium">确认时间</span>
                            </div>
                            <p className="text-[10px] text-slate-400">{detail.confirm_time}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Footer ===== */}
            <div className="px-5 py-3 border-t border-slate-700/50 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-800/50">
              <Button onClick={onClose} variant="outline" className="h-9 px-6 text-xs border-slate-600 text-slate-300 hover:bg-slate-700">
                关闭
              </Button>
              <Button onClick={handleSubmit} className="h-9 px-6 text-xs bg-blue-500 hover:bg-blue-600 text-white">
                提交
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
