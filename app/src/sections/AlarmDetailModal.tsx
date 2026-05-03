import { useState, useEffect } from 'react';
import {
  X, Phone, MapPin, Video, Play, Pause, Clock, User,
  CheckCircle, ChevronRight, Flame, AlertTriangle, Bell,
  Shield, Radio, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/* ===== Types ===== */
interface AlarmRecord {
  id: string;
  orderNo: string;
  unitName: string;
  deviceName: string;
  deviceType: string;
  alarmType: string;
  alarmTime: string;
  location: string;
  address: string;
  controlRoom: string;
  controlRoomManager: string;
  controlRoomManagerPhone: string;
  fireSafetyManager: string;
  fireSafetyManagerPhone: string;
  dutyPerson: string;
  dutyPhone: string;
  status: string;
  statusColor: string;
  level: string;
  desc: string;
  floorPlan: string;
  videoUrl: string;
  confirmType?: string;
}

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

/* ===== Mock Detail Data ===== */
function generateDetail(alarm: any): AlarmRecord {
  const unitData: Record<string, Partial<AlarmRecord>> = {
    '兰州靖煤酒店': {
      controlRoom: '兰州靖煤酒店消控室',
      controlRoomManager: '王建国',
      controlRoomManagerPhone: '138****5621',
      fireSafetyManager: '张杰',
      fireSafetyManagerPhone: '177****9119',
      dutyPerson: '李明',
      dutyPhone: '0931-8882567',
      address: '兰州市城关区红星巷156号',
    },
    '万达广场商业中心': {
      controlRoom: '万达广场消防控制中心',
      controlRoomManager: '赵志强',
      controlRoomManagerPhone: '139****3789',
      fireSafetyManager: '刘芳',
      fireSafetyManagerPhone: '136****5520',
      dutyPerson: '张伟',
      dutyPhone: '0931-6666888',
      address: '兰州市城关区天水北路68号',
    },
    '兰州大学第二医院': {
      controlRoom: '兰大二院消防控制室',
      controlRoomManager: '陈海波',
      controlRoomManagerPhone: '150****2234',
      fireSafetyManager: '马丽',
      fireSafetyManagerPhone: '133****8876',
      dutyPerson: '孙涛',
      dutyPhone: '0931-8942266',
      address: '兰州市城关区萃英门82号',
    },
    '兰州中心': {
      controlRoom: '兰州中心消防控制室',
      controlRoomManager: '-',
      controlRoomManagerPhone: '-',
      fireSafetyManager: '吴磊',
      fireSafetyManagerPhone: '135****6678',
      dutyPerson: '周洋',
      dutyPhone: '0931-8889999',
      address: '兰州市七里河区西津西路16号',
    },
  };
  const ud = unitData[alarm.unit] || {};
  return {
    id: alarm.id,
    orderNo: alarm.id.replace(/\D/g, '').slice(0, 12),
    unitName: alarm.unit,
    deviceName: alarm.device,
    deviceType: alarm.code || '点型光电感烟火灾探测器',
    alarmType: alarm.type === 'fire' ? '火警' : alarm.type === 'fault' ? '故障' : alarm.type === 'prewarn' ? '预警' : '监管',
    alarmTime: alarm.time,
    location: alarm.location,
    address: ud.address || '兰州市',
    controlRoom: ud.controlRoom || alarm.unit + '消控室',
    controlRoomManager: ud.controlRoomManager || '-',
    controlRoomManagerPhone: ud.controlRoomManagerPhone || '-',
    fireSafetyManager: ud.fireSafetyManager || '-',
    fireSafetyManagerPhone: ud.fireSafetyManagerPhone || '-',
    dutyPerson: ud.dutyPerson || '-',
    dutyPhone: ud.dutyPhone || '-',
    status: alarm.status === 'pending' ? '超时未处理' : alarm.status === 'confirmed_true' ? '真警已确认' : alarm.status === 'confirmed_false' ? '误报已确认' : alarm.status === 'handling' ? '处理中' : '已解决',
    statusColor: alarm.status === 'pending' ? 'text-red-400' : alarm.status === 'confirmed_true' ? 'text-red-400' : alarm.status === 'confirmed_false' ? 'text-yellow-400' : alarm.status === 'handling' ? 'text-blue-400' : 'text-emerald-400',
    level: alarm.level,
    desc: alarm.desc,
    floorPlan: '/floor-plan.jpg',
    videoUrl: '',
    confirmType: alarm.status === 'confirmed_true' ? '真实火警' : alarm.status === 'confirmed_false' ? '误报' : undefined,
  };
}

function generateProcess(alarm: any): ProcessStep[] {
  return [
    { label: '已接警', desc: '发生报警值守人员进行报警', completed: true, active: false },
    { label: '电话拨打', desc: '拨打单位/场所相关人员电话进行火警通知', completed: alarm.status !== 'pending', active: alarm.status === 'pending' },
    { label: '电话再次确认', desc: '若未进行火警确认则三分钟后继续电话确认', completed: alarm.status === 'confirmed_true' || alarm.status === 'confirmed_false', active: alarm.status === 'handling' },
    { label: '值守确认', desc: '填写经与现场值守确认信息', completed: alarm.status === 'confirmed_true' || alarm.status === 'confirmed_false', active: false },
  ];
}

function generateDutyRecords(alarm: any): DutyRecord[] {
  return [
    {
      stage: '接警', person: '新致远', time: alarm.time,
      action: `接到${alarm.unit}${alarm.device}报警`, completed: true,
    },
    {
      stage: '通知', person: '新致远', time: '-',
      action: `拨打单位值班电话通知火警`, completed: alarm.status !== 'pending',
    },
    {
      stage: '确认', person: alarm.handler || '-', time: '-',
      action: '现场值守人员确认报警信息', completed: alarm.status === 'confirmed_true' || alarm.status === 'confirmed_false',
    },
    {
      stage: '处置', person: alarm.handler || '-', time: '-',
      action: alarm.status === 'confirmed_true' ? '确认为真实火警，启动应急预案' : alarm.status === 'confirmed_false' ? '确认为误报，记录归档' : '等待处理', completed: alarm.status !== 'pending' && alarm.status !== 'handling',
    },
  ];
}

/* ===== Props ===== */
interface AlarmDetailModalProps {
  alarm: any;
  onClose: () => void;
}

export default function AlarmDetailModal({ alarm, onClose }: AlarmDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'duty' | 'handle'>('duty');
  const [confirmType, setConfirmType] = useState<string>('');
  const [remark, setRemark] = useState('');
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  const detail = generateDetail(alarm);
  const processSteps = generateProcess(alarm);
  const dutyRecords = generateDutyRecords(alarm);

  const typeIcon = (type: string) => {
    switch (type) {
      case '火警': return <Flame className="w-4 h-4 text-red-400" />;
      case '故障': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case '预警': return <Shield className="w-4 h-4 text-purple-400" />;
      case '监管': return <Bell className="w-4 h-4 text-emerald-400" />;
      default: return <Radio className="w-4 h-4 text-slate-400" />;
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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
            {typeIcon(detail.alarmType)}
            <h3 className="text-sm font-bold text-slate-100">报警详情</h3>
            <span className="text-[10px] text-slate-500 font-mono">工单编号：{detail.orderNo}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFloorPlan(!showFloorPlan)}
              className="text-[10px] px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md hover:bg-blue-500/30 transition-colors flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" />{showFloorPlan ? '隐藏' : '查看'}平面图
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors" aria-label="关闭">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===== Process Timeline ===== */}
        <div className="px-5 py-3 border-b border-slate-700/50 flex-shrink-0 bg-slate-800/50">
          <div className="flex items-center justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-[11px] left-8 right-8 h-0.5 bg-slate-700/50 z-0" />
            {processSteps.map((step: any, i: number) => (
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

        {/* ===== Body ===== */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-0 min-h-0">
            {/* ===== LEFT: Detail Info ===== */}
            <div className={`${showFloorPlan ? 'w-[40%]' : 'w-[58%]'} border-r border-slate-700/50 p-4 space-y-3 transition-all`}>
              {/* Info Grid */}
              <div className="rounded-lg border border-slate-700/30 overflow-hidden">
                {/* Row 1 */}
                <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
                  <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">报警单位</div>
                  <div className="px-3 py-2 text-[11px] text-slate-200 font-medium flex items-center">{detail.unitName}</div>
                  <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">处理状态</div>
                  <div className="px-3 py-2 text-[11px] flex items-center">
                    <span className={`${detail.statusColor} font-medium`}>{detail.status}</span>
                  </div>
                </div>
                {/* Row 2 */}
                <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
                  <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">报警时间</div>
                  <div className="px-3 py-2 text-[11px] text-slate-200 font-mono flex items-center">{detail.alarmTime}</div>
                  <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">报警类型</div>
                  <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center gap-1">
                    {typeIcon(detail.alarmType)}
                    <span>{detail.deviceType}</span>
                    <ChevronRight className="w-3 h-3 text-blue-400" />
                  </div>
                </div>
                {/* Row 3 */}
                <div className="grid grid-cols-[100px_1fr] border-b border-slate-700/30">
                  <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">报警位置</div>
                  <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-400" />{detail.location}
                  </div>
                </div>
                {/* Row 4 */}
                <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
                  <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">消控室</div>
                  <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center">{detail.controlRoom}</div>
                  <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">值班电话</div>
                  <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center gap-1">
                    {detail.dutyPhone !== '-' ? (
                      <><Phone className="w-3 h-3 text-emerald-400" />{detail.dutyPhone}</>
                    ) : '-'}
                  </div>
                </div>
                {/* Row 5 */}
                <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
                  <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">消控室负责人</div>
                  <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center justify-between">
                    <span>{detail.controlRoomManager}</span>
                    {detail.controlRoomManagerPhone !== '-' && (
                      <button className="text-emerald-400 hover:text-emerald-300" aria-label="拨打"><Phone className="w-3 h-3" /></button>
                    )}
                  </div>
                  <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">手机号</div>
                  <div className="px-3 py-2 text-[11px] text-slate-200 font-mono flex items-center">
                    {detail.controlRoomManagerPhone}
                  </div>
                </div>
                {/* Row 6 */}
                <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
                  <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center text-emerald-400">消控室管理人</div>
                  <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center">
                    {detail.fireSafetyManager}
                  </div>
                  <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">手机号</div>
                  <div className="px-3 py-2 text-[11px] text-slate-200 font-mono flex items-center gap-1">
                    {detail.fireSafetyManagerPhone !== '-' ? (
                      <><Phone className="w-3 h-3 text-emerald-400" />{detail.fireSafetyManagerPhone}</>
                    ) : '-'}
                  </div>
                </div>
                {/* Row 7 */}
                <div className="grid grid-cols-[100px_1fr_100px_1fr] border-b border-slate-700/30">
                  <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">消防安全管理人</div>
                  <div className="px-3 py-2 text-[11px] text-slate-200 flex items-center">{detail.fireSafetyManager}</div>
                  <div className="px-3 py-2 bg-slate-700/20 text-[10px] text-slate-400 flex items-center">手机号</div>
                  <div className="px-3 py-2 text-[11px] text-slate-200 font-mono flex items-center gap-1">
                    {detail.fireSafetyManagerPhone !== '-' ? (
                      <><Phone className="w-3 h-3 text-emerald-400" />{detail.fireSafetyManagerPhone}</>
                    ) : '-'}
                  </div>
                </div>
              </div>

              {/* Floor Plan (when toggled) */}
              {showFloorPlan && (
                <div className="rounded-lg border border-slate-700/30 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-700/20 border-b border-slate-700/30 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-[11px] text-slate-200 font-medium">报警位置平面图</span>
                    <span className="text-[9px] text-slate-500">{detail.location}</span>
                  </div>
                  <div className="p-3 bg-slate-900/50 relative" style={{ height: 200 }}>
                    {/* Simulated floor plan */}
                    <svg viewBox="0 0 400 180" className="w-full h-full">
                      {/* Building outline */}
                      <rect x="20" y="20" width="360" height="140" fill="none" stroke="#475569" strokeWidth="1" rx="4" />
                      {/* Rooms */}
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
                      {/* Alarm indicator */}
                      <circle cx="160" cy="55" r="8" fill="#ef4444" opacity="0.8">
                        <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      <text x="160" y="20" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="bold">报警位置</text>
                    </svg>
                  </div>
                </div>
              )}

              {/* Confirm Section */}
              <div className="rounded-lg border border-slate-700/30 overflow-hidden">
                <div className="px-3 py-2 bg-slate-700/20 border-b border-slate-700/30">
                  <span className="text-[11px] text-slate-200 font-medium">值守确认</span>
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
                  <div>
                    <Textarea
                      value={remark}
                      onChange={e => setRemark(e.target.value)}
                      placeholder="请输入备注信息..."
                      className="bg-slate-700/30 border-slate-600/30 text-slate-200 text-xs min-h-[50px] resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ===== RIGHT: Video + Records ===== */}
            <div className={`${showFloorPlan ? 'w-[60%]' : 'w-[42%]'} flex flex-col`}>
              {/* Address */}
              <div className="px-4 py-2.5 border-b border-slate-700/50 flex items-center gap-2 bg-slate-800/30 flex-shrink-0">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] text-slate-200">{detail.address}</span>
                <span className="text-[9px] text-slate-500 ml-auto font-mono">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {new Date().toLocaleString('zh-CN')}
                </span>
              </div>

              {/* Video Monitor */}
              <div className="flex-shrink-0 p-3">
                <div className="relative rounded-lg border border-slate-700/50 overflow-hidden bg-slate-900" style={{ height: 200 }}>
                  {/* Simulated video feed */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
                    <svg className="absolute inset-0 w-full h-full opacity-[0.04]" preserveAspectRatio="none">
                      <defs><pattern id="vidgrid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs>
                      <rect width="100%" height="100%" fill="url(#vidgrid)" />
                    </svg>
                    {/* Simulated control room scene */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-10 bg-slate-700/50 rounded border border-slate-600/30 mx-auto mb-2 flex items-center justify-center">
                          <div className="w-12 h-0.5 bg-slate-500/30 rounded-full" />
                        </div>
                        <div className="flex gap-1 justify-center mb-1">
                          {Array.from({ length: 8 }).map((_: any, i: number) => (
                            <div key={i} className={`w-2 h-1.5 rounded-sm ${i < 2 ? 'bg-red-500/60' : i < 4 ? 'bg-yellow-500/60' : 'bg-emerald-500/60'}`} />
                          ))}
                        </div>
                        <p className="text-[8px] text-slate-600">消控室实时视频 - Camera 01</p>
                      </div>
                    </div>
                  </div>
                  {/* Overlay */}
                  <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.02]"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.1) 1px, rgba(255,255,255,0.1) 2px)' }} />
                  {/* Top bar */}
                  <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-1.5 bg-gradient-to-b from-black/40 to-transparent">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[7px] text-red-400 font-bold">REC</span>
                    </div>
                    <span className="text-[8px] text-slate-400 font-mono">Camera 01</span>
                  </div>
                  {/* Play button */}
                  <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <button
                      onClick={() => setVideoPlaying(!videoPlaying)}
                      className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/60 transition-all" aria-label="暂停">
                      {videoPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      )}
                    </button>
                  </div>
                  {/* Bottom bar */}
                  <div className="absolute bottom-0 left-0 right-0 z-20 p-1.5 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-between">
                    <span className="text-[8px] text-slate-300">{detail.controlRoom}</span>
                    <Video className="w-3 h-3 text-slate-500" />
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
                    {dutyRecords.map((r: any, i: number) => (
                      <div key={i} className="flex gap-3">
                        {/* Timeline */}
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
                        {/* Content */}
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
                        {detail.confirmType || '暂无处理记录'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-700/20 border border-slate-700/30">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[11px] text-slate-200 font-medium">处理人员</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {alarm.handler || '待分配'}
                      </p>
                    </div>
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
          <Button className="h-9 px-6 text-xs bg-blue-500 hover:bg-blue-600 text-white">
            提交
          </Button>
        </div>
      </div>
    </div>
  );
}
