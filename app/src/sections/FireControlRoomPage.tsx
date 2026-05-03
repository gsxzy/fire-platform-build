import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  VolumeX, RotateCcw, Shield, CheckCircle, Hand,
  Flame, AlertTriangle, Play, Square, Eye,
  Zap, Activity, HardDrive, Phone, User, MapPin,
  BellOff, Settings2, Users, Monitor, Clock,
  RefreshCw, Radio, CheckCircle2, XCircle,
  Video, LogIn, Cog
} from 'lucide-react';
import { api } from '@/lib/api';
import { controlRoomConfigService } from '@/api/services';
import { ControlRoomDAO } from '@/db/Database';
import { api as httpApi } from '@/api/client';
import DataContainer from '@/components/DataContainer';
import SimpleVideoPlayer from '@/components/SimpleVideoPlayer';

/* ═══════════════════════════════════════════════════════════════
   数智消控室 - 消防报警主机(FAS)集中控制界面
   ═══════════════════════════════════════════════════════════════ */

interface FireAlarm {
  id: number; alarm_no: string; alarm_type: number; alarm_level: number;
  device_name: string; device_point?: string; device_code?: string;
  unit_name: string; location: string; alarm_desc: string;
  status: number; confirm_result?: number; confirm_remark?: string; created_at: string;
}
interface FaultAlarm {
  id: number; alarm_no: string; device_name: string; device_type: string;
  location: string; fault_desc: string; status: number; created_at: string;
}
interface ShieldItem {
  id: number; point_name: string; device_type: string; location: string;
  shield_reason: string; shield_time: string; status: number;
}
interface FeedbackAlarm {
  id: number; device_name: string; location: string; feedback_desc: string; created_at: string;
}
interface MultilinePoint {
  id: number; host_id: number; point_no: number; point_name: string;
  device_type: string; status: number; feedback_status: number; fault_status: number;
}
interface BusPoint {
  id: number; host_id: number; loop_no: number; point_no: number;
  point_name: string; device_type: string; install_location: string; status: number;
}
interface RealtimeData {
  pressure_1: number; pressure_2: number;
  liquid_level_1: number; liquid_level_2: number;
  video_status: number; host_status: number;
  current_mode: number; silenced: number;
  fire_count: number; fault_count: number;
  shield_count: number; feedback_count: number;
}
interface CommandLog {
  id: number; command_type: string; command_value: string;
  point_name?: string; command_by: string; command_time: string; result: number;
}
interface VideoCamera {
  id: number; cameraName: string; cameraNo: string;
  streamUrl: string; status: number; position: string;
}

const SECONDARY_PWD = '888888';

/* ─── Hooks ─── */
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

function useGaugeFlash(value: number): boolean {
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      prev.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);
  return flash;
}

