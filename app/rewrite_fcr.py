import sys

content = '''import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  VolumeX, RotateCcw, Shield, CheckCircle, Hand,
  Flame, AlertTriangle, Play, Square, Eye,
  Zap, Activity, HardDrive,
  BellOff, Users, Monitor, Clock,
  Video, Gauge, LogIn, Radio,
  RefreshCw, Wifi, WifiOff, CheckCircle2, XCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { controlRoomConfigService } from '@/api/services';
import { ControlRoomDAO } from '@/db/Database';
import DataContainer from '@/components/DataContainer';
import SimpleVideoPlayer from '@/components/SimpleVideoPlayer';

/* ============================================================
   消防控制室 - FAS集中监控界面
   ============================================================ */

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

export default function FireControlRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [roomName, setRoomName] = useState('未知消控室');
  const [projectName, setProjectName] = useState('');
  const [allRooms, setAllRooms] = useState<{ id: string; name: string }[]>([]);
  const [selectedHost, setSelectedHost] = useState<{ id: number; host_name: string; duty_phone: string; duty_person: string } | null>(null);
  const [personnelInfo, setPersonnelInfo] = useState<any>(null);

  const [realtime, setRealtime] = useState<RealtimeData>({
    pressure_1: 0.42, pressure_2: 0.38, liquid_level_1: 3.85, liquid_level_2: 4.20,
    video_status: 1, host_status: 1, current_mode: 2, silenced: 0,
    fire_count: 0, fault_count: 0, shield_count: 0, feedback_count: 0
  });

  const [fireAlarms, setFireAlarms] = useState<FireAlarm[]>([]);
  const [faultAlarms, setFaultAlarms] = useState<FaultAlarm[]>([]);
  const [shieldItems, setShieldItems] = useState<ShieldItem[]>([]);
  const [feedbackAlarms, setFeedbackAlarms] = useState<FeedbackAlarm[]>([]);

  const [multilinePoints, setMultilinePoints] = useState<MultilinePoint[]>([]);
  const [busPoints, setBusPoints] = useState<BusPoint[]>([]);
  const [multilineBtnSize, setMultilineBtnSize] = useState<'sm'|'md'|'lg'>('md');
  const [busBtnSize, setBusBtnSize] = useState<'sm'|'md'|'lg'>('md');
  const [busCols, setBusCols] = useState<2|4>(2);

  const [cameras, setCameras] = useState<VideoCamera[]>([]);
  const [activeCamera, setActiveCamera] = useState(0);

  const [silenceDialog, setSilenceDialog] = useState(false);
  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPwdInput, setResetPwdInput] = useState('');
  const [resetPwdError, setResetPwdError] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [shieldDialog, setShieldDialog] = useState(false);
  const [modeDialog, setModeDialog] = useState(false);
  const [modeTarget, setModeTarget] = useState(2);
  const [shieldReason, setShieldReason] = useState('');
  const [confirmingId, setConfirmingId] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const logsRef = useRef<HTMLDivElement>(null);
  const [alarmTab, setAlarmTab] = useState<'all'|'fire'|'fault'|'shield'|'feedback'>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{msg: string; type: 'success'|'error'|'info'; id: number} | null>(null);
  const showToast = (msg: string, type: 'success'|'error'|'info' = 'info') => {
    const id = Date.now();
    setToast({ msg, type, id });
    setTimeout(() => setToast(t => t?.id === id ? null : t), 3000);
  };
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const openVideo = (cam: VideoCamera) => {
    setVideoUrl(cam.streamUrl || '');
    setVideoTitle(cam.cameraName || '视频监控');
    setVideoOpen(true);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [commandLogs]);

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

  const loadData = useCallback(async () => {
    if (!roomId) return;
    setPageLoading(true);
    setError(null);
    try {
      const [allRoomsRes, hostsRes] = await Promise.all([
        ControlRoomDAO.getAll(),
        api.getControlRoomHosts(roomId as any),
      ]) as [any, any];
      const roomRes = allRoomsRes.find((r: any) => String(r.id) === String(roomId)) || null;
      setAllRooms(allRoomsRes.map((r: any) => ({ id: String(r.id), name: r.unitName?.trim() || r.room_name?.trim() || r.name?.trim() || r.unit_name?.trim() || r.id || '未命名' })));
      const unitName = roomRes?.unitName?.trim() || roomRes?.room_name?.trim() || roomRes?.name?.trim() || roomRes?.id || '未知消控室';
      setRoomName(unitName);
      setProjectName(unitName + '消防项目');

      try {
        const configRes = await controlRoomConfigService.listAll() as any;
        const configs = Array.isArray(configRes.data) ? configRes.data : (configRes.data?.list || []);
        const config = configs.find((c: any) => c.unitId === roomId || c.id?.includes(String(roomId)));
        if (config) setPersonnelInfo(config);
      } catch { /* ignore */ }

      const hosts = Array.isArray(hostsRes) ? hostsRes : (hostsRes?.list || []);
      let activeHostId = 1;
      if (hosts.length > 0) {
        activeHostId = hosts[0].id;
        setSelectedHost({
          id: hosts[0].id,
          host_name: hosts[0].host_name,
          duty_phone: hosts[0].duty_phone || '13911110001',
          duty_person: hosts[0].duty_person || '王值班',
        });
      }

      const [fireRes, faultRes, multiRes, busRes, rtRes, shieldRes, fbRes, logRes, vidRes] = await Promise.all([
        api.getFireAlarms(),
        api.getFaultAlarms(),
        api.getMultilinePanels(activeHostId),
        api.getBusPoints(activeHostId),
        api.getRealtimeStatus(roomId, activeHostId),
        api.getShields(roomId, activeHostId),
        api.alarmRecent(),
        api.getHostCommandLogs({ roomId, hostId: activeHostId, limit: 20 }),
        api.getVideos(roomId),
      ]);

      const fireList = Array.isArray(fireRes) ? fireRes : (fireRes?.list || []);
      const faultList = Array.isArray(faultRes) ? faultRes : (faultRes?.list || []);
      setFireAlarms(fireList.filter((a: any) => a.alarm_type === 1).slice(0, 8));
      setFaultAlarms(faultList.filter((a: any) => a.alarm_type === 2).slice(0, 8));
      setMultilinePoints(Array.isArray(multiRes) ? multiRes : (multiRes?.list || []));
      setBusPoints(Array.isArray(busRes) ? busRes : (busRes?.list || []));

      if (rtRes && typeof rtRes === 'object' && !Array.isArray(rtRes)) {
        setRealtime(prev => ({ ...prev, ...rtRes }));
      }
      setShieldItems(Array.isArray(shieldRes) ? shieldRes : (shieldRes?.list || []));
      setFeedbackAlarms(Array.isArray(fbRes) ? fbRes.slice(0, 8) : (fbRes?.list || []).slice(0, 8));
      setCommandLogs(Array.isArray(logRes) ? logRes : (logRes?.list || []));
      setCameras(Array.isArray(vidRes) ? vidRes : (vidRes?.list || []));
    } catch (e) {
      console.error('loadData error', e);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setPageLoading(false);
    }
  }, [roomId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSilence = async () => {
    setLoading(true);
    try {
      await api.silenceHost(selectedHost?.id || 1);
      setRealtime(prev => ({ ...prev, silenced: 1 }));
      setSilenceDialog(false);
      showToast('远程消音指令已下发', 'success');
    } catch (e) { showToast('消音指令下发失败', 'error'); }
    finally { setLoading(false); }
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
      setRealtime(prev => ({ ...prev, fire_count: 0, fault_count: 0, silenced: 0 }));
      setFireAlarms([]); setFaultAlarms([]);
      setResetDialog(false);
      showToast('设备复位成功', 'success');
    } catch (e) { showToast('设备复位失败', 'error'); }
    finally { setLoading(false); }
  };

  const handleShield = async () => {
    setLoading(true);
    try {
      await api.addShield({
        roomId, hostId: selectedHost?.id || 1,
        pointName: selectedHost?.host_name || '主机',
        shieldReason, shieldBy: 'admin'
      });
      setShieldDialog(false); setShieldReason('');
      loadData();
      showToast('屏蔽添加成功', 'success');
    } catch (e) { showToast('屏蔽添加失败', 'error'); }
    finally { setLoading(false); }
  };

  const openModeDialog = (mode: number) => { setModeTarget(mode); setModeDialog(true); };
  const handleModeSwitch = async () => {
    setLoading(true);
    try {
      await api.switchHostMode(selectedHost?.id || 1, modeTarget === 2 ? 'auto' : 'manual');
      setRealtime(prev => ({ ...prev, current_mode: modeTarget }));
      setModeDialog(false);
      showToast(`已切换为${modeTarget === 2 ? '自动' : '手动'}模式`, 'success');
    } catch (e) { showToast('模式切换失败', 'error'); }
    finally { setLoading(false); }
  };

  const handleConfirm = async (id: string, result: number) => {
    setConfirmingId(id);
    await new Promise(r => setTimeout(r, 500));
    setFireAlarms(prev => prev.map(a => a.id === Number(id) ? { ...a, status: 1, confirm_result: result } : a));
    setConfirmingId(null);
  };

  const fmtTime = (t?: string) => {
    if (!t) return '-';
    const d = new Date(t.replace(' ', 'T'));
    if (isNaN(d.getTime())) return t.slice(5, 16);
    const M = String(d.getMonth()+1).padStart(2,'0');
    const D = String(d.getDate()).padStart(2,'0');
    const h = String(d.getHours()).padStart(2,'0');
    const m = String(d.getMinutes()).padStart(2,'0');
    return M + '-' + D + ' ' + h + ':' + m;
  };

  const cell = 'flex items-center text-[11px] leading-none truncate';

  return (
    <DataContainer loading={pageLoading} error={error} data={selectedHost} onRetry={loadData} emptyText='暂无消控室数据'>
      <div className='h-full flex flex-col gap-2 p-2 bg-slate-950 overflow-hidden'>
        {/* ===== HEADER ===== */}
        <div className='flex-shrink-0 glass rounded-lg px-3 py-2 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Monitor className='w-5 h-5 text-blue-400' />
            <div className='flex flex-col'>
              <h1 className='text-sm font-bold text-slate-100'>{projectName || roomName}</h1>
              <p className='text-[10px] text-slate-500'>编号: {roomId || '-'} | 主机: {selectedHost?.host_name || '报警主机1号'} | 值班: {selectedHost?.duty_person || '-'}</p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {allRooms.length > 0 && (
              <Select value={roomId} onValueChange={(id) => navigate('/monitor/control/room/' + id)}>
                <SelectTrigger className='h-7 text-xs bg-slate-900/50 border-slate-700/30 text-slate-200 rounded-lg w-44'>
                  <SelectValue placeholder='选择消控室' />
                </SelectTrigger>
                <SelectContent className='bg-slate-900 border-slate-700/30 text-slate-200 max-h-64'>
                  {allRooms.map(r => (
                    <SelectItem key={r.id} value={r.id} className='text-xs cursor-pointer'>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button onClick={loadData} className='flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900/50 border border-slate-700/30 hover:bg-slate-800/50 transition-all'>
              <RefreshCw className={'w-3 h-3 text-slate-400 ' + (refreshing ? 'animate-spin' : '')} />
              <span className='text-[10px] text-slate-400'>{fmtTime(lastRefresh.toISOString())}</span>
            </button>
            <div className={'flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium ' + (realtime.host_status === 1 ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400')}>
              {realtime.host_status === 1 ? <Wifi className='w-3 h-3' /> : <WifiOff className='w-3 h-3' />}
              {realtime.host_status === 1 ? '在线' : '离线'}
            </div>
            <div className='flex items-center gap-1.5 text-slate-400 px-2 py-1 rounded-md bg-slate-900/50 border border-slate-700/30'>
              <Clock className='w-3 h-3' />
              <span className='text-[11px] font-mono font-semibold text-slate-300'>
                {String(currentTime.getHours()).padStart(2,'0')}:{String(currentTime.getMinutes()).padStart(2,'0')}:{String(currentTime.getSeconds()).padStart(2,'0')}
              </span>
            </div>
          </div>
        </div>

        {/* ===== ROW 1: Stats + Alarms + Controls ===== */}
        <div className='flex-1 flex gap-2 min-h-0'>
          {/* Left: Stats */}
          <div className='flex flex-col gap-2 flex-shrink-0 w-[56px]'>
            <div className={'fire-card flex-1 flex flex-col items-center justify-center gap-1 p-1 border-t-2 ' + (realtime.fire_count > 0 ? 'border-t-red-500' : 'border-t-red-500/30')}>
              <Flame className='w-4 h-4 text-red-400' />
              <span className='text-base font-bold text-red-400 leading-none'>{realtime.fire_count}</span>
              <span className='text-[9px] text-red-300/60 font-medium'>火警</span>
            </div>
            <div className={'fire-card flex-1 flex flex-col items-center justify-center gap-1 p-1 border-t-2 ' + (realtime.fault_count > 0 ? 'border-t-yellow-500' : 'border-t-yellow-500/30')}>
              <AlertTriangle className='w-4 h-4 text-yellow-400' />
              <span className='text-base font-bold text-yellow-400 leading-none'>{realtime.fault_count}</span>
              <span className='text-[9px] text-yellow-300/60 font-medium'>故障</span>
            </div>
            <div className='fire-card flex-1 flex flex-col items-center justify-center gap-1 p-1 border-t-2 border-t-purple-500/30'>
              <Shield className='w-4 h-4 text-purple-400' />
              <span className='text-base font-bold text-purple-400 leading-none'>{realtime.shield_count}</span>
              <span className='text-[9px] text-purple-300/60 font-medium'>屏蔽</span>
            </div>
            <div className='fire-card flex-1 flex flex-col items-center justify-center gap-1 p-1 border-t-2 border-t-blue-500/30'>
              <CheckCircle className='w-4 h-4 text-blue-400' />
              <span className='text-base font-bold text-blue-400 leading-none'>{realtime.feedback_count}</span>
              <span className='text-[9px] text-blue-300/60 font-medium'>反馈</span>
            </div>
          </div>

          {/* Center: Alarm Table */}
          <div className='flex-[2] flex flex-col min-w-0 gap-2'>
            <Tabs value={alarmTab} onValueChange={(v: any) => setAlarmTab(v)} className='flex-shrink-0'>
              <TabsList className='bg-slate-900/50 border border-slate-700/30 h-7 p-0.5'>
                <TabsTrigger value='all' className='text-[10px] px-2 h-6 data-[state=active]:bg-slate-800'>全部</TabsTrigger>
                <TabsTrigger value='fire' className='text-[10px] px-2 h-6 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-300'>火警</TabsTrigger>
                <TabsTrigger value='fault' className='text-[10px] px-2 h-6 data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-300'>故障</TabsTrigger>
                <TabsTrigger value='shield' className='text-[10px] px-2 h-6 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300'>屏蔽</TabsTrigger>
                <TabsTrigger value='feedback' className='text-[10px] px-2 h-6 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300'>反馈</TabsTrigger>
              </TabsList>
            </Tabs>
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

          {/* Right: Quick Controls */}
          <div className='flex flex-col gap-2 flex-shrink-0 w-[92px]'>
            <ControlButton
              active={realtime.silenced === 1}
              color='emerald'
              icon={<VolumeX className='w-5 h-5' />}
              label={realtime.silenced === 1 ? '已消音' : '消音'}
              onClick={() => setSilenceDialog(true)}
            />
            <ControlButton
              color='blue'
              icon={<RotateCcw className='w-5 h-5' />}
              label='复位'
              onClick={() => setResetPwdOpen(true)}
            />
            <ControlButton
              active={realtime.current_mode === 1}
              color='amber'
              icon={<Hand className='w-5 h-5' />}
              label='手动'
              onClick={() => openModeDialog(1)}
            />
            <ControlButton
              active={realtime.current_mode === 2}
              color='blue'
              icon={<CheckCircle className='w-5 h-5' />}
              label='自动'
              onClick={() => openModeDialog(2)}
            />
            <ControlButton
              color='purple'
              icon={<Shield className='w-5 h-5' />}
              label='屏蔽'
              onClick={() => setShieldDialog(true)}
            />
          </div>
        </div>

        {/* ===== ROW 2: Multiline + Bus + Environment ===== */}
        <div className='flex-1 flex gap-2 min-h-0'>
          {/* Left: Multiline Panel */}
          <div className='flex-[2] flex flex-col min-w-0 fire-card overflow-hidden'>
            <div className='px-3 py-1.5 glass border-b border-slate-700/30 rounded-t-lg flex items-center justify-between flex-shrink-0'>
              <div className='flex items-center gap-2'>
                <Zap className='w-3.5 h-3.5 text-amber-400' />
                <span className='text-xs text-slate-200 font-semibold'>多线盘</span>
                <Badge className='text-[9px] bg-amber-500/15 text-amber-400 border-amber-500/25 font-medium'>{multilinePoints.length}路</Badge>
              </div>
              <div className='flex items-center gap-0.5 bg-slate-900/60 rounded-lg p-0.5'>
                {(['sm','md','lg'] as const).map(s => (
                  <button key={s} onClick={() => setMultilineBtnSize(s)}
                    className={'text-[9px] px-1.5 py-0.5 rounded-md transition-all font-medium ' + (multilineBtnSize === s ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300')}>
                    {s === 'sm' ? '小' : s === 'md' ? '中' : '大'}
                  </button>
                ))}
              </div>
            </div>
            <div className='flex-1 overflow-y-auto scrollbar-thin p-2'>
              <div className={'grid gap-2 ' + (multilineBtnSize === 'lg' ? 'grid-cols-3' : multilineBtnSize === 'md' ? 'grid-cols-4' : 'grid-cols-5')}>
                {multilinePoints.map(p => (
                  <MultilineCard key={p.id} point={p} hostId={selectedHost?.id} btnSize={multilineBtnSize} />
                ))}
              </div>
            </div>
          </div>

          {/* Center: Bus Panel */}
          <div className='flex-[2] flex flex-col min-w-0 fire-card overflow-hidden'>
            <div className='px-3 py-1.5 glass border-b border-slate-700/30 rounded-t-lg flex items-center justify-between flex-shrink-0'>
              <div className='flex items-center gap-2'>
                <Activity className='w-3.5 h-3.5 text-blue-400' />
                <span className='text-xs text-slate-200 font-semibold'>总线盘</span>
                <Badge className='text-[9px] bg-blue-500/15 text-blue-400 border-blue-500/30 font-medium'>{busPoints.length}点</Badge>
              </div>
              <div className='flex items-center gap-0.5 bg-slate-900/60 rounded-lg p-0.5'>
                <button onClick={() => setBusCols(2)} className={'text-[9px] px-1.5 py-0.5 rounded-md transition-all font-medium ' + (busCols === 2 ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500 hover:text-slate-300')}>2列</button>
                <button onClick={() => setBusCols(4)} className={'text-[9px] px-1.5 py-0.5 rounded-md transition-all font-medium ' + (busCols === 4 ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500 hover:text-slate-300')}>4列</button>
                <div className='w-px h-3 bg-slate-700/60 mx-0.5' />
                {(['sm','md','lg'] as const).map(s => (
                  <button key={s} onClick={() => setBusBtnSize(s)}
                    className={'text-[9px] px-1.5 py-0.5 rounded-md transition-all font-medium ' + (busBtnSize === s ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500 hover:text-slate-300')}>
                    {s === 'sm' ? '小' : s === 'md' ? '中' : '大'}
                  </button>
                ))}
              </div>
            </div>
            <div className='flex-1 overflow-y-auto scrollbar-thin p-2'>
              <div className={'grid gap-2 ' + (busCols === 2 ? 'grid-cols-2' : 'grid-cols-4')}>
                {busPoints.map(p => (
                  <BusCard key={p.id} point={p} hostId={selectedHost?.id} btnSize={busBtnSize} />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Environment Monitor */}
          <div className='flex-1 flex flex-col gap-2 min-w-0'>
            <div className='fire-card p-2 flex flex-col gap-2 flex-1 min-h-0'>
              <div className='flex items-center justify-between flex-shrink-0'>
                <div className='flex items-center gap-1.5'>
                  <Gauge className='w-3.5 h-3.5 text-emerald-400' />
                  <span className='text-[10px] text-slate-300 font-semibold'>环境监测</span>
                </div>
                <div className='flex items-center gap-1 bg-slate-900/60 rounded-lg p-0.5'>
                  <button onClick={() => setActiveCamera(-1)} className={'text-[9px] px-2 py-1 rounded-md transition-all font-medium ' + (activeCamera === -1 ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500 hover:text-slate-300')}>仪表</button>
                  <button onClick={() => setActiveCamera(0)} className={'text-[9px] px-2 py-1 rounded-md transition-all font-medium ' + (activeCamera >= 0 ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500 hover:text-slate-300')}>视频</button>
                </div>
              </div>
              {activeCamera === -1 ? (
                <div className='flex-1 grid grid-cols-2 gap-2 min-h-0'>
                  <PressureGauge label='管网压力' value={realtime.pressure_1} unit='MPa' max={1} />
                  <PressureGauge label='喷淋压力' value={realtime.pressure_2} unit='MPa' max={1} />
                  <LiquidLevel label='水箱液位' value={realtime.liquid_level_1} unit='m' max={5} />
                  <LiquidLevel label='消防水池' value={realtime.liquid_level_2} unit='m' max={5} />
                </div>
              ) : (
                <div className='flex-1 flex flex-col min-h-0 gap-2'>
                  <div
                    onClick={() => cameras[activeCamera]?.status === 1 && openVideo(cameras[activeCamera])}
                    className={'flex-1 rounded-lg border border-slate-700/30 bg-slate-800/40 flex flex-col items-center justify-center gap-2 ' + (cameras[activeCamera]?.status === 1 ? 'cursor-pointer hover:border-blue-500/40 hover:bg-slate-800/60 transition-all' : 'cursor-default')}>
                    {cameras.length > 0 && cameras[activeCamera]?.status === 1 ? (
                      <>
                        <Play className='w-6 h-6 text-blue-400/60' />
                        <span className='text-xs text-slate-300'>{cameras[activeCamera]?.cameraName || '视频监控'}</span>
                        <span className='text-[10px] text-slate-500'>{cameras[activeCamera]?.position || ''}</span>
                        <span className='text-[9px] text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20'>在线 · 点击播放</span>
                      </>
                    ) : (
                      <>
                        <Monitor className='w-6 h-6 text-slate-600' />
                        <span className='text-xs text-slate-500'>暂无视频信号</span>
                      </>
                    )}
                  </div>
                  {cameras.length > 1 && (
                    <div className='flex items-center justify-center gap-1 flex-shrink-0'>
                      {cameras.map((cam, i) => (
                        <button key={cam.id} onClick={() => setActiveCamera(i)}
                          className={'text-[9px] px-2 py-1 rounded-md transition-all ' + (activeCamera === i ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500 hover:text-slate-300')}>
                          {cam.cameraNo}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {personnelInfo && (
              <div className='fire-card p-2.5 flex flex-col gap-2 flex-shrink-0'>
                <div className='flex items-center gap-1.5'>
                  <Users className='w-3.5 h-3.5 text-cyan-400' />
                  <span className='text-[11px] text-cyan-400 font-semibold'>值班人员</span>
                </div>
                {personnelInfo.managerName && (
                  <div className='flex items-center justify-between'>
                    <span className='text-[10px] text-slate-400'>负责人</span>
                    <div className='flex items-center gap-1'>
                      <span className='text-[10px] text-slate-200'>{personnelInfo.managerName}</span>
                      <a href={'tel:' + personnelInfo.managerPhone} className='text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 border border-emerald-500/20'>{personnelInfo.managerPhone}</a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== ROW 3: Command Logs ===== */}
        <div className='h-24 flex-shrink-0 fire-card flex flex-col overflow-hidden'>
          <div className='px-3 py-1 border-b border-slate-700/30 flex items-center gap-1.5 flex-shrink-0'>
            <LogIn className='w-3 h-3 text-slate-500' />
            <span className='text-[10px] text-slate-400 font-semibold'>操作日志</span>
          </div>
          <div ref={logsRef} className='flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1'>
            {commandLogs.length === 0 && (
              <div className='text-[10px] text-slate-600 text-center py-2'>暂无操作记录</div>
            )}
            {commandLogs.map((log) => (
              <div key={log.id} className='flex items-center gap-3 text-[10px]'>
                <span className='text-slate-600 font-mono'>{fmtTime(log.command_time)}</span>
                <Badge className={'text-[9px] px-1 py-0 ' + (log.result === 1 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20')}>
                  {log.result === 1 ? '成功' : '失败'}
                </Badge>
                <span className='text-slate-400'>{log.command_by}</span>
                <span className='text-slate-300'>{log.command_type}</span>
                {log.point_name && <span className='text-slate-500'>{log.point_name}</span>}
                <span className='text-slate-500'>{log.command_value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ===== DIALOGS ===== */}
        <Dialog open={silenceDialog} onOpenChange={setSilenceDialog}>
          <DialogContent className='bg-slate-800 border-slate-700 text-slate-100 max-w-sm backdrop-blur-sm'>
            <DialogHeader><DialogTitle className='flex items-center gap-2 text-base'><VolumeX className='w-5 h-5 text-blue-400' /> 远程消音确认</DialogTitle></DialogHeader>
            <p className='text-sm text-slate-400'>确认对 <span className='font-medium text-slate-200'>{selectedHost?.host_name || '报警主机'}</span> 执行远程消音操作？</p>
            <p className='text-xs text-yellow-500'>仅关闭现场声光报警器的声音，不清除当前告警，不复位设备状态。</p>
            <DialogFooter>
              <Button variant='outline' onClick={() => setSilenceDialog(false)} className='border-slate-600 text-slate-300 h-8 text-xs'>取消</Button>
              <Button onClick={handleSilence} disabled={loading} className='bg-blue-500 hover:bg-blue-600 text-white h-8 text-xs'>{loading ? '执行中...' : '确认消音'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={resetPwdOpen} onOpenChange={setResetPwdOpen}>
          <DialogContent className='bg-slate-800 border-slate-700 text-slate-100 max-w-sm backdrop-blur-sm'>
            <DialogHeader><DialogTitle className='flex items-center gap-2 text-base'><RotateCcw className='w-5 h-5 text-yellow-400' /> 二级密码验证</DialogTitle></DialogHeader>
            <p className='text-sm text-slate-400'>执行设备复位前请输入二级密码</p>
            <Input type='password' value={resetPwdInput} onChange={e => { setResetPwdInput(e.target.value); setResetPwdError(false); }}
              onKeyDown={e => e.key === 'Enter' && checkResetPwd()} placeholder='输入密码'
              className={'bg-slate-700 border ' + (resetPwdError ? 'border-red-500' : 'border-slate-600') + ' text-slate-200 h-8 text-xs mt-1'} />
            {resetPwdError && <p className='text-xs text-red-400'>密码错误</p>}
            <DialogFooter>
              <Button variant='outline' onClick={() => { setResetPwdOpen(false); setResetPwdInput(''); setResetPwdError(false); }} className='border-slate-600 text-slate-300 h-8 text-xs'>取消</Button>
              <Button onClick={checkResetPwd} className='bg-yellow-500 hover:bg-yellow-600 text-white h-8 text-xs'>验证</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={resetDialog} onOpenChange={setResetDialog}>
          <DialogContent className='bg-slate-800 border-slate-700 text-slate-100 max-w-sm backdrop-blur-sm'>
            <DialogHeader><DialogTitle className='flex items-center gap-2 text-base'><RotateCcw className='w-5 h-5 text-yellow-400' /> 设备复位确认</DialogTitle></DialogHeader>
            <p className='text-sm text-slate-400'>确认对 <span className='font-medium text-slate-200'>{selectedHost?.host_name || '报警主机'}</span> 执行设备复位操作？</p>
            <p className='text-xs text-yellow-500'>远程火警、故障复位，清除当前告警状态，恢复设备正常运行。历史告警记录不会被删除。</p>
            <DialogFooter>
              <Button variant='outline' onClick={() => setResetDialog(false)} className='border-slate-600 text-slate-300 h-8 text-xs'>取消</Button>
              <Button onClick={handleReset} disabled={loading} className='bg-yellow-500 hover:bg-yellow-600 text-white h-8 text-xs'>{loading ? '执行中...' : '确认复位'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={shieldDialog} onOpenChange={setShieldDialog}>
          <DialogContent className='bg-slate-800 border-slate-700 text-slate-100 max-w-sm backdrop-blur-sm'>
            <DialogHeader><DialogTitle className='flex items-center gap-2 text-base'><Shield className='w-5 h-5 text-purple-400' /> 添加屏蔽</DialogTitle></DialogHeader>
            <div className='space-y-3'>
              <div><Label className='text-slate-300 text-xs'>屏蔽设备</Label><div className='text-sm text-slate-200 mt-0.5'>{selectedHost?.host_name || '报警主机'}</div></div>
              <div><Label className='text-slate-300 text-xs'>屏蔽原因 <span className='text-red-400'>*</span></Label><Input value={shieldReason} onChange={e => setShieldReason(e.target.value)} placeholder='请输入屏蔽原因（如：设备检修）' className='bg-slate-700 border-slate-600 text-slate-200 h-8 text-xs mt-0.5' /></div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setShieldDialog(false)} className='border-slate-600 text-slate-300 h-8 text-xs'>取消</Button>
              <Button onClick={handleShield} disabled={loading || !shieldReason} className='bg-purple-500 hover:bg-purple-600 text-white h-8 text-xs'>{loading ? '添加中...' : '添加屏蔽'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={modeDialog} onOpenChange={setModeDialog}>
          <DialogContent className='bg-slate-800 border-slate-700 text-slate-100 max-w-sm backdrop-blur-sm'>
            <DialogHeader><DialogTitle className='flex items-center gap-2 text-base'><Hand className='w-5 h-5 text-blue-400' /> 模式切换</DialogTitle></DialogHeader>
            <div className='space-y-2'>
              <p className='text-sm text-slate-400'>当前: <Badge className={'text-xs ' + (realtime.current_mode === 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400')}>{realtime.current_mode === 2 ? '自动' : '手动'}</Badge></p>
              <p className='text-sm text-slate-400'>切换为: <Badge className={'text-xs ' + (modeTarget === 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400')}>{modeTarget === 2 ? '自动' : '手动'}</Badge></p>
              <p className='text-xs text-yellow-500'>{modeTarget === 1 ? '手动模式下联动设备不会自动启动，需人工确认后操作。' : '自动模式下联动设备将根据报警信号自动启动。'}</p>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setModeDialog(false)} className='border-slate-600 text-slate-300 h-8 text-xs'>取消</Button>
              <Button onClick={handleModeSwitch} disabled={loading} className='bg-blue-500 hover:bg-blue-600 text-white h-8 text-xs'>{loading ? '切换中...' : '确认切换'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Toast Notification */}
        {toast && (
          <div className={'fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium border backdrop-blur-sm shadow-lg ' + (toast.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : toast.type === 'error' ? 'bg-red-500/15 text-red-300 border-red-500/25' : 'bg-blue-500/15 text-blue-300 border-blue-500/25')}>
            {toast.type === 'success' ? <CheckCircle2 className='w-4 h-4' /> : toast.type === 'error' ? <XCircle className='w-4 h-4' /> : <Radio className='w-4 h-4' />}
            <span>{toast.msg}</span>
          </div>
        )}

        {/* Video Player Modal */}
        {videoOpen && (
          <SimpleVideoPlayer
            streamUrl={videoUrl}
            title={videoTitle}
            onClose={() => setVideoOpen(false)}
          />
        )}
      </div>
    </DataContainer>
  );
}

/* ============================================================
   Sub Components
   ============================================================ */

function AlarmTable({ alarmTab, fireAlarms, faultAlarms, shieldItems, feedbackAlarms, fmtTime, cell, confirmingId, handleConfirm }: any) {
  const renderRows = () => {
    const rows: any[] = [];
    if (alarmTab === 'all' || alarmTab === 'fire') {
      fireAlarms.forEach((a: FireAlarm) => rows.push(
        <div key={'fire-' + a.id} className='grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row border-b border-slate-700/10 items-center group'>
          <div className='flex items-center'><span className={'text-[10px] px-1.5 py-0.5 rounded-md font-semibold ' + (a.alarm_type === 1 ? 'text-red-400 bg-red-500/15 border-red-500/30' : a.alarm_type === 2 ? 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' : 'text-purple-400 bg-purple-500/15 border-purple-500/30')}>{a.alarm_type === 1 ? '火警' : a.alarm_type === 2 ? '故障' : '预警'}</span></div>
          <span className={cell + ' text-slate-500'}>{fmtTime(a.created_at)}</span>
          <span className={cell + ' text-slate-200 font-semibold'}>{a.device_name}</span>
          <span className={cell + ' text-slate-500'}>{a.device_point}</span>
          <span className={cell + ' text-slate-500 font-mono'}>1</span>
          <span className={cell + ' text-slate-500 font-mono'}>{a.device_code}</span>
          <span className={'text-[10px] leading-none text-center font-semibold ' + (a.status === 0 ? 'text-red-400' : a.status === 1 ? 'text-blue-400' : a.status === 2 ? 'text-emerald-400' : 'text-slate-400')}>{a.status === 0 ? '未处理' : a.status === 1 ? '已确认' : a.status === 2 ? '已处理' : '误报'}</span>
          <div className='flex items-center justify-center'>
            {a.status === 0 ? (
              <button onClick={() => handleConfirm(String(a.id), 1)} disabled={confirmingId === String(a.id)} className='text-[10px] px-2 py-1 bg-blue-500/15 text-blue-400 rounded-md hover:bg-blue-500/25 transition-all border border-blue-500/20 font-medium disabled:opacity-40'>{confirmingId === String(a.id) ? '中' : '确认'}</button>
            ) : (
              <button className='text-[10px] px-2 py-1 bg-slate-700/40 text-slate-400 rounded-md hover:bg-slate-700/60 transition-all border border-slate-600/30 flex items-center gap-1'><Eye className='w-3 h-3' />查看</button>
            )}
          </div>
        </div>
      ));
    }
    if (alarmTab === 'all' || alarmTab === 'fault') {
      faultAlarms.forEach((f: FaultAlarm) => rows.push(
        <div key={'fault-' + f.id} className='grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row border-b border-slate-700/10 items-center group'>
          <div className='flex items-center'><span className='text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20'>故障</span></div>
          <span className={cell + ' text-slate-500'}>{fmtTime(f.created_at)}</span>
          <span className={cell + ' text-slate-200 font-semibold'}>{f.device_name}</span>
          <span className={cell + ' text-slate-500'}>{f.device_type}</span>
          <span className={cell + ' text-slate-500 font-mono'}>1</span>
          <span className={cell + ' text-slate-500 font-mono'}>{f.alarm_no}</span>
          <span className={'text-[10px] leading-none text-center font-semibold ' + (f.status === 0 ? 'text-yellow-400' : 'text-emerald-400')}>{f.status === 0 ? '未处理' : '已处理'}</span>
          <div className='flex items-center justify-center'><button className='text-[10px] px-2 py-1 bg-slate-700/40 text-slate-400 rounded-md hover:bg-slate-700/60 transition-all border border-slate-600/30 flex items-center gap-1'><Eye className='w-3 h-3' />查看</button></div>
        </div>
      ));
    }
    if (alarmTab === 'all' || alarmTab === 'shield') {
      shieldItems.forEach((s: ShieldItem) => rows.push(
        <div key={'shield-' + s.id} className='grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row border-b border-slate-700/10 items-center group'>
          <div className='flex items-center'><span className='text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20'>屏蔽</span></div>
          <span className={cell + ' text-slate-500'}>{fmtTime(s.shield_time)}</span>
          <span className={cell + ' text-slate-200 font-semibold'}>{s.point_name}</span>
          <span className={cell + ' text-slate-500'}>{s.device_type}</span>
          <span className={cell + ' text-slate-500 font-mono'}>1</span>
          <span className={cell + ' text-slate-500 font-mono'}>—</span>
          <span className='text-[10px] leading-none text-center font-semibold text-purple-400'>屏蔽中</span>
          <div className='flex items-center justify-center'><button className='text-[10px] px-2 py-1 bg-purple-500/10 text-purple-400 rounded-md hover:bg-purple-500/20 transition-all border border-purple-500/20 font-medium'>解除</button></div>
        </div>
      ));
    }
    if (alarmTab === 'all' || alarmTab === 'feedback') {
      feedbackAlarms.forEach((fb: FeedbackAlarm) => rows.push(
        <div key={'fb-' + fb.id} className='grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-[32px] fire-table-row border-b border-slate-700/10 items-center group'>
          <div className='flex items-center'><span className='text-[10px] px-1.5 py-0.5 rounded-md font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20'>反馈</span></div>
          <span className={cell + ' text-slate-500'}>{fmtTime(fb.created_at)}</span>
          <span className={cell + ' text-slate-200 font-semibold'}>{fb.device_name}</span>
          <span className={cell + ' text-slate-500'}>{fb.feedback_desc}</span>
          <span className={cell + ' text-slate-500 font-mono'}>1</span>
          <span className={cell + ' text-slate-500 font-mono'}>—</span>
          <span className='text-[10px] leading-none text-center font-semibold text-blue-400'>正常</span>
          <div className='flex items-center justify-center'><button className='text-[10px] px-2 py-1 bg-slate-700/40 text-slate-400 rounded-md hover:bg-slate-700/60 transition-all border border-slate-600/30 flex items-center gap-1'><Eye className='w-3 h-3' />查看</button></div>
        </div>
      ));
    }
    if (rows.length === 0) {
      return <div className='h-[120px] flex flex-col items-center justify-center gap-2 text-slate-600'><BellOff className='w-6 h-6 text-slate-700' /><span className='text-xs'>暂无数据</span></div>;
    }
    return rows;
  };

  return (
    <div className='flex-1 flex flex-col min-h-0 fire-card rounded-t-none overflow-hidden'>
      <div className='grid grid-cols-[52px_1fr_1.5fr_1fr_48px_1fr_56px_56px] gap-1 px-3 h-8 glass flex-shrink-0 items-center border-b border-slate-700/20'>
        <span className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider'>类型</span>
        <span className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider'>时间</span>
        <span className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider'>设备名称</span>
        <span className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider'>点位</span>
        <span className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider'>主机</span>
        <span className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider'>编码</span>
        <span className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center'>状态</span>
        <span className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center'>操作</span>
      </div>
      <div className='flex-1 overflow-y-auto scrollbar-thin'>
        {renderRows()}
      </div>
    </div>
  );
}

function ControlButton({ active, color, icon, label, onClick }: any) {
  const colorMap: Record<string, any> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', ring: 'ring-emerald-500/30', border: 'border-emerald-500/30' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-300', ring: 'ring-blue-500/30', border: 'border-blue-500/30' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-300', ring: 'ring-amber-500/30', border: 'border-amber-500/30' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-300', ring: 'ring-purple-500/30', border: 'border-purple-500/30' },
  };
  const c = colorMap[color] || colorMap.blue;
  const activeBg = c.bg.replace('/10', '/25');
  const activeText = c.text.replace('300', '100');
  const activeRing = c.ring.replace('/30', '/50');
  const innerBg = c.bg.replace('/10', '/30');
  const innerRing = c.ring.replace('/30', '/50');
  const innerBg2 = c.bg.replace('/10', '/15');
  return (
    <Button onClick={onClick} className={'flex-1 flex flex-col items-center justify-center gap-2 border-0 transition-all shadow-lg rounded-xl backdrop-blur-sm active-press ' + (active ? activeBg + ' ' + activeText + ' ring-2 ' + activeRing : c.bg + ' ' + c.text + ' hover:' + activeBg + ' border ' + c.border)}>
      <div className={'w-10 h-10 rounded-full flex items-center justify-center shadow-inner ' + (active ? innerBg + ' ring-2 ' + innerRing : innerBg2 + ' ring-1 ' + c.ring)}>
        {icon}
      </div>
      <span className='text-xs font-bold tracking-wide'>{label}</span>
    </Button>
  );
}

function PressureGauge({ label, value, unit, max }: { label: string; value: number; unit: string; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const angle = (pct / 100) * 180 - 90;
  const uid = 'pg-' + label.replace(/\\s/g, '');
  return (
    <div className='flex flex-col items-center justify-center gap-1 fire-card p-2 hover:border-emerald-500/20 hover:scale-[1.01] group'>
      <svg viewBox='0 0 60 40' className='w-full h-10'>
        <defs><linearGradient id={uid} x1='0' y1='0' x2='1' y2='0'><stop offset='0%' stopColor='#10b981'/><stop offset='100%' stopColor='#059669'/></linearGradient></defs>
        <path d='M5 35 A25 25 0 0 1 55 35' fill='none' stroke='#1e293b' strokeWidth='4' />
        <path d={'M5 35 A25 25 0 0 1 ' + (5 + 50 * (pct/100)) + ' ' + (35 - 25 * Math.sin(Math.PI * (pct/100)))} fill='none' stroke={'url(#' + uid + ')'} strokeWidth='4' />
        <line x1='30' y1='35' x2='30' y2='15' stroke='#94a3b8' strokeWidth='2' transform={'rotate(' + angle + ' 30 35)'} />
        <circle cx='30' cy='35' r='3' fill='#475669' />
      </svg>
      <span className='text-[11px] font-bold text-slate-200'>{value.toFixed(2)}</span>
      <span className='text-[8px] text-slate-500'>{unit}</span>
      <span className='text-[8px] text-emerald-400 font-medium'>{label}</span>
    </div>
  );
}

function LiquidLevel({ label, value, unit, max }: { label: string; value: number; unit: string; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className='flex flex-col items-center justify-center gap-1 fire-card p-2 hover:border-blue-500/20 hover:scale-[1.01] group'>
      <div className='w-7 h-12 border-2 border-slate-600 rounded-lg relative overflow-hidden bg-slate-900/50'>
        <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500/50 to-blue-400/30 transition-all' style={{ height: pct + '%' }} />
        <div className='absolute inset-0 flex items-end justify-center pb-1'>
          <span className='text-[8px] text-blue-200 font-bold'>{value.toFixed(2)}</span>
        </div>
      </div>
      <span className='text-[8px] text-slate-500'>{unit}</span>
      <span className='text-[8px] text-blue-400 font-medium'>{label}</span>
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
    setExecLoading(true);
    try {
      await api.controlMultiline(hostId ?? 0, point.id, 'start');
      setRunning(true); setFeedback(true);
      setExecResult({ type: 'success', msg: '启动指令下发成功' });
    } catch (e) { setExecResult({ type: 'error', msg: '启动指令下发失败' }); }
    finally { setExecLoading(false); setTimeout(() => setExecResult(null), 3000); }
  };
  const doStop = async () => {
    setExecLoading(true);
    try {
      await api.controlMultiline(hostId ?? 0, point.id, 'stop');
      setRunning(false); setFeedback(false);
      setExecResult({ type: 'success', msg: '停止指令下发成功' });
    } catch (e) { setExecResult({ type: 'error', msg: '停止指令下发失败' }); }
    finally { setExecLoading(false); setTimeout(() => setExecResult(null), 3000); }
  };

  return (
    <div className={'relative fire-card ' + s.pad + ' flex flex-col ' + s.gap + ' hover:scale-[1.01]'}>
      {execResult && (
        <div className={'absolute top-1 left-1 right-1 z-20 text-center ' + s.btnText + ' py-0.5 rounded font-medium ' + (execResult.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30')}>{execResult.msg}</div>
      )}
      <div className='flex items-center justify-between'>
        <HardDrive className={s.icon + ' text-slate-500'} />
        <div className='flex items-center gap-1.5 flex-shrink-0'>
          <div className='flex items-center gap-0.5'><div className={s.indicator + ' rounded-full ' + (running ? 'bg-emerald-400' : 'bg-slate-700')} /><span className={s.indicatorText + ' text-slate-500'}>启</span></div>
          <div className='flex items-center gap-0.5'><div className={s.indicator + ' rounded-full ' + (feedback ? 'bg-blue-400' : 'bg-slate-700')} /><span className={s.indicatorText + ' text-slate-500'}>反</span></div>
          <div className='flex items-center gap-0.5'><div className={s.indicator + ' rounded-full ' + (fault ? 'bg-red-400' : 'bg-slate-700')} /><span className={s.indicatorText + ' text-slate-500'}>故</span></div>
        </div>
      </div>
      <div className='flex items-center gap-1.5'>
        <HardDrive className={s.icon + ' text-slate-500 flex-shrink-0'} />
        <div className={s.text + ' text-slate-300 font-medium truncate leading-tight'}>{point.point_name}</div>
      </div>
      <div className='flex gap-1.5'>
        <button onClick={() => setConfirmAction('start')} disabled={running || execLoading} className={'flex-1 flex items-center justify-center gap-1 ' + s.btnPy + ' rounded ' + s.btnText + ' bg-red-600/25 text-red-300 hover:bg-red-600/40 disabled:opacity-30 transition-colors border border-red-500/30'}><Play className={s.btnIcon} />启动</button>
        <button onClick={() => setConfirmAction('stop')} disabled={!running || execLoading} className={'flex-1 flex items-center justify-center gap-1 ' + s.btnPy + ' rounded ' + s.btnText + ' bg-orange-600/25 text-orange-300 hover:bg-orange-600/40 disabled:opacity-30 transition-colors border border-orange-500/30'}><Square className={s.btnIcon} />停止</button>
      </div>
      <Dialog open={!!confirmAction && !needPwd} onOpenChange={v => { if (!v) setConfirmAction(null); }}>
        <DialogContent className='bg-slate-800 border-slate-700 text-slate-100 max-w-md backdrop-blur-sm'>
          <DialogHeader><DialogTitle className='flex items-center gap-2 text-lg'><Shield className='w-5 h-5 text-yellow-400' />设备操作确认</DialogTitle></DialogHeader>
          <div className='py-4 text-center'>
            <div className='w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-yellow-500/30'>{confirmAction === 'start' ? <Play className='w-6 h-6 text-red-400' /> : <Square className='w-6 h-6 text-orange-400' />}</div>
            <p className='text-sm text-slate-300 mb-1'>{confirmAction === 'start' ? '确认启动' : '确认停止'}「<span className='text-slate-100 font-semibold'>{point.point_name}</span>」？</p>
            <p className='text-xs text-slate-500'>此操作需要二级密码验证</p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setConfirmAction(null)} className='border-slate-600 text-slate-300 h-9 text-sm'>取消</Button>
            <Button onClick={() => setNeedPwd(true)} className='bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/40 h-9 text-sm'>继续</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={needPwd} onOpenChange={v => { if (!v) { setNeedPwd(false); setPwdInput(''); setPwdError(false); setConfirmAction(null); } }}>
        <DialogContent className='bg-slate-800 border-slate-700 text-slate-100 max-w-md backdrop-blur-sm'>
          <DialogHeader><DialogTitle className='flex items-center gap-2 text-lg'><Shield className='w-5 h-5 text-yellow-400' />二级密码验证</DialogTitle></DialogHeader>
          <div className='py-4 space-y-4'>
            <p className='text-sm text-slate-400 text-center'>执行<span className='text-slate-200 font-medium'>{confirmAction === 'start' ? '启动' : '停止'}</span>操作前请输入二级密码</p>
            <Input type='password' value={pwdInput} onChange={e => { setPwdInput(e.target.value); setPwdError(false); }} onKeyDown={e => e.key === 'Enter' && checkPwd()} placeholder='请输入二级密码' autoFocus className={'bg-slate-700 border ' + (pwdError ? 'border-red-500 text-red-300' : 'border-slate-600 text-slate-200') + ' text-center text-base h-11'} />
            {pwdError && <p className='text-sm text-red-400 text-center'>密码错误，请重新输入</p>}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => { setNeedPwd(false); setPwdInput(''); setPwdError(false); setConfirmAction(null); }} className='border-slate-600 text-slate-300 h-9 text-sm'>取消</Button>
            <Button onClick={checkPwd} className='bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/40 h-9 text-sm font-medium'>验证并执行</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

  const checkPwd = () => {
    if (pwdInput === SECONDARY_PWD) {
      setNeedPwd(false); setPwdInput(''); setPwdError(false);
      confirmAction === 'start' ? doStart() : doStop();
    } else { setPwdError(true); }
  };

  const doStart = async () => {
    setExecLoading(true);
    try {
      await api.controlBus(hostId ?? 0, point.id, 'start');
      setRunning(true); setFeedback(true);
      setExecResult({ type: 'success', msg: '启动指令下发成功' });
    } catch (e) { setExecResult({ type: 'error', msg: '启动指令下发失败' }); }
    finally { setExecLoading(false); setTimeout(() => setExecResult(null), 3000); }
  };
  const doStop = async () => {
    setExecLoading(true);
    try {
      await api.controlBus(hostId ?? 0, point.id, 'stop');
      setRunning(false); setFeedback(false);
      setExecResult({ type: 'success', msg: '停止指令下发成功' });
    } catch (e) { setExecResult({ type: 'error', msg: '停止指令下发失败' }); }
    finally { setExecLoading(false); setTimeout(() => setExecResult(null), 3000); }
  };

  const statusColor = point.status === 1 ? 'bg-red-400' : point.status === 2 ? 'bg-yellow-400' : point.status === 3 ? 'bg-slate-400' : running ? 'bg-emerald-400' : 'bg-slate-600';
  const statusLabel = point.status === 1 ? '火警' : point.status === 2 ? '故障' : point.status === 3 ? '屏蔽' : running ? '启动' : '正常';

  const sizeConfig = {
    sm: { pad: 'p-1.5', text: 'text-[10px]', subText: 'text-[9px]', btnText: 'text-[9px]', btnPy: 'py-0.5', icon: 'w-3 h-3', indicator: 'w-1.5 h-1.5' },
    md: { pad: 'p-2', text: 'text-[11px]', subText: 'text-[10px]', btnText: 'text-[10px]', btnPy: 'py-1', icon: 'w-3.5 h-3.5', indicator: 'w-2 h-2' },
    lg: { pad: 'p-2.5', text: 'text-xs', subText: 'text-[11px]', btnText: 'text-[11px]', btnPy: 'py-1.5', icon: 'w-4 h-4', indicator: 'w-2.5 h-2.5' },
  };
  const s = sizeConfig[btnSize];

  return (
    <div className={'relative fire-card ' + s.pad + ' flex flex-col gap-1 hover:scale-[1.01]'}>
      {execResult && (
        <div className={'absolute top-1 left-1 right-1 z-20 text-center ' + s.btnText + ' py-0.5 rounded font-medium ' + (execResult.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30')}>{execResult.msg}</div>
      )}
      <div className='flex items-center gap-1.5'>
        <HardDrive className={s.icon + ' text-slate-500 flex-shrink-0'} />
        <div className='flex-1 min-w-0'>
          <div className={s.text + ' text-slate-300 font-medium truncate'}>{point.point_name}</div>
          <div className={s.subText + ' text-slate-500 truncate'}>回路{point.loop_no}_点{point.point_no}</div>
        </div>
        <div className='flex items-center gap-0.5 flex-shrink-0'><div className={s.indicator + ' rounded-full ' + statusColor} /><span className={s.subText + ' text-slate-500'}>{statusLabel}</span></div>
      </div>
      <div className='flex gap-1.5'>
        <button onClick={() => setConfirmAction('start')} disabled={running || execLoading} className={'flex-1 flex items-center justify-center gap-1 ' + s.btnPy + ' rounded ' + s.btnText + ' bg-red-600/25 text-red-300 hover:bg-red-600/40 disabled:opacity-30 transition-colors border border-red-500/30'}><Play className={btnSize === 'sm' ? 'w-2.5 h-2.5' : btnSize === 'md' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />启动</button>
        <button onClick={() => setConfirmAction('stop')} disabled={!running || execLoading} className={'flex-1 flex items-center justify-center gap-1 ' + s.btnPy + ' rounded ' + s.btnText + ' bg-orange-600/25 text-orange-300 hover:bg-orange-600/40 disabled:opacity-30 transition-colors border border-orange-500/30'}><Square className={btnSize === 'sm' ? 'w-2.5 h-2.5' : btnSize === 'md' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />停止</button>
      </div>
      <div className='flex items-center justify-center gap-2'>
        <div className='flex items-center gap-0.5'><div className={s.indicator + ' rounded-full ' + (running ? 'bg-emerald-400' : 'bg-slate-700')} /><span className={s.subText + ' ' + (running ? 'text-emerald-400' : 'text-slate-600')}>启动</span></div>
        <div className='flex items-center gap-0.5'><div className={s.indicator + ' rounded-full ' + (feedback ? 'bg-blue-400' : 'bg-slate-700')} /><span className={s.subText + ' ' + (feedback ? 'text-blue-400' : 'text-slate-600')}>反馈</span></div>
      </div>
      <Dialog open={!!confirmAction && !needPwd} onOpenChange={v => { if (!v) setConfirmAction(null); }}>
        <DialogContent className='bg-slate-800 border-slate-700 text-slate-100 max-w-md backdrop-blur-sm'>
          <DialogHeader><DialogTitle className='flex items-center gap-2 text-lg'><Shield className='w-5 h-5 text-yellow-400' />设备操作确认</DialogTitle></DialogHeader>
          <div className='py-4 text-center'>
            <div className='w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-yellow-500/30'>{confirmAction === 'start' ? <Play className='w-6 h-6 text-red-400' /> : <Square className='w-6 h-6 text-orange-400' />}</div>
            <p className='text-sm text-slate-300 mb-1'>{confirmAction === 'start' ? '确认启动' : '确认停止'}「<span className='text-slate-100 font-semibold'>{point.point_name}</span>」？</p>
            <p className='text-xs text-slate-500'>此操作需要二级密码验证</p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setConfirmAction(null)} className='border-slate-600 text-slate-300 h-9 text-sm'>取消</Button>
            <Button onClick={() => setNeedPwd(true)} className='bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/40 h-9 text-sm'>继续</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={needPwd} onOpenChange={v => { if (!v) { setNeedPwd(false); setPwdInput(''); setPwdError(false); setConfirmAction(null); } }}>
        <DialogContent className='bg-slate-800 border-slate-700 text-slate-100 max-w-md backdrop-blur-sm'>
          <DialogHeader><DialogTitle className='flex items-center gap-2 text-lg'><Shield className='w-5 h-5 text-yellow-400' />二级密码验证</DialogTitle></DialogHeader>
          <div className='py-4 space-y-4'>
            <p className='text-sm text-slate-400 text-center'>执行<span className='text-slate-200 font-medium'>{confirmAction === 'start' ? '启动' : '停止'}</span>操作前请输入二级密码</p>
            <Input type='password' value={pwdInput} onChange={e => { setPwdInput(e.target.value); setPwdError(false); }} onKeyDown={e => e.key === 'Enter' && checkPwd()} placeholder='请输入二级密码' autoFocus className={'bg-slate-700 border ' + (pwdError ? 'border-red-500 text-red-300' : 'border-slate-600 text-slate-200') + ' text-center text-base h-11'} />
            {pwdError && <p className='text-sm text-red-400 text-center'>密码错误，请重新输入</p>}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => { setNeedPwd(false); setPwdInput(''); setPwdError(false); setConfirmAction(null); }} className='border-slate-600 text-slate-300 h-9 text-sm'>取消</Button>
            <Button onClick={checkPwd} className='bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/40 h-9 text-sm font-medium'>验证并执行</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
'''

with open('src/sections/FireControlRoomPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done, wrote', len(content), 'chars')