export default function FireControlRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [silenceDialog, setSilenceDialog] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPwdInput, setResetPwdInput] = useState('');
  const [resetPwdError, setResetPwdError] = useState(false);
  const [shieldDialog, setShieldDialog] = useState(false);
  const [modeDialog, setModeDialog] = useState(false);
  const [modeTarget, setModeTarget] = useState(2);
  const [silencePressed, setSilencePressed] = useState(false);
  const [shieldReason, setShieldReason] = useState('');
  const [currentMode, setCurrentMode] = useState({ currentMode: 2, modeName: '自动' });
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [roomName, setRoomName] = useState('未知消控室');
  const [projectName, setProjectName] = useState('');
  const [allRooms, setAllRooms] = useState<{ id: string; name: string }[]>([]);
  const [fireAlarms, setFireAlarms] = useState<FireAlarm[]>([]);
  const [faultAlarms, setFaultAlarms] = useState<FaultAlarm[]>([]);
  const [shieldItems, setShieldItems] = useState<ShieldItem[]>([]);
  const [feedbackAlarms, setFeedbackAlarms] = useState<FeedbackAlarm[]>([]);
  const [multilinePoints, setMultilinePoints] = useState<MultilinePoint[]>([]);
  const [busPoints, setBusPoints] = useState<BusPoint[]>([]);
  const [multilineBtnSize, setMultilineBtnSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [busBtnSize, setBusBtnSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [busCols, setBusCols] = useState<2 | 4>(2);
  const [rightPanelMode, setRightPanelMode] = useState<'gauges' | 'video'>('gauges');
  const [selectedHost, setSelectedHost] = useState<{ id: number; host_name: string; duty_phone: string; duty_person: string } | null>(null);
  const [personnelInfo, setPersonnelInfo] = useState<{
    managerName?: string; managerPhone?: string;
    dutyOfficerName?: string; dutyOfficerPhone?: string;
    safetyOfficerName?: string; safetyOfficerPhone?: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  /* ─── New States ─── */
  const [realtime, setRealtime] = useState<RealtimeData>({
    pressure_1: 0.42, pressure_2: 0.38, liquid_level_1: 3.85, liquid_level_2: 4.20,
    video_status: 1, host_status: 1, current_mode: 2, silenced: 0,
    fire_count: 0, fault_count: 0, shield_count: 0, feedback_count: 0
  });
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const [cameras, setCameras] = useState<VideoCamera[]>([]);
  const [linkedCameraId, setLinkedCameraId] = useState<number | null>(null);
  const [cameraSettingsOpen, setCameraSettingsOpen] = useState(false);
  const [cameraSelectOpen, setCameraSelectOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [alarmTab, setAlarmTab] = useState<'all'|'fire'|'fault'|'shield'|'feedback'>('all');
  const logsRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [uptime, setUptime] = useState(0);

  /* ─── Toast ─── */
  const [toast, setToast] = useState<{msg: string; type: 'success'|'error'|'info'; id: number} | null>(null);
  const showToast = (msg: string, type: 'success'|'error'|'info' = 'info') => {
    const id = Date.now();
    setToast({ msg, type, id });
    setTimeout(() => setToast(t => t?.id === id ? null : t), 3000);
  };

  /* ─── Video Player ─── */
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setUptime(u => u + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [commandLogs]);

  /* ─── 5s Polling for Realtime ─── */
  useEffect(() => {
    if (!roomId) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      setRefreshing(true);
      api.getRealtimeStatus(roomId, selectedHost?.id || 1)
        .then((rt: any) => { if (rt && typeof rt === 'object') setRealtime(prev => ({ ...prev, ...rt })); })
        .catch(() => {})
        .finally(() => { setRefreshing(false); setLastRefresh(new Date()); });
    }, 5000);
    return () => clearInterval(timer);
  }, [roomId, selectedHost?.id]);

  /* ─── Load Data from API ─── */
  const loadData = useCallback(async () => {
    if (!roomId) return;
    setPageLoading(true);
    setError(null);
    try {
      // 优先从后端 API 加载消控室列表
      let allRoomsRes: any[] = [];
      try {
        const roomsApiRes = await httpApi.get<{ list: any[] }>('/control-rooms', { pageSize: 9999 });
        if (roomsApiRes.code === 200 && roomsApiRes.data?.list) {
          allRoomsRes = roomsApiRes.data.list.map((r: any) => ({
            id: r.roomId || r.id || '',
            unitName: r.location || r.unitName || r.room_name || r.name || r.roomId || '未命名消控室',
            room_name: r.location || r.unitName || r.room_name || r.name || r.roomId || '未命名消控室',
            name: r.location || r.unitName || r.room_name || r.name || r.roomId || '未命名消控室',
          }));
        }
      } catch (apiErr) {
        console.log('[loadData] API 加载失败，fallback 到 DAO', apiErr);
        allRoomsRes = await ControlRoomDAO.getAll();
      }
      const [hostsRes] = await Promise.all([
        api.getControlRoomHosts(roomId),
      ]) as [any];
      const roomRes = allRoomsRes.find((r: any) => String(r.id) === String(roomId)) || null;
      setAllRooms(allRoomsRes.map((r: any) => ({ id: String(r.id), name: r.unitName?.trim() || r.room_name?.trim() || r.name?.trim() || r.unit_name?.trim() || r.id || '未命名' })));
      const unitName = roomRes?.unitName?.trim() || roomRes?.room_name?.trim() || roomRes?.name?.trim() || roomRes?.id || '未知消控室';
      setRoomName(unitName);
      setProjectName(`${unitName}消防项目`);

      try {
        const configRes = await controlRoomConfigService.listAll() as any;
        const configs = Array.isArray(configRes.data) ? configRes.data : (configRes.data?.list || []);
        const config = configs.find((c: any) => c.unitId === roomId || c.id?.includes(String(roomId)));
        if (config) {
          setPersonnelInfo({
            managerName: config.managerName, managerPhone: config.managerPhone,
            dutyOfficerName: config.dutyOfficerName, dutyOfficerPhone: config.dutyOfficerPhone,
            safetyOfficerName: config.safetyOfficerName, safetyOfficerPhone: config.safetyOfficerPhone,
          });
        }
      } catch { /* ignore */ }

      const hosts = Array.isArray(hostsRes) ? hostsRes : (hostsRes?.list || []);
      let activeHostId = 1;
      if (hosts.length > 0) {
        activeHostId = hosts[0].id;
        setSelectedHost({
          id: hosts[0].id, host_name: hosts[0].host_name,
          duty_phone: hosts[0].duty_phone || '13911110001',
          duty_person: hosts[0].duty_person || '王值班',
        });
      }

      /* 独立请求，互不影响 —— 避免单个 API 404 导致全部数据丢失 */
      const [fireRes, faultRes, multiRes, busRes, rtRes, shieldRes, fbRes, logRes, vidRes] = await Promise.all([
        api.getFireAlarms().catch(() => []),
        api.getFaultAlarms().catch(() => []),
        api.getMultilinePanels(activeHostId).catch(() => []),
        api.getBusPoints(activeHostId).catch(() => []),
        api.getRealtimeStatus(roomId, activeHostId).catch(() => null),
        api.getShields(roomId, activeHostId).catch(() => []),
        api.getFeedbackAlarms().catch(() => []),
        api.getHostCommandLogs({ roomId, hostId: activeHostId, limit: 50 }).catch(() => []),
        api.getVideos(roomId).catch(() => []),
      ]);

      const fireList = Array.isArray(fireRes) ? fireRes : (fireRes?.list || []);
      const faultList = Array.isArray(faultRes) ? faultRes : (faultRes?.list || []);
      setFireAlarms(fireList.filter((a: any) => a.alarm_type === 1).slice(0, 4));
      setFaultAlarms(faultList.filter((a: any) => a.alarm_type === 2).slice(0, 4));
      const mlp = Array.isArray(multiRes) ? multiRes : (multiRes?.list || []);
      const bp = Array.isArray(busRes) ? busRes : (busRes?.list || []);
      setMultilinePoints(mlp.length > 0 ? mlp : generateDefaultMultiline(activeHostId));
      setBusPoints(bp.length > 0 ? bp : generateDefaultBusPoints(activeHostId));

      if (rtRes && typeof rtRes === 'object' && !Array.isArray(rtRes)) {
        setRealtime(prev => ({ ...prev, ...rtRes }));
        setCurrentMode({ currentMode: rtRes.current_mode || 2, modeName: (rtRes.current_mode || 2) === 2 ? '自动' : '手动' });
        setSilencePressed(rtRes.silenced === 1);
      }
      setShieldItems((Array.isArray(shieldRes) ? shieldRes : (shieldRes?.list || [])).slice(0, 4));
      const fbList = Array.isArray(fbRes) ? fbRes : (fbRes?.list || []);
      setFeedbackAlarms(fbList.slice(0, 4));
      setCommandLogs(Array.isArray(logRes) ? logRes : (logRes?.list || []));
      setCameras(Array.isArray(vidRes) ? vidRes : (vidRes?.list || []));
    } catch (e) {
      console.error('消控室数据加载失败', e);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setPageLoading(false);
      setLastRefresh(new Date());
    }
  }, [roomId]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ─── Alarm Sound Trigger (预留接口) ─── */
  const prevFireCount = usePrevious(fireAlarms.length);
  const prevFaultCount = usePrevious(faultAlarms.length);
  useEffect(() => {
    const unconfirmedFire = fireAlarms.filter(a => a.status === 0).length;
    const unconfirmedFault = faultAlarms.filter(a => a.status === 0).length;
    if ((prevFireCount !== undefined && fireAlarms.length > prevFireCount && unconfirmedFire > 0) ||
        (prevFaultCount !== undefined && faultAlarms.length > prevFaultCount && unconfirmedFault > 0)) {
      // 预留接口：接入实际告警音效系统
      console.log('[ALARM SOUND TRIGGER] fire:', unconfirmedFire, 'fault:', unconfirmedFault);
    }
  }, [fireAlarms, faultAlarms, prevFireCount, prevFaultCount]);

  const handleSilence = async () => {
    setLoading(true);
    try {
      await api.silenceHost(selectedHost?.id || 1);
      setSilencePressed(true);
      setRealtime(prev => ({ ...prev, silenced: 1 }));
      showToast('远程消音指令已下发', 'success');
    } catch (e) {
      showToast('消音指令下发失败', 'error');
    } finally { setLoading(false); setSilenceDialog(false); }
  };

  const checkResetPwd = () => {
    if (resetPwdInput === SECONDARY_PWD) {
      setResetPwdOpen(false); setResetPwdInput(''); setResetPwdError(false); setResetDialog(true);
    } else { setResetPwdError(true); }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await api.resetHost(selectedHost?.id || 1);
      setCurrentMode({ currentMode: 2, modeName: '自动' });
      setRealtime(prev => ({ ...prev, fire_count: 0, fault_count: 0, silenced: 0 }));
      setFireAlarms([]); setFaultAlarms([]);
      showToast('设备复位成功', 'success');
    } catch (e) {
      showToast('设备复位失败', 'error');
    } finally { setLoading(false); setResetDialog(false); }
  };

  const handleShield = async () => {
    setLoading(true);
    try {
      await api.addShield({
        roomId, hostId: selectedHost?.id || 1,
        pointName: selectedHost?.host_name || '报警主机',
        shieldReason, shieldBy: 'admin'
      });
      setShieldDialog(false); setShieldReason('');
      loadData();
      showToast('屏蔽添加成功', 'success');
    } catch (e) {
      showToast('屏蔽添加失败', 'error');
    } finally { setLoading(false); }
  };

  const openModeDialog = (mode: number) => { setModeTarget(mode); setModeDialog(true); };
  const handleModeSwitch = async () => {
    setLoading(true);
    try {
      await api.switchHostMode(selectedHost?.id || 1, modeTarget === 2 ? 'auto' : 'manual');
      setCurrentMode({ currentMode: modeTarget, modeName: modeTarget === 2 ? '自动' : '手动' });
      setRealtime(prev => ({ ...prev, current_mode: modeTarget }));
      showToast(`已切换为${modeTarget === 2 ? '自动' : '手动'}模式`, 'success');
    } catch (e) {
      showToast('模式切换失败', 'error');
    } finally { setLoading(false); setModeDialog(false); }
  };

  const handleConfirm = async (id: string, result: number) => {
    setConfirmingId(id);
    try {
      await api.confirmFireAlarm(Number(id));
      setFireAlarms(prev => prev.map(a => a.id === Number(id) ? { ...a, status: 1, confirm_result: result } : a));
      showToast('告警确认成功', 'success');
    } catch (e) {
      showToast('告警确认失败', 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  const fmtTime = (t?: string) => {
    if (!t) return '-';
    const d = new Date(t.replace(' ', 'T'));
    if (isNaN(d.getTime())) return t.slice(5, 16);
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${M}-${D} ${h}:${m}`;
  };

  const fmtUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const cell = "flex items-center text-[11px] leading-none truncate";

  /* ─── Gauge flash states ─── */
  const p1Flash = useGaugeFlash(realtime.pressure_1);
  const p2Flash = useGaugeFlash(realtime.pressure_2);
  const l1Flash = useGaugeFlash(realtime.liquid_level_1);
  const l2Flash = useGaugeFlash(realtime.liquid_level_2);

  return (
    <DataContainer loading={pageLoading} error={error} data={selectedHost} onRetry={loadData} emptyText="暂无消控室数据">
      <div className="h-full flex flex-col gap-2 p-2 bg-slate-950 overflow-hidden scanline-overlay">
        {/* ═══════════════════════════════════════════════════════════════
            HEADER
           ═══════════════════════════════════════════════════════════════ */}
        <div className="flex-shrink-0 tech-card rounded-xl px-3 py-2 flex items-center justify-between corner-brackets relative overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Monitor className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-slate-100 leading-tight glow-text-blue">{projectName || roomName}</h1>
              <p className="text-[10px] text-slate-500">编号: {roomId || '-'} · 主机: {selectedHost?.host_name || '报警主机1号'} · 值班: {selectedHost?.duty_person || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {allRooms.length > 0 && (
              <Select value={roomId} onValueChange={(id) => navigate(`/monitor/control/room/${id}`)}>
                <SelectTrigger className="h-7 text-xs bg-slate-900/40 border-slate-700/30 text-slate-200 rounded-lg w-44">
                  <SelectValue placeholder="选择消控室" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700/30 text-slate-200 max-h-64">
                  {allRooms.map(r => (
                    <SelectItem key={r.id} value={r.id} className="text-xs cursor-pointer">{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button onClick={loadData} className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900/40 border border-slate-700/30 hover:bg-slate-800/50 transition-all">
              <RefreshCw className={`w-3 h-3 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-[10px] text-slate-400">{fmtTime(lastRefresh.toISOString())}</span>
            </button>
            <div className={`status-led ${realtime.host_status === 1 ? 'online' : 'offline'} text-[10px] font-medium px-2 py-1 rounded-md border ${realtime.host_status === 1 ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
              {realtime.host_status === 1 ? (
                <><span className="led" /><span>在线</span></>
              ) : (
                <><span className="led" /><span>离线</span></>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 px-2 py-1 rounded-md bg-slate-900/40 border border-slate-700/30">
              <Clock className="w-3 h-3" />
              <span className="text-sm font-mono font-bold text-slate-200 glow-text-blue tracking-wider">
                {String(currentTime.getHours()).padStart(2,'0')}:{String(currentTime.getMinutes()).padStart(2,'0')}:{String(currentTime.getSeconds()).padStart(2,'0')}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-500 px-2 py-1 rounded-md bg-slate-900/40 border border-slate-700/30 font-mono">
              <Activity className="w-3 h-3" />
              <span>运行 {fmtUptime(uptime)}</span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            MAIN: Left Stats + Center Table + Right Controls + Right Info
           ═══════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex gap-2 min-h-0">

          {/* ─── Left: Status Stat Panels ─── */}
          <div className="flex flex-col gap-2 flex-shrink-0 w-[56px]">
            <button onClick={() => setAlarmTab('fire')} className={`hmi-stat-card flex-1 flex flex-col items-center justify-center gap-1 p-1 relative overflow-hidden border-t-2 transition-all cursor-pointer corner-brackets ${alarmTab === 'fire' ? 'ring-1 ring-red-500/40 bg-red-500/5 border-t-red-500' : realtime.fire_count > 0 ? 'border-t-red-500 hover:bg-red-500/5 led-pulse-red' : 'border-t-red-500/30 hover:bg-slate-800/30'}`}>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500/60 to-red-400/10" />
              <Flame className="w-4 h-4 text-red-400" />
              <span className={`text-base font-bold leading-none ${realtime.fire_count > 0 ? "text-red-400 glow-text-red animate-value-pop" : "text-red-400/40"}`}>{realtime.fire_count}</span>
              <span className="text-[9px] text-red-300/60 font-medium tracking-wide">火警</span>
            </button>
            <button onClick={() => setAlarmTab('fault')} className={`hmi-stat-card flex-1 flex flex-col items-center justify-center gap-1 p-1 relative overflow-hidden border-t-2 transition-all cursor-pointer corner-brackets ${alarmTab === 'fault' ? 'ring-1 ring-yellow-500/40 bg-yellow-500/5 border-t-yellow-500' : realtime.fault_count > 0 ? 'border-t-yellow-500 hover:bg-yellow-500/5 led-pulse-yellow' : 'border-t-yellow-500/30 hover:bg-slate-800/30'}`}>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500/60 to-yellow-400/10" />
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className={`text-base font-bold leading-none ${realtime.fault_count > 0 ? "text-yellow-400 glow-text-yellow animate-value-pop" : "text-yellow-400/40"}`}>{realtime.fault_count}</span>
              <span className="text-[9px] text-yellow-300/60 font-medium tracking-wide">故障</span>
            </button>
            <button onClick={() => setAlarmTab('shield')} className={`hmi-stat-card flex-1 flex flex-col items-center justify-center gap-1 p-1 relative overflow-hidden border-t-2 transition-all cursor-pointer corner-brackets ${alarmTab === 'shield' ? 'ring-1 ring-purple-500/40 bg-purple-500/5 border-t-purple-500' : 'border-t-purple-500/30 hover:bg-purple-500/5'}`}>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/60 to-purple-400/10" />
              <Shield className="w-4 h-4 text-purple-400" />
              <span className={`text-base font-bold leading-none ${realtime.shield_count > 0 ? "text-purple-400 animate-value-pop" : "text-purple-400/40"}`}>{realtime.shield_count}</span>
              <span className="text-[9px] text-purple-300/60 font-medium tracking-wide">屏蔽</span>
            </button>
            <button onClick={() => setAlarmTab('feedback')} className={`hmi-stat-card flex-1 flex flex-col items-center justify-center gap-1 p-1 relative overflow-hidden border-t-2 transition-all cursor-pointer corner-brackets ${alarmTab === 'feedback' ? 'ring-1 ring-blue-500/40 bg-blue-500/5 border-t-blue-500' : 'border-t-blue-500/30 hover:bg-blue-500/5'}`}>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/60 to-blue-400/10" />
              <CheckCircle className="w-4 h-4 text-blue-400" />
              <span className={`text-base font-bold leading-none ${realtime.feedback_count > 0 ? "text-blue-400 animate-value-pop" : "text-blue-400/40"}`}>{realtime.feedback_count}</span>
              <span className="text-[9px] text-blue-300/60 font-medium tracking-wide">反馈</span>
            </button>
          </div>

          {/* ─── Center: Alarm Table ─── */}
          <div className="flex-[2] flex flex-col min-w-0">
            <div className="flex items-center justify-between px-3 h-7 glass rounded-t-xl flex-shrink-0">
              <span className="text-[10px] text-slate-400 font-semibold">
                {alarmTab === 'all' ? '全部事件' : alarmTab === 'fire' ? '火警事件' : alarmTab === 'fault' ? '故障事件' : alarmTab === 'shield' ? '屏蔽事件' : '反馈事件'}
                <span className="text-slate-600 ml-1 font-normal">({
                  alarmTab === 'all' ? fireAlarms.length + faultAlarms.length + shieldItems.length + feedbackAlarms.length :
                  alarmTab === 'fire' ? fireAlarms.length :
                  alarmTab === 'fault' ? faultAlarms.length :
                  alarmTab === 'shield' ? shieldItems.length :
                  feedbackAlarms.length
                })</span>
              </span>
              <button onClick={() => setAlarmTab('all')} className={`text-[10px] px-2 py-0.5 rounded transition-all ${alarmTab === 'all' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}>全部</button>
            </div>
            <AlarmTable
              alarmTab={alarmTab}
              fireAlarms={fireAlarms}
              faultAlarms={faultAlarms}
              shieldItems={shieldItems}
              feedbackAlarms={feedbackAlarms}
              fmtTime={fmtTime}
              cell={cell}
              confirmingId={confirmingId}
              handleConfirm={handleConfirm}
            />
          </div>

          {/* ─── Control Buttons ─── */}
          <div className="flex flex-col gap-2 flex-shrink-0 w-[92px]">
            <Button onClick={() => setSilenceDialog(true)} className={`hmi-btn flex-1 flex flex-col items-center justify-center gap-2 border-0 transition-all shadow-lg rounded-xl backdrop-blur-sm active-press ${silencePressed ? 'bg-emerald-500/25 text-emerald-100 ring-2 ring-emerald-500/40' : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${silencePressed ? 'bg-emerald-500/30 ring-2 ring-emerald-400/50' : 'bg-emerald-500/15 ring-1 ring-emerald-500/30'}`}>
                <VolumeX className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold tracking-wide">{silencePressed ? '已消音' : '消音'}</span>
            </Button>
            <Button onClick={() => setResetPwdOpen(true)} className="hmi-btn flex-1 flex flex-col items-center justify-center gap-2 border-0 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 shadow-lg transition-all rounded-xl backdrop-blur-sm active-press border border-blue-500/30">
              <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center ring-1 ring-blue-500/30 shadow-inner">
                <RotateCcw className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold tracking-wide">复位</span>
            </Button>
            <Button onClick={() => openModeDialog(1)} className={`hmi-btn flex-1 flex flex-col items-center justify-center gap-2 border-0 shadow-lg rounded-xl transition-all backdrop-blur-sm active-press ${currentMode.currentMode === 1 ? 'bg-amber-500/25 text-amber-100 ring-2 ring-amber-500/50' : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${currentMode.currentMode === 1 ? 'bg-amber-500/30 ring-2 ring-amber-400/50' : 'bg-amber-500/15 ring-1 ring-amber-500/30'}`}>
                <Hand className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold tracking-wide">手动</span>
            </Button>
            <Button onClick={() => openModeDialog(2)} className={`hmi-btn flex-1 flex flex-col items-center justify-center gap-2 border-0 shadow-lg rounded-xl transition-all backdrop-blur-sm active-press ${currentMode.currentMode === 2 ? 'bg-blue-500/25 text-blue-100 ring-2 ring-blue-500/50' : 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${currentMode.currentMode === 2 ? 'bg-blue-500/30 ring-2 ring-blue-400/50' : 'bg-blue-500/15 ring-1 ring-blue-500/30'}`}>
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold tracking-wide">自动</span>
            </Button>
            <Button onClick={() => setShieldDialog(true)} className="hmi-btn flex-1 flex flex-col items-center justify-center gap-2 border-0 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 shadow-lg transition-all rounded-xl backdrop-blur-sm active-press border border-purple-500/30">
              <div className="w-10 h-10 rounded-full bg-purple-500/15 flex items-center justify-center ring-1 ring-purple-500/30 shadow-inner">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold tracking-wide">屏蔽</span>
            </Button>
          </div>

          {/* ─── Right: Info + Gauges / Video ─── */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            {/* Stats summary bar */}
            <div className="flex items-center justify-between px-3 py-1.5 tech-card rounded-xl corner-brackets">
              <div className="flex items-center gap-1.5">
                <Settings2 className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] text-slate-400">总点位: <b className="text-slate-200 glow-text-blue">{busPoints.length + multilinePoints.length}</b></span>
              </div>
              <div className="w-px h-3 bg-slate-700/60" />
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] text-slate-400">总线: <b className="text-slate-200">{busPoints.length}</b></span>
              </div>
              <div className="w-px h-3 bg-slate-700/60" />
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] text-slate-400">多线: <b className="text-slate-200">{multilinePoints.length}</b></span>
              </div>
            </div>

            {/* Unit info card */}
            <div className="tech-card p-2.5 flex flex-col gap-1.5 corner-brackets">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-blue-500/15 flex items-center justify-center ring-1 ring-blue-500/30">
                  <MapPin className="w-3 h-3 text-blue-400" />
                </div>
                <span className="text-[11px] text-slate-200 font-semibold truncate">{roomName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/30">
                  <Phone className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-[10px] text-slate-400">消控室电话: <span className="text-slate-300">{selectedHost?.duty_phone || '-'}</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-amber-500/15 flex items-center justify-center ring-1 ring-amber-500/30">
                  <User className="w-3 h-3 text-amber-400" />
                </div>
                <span className="text-[10px] text-slate-400">负责人: <span className="text-slate-300">{selectedHost?.duty_person || '-'}</span></span>
              </div>
            </div>

            {/* Personnel info card */}
            {personnelInfo && (
              <div className="tech-card p-2.5 flex flex-col gap-2 corner-brackets">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-cyan-500/15 flex items-center justify-center ring-1 ring-cyan-500/30">
                    <Users className="w-3 h-3 text-cyan-400" />
                  </div>
                  <span className="text-[11px] text-cyan-400 font-semibold">值班人员信息</span>
                </div>
                {personnelInfo.managerName && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">消控室负责人</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-200 font-medium">{personnelInfo.managerName}</span>
                      <a href={`tel:${personnelInfo.managerPhone}`} className="text-[9px] px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md hover:bg-emerald-500/20 transition-all border border-emerald-500/20 flex items-center gap-1 font-medium">
                        <Phone className="w-2.5 h-2.5" />{personnelInfo.managerPhone}
                      </a>
                    </div>
                  </div>
                )}
                {personnelInfo.dutyOfficerName && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">消控室管理人</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-200 font-medium">{personnelInfo.dutyOfficerName}</span>
                      <a href={`tel:${personnelInfo.dutyOfficerPhone}`} className="text-[9px] px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md hover:bg-emerald-500/20 transition-all border border-emerald-500/20 flex items-center gap-1 font-medium">
                        <Phone className="w-2.5 h-2.5" />{personnelInfo.dutyOfficerPhone}
                      </a>
                    </div>
                  </div>
                )}
                {personnelInfo.safetyOfficerName && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">消防安全管理人</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-200 font-medium">{personnelInfo.safetyOfficerName}</span>
                      <a href={`tel:${personnelInfo.safetyOfficerPhone}`} className="text-[9px] px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md hover:bg-emerald-500/20 transition-all border border-emerald-500/20 flex items-center gap-1 font-medium">
                        <Phone className="w-2.5 h-2.5" />{personnelInfo.safetyOfficerPhone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* IoT / Video Panel */}
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              {rightPanelMode === 'gauges' ? (
                <SciFiGaugePanel
                  realtime={realtime}
                  onSwitchVideo={() => setRightPanelMode('video')}
                  flashes={{ p1: p1Flash, p2: p2Flash, l1: l1Flash, l2: l2Flash }}
                />
              ) : (
                <div className="flex-1 tech-card flex flex-col gap-2 min-h-0 p-2 corner-brackets-full relative">
                  <div className="cb-tl" /><div className="cb-tr" /><div className="cb-bl" /><div className="cb-br" />
                  <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px] text-slate-300 font-semibold">视频监控</span>
                      <div className="flex items-center gap-1 ml-1">
                        <div className="w-1.5 h-1.5 rounded-full led-red led-blink" />
                        <span className="text-[9px] text-red-400 font-medium">REC</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCameraSettingsOpen(true)} className="text-[9px] px-2 py-1 rounded-md bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all border border-slate-700/50 flex items-center gap-1">
                        <Settings2 className="w-3 h-3" />设置
                      </button>
                      <button onClick={() => setRightPanelMode('gauges')} className="text-[9px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all border border-emerald-500/20">物联监测</button>
                    </div>
                  </div>
                  {/* Video Display Area */}
                  {linkedCameraId && cameras.find(c => c.id === linkedCameraId)?.status === 1 ? (
                    <div className="flex-1 rounded-lg border border-blue-500/30 bg-slate-900/60 relative overflow-hidden flex items-center justify-center min-h-[180px]">
                      {videoUrl ? (
                        <video
                          ref={videoRef}
                          src={videoUrl}
                          className="w-full h-full object-contain rounded-lg"
                          controls
                          muted
                          autoPlay
                          playsInline
                        />
                      ) : (
                        <SimulatedMonitor label={cameras.find(c => c.id === linkedCameraId)?.cameraName || '监控画面'} />
                      )}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/80 rounded border border-slate-700/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 led-pulse-green" />
                        <span className="text-[9px] text-slate-300">{cameras.find(c => c.id === linkedCameraId)?.cameraName}</span>
                      </div>
                      {/* Camera watermark */}
                      <div className="absolute bottom-2 right-2 text-[10px] text-slate-500/60 font-mono select-none pointer-events-none">
                        CAM-{String(linkedCameraId).padStart(3,'0')} | {new Date().toLocaleDateString('zh-CN')}
                      </div>
                      <button
                        onClick={() => { setLinkedCameraId(null); if (videoRef.current) { videoRef.current.pause(); videoRef.current.removeAttribute('src'); videoRef.current.load(); } }}
                        className="absolute top-2 right-2 w-5 h-5 rounded bg-slate-900/80 border border-slate-700/50 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-all"
                      >
                        <XCircle className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 rounded-lg border border-slate-700/30 bg-slate-800/40 flex flex-col items-center justify-center gap-2">
                      <Monitor className="w-8 h-8 text-slate-600" />
                      <span className="text-xs text-slate-500">
                        {linkedCameraId ? '关联摄像头离线' : '未设置关联摄像头'}
                      </span>
                      <button onClick={() => setCameraSettingsOpen(true)} className="text-[10px] px-3 py-1 bg-blue-500/15 text-blue-400 rounded-md hover:bg-blue-500/25 transition-all border border-blue-500/20">
                        {linkedCameraId ? '重新设置' : '点击设置'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            BOTTOM: Multiline + Bus
           ═══════════════════════════════════════════════════════════════ */}
        <div className="flex gap-2 flex-shrink-0" style={{ height: '30%' }}>
          {/* Multiline Panel */}
          <div className="tech-card flex flex-col flex-[2.3] overflow-hidden corner-brackets-full relative">
            <div className="cb-tl" /><div className="cb-tr" /><div className="cb-bl" /><div className="cb-br" />
            <div className="px-3 py-1.5 hmi-panel-header border-b border-slate-700/30 rounded-t-xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-amber-500/15 flex items-center justify-center ring-1 ring-amber-500/30">
                  <Zap className="w-3 h-3 text-amber-400" />
                </div>
                <span className="text-xs text-slate-200 font-semibold">多线盘</span>
                <Badge className="text-[9px] bg-amber-500/15 text-amber-400 border-amber-500/25 font-medium">{multilinePoints.length}路</Badge>
              </div>
              <div className="flex items-center gap-0.5 bg-slate-900/60 rounded-lg p-0.5">
                {(['sm','md','lg'] as const).map(s => (
                  <button key={s} onClick={() => setMultilineBtnSize(s)}
                    className={`text-[9px] px-1.5 py-0.5 rounded-md transition-all font-medium ${multilineBtnSize === s ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}>
                    {s === 'sm' ? '小' : s === 'md' ? '中' : '大'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
              <div className={`grid gap-2 ${multilineBtnSize === 'lg' ? 'grid-cols-3' : multilineBtnSize === 'md' ? 'grid-cols-4' : 'grid-cols-5'}`}>
                {multilinePoints.map(p => <MultilineCard key={p.id} point={p} hostId={selectedHost?.id} btnSize={multilineBtnSize} />)}
              </div>
            </div>
          </div>
          {/* Bus Panel */}
          <div className="tech-card flex flex-col flex-1 overflow-hidden corner-brackets-full relative">
            <div className="cb-tl" /><div className="cb-tr" /><div className="cb-bl" /><div className="cb-br" />
            <div className="px-3 py-1.5 hmi-panel-header border-b border-slate-700/30 rounded-t-xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-blue-500/15 flex items-center justify-center ring-1 ring-blue-500/30">
                  <Activity className="w-3 h-3 text-blue-400" />
                </div>
                <span className="text-xs text-slate-200 font-semibold">总线盘</span>
                <Badge className="text-[9px] bg-blue-500/15 text-blue-400 border-blue-500/30 font-medium">{busPoints.length}点</Badge>
              </div>
              <div className="flex items-center gap-0.5 bg-slate-900/60 rounded-lg p-0.5">
                <button onClick={() => setBusCols(2)} className={`text-[9px] px-1.5 py-0.5 rounded-md transition-all font-medium ${busCols === 2 ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500 hover:text-slate-300'}`}>2列</button>
                <button onClick={() => setBusCols(4)} className={`text-[9px] px-1.5 py-0.5 rounded-md transition-all font-medium ${busCols === 4 ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500 hover:text-slate-300'}`}>4列</button>
                <div className="w-px h-3 bg-slate-700/60 mx-0.5" />
                {(['sm','md','lg'] as const).map(s => (
                  <button key={s} onClick={() => setBusBtnSize(s)}
                    className={`text-[9px] px-1.5 py-0.5 rounded-md transition-all font-medium ${busBtnSize === s ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500 hover:text-slate-300'}`}>
                    {s === 'sm' ? '小' : s === 'md' ? '中' : '大'}
                  </button>
                ))}
              </div>
            </div>
            <div className={`overflow-y-auto scrollbar-thin p-2 ${busBtnSize === 'sm' ? 'max-h-[260px]' : busBtnSize === 'md' ? 'max-h-[320px]' : 'max-h-[400px]'}`}>
              <div className={`grid gap-2 ${busCols === 2 ? 'grid-cols-2' : 'grid-cols-4'}`}>
                {busPoints.map(p => <BusCard key={p.id} point={p} hostId={selectedHost?.id} btnSize={busBtnSize} />)}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            COMMAND LOGS
           ═══════════════════════════════════════════════════════════════ */}
        <div className="h-24 flex-shrink-0 tech-card flex flex-col overflow-hidden corner-brackets">
          <div className="px-3 py-1 border-b border-slate-700/30 flex items-center gap-1.5 flex-shrink-0 hmi-panel-header">
            <LogIn className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] text-slate-400 font-semibold">操作日志</span>
          </div>
          <div ref={logsRef} className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1 relative">
            {/* Timeline connector line */}
            <div className="absolute left-[52px] top-2 bottom-2 w-px bg-slate-700/30" />
            {commandLogs.length === 0 && <div className="text-[10px] text-slate-600 text-center py-2">暂无操作记录</div>}
            {commandLogs.map((log, idx) => (
              <div key={log.id} className="flex items-center gap-3 text-[10px] animate-slide-in-right relative" style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}>
                <span className="text-slate-600 font-mono w-11 text-right flex-shrink-0">{fmtTime(log.command_time)}</span>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 z-10 relative" style={{ backgroundColor: log.result === 1 ? '#34d399' : '#f87171', boxShadow: log.result === 1 ? '0 0 4px rgba(52,211,153,0.5)' : '0 0 4px rgba(248,113,113,0.5)' }} />
                <Badge className={`text-[9px] px-1 py-0 ${log.result === 1 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{log.result === 1 ? '成功' : '失败'}</Badge>
                <span className="text-slate-400">{log.command_by}</span>
                <span className="text-slate-300">{log.command_type}</span>
                {log.point_name && <span className="text-slate-500">{log.point_name}</span>}
                <span className="text-slate-500">{log.command_value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          DIALOGS
         ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={silenceDialog} onOpenChange={setSilenceDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-sm backdrop-blur-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><VolumeX className="w-5 h-5 text-blue-400" /> 远程消音确认</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-400">确认对 <span className="font-medium text-slate-200">{selectedHost?.host_name || '报警主机'}</span> 执行远程消音操作？</p>
          <p className="text-xs text-yellow-500">仅关闭现场声光报警器的声音，不清除当前告警，不复位设备状态。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSilenceDialog(false)} className="border-slate-600 text-slate-300 h-8 text-xs">取消</Button>
            <Button onClick={handleSilence} disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white h-8 text-xs">{loading ? '执行中...' : '确认消音'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPwdOpen} onOpenChange={setResetPwdOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-sm backdrop-blur-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><RotateCcw className="w-5 h-5 text-yellow-400" /> 二级密码验证</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-400">执行设备复位前请输入二级密码</p>
          <Input type="password" value={resetPwdInput} onChange={e => { setResetPwdInput(e.target.value); setResetPwdError(false); }}
            onKeyDown={e => e.key === 'Enter' && checkResetPwd()} placeholder="输入密码"
            className={`bg-slate-700 border ${resetPwdError ? 'border-red-500' : 'border-slate-600'} text-slate-200 h-8 text-xs mt-1`} />
          {resetPwdError && <p className="text-xs text-red-400">密码错误</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPwdOpen(false); setResetPwdInput(''); setResetPwdError(false); }} className="border-slate-600 text-slate-300 h-8 text-xs">取消</Button>
            <Button onClick={checkResetPwd} className="bg-yellow-500 hover:bg-yellow-600 text-white h-8 text-xs">验证</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialog} onOpenChange={setResetDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-sm backdrop-blur-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><RotateCcw className="w-5 h-5 text-yellow-400" /> 设备复位确认</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-400">确认对 <span className="font-medium text-slate-200">{selectedHost?.host_name || '报警主机'}</span> 执行设备复位操作？</p>
          <p className="text-xs text-yellow-500">远程火警、故障复位，清除当前告警状态，恢复设备正常运行。历史告警记录不会被删除。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog(false)} className="border-slate-600 text-slate-300 h-8 text-xs">取消</Button>
            <Button onClick={handleReset} disabled={loading} className="bg-yellow-500 hover:bg-yellow-600 text-white h-8 text-xs">{loading ? '执行中...' : '确认复位'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shieldDialog} onOpenChange={setShieldDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-sm backdrop-blur-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Shield className="w-5 h-5 text-purple-400" /> 添加屏蔽</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-slate-300 text-xs">屏蔽设备</Label><div className="text-sm text-slate-200 mt-0.5">{selectedHost?.host_name || '报警主机'}</div></div>
            <div><Label className="text-slate-300 text-xs">屏蔽原因 <span className="text-red-400">*</span></Label><Input value={shieldReason} onChange={e => setShieldReason(e.target.value)} placeholder="请输入屏蔽原因（如：设备检修）" className="bg-slate-700 border-slate-600 text-slate-200 h-8 text-xs mt-0.5" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShieldDialog(false)} className="border-slate-600 text-slate-300 h-8 text-xs">取消</Button>
            <Button onClick={handleShield} disabled={loading || !shieldReason} className="bg-purple-500 hover:bg-purple-600 text-white h-8 text-xs">{loading ? '添加中...' : '添加屏蔽'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modeDialog} onOpenChange={setModeDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-sm backdrop-blur-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Hand className="w-5 h-5 text-blue-400" /> 模式切换</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">当前: <Badge className={`text-xs ${currentMode.currentMode === 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{currentMode.modeName}</Badge></p>
            <p className="text-sm text-slate-400">切换为: <Badge className={`text-xs ${modeTarget === 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{modeTarget === 2 ? '自动' : '手动'}</Badge></p>
            <p className="text-xs text-yellow-500">{modeTarget === 1 ? '手动模式下联动设备不会自动启动，需人工确认后操作。' : '自动模式下联动设备将根据报警信号自动启动。'}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModeDialog(false)} className="border-slate-600 text-slate-300 h-8 text-xs">取消</Button>
            <Button onClick={handleModeSwitch} disabled={loading} className="bg-blue-500 hover:bg-blue-600 text-white h-8 text-xs">{loading ? '切换中...' : '确认切换'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Settings Dialog - view all cameras */}
      <Dialog open={cameraSettingsOpen} onOpenChange={setCameraSettingsOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md backdrop-blur-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Cog className="w-5 h-5 text-blue-400" /> 摄像头状态</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
            {cameras.length === 0 && <p className="text-sm text-slate-500 text-center py-4">暂无摄像头数据</p>}
            {cameras.map(cam => (
              <div key={cam.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${cam.status === 1 ? 'bg-slate-900/40 border-slate-700/30' : 'bg-slate-900/20 border-slate-700/20 opacity-50'}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cam.status === 1 ? 'bg-emerald-400 led-pulse-green' : 'bg-slate-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 font-medium truncate">{cam.cameraName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{cam.cameraNo} · {cam.position || '未指定位置'} · {cam.status === 1 ? '在线' : '离线'}</div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCameraSettingsOpen(false)} className="border-slate-600 text-slate-300 h-8 text-xs">关闭</Button>
            <Button onClick={() => { setCameraSettingsOpen(false); const onlineCams = cameras.filter(c => c.status === 1); if (onlineCams.length === 0) { showToast('暂无在线摄像头', 'error'); return; } setCameraSelectOpen(true); }} className="bg-blue-500 hover:bg-blue-600 text-white h-8 text-xs">确认关联</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Online Camera Select Dialog */}
      <Dialog open={cameraSelectOpen} onOpenChange={setCameraSelectOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md backdrop-blur-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Video className="w-5 h-5 text-emerald-400" /> 选择在线摄像头</DialogTitle></DialogHeader>
          <p className="text-xs text-slate-500 mb-2">请选择要关联显示的在线摄像头：</p>
          <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
            {cameras.filter(c => c.status === 1).map(cam => (
              <div key={cam.id} onClick={() => setLinkedCameraId(cam.id)}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${linkedCameraId === cam.id ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/40 border-slate-700/30 hover:border-slate-600/50'}`}>
                <div className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-400 led-pulse-green" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 font-medium truncate">{cam.cameraName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{cam.cameraNo} · {cam.position || '未指定位置'}</div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${linkedCameraId === cam.id ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'}`}>
                  {linkedCameraId === cam.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCameraSelectOpen(false)} className="border-slate-600 text-slate-300 h-8 text-xs">取消</Button>
            <Button onClick={() => {
              if (!linkedCameraId) { showToast('请选择一个摄像头', 'error'); return; }
              const cam = cameras.find(c => c.id === linkedCameraId);
              if (!cam || cam.status !== 1) { showToast('请选择一个在线摄像头', 'error'); return; }
              setVideoUrl(cam.streamUrl || '');
              setVideoTitle(cam.cameraName || '视频监控');
              setCameraSelectOpen(false);
              showToast(`已关联摄像头：${cam.cameraName}`, 'success');
            }} className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-xs">确认选择</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium border backdrop-blur-sm shadow-lg ${toast.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : toast.type === 'error' ? 'bg-red-500/15 text-red-300 border-red-500/25' : 'bg-blue-500/15 text-blue-300 border-blue-500/25'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Video Player Modal */}
      {videoOpen && (
        <SimpleVideoPlayer streamUrl={videoUrl} title={videoTitle} onClose={() => setVideoOpen(false)} />
      )}
    </DataContainer>
  );
}

/* ════════════════════════════════════════════
   Sub Components
   ════════════════════════════════════════════ */

function AlarmTable({ alarmTab, fireAlarms, faultAlarms, shieldItems, feedbackAlarms, fmtTime, cell, confirmingId, handleConfirm }: any) {
  const renderRows = () => {
    const rows: any[] = [];
    if (alarmTab === 'all' || alarmTab === 'fire') {
      fireAlarms.slice(0, 4).forEach((a: FireAlarm) => rows.push(
        <div key={`fire-${a.id}`} className={`grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row fire-table-row-red border-b border-slate-700/10 items-center group ${a.status === 0 ? 'alarm-critical animate-red-pulse' : ''}`}>
          <div className="flex items-center">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${a.alarm_type === 1 ? 'text-red-400 bg-red-500/15 border-red-500/30' : a.alarm_type === 2 ? 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' : 'text-purple-400 bg-purple-500/15 border-purple-500/30'}`}>{a.alarm_type === 1 ? '火警' : a.alarm_type === 2 ? '故障' : '预警'}</span>
          </div>
          <span className={`${cell} text-slate-500`}>{fmtTime(a.created_at)}</span>
          <span className={`${cell} text-slate-200 font-semibold`}>{a.device_name}</span>
          <span className={`${cell} text-slate-500`}>{a.device_point}</span>
          <span className={`${cell} text-slate-500 font-mono`}>1</span>
          <span className={`${cell} text-slate-500 font-mono`}>{a.device_code}</span>
          <span className={`text-[10px] leading-none text-center font-semibold ${a.status === 0 ? 'text-red-400 glow-text-red' : a.status === 1 ? 'text-blue-400' : a.status === 2 ? 'text-emerald-400' : 'text-slate-400'}`}>{a.status === 0 ? '未处理' : a.status === 1 ? '已确认' : a.status === 2 ? '已处理' : '误报'}</span>
          <div className="flex items-center justify-center">
            {a.status === 0 ? (
              <button onClick={() => handleConfirm(String(a.id), 1)} disabled={confirmingId === String(a.id)} className="text-[10px] px-2 py-1 bg-blue-500/15 text-blue-400 rounded-md hover:bg-blue-500/25 transition-all border border-blue-500/20 font-medium disabled:opacity-40">{confirmingId === String(a.id) ? '中' : '确认'}</button>
            ) : (
              <button className="text-[10px] px-2 py-1 bg-slate-700/40 text-slate-400 rounded-md hover:bg-slate-700/60 transition-all border border-slate-600/30 flex items-center gap-1"><Eye className="w-3 h-3" />查看</button>
            )}
          </div>
        </div>
      ));
    }
    if (alarmTab === 'all' || alarmTab === 'fault') {
      faultAlarms.slice(0, 4).forEach((f: FaultAlarm) => rows.push(
        <div key={`fault-${f.id}`} className={`grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row fire-table-row-amber border-b border-slate-700/10 items-center group ${f.status === 0 ? 'alarm-warning' : ''}`}>
          <div className="flex items-center"><span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20">故障</span></div>
          <span className={`${cell} text-slate-500`}>{fmtTime(f.created_at)}</span>
          <span className={`${cell} text-slate-200 font-semibold`}>{f.device_name}</span>
          <span className={`${cell} text-slate-500`}>{f.device_type}</span>
          <span className={`${cell} text-slate-500 font-mono`}>1</span>
          <span className={`${cell} text-slate-500 font-mono`}>{f.alarm_no}</span>
          <span className={`text-[10px] leading-none text-center font-semibold ${f.status === 0 ? 'text-yellow-400 glow-text-yellow' : 'text-emerald-400'}`}>{f.status === 0 ? '未处理' : '已处理'}</span>
          <div className="flex items-center justify-center"><button className="text-[10px] px-2 py-1 bg-slate-700/40 text-slate-400 rounded-md hover:bg-slate-700/60 transition-all border border-slate-600/30 flex items-center gap-1"><Eye className="w-3 h-3" />查看</button></div>
        </div>
      ));
    }
    if (alarmTab === 'all' || alarmTab === 'shield') {
      shieldItems.slice(0, 4).forEach((s: ShieldItem) => rows.push(
        <div key={`shield-${s.id}`} className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row fire-table-row-purple border-b border-slate-700/10 items-center group">
          <div className="flex items-center"><span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20">屏蔽</span></div>
          <span className={`${cell} text-slate-500`}>{fmtTime(s.shield_time)}</span>
          <span className={`${cell} text-slate-200 font-semibold`}>{s.point_name}</span>
          <span className={`${cell} text-slate-500`}>{s.device_type}</span>
          <span className={`${cell} text-slate-500 font-mono`}>1</span>
          <span className={`${cell} text-slate-500 font-mono`}>—</span>
          <span className="text-[10px] leading-none text-center font-semibold text-purple-400">屏蔽中</span>
          <div className="flex items-center justify-center"><button className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-400 rounded-md hover:bg-purple-500/20 transition-all border border-purple-500/20 font-medium">解除</button></div>
        </div>
      ));
    }
    if (alarmTab === 'all' || alarmTab === 'feedback') {
      feedbackAlarms.slice(0, 4).forEach((fb: FeedbackAlarm) => rows.push(
        <div key={`fb-${fb.id}`} className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row fire-table-row-cyan border-b border-slate-700/10 items-center group">
          <div className="flex items-center"><span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20">反馈</span></div>
          <span className={`${cell} text-slate-500`}>{fmtTime(fb.created_at)}</span>
          <span className={`${cell} text-slate-200 font-semibold`}>{fb.device_name}</span>
          <span className={`${cell} text-slate-500`}>{fb.feedback_desc}</span>
          <span className={`${cell} text-slate-500 font-mono`}>1</span>
          <span className={`${cell} text-slate-500 font-mono`}>—</span>
          <span className="text-[10px] leading-none text-center font-semibold text-blue-400">正常</span>
          <div className="flex items-center justify-center"><button className="text-[10px] px-2 py-1 bg-slate-700/40 text-slate-400 rounded-md hover:bg-slate-700/60 transition-all border border-slate-600/30 flex items-center gap-1"><Eye className="w-3 h-3" />查看</button></div>
        </div>
      ));
    }
    if (rows.length === 0) {
      return <div className="h-[120px] flex flex-col items-center justify-center gap-2 text-slate-600"><BellOff className="w-6 h-6 text-slate-700" /><span className="text-xs">暂无数据</span></div>;
    }
    return rows;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 tech-card rounded-t-none overflow-hidden corner-brackets">
      <div className="grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-8 glass flex-shrink-0 items-center border-b border-slate-700/20">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">类型</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">时间</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">设备名称</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">点位</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">主机</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">编码</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center">状态</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center">操作</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {renderRows()}
      </div>
    </div>
  );
}

function SciFiGauge({ label, value, unit, max, color, flash }: { label: string; value: number; unit: string; max: number; color: string; flash?: boolean }) {
  const numValue = typeof value === 'number' && !isNaN(value) ? value : (Number(value) || 0);
  const pct = Math.min(100, Math.max(0, (numValue / max) * 100));
  const radius = 28;
  const cx = 32;
  const cy = 34;
  const startAngle = 135;
  const endAngle = 405;
  const angle = startAngle + (pct / 100) * (endAngle - startAngle);
  const rad = (angle * Math.PI) / 180;
  const nx = cx + radius * Math.cos(rad);
  const ny = cy + radius * Math.sin(rad);
  const zoneColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : color;

  const isAbnormal = (label.includes('压力') && (numValue > 0.8 || numValue < 0.2)) || (label.includes('液位') && numValue < 1.0);

  return (
    <div className={`flex flex-col items-center justify-center gap-1 relative p-1 rounded-lg transition-all ${flash ? 'data-changed' : ''} ${isAbnormal ? 'alarm-critical rounded-lg' : ''}`}>
      <svg viewBox="0 0 64 44" className="w-full h-12">
        <defs>
          <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={zoneColor} stopOpacity="0.8" />
          </linearGradient>
          <filter id={`glow-${label}`}>
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Background arc */}
        <path d={`M ${cx + radius * Math.cos((startAngle * Math.PI) / 180)} ${cy + radius * Math.sin((startAngle * Math.PI) / 180)} A ${radius} ${radius} 0 1 1 ${cx + radius * Math.cos((endAngle * Math.PI) / 180)} ${cy + radius * Math.sin((endAngle * Math.PI) / 180)}`}
          fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="6" strokeLinecap="round" />
        {/* Value arc */}
        <path d={`M ${cx + radius * Math.cos((startAngle * Math.PI) / 180)} ${cy + radius * Math.sin((startAngle * Math.PI) / 180)} A ${radius} ${radius} 0 ${angle > startAngle + 180 ? 1 : 0} 1 ${nx} ${ny}`}
          fill="none" stroke={`url(#grad-${label})`} strokeWidth="6" strokeLinecap="round" filter={`url(#glow-${label})`} />
        {/* Ticks */}
        {[0, 25, 50, 75, 100].map(t => {
          const ta = startAngle + (t / 100) * (endAngle - startAngle);
          const tr = (ta * Math.PI) / 180;
          const tx1 = cx + (radius - 4) * Math.cos(tr);
          const ty1 = cy + (radius - 4) * Math.sin(tr);
          const tx2 = cx + (radius + 2) * Math.cos(tr);
          const ty2 = cy + (radius + 2) * Math.sin(tr);
          return <line key={t} x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="rgba(148,163,184,0.3)" strokeWidth="0.5" />;
        })}
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="2" fill={zoneColor} />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={cx + (radius - 8) * Math.cos(rad)} y2={cy + (radius - 8) * Math.sin(rad)}
          stroke={zoneColor} strokeWidth="1.5" strokeLinecap="round" />
        {/* Value text */}
        <text x={cx} y={cy + 6} className="sci-fi-value" fill={zoneColor}>{numValue.toFixed(2)}</text>
        <text x={cx} y={cy + 11} className="sci-fi-unit">{unit}</text>
      </svg>
      <span className="text-[8px] font-medium" style={{ color: zoneColor }}>{label}</span>
    </div>
  );
}

function SciFiGaugePanel({ realtime, onSwitchVideo, flashes }: { realtime: RealtimeData; onSwitchVideo: () => void; flashes: { p1: boolean; p2: boolean; l1: boolean; l2: boolean } }) {
  return (
    <div className="flex-1 sci-fi-panel rounded-xl p-2 flex flex-col gap-2 min-h-0 relative corner-brackets-full">
      <div className="cb-tl" /><div className="cb-tr" /><div className="cb-bl" /><div className="cb-br" />
      <div className="sci-fi-scan-line" />
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 relative z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3 bg-cyan-400/60 rounded-full" />
          <span className="text-[10px] text-cyan-300 font-bold tracking-wider sci-fi-text">SENSOR_DATA</span>
          <span className="text-[8px] text-cyan-500/50 px-1.5 py-0.5 bg-cyan-500/5 rounded border border-cyan-500/10">LIVE</span>
        </div>
        <button onClick={onSwitchVideo} className="text-[9px] px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all border border-blue-500/20 flex items-center gap-1">
          <Video className="w-3 h-3" />视频
        </button>
      </div>
      {/* Grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      {/* Gauges */}
      <div className="flex-1 grid grid-cols-2 gap-2 min-h-0 relative z-10">
        <SciFiGauge label="管网压力" value={realtime.pressure_1} unit="MPa" max={1} color="#10b981" flash={flashes.p1} />
        <SciFiGauge label="喷淋压力" value={realtime.pressure_2} unit="MPa" max={1} color="#3b82f6" flash={flashes.p2} />
        <SciFiGauge label="水箱液位" value={realtime.liquid_level_1} unit="m" max={5} color="#06b6d4" flash={flashes.l1} />
        <SciFiGauge label="消防水池" value={realtime.liquid_level_2} unit="m" max={5} color="#8b5cf6" flash={flashes.l2} />
      </div>
      {/* Bottom data strip */}
      <div className="flex items-center justify-between px-2 py-1 bg-slate-900/40 rounded border border-slate-700/20 flex-shrink-0 relative z-10">
        <span className="text-[8px] text-slate-500 sci-fi-text">HOST_ID: {realtime.host_status === 1 ? 'ONLINE' : 'OFFLINE'}</span>
        <span className="text-[8px] text-slate-500 sci-fi-text">MODE: {realtime.current_mode === 2 ? 'AUTO' : 'MANUAL'}</span>
      </div>
    </div>
  );
}

function MultilineCard({ point, hostId, btnSize = 'md' }: { point: MultilinePoint; hostId?: number; btnSize?: 'sm' | 'md' | 'lg' }) {
  const [running, setRunning] = useState(point.status === 1);
  const [feedback, setFeedback] = useState(point.feedback_status === 1);
  const [fault] = useState(point.fault_status === 1);
  const [confirmAction, setConfirmAction] = useState<'start' | 'stop' | null>(null);
  const [needPwd, setNeedPwd] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdError, setPwdError] = useState(false);
  const [execLoading, setExecLoading] = useState(false);
  const [execResult, setExecResult] = useState<{type: 'success' | 'error'; msg: string} | null>(null);
  const [opAnim, setOpAnim] = useState(false);

  const sizeConfig = {
    sm: { pad: 'p-1.5', gap: 'gap-1', icon: 'w-3 h-3', text: 'text-[10px]', btnText: 'text-[9px]', btnPy: 'py-0.5', btnIcon: 'w-2.5 h-2.5', indicator: 'w-1.5 h-1.5', indicatorText: 'text-[7px]' },
    md: { pad: 'p-2', gap: 'gap-1.5', icon: 'w-3.5 h-3.5', text: 'text-[11px]', btnText: 'text-[10px]', btnPy: 'py-1', btnIcon: 'w-3 h-3', indicator: 'w-2 h-2', indicatorText: 'text-[8px]' },
    lg: { pad: 'p-2.5', gap: 'gap-2', icon: 'w-4 h-4', text: 'text-xs', btnText: 'text-[11px]', btnPy: 'py-1.5', btnIcon: 'w-3.5 h-3.5', indicator: 'w-2.5 h-2.5', indicatorText: 'text-[9px]' },
  };
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
    <div className={`relative tech-card ${s.pad} flex flex-col ${s.gap} hover:scale-[1.01] corner-brackets ${opAnim ? 'animate-scale-in' : ''}`}>
      {execResult && (
        <div className={`absolute top-1 left-1 right-1 z-20 text-center ${s.btnText} py-0.5 rounded font-medium ${execResult.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>{execResult.msg}</div>
      )}
      <div className="flex items-center justify-between">
        <HardDrive className={`${s.icon} text-slate-500`} />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${running ? 'led-green led-pulse' : 'bg-slate-700'}`} /><span className={`${s.indicatorText} ${running ? 'text-emerald-400' : 'text-slate-500'}`}>启</span></div>
          <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${feedback ? 'led-blue' : 'bg-slate-700'}`} /><span className={`${s.indicatorText} ${feedback ? 'text-blue-400' : 'text-slate-500'}`}>反</span></div>
          <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${fault ? 'led-red led-blink' : 'bg-slate-700'}`} /><span className={`${s.indicatorText} ${fault ? 'text-red-400' : 'text-slate-500'}`}>故</span></div>
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

function generateDefaultMultiline(hostId?: number): MultilinePoint[] {
  const hid = hostId || 1;
  return [
    { id: hid * 10 + 1, host_id: hid, point_no: 1, point_name: '喷淋泵启动', device_type: '喷淋泵', status: 0, feedback_status: 0, fault_status: 0 },
    { id: hid * 10 + 2, host_id: hid, point_no: 2, point_name: '消防泵启动', device_type: '消防泵', status: 1, feedback_status: 1, fault_status: 0 },
    { id: hid * 10 + 3, host_id: hid, point_no: 3, point_name: '排烟风机启动', device_type: '排烟风机', status: 0, feedback_status: 0, fault_status: 1 },
    { id: hid * 10 + 4, host_id: hid, point_no: 4, point_name: '正压送风机启动', device_type: '正压送风机', status: 0, feedback_status: 0, fault_status: 0 },
    { id: hid * 10 + 5, host_id: hid, point_no: 5, point_name: '消防广播', device_type: '广播设备', status: 0, feedback_status: 0, fault_status: 0 },
  ];
}

function generateDefaultBusPoints(hostId?: number): BusPoint[] {
  const hid = hostId || 1;
  const locations = ['1F大厅', '2F走廊', 'B1停车场', '天台', '配电室'];
  const deviceTypes = ['烟感探测器', '温感探测器', '手动报警按钮', '输入输出模块'];
  return Array.from({ length: 16 }, (_, i) => ({
    id: hid * 100 + i + 1,
    host_id: hid,
    loop_no: Math.floor(i / 8) + 1,
    point_no: (i % 8) + 1,
    point_name: `回路${Math.floor(i / 8) + 1}_点位${(i % 8) + 1}`,
    device_type: deviceTypes[i % 4],
    install_location: locations[i % 5],
    status: i < 2 ? 1 : i < 4 ? 2 : 0,
  }));
}

function SimulatedMonitor({ label }: { label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let raf: number;
    const w = canvas.width;
    const h = canvas.height;

    const draw = () => {
      frame++;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
      for (let i = 0; i < h; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }

      // Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let i = 0; i < h; i += 4) ctx.fillRect(0, i, w, 1);

      // Noise
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.06})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }

      // Moving target
      const tx = w * 0.3 + Math.sin(frame * 0.012) * w * 0.25;
      const ty = h * 0.4 + Math.cos(frame * 0.018) * h * 0.18;
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(tx, ty, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Crosshair
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx - 14, ty); ctx.lineTo(tx + 14, ty); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx, ty - 14); ctx.lineTo(tx, ty + 14); ctx.stroke();

      // Corner brackets
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1.5;
      const cs = 12;
      [[0, 0], [w, 0], [0, h], [w, h]].forEach(([cx, cy]) => {
        ctx.beginPath();
        if (cx === 0) { ctx.moveTo(cs, cy); ctx.lineTo(3, cy); ctx.lineTo(3, cy === 0 ? cs : cy - cs); }
        else { ctx.moveTo(cx - cs, cy); ctx.lineTo(cx - 3, cy); ctx.lineTo(cx - 3, cy === 0 ? cs : cy - cs); }
        ctx.stroke();
      });

      // Timestamp
      ctx.fillStyle = '#22c55e';
      ctx.font = '10px monospace';
      ctx.fillText(new Date().toLocaleString('zh-CN'), 10, 18);

      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`[模拟画面] ${label}`, 10, 34);

      // Signal bars
      ctx.fillStyle = '#f59e0b';
      for (let i = 0; i < 4; i++) { const barH = 2 + i * 2.5; ctx.fillRect(w - 26 + i * 4, 16 - barH, 2.5, barH); }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [label]);

  return (
    <div className="relative w-full h-full rounded overflow-hidden bg-[#0f1720]">
      <canvas ref={canvasRef} width={480} height={270} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)' }} />
    </div>
  );
}

function BusCard({ point, hostId, btnSize = 'md' }: { point: BusPoint; hostId?: number; btnSize?: 'sm' | 'md' | 'lg' }) {
  const [running, setRunning] = useState(point.status === 1);
  const [feedback, setFeedback] = useState(point.status === 1);
  const [confirmAction, setConfirmAction] = useState<'start' | 'stop' | null>(null);
  const [needPwd, setNeedPwd] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdError, setPwdError] = useState(false);
  const [execLoading, setExecLoading] = useState(false);
  const [execResult, setExecResult] = useState<{type: 'success' | 'error'; msg: string} | null>(null);
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

  const statusColor = point.status === 1 ? 'led-red led-blink' : point.status === 2 ? 'led-yellow' : point.status === 3 ? 'bg-slate-400' : running ? 'led-green led-pulse' : 'bg-slate-600';
  const statusLabel = point.status === 1 ? '火警' : point.status === 2 ? '故障' : point.status === 3 ? '屏蔽' : running ? '启动' : '正常';

  const sizeConfig = {
    sm: { pad: 'p-1.5', text: 'text-[10px]', subText: 'text-[9px]', btnText: 'text-[9px]', btnPy: 'py-0.5', icon: 'w-3 h-3', indicator: 'w-1.5 h-1.5' },
    md: { pad: 'p-2', text: 'text-[11px]', subText: 'text-[10px]', btnText: 'text-[10px]', btnPy: 'py-1', icon: 'w-3.5 h-3.5', indicator: 'w-2 h-2' },
    lg: { pad: 'p-2.5', text: 'text-xs', subText: 'text-[11px]', btnText: 'text-[11px]', btnPy: 'py-1.5', icon: 'w-4 h-4', indicator: 'w-2.5 h-2.5' },
  };
  const s = sizeConfig[btnSize];

  return (
    <div className={`relative tech-card ${s.pad} flex flex-col gap-1 hover:scale-[1.01] corner-brackets ${opAnim ? 'animate-scale-in' : ''}`}>
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
        <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${running ? 'led-green led-pulse' : 'bg-slate-700'}`} /><span className={`${s.subText} ${running ? 'text-emerald-400' : 'text-slate-600'}`}>启动</span></div>
        <div className="flex items-center gap-0.5"><div className={`${s.indicator} rounded-full transition-all ${feedback ? 'led-blue' : 'bg-slate-700'}`} /><span className={`${s.subText} ${feedback ? 'text-blue-400' : 'text-slate-600'}`}>反馈</span></div>
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
