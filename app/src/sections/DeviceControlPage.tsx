import { useState, useEffect, useCallback } from 'react';
import {
  Power, PowerOff, Play, Pause, RotateCcw, Droplets,
  AlertTriangle, Search, CheckCircle,
  XCircle, Clock, Activity, Radio, Zap, Fan, Speaker,
  ScrollText, ArrowUpDown, History, Cpu, CircleDot,
  MapPin, Gauge, SlidersHorizontal, Settings,
  VolumeX, ArrowRightLeft, Loader2,
} from 'lucide-react';
import {
  deviceControlService,
  DEVICE_CONTROL_CMD_MAP,
  type DeviceControlCmdType,
} from '@/api/services';
import { getErrorMessage } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';
import TableBodyPlaceholder from '@/components/TableBodyPlaceholder';

/* ═══════════════ Types ═══════════════ */
interface IoTDevice {
  id: number;
  device_id?: string;
  device_sn?: string;
  archive_device_id?: number;
  device_name: string;
  protocol?: string;
  protocol_type?: string;
  status: string;
  online_status: string;
  ip?: string | null;
  port?: number | null;
  location?: string | null;
  unit_name?: string | null;
}

function resolveArchiveDeviceId(d: IoTDevice): number {
  const id = d.archive_device_id ?? d.id;
  return Number(id);
}

interface ControlLog {
  id: number;
  device_id: string;
  device_name: string;
  protocol: string;
  command: string;
  status: string;
  response: string | null;
  error_msg: string | null;
  sent_at: string;
  responded_at: string | null;
}

/* ═══════════════ Helpers ═══════════════ */
function mapDeviceStatus(status: string, onlineStatus: string): string {
  const s = (status || '').toLowerCase();
  const os = (onlineStatus || '').toLowerCase();
  if (s === 'disabled' || s === 'scrapped') return 'offline';
  if (s === 'fault' || s === 'maintenance') return 'fault';
  if (os === 'offline' || s === 'offline') return 'offline';
  if (os === 'online' || s === 'normal') return 'running';
  return 'stopped';
}

function mapDeviceType(protocol: string, name: string): string {
  const p = (protocol || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (n.includes('风机')) return 'fan';
  if (n.includes('泵')) return 'pump';
  if (n.includes('阀')) return 'valve';
  if (n.includes('广播')) return 'broadcast';
  if (n.includes('卷帘')) return 'shutter';
  if (n.includes('电梯')) return 'elevator';
  if (n.includes('照明') || n.includes('指示')) return 'lighting';
  if (p === 'gb26875' || p === 'fscn8001') return 'controller';
  return 'controller';
}

const typeConfig = (type: string) => {
  switch (type) {
    case 'fan': return { label: '风机', icon: Fan, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', gradient: 'from-cyan-500 to-blue-500' };
    case 'pump': return { label: '水泵', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', gradient: 'from-blue-500 to-indigo-500' };
    case 'valve': return { label: '阀门', icon: ArrowUpDown, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', gradient: 'from-indigo-500 to-purple-500' };
    case 'broadcast': return { label: '广播', icon: Speaker, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', gradient: 'from-purple-500 to-pink-500' };
    case 'shutter': return { label: '防火卷帘', icon: ScrollText, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', gradient: 'from-orange-500 to-red-500' };
    case 'elevator': return { label: '电梯', icon: Cpu, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30', gradient: 'from-pink-500 to-rose-500' };
    case 'lighting': return { label: '应急照明', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', gradient: 'from-yellow-500 to-orange-500' };
    case 'controller': return { label: '控制器', icon: CircleDot, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', gradient: 'from-emerald-500 to-teal-500' };
    default: return { label: '设备', icon: Cpu, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', gradient: 'from-slate-500 to-slate-400' };
  }
};

const statusConfig = (status: string) => {
  switch (status) {
    case 'running': return { label: '在线', color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400', ring: 'ring-emerald-500/30' };
    case 'stopped': return { label: '停止', color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-500', ring: 'ring-slate-500/20' };
    case 'fault': return { label: '故障', color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400', ring: 'ring-red-500/30' };
    case 'offline': return { label: '离线', color: 'text-slate-600', bg: 'bg-slate-600/10', dot: 'bg-slate-600', ring: 'ring-slate-600/20' };
    default: return { label: status, color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-500', ring: 'ring-slate-500/20' };
  }
};

const CMD_MAP: Record<string, string> = {
  '启动': 'start',
  '停止': 'stop',
  '测试': 'test',
  '复位': 'reset',
  '消音': 'mute',
  '手动': 'manual',
  '自动': 'auto',
};

const CMD_LABEL: Record<string, string> = {
  start: '启动', stop: '停止', test: '测试', reset: '复位',
  mute: '消音', manual: '手动模式', auto: '自动模式',
};

/* ═══════════════ Main Component ═══════════════ */
export default function DeviceControlPage() {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [logs, setLogs] = useState<ControlLog[]>([]);
  const [loading] = useState(false);
  const [activeTab, setActiveTab] = useState<'control' | 'log'>('control');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ device: IoTDevice; action: string } | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [executing, setExecuting] = useState<Set<string>>(new Set());

  /* ── 加载设备列表 ── */
  const loadDevices = useCallback(async () => {
    try {
      const res = await deviceControlService.listIotDevices({ pageSize: 200 });
      const list = res?.list ?? [];
      setDevices(Array.isArray(list) ? (list as unknown as IoTDevice[]) : []);
    } catch {
      setDevices([]);
    }
  }, []);

  /* ── 加载指令日志 ── */
  const loadLogs = useCallback(async () => {
    try {
      const res = await deviceControlService.commandHistory({ pageSize: 50 });
      const list = res.data?.list ?? [];
      setLogs(Array.isArray(list) ? (list as unknown as ControlLog[]) : []);
    } catch {
      setLogs([]);
    }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);
  useEffect(() => { if (activeTab === 'log') loadLogs(); }, [activeTab, loadLogs]);

  const tabs = [
    { key: 'fan', label: '风机', icon: Fan },
    { key: 'pump', label: '水泵', icon: Droplets },
    { key: 'valve', label: '阀门', icon: ArrowUpDown },
    { key: 'broadcast', label: '广播', icon: Speaker },
    { key: 'shutter', label: '卷帘', icon: ScrollText },
    { key: 'elevator', label: '电梯', icon: Cpu },
    { key: 'lighting', label: '照明', icon: Zap },
    { key: 'controller', label: '控制器', icon: CircleDot },
  ];

  const filtered = devices.filter(d => {
    const mappedType = mapDeviceType(d.protocol_type || d.protocol || '', d.device_name);
    const mappedStatus = mapDeviceStatus(d.status, d.online_status);
    if (filterType !== 'all' && mappedType !== filterType) return false;
    if (filterStatus !== 'all' && mappedStatus !== filterStatus) return false;
    if (search && !d.device_name.includes(search) && !(d.location || '').includes(search)) return false;
    return true;
  });

  /* ── 下发控制指令 ── */
  const sendCommand = async (device: IoTDevice, action: string) => {
    const cmd = CMD_MAP[action];
    if (!cmd) return;
    const deviceId = resolveArchiveDeviceId(device);
    if (!Number.isFinite(deviceId) || deviceId <= 0) return;
    const key = `${deviceId}-${cmd}`;
    setExecuting(prev => new Set(prev).add(key));
    try {
      const mapped = DEVICE_CONTROL_CMD_MAP[cmd];
      if (mapped === 'start-stop') {
        await deviceControlService.startStop(deviceId, cmd === 'start' ? 'start' : 'stop');
      } else if (mapped === 3) {
        await deviceControlService.reset(deviceId);
      } else if (mapped === 4) {
        await deviceControlService.silence(deviceId);
      } else {
        await deviceControlService.sendCommand({
          deviceId,
          cmdType: (mapped as DeviceControlCmdType) || 1,
          cmdParam: { command: cmd },
        });
      }
      loadLogs();
    } catch (err: unknown) {
      console.warn('[DeviceControl] 指令下发失败:', getErrorMessage(err));
    } finally {
      setExecuting(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleControl = (device: IoTDevice, action: string) => {
    setConfirmAction({ device, action });
  };

  const executeControl = async () => {
    if (!confirmAction) return;
    const { device, action } = confirmAction;
    await sendCommand(device, action);
    setConfirmAction(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const batchControl = async (action: string) => {
    const cmd = CMD_MAP[action];
    if (!cmd) return;
    const mapped = DEVICE_CONTROL_CMD_MAP[cmd];
    const deviceIds = selectedIds.map(id => Number(id)).filter(n => Number.isFinite(n) && n > 0);
    if (deviceIds.length === 0) return;
    try {
      if (mapped === 'start-stop') {
        for (const deviceId of deviceIds) {
          await deviceControlService.startStop(deviceId, cmd === 'start' ? 'start' : 'stop');
        }
      } else {
        await deviceControlService.batch(deviceIds, (mapped as DeviceControlCmdType) || 1, { command: cmd });
      }
      loadLogs();
    } catch (err: unknown) {
      console.warn('[Batch] 失败:', getErrorMessage(err));
    }
    setSelectedIds([]);
    setBatchMode(false);
  };

  const stats = {
    total: devices.length,
    running: devices.filter(d => mapDeviceStatus(d.status, d.online_status) === 'running').length,
    stopped: devices.filter(d => mapDeviceStatus(d.status, d.online_status) === 'stopped').length,
    fault: devices.filter(d => mapDeviceStatus(d.status, d.online_status) === 'fault').length,
    offline: devices.filter(d => mapDeviceStatus(d.status, d.online_status) === 'offline').length,
  };

  const statItems = [
    { label: '总设备', value: stats.total, icon: Cpu, color: 'blue', accent: 'bg-blue-500', from: 'from-blue-500/80', to: 'to-cyan-400/80' },
    { label: '在线', value: stats.running, icon: Play, color: 'emerald', accent: 'bg-emerald-500', from: 'from-emerald-500/80', to: 'to-teal-400/80' },
    { label: '停止', value: stats.stopped, icon: Pause, color: 'slate', accent: 'bg-slate-500', from: 'from-slate-500/80', to: 'to-slate-400/80' },
    { label: '故障', value: stats.fault, icon: AlertTriangle, color: 'red', accent: 'bg-red-500', from: 'from-red-500/80', to: 'to-orange-400/80' },
    { label: '离线', value: stats.offline, icon: Radio, color: 'slate', accent: 'bg-slate-500', from: 'from-slate-600/80', to: 'to-slate-500/80' },
  ];

  /* ── 控制按钮配置（根据协议类型动态显示） ── */
  function getControlButtons(device: IoTDevice) {
    const proto = (device.protocol || '').toLowerCase();
    const status = mapDeviceStatus(device.status, device.online_status);
    const buttons: { label: string; icon: any; cmd: string; variant: string; show: boolean }[] = [];

    if (proto === 'gb26875' || proto === 'fscn8001') {
      buttons.push(
        { label: '消音', icon: VolumeX, cmd: 'mute', variant: 'amber', show: true },
        { label: '复位', icon: RotateCcw, cmd: 'reset', variant: 'slate', show: true },
        { label: '手动', icon: ArrowRightLeft, cmd: 'manual', variant: 'purple', show: status !== 'offline' },
        { label: '自动', icon: Settings, cmd: 'auto', variant: 'blue', show: status !== 'offline' },
      );
    } else {
      // 通用设备：启动/停止/测试/复位
      buttons.push(
        { label: '启动', icon: Play, cmd: 'start', variant: 'emerald', show: status !== 'running' && status !== 'fault' && status !== 'offline' },
        { label: '停止', icon: PowerOff, cmd: 'stop', variant: 'red', show: status === 'running' },
        { label: '测试', icon: Activity, cmd: 'test', variant: 'blue', show: status !== 'offline' },
        { label: '复位', icon: RotateCcw, cmd: 'reset', variant: 'slate', show: true },
      );
    }
    return buttons.filter(b => b.show);
  }

  const variantClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40',
    red: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40',
    slate: 'bg-slate-700/30 text-slate-400 border-slate-600/20 hover:bg-slate-700/50 hover:border-slate-500/40',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40',
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">设备反控</h2>
            <p className="text-[10px] text-slate-500">远程设备控制 · GB26875 / ModbusTCP / MQTT</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadDevices()} className="text-[10px] px-3 py-1.5 rounded-lg border border-slate-700/30 bg-slate-800/40 text-slate-400 hover:bg-slate-700/40 transition-all">
            刷新
          </button>
          <button
            onClick={() => setBatchMode(!batchMode)}
            className={`text-[10px] px-3 py-1.5 rounded-lg border transition-all backdrop-blur-sm ${
              batchMode
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30'
                : 'bg-slate-800/40 text-slate-400 border-slate-700/30 hover:bg-slate-700/40 hover:scale-[1.02]'
            }`}
          >
            {batchMode ? '取消批量' : '批量控制'}
          </button>
          {batchMode && selectedIds.length > 0 && (
            <>
              <button onClick={() => batchControl('启动')} className="text-[10px] px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all hover:scale-[1.02] backdrop-blur-sm">
                批量启动
              </button>
              <button onClick={() => batchControl('停止')} className="text-[10px] px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-all hover:scale-[1.02] backdrop-blur-sm">
                批量停止
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {statItems.map((s) => (
          <div key={s.label} className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-4 border border-slate-700/30 hover:bg-slate-700/40 transition-all hover:scale-[1.01] group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400">{s.label}</span>
              <div className={`w-8 h-8 rounded-lg ${s.accent}/15 flex items-center justify-center ring-1 ring-${s.color}-500/20`}>
                <s.icon className={`w-4 h-4 text-${s.color}-400`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {s.value}<span className="text-xs font-normal text-slate-500 ml-1">台</span>
            </div>
            <div className="mt-3 h-1 w-full bg-slate-700/30 rounded-full overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${s.from} ${s.to} transition-all duration-500`}
                style={{ width: `${Math.max((s.value / Math.max(stats.total, 1)) * 100, 8)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/40 backdrop-blur-sm rounded-xl w-fit border border-slate-700/30">
        <button onClick={() => setActiveTab('control')}
          className={`px-4 py-2 text-xs rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'control' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
          }`}>
          <Settings className="w-3.5 h-3.5" />设备控制
        </button>
        <button onClick={() => setActiveTab('log')}
          className={`px-4 py-2 text-xs rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'log' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
          }`}>
          <History className="w-3.5 h-3.5" />指令记录
        </button>
      </div>

      {activeTab === 'control' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 p-1 bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/30">
              <button onClick={() => setFilterType('all')}
                className={`text-[10px] px-2.5 py-1.5 rounded-lg transition-all ${
                  filterType === 'all' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                }`}>全部</button>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setFilterType(t.key)}
                  className={`text-[10px] px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    filterType === t.key ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }`}>
                  <t.icon className="w-3 h-3" />{t.label}
                </button>
              ))}
            </div>
            <div className="h-4 w-px bg-slate-700/50" />
            <div className="relative">
              <SlidersHorizontal className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-xl text-[10px] text-slate-300 pl-7 pr-6 py-1.5 outline-none appearance-none cursor-pointer hover:bg-slate-700/40 transition-colors">
                <option value="all">全部状态</option>
                <option value="running">在线</option>
                <option value="stopped">停止</option>
                <option value="fault">故障</option>
                <option value="offline">离线</option>
              </select>
            </div>
            <div className="relative ml-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索设备..."
                className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/30 rounded-xl pl-7 pr-3 py-1.5 text-[10px] text-slate-200 outline-none w-40 placeholder:text-slate-500 hover:bg-slate-700/40 transition-colors focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20" />
            </div>
          </div>

          {/* Device Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
              <p className="text-xs">数据加载中，请稍候…</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              type="data"
              title="暂无可控设备"
              description="请确认设备已接入、已分配至单位且当前账号具备反控权限；过滤条件过严时可尝试清空筛选。"
              className="py-12"
            />
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filtered.map(device => {
                const mappedType = mapDeviceType(device.protocol_type || device.protocol || '', device.device_name);
                const mappedStatus = mapDeviceStatus(device.status, device.online_status);
                const tc = typeConfig(mappedType);
                const sc = statusConfig(mappedStatus);
                const archiveId = String(resolveArchiveDeviceId(device));
                const isSelected = selectedIds.includes(archiveId);
                const buttons = getControlButtons(device);

                return (
                  <div key={archiveId}
                    className={`bg-slate-800/40 backdrop-blur-sm rounded-xl border transition-all group hover:bg-slate-700/40 hover:scale-[1.01] hover:shadow-lg hover:shadow-slate-900/20 ${
                      isSelected ? 'border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10' : 'border-slate-700/30 hover:border-slate-600/50'
                    }`}>
                    <div className="p-3.5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          {batchMode && (
                            <button onClick={() => toggleSelect(archiveId)}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                isSelected ? 'bg-blue-500 border-blue-500 shadow-sm shadow-blue-500/30' : 'border-slate-600 hover:border-slate-500'
                              }`}>
                              {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                            </button>
                          )}
                          <div className={`w-8 h-8 rounded-xl ${tc.bg} flex items-center justify-center ring-1 ${tc.border}`}>
                            <tc.icon className={`w-4 h-4 ${tc.color}`} />
                          </div>
                          <div>
                            <div className="text-xs text-slate-200 font-medium">{device.device_name}</div>
                            <div className="text-[9px] text-slate-500 font-mono">{device.device_id}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] bg-slate-700/30 text-slate-400 border-slate-600/30">
                            {device.protocol?.toUpperCase()}
                          </Badge>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1.5 ${sc.bg} ${sc.color} ring-1 ${sc.ring}`}>
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-[10px] text-slate-500 mb-3.5">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />位置</span>
                          <span className="text-slate-300">{device.location || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1"><Settings className="w-3 h-3" />协议</span>
                          <span className="text-slate-300">{device.protocol?.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />状态</span>
                          <span className="text-slate-200 font-mono font-medium">{device.status}/{device.online_status}</span>
                        </div>
                        {device.ip && (
                          <div className="flex justify-between items-center">
                            <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />地址</span>
                            <span className="text-slate-300 font-mono">{device.ip}:{device.port || '-'}</span>
                          </div>
                        )}
                      </div>
                      {/* Control Buttons */}
                      <div className="flex gap-1.5 flex-wrap">
                        {buttons.map(btn => {
                          const isExec = executing.has(`${archiveId}-${btn.cmd}`);
                        void isExec; // used in disabled prop
                          return (
                            <button key={btn.cmd}
                              onClick={() => handleControl(device, btn.label)}
                              disabled={isExec || mappedStatus === 'offline'}
                              className={`flex-1 min-w-[60px] py-1.5 text-[9px] rounded-lg transition-all flex items-center justify-center gap-1 border ${variantClasses[btn.variant]} hover:shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed`}>
                              {isExec ? <Clock className="w-3 h-3 animate-spin" /> : <btn.icon className="w-3 h-3" />}
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Log Tab */
        <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/30 overflow-hidden">
          <div className="p-3.5 border-b border-slate-700/30 flex items-center justify-between bg-slate-800/60">
            <h3 className="text-xs font-medium text-slate-200 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />控制指令记录
            </h3>
            <span className="text-[10px] text-slate-500">共 {logs.length} 条记录</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-slate-500 border-b border-slate-700/30 bg-slate-800/40">
                <th className="text-left p-3 font-medium">时间</th>
                <th className="text-left p-3 font-medium">设备</th>
                <th className="text-left p-3 font-medium">协议</th>
                <th className="text-left p-3 font-medium">指令</th>
                <th className="text-left p-3 font-medium">状态</th>
                <th className="text-left p-3 font-medium">详情</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {logs.map(log => (
                <tr key={log.id} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                  <td className="p-3 text-slate-400 font-mono">{new Date(log.sent_at).toLocaleString('zh-CN')}</td>
                  <td className="p-3 text-slate-200">{log.device_name || log.device_id}</td>
                  <td className="p-3"><Badge variant="outline" className="text-[9px]">{log.protocol?.toUpperCase()}</Badge></td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-[9px] border border-blue-500/20">
                      {CMD_LABEL[log.command] || log.command}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`flex items-center gap-1 ${
                      log.status === 'success' ? 'text-emerald-400' :
                      log.status === 'failed' ? 'text-red-400' :
                      log.status === 'timeout' ? 'text-orange-400' :
                      'text-yellow-400'
                    }`}>
                      {log.status === 'success' ? <CheckCircle className="w-3 h-3" /> :
                       log.status === 'failed' ? <XCircle className="w-3 h-3" /> :
                       log.status === 'timeout' ? <Clock className="w-3 h-3" /> :
                       <Activity className="w-3 h-3" />}
                      {log.status === 'success' ? '成功' :
                       log.status === 'failed' ? '失败' :
                       log.status === 'timeout' ? '超时' :
                       '执行中'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400 max-w-xs truncate" title={log.error_msg || log.response || ''}>
                    {log.error_msg || log.response || '-'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <TableBodyPlaceholder
                  colSpan={6}
                  isEmpty
                  emptyTitle="暂无指令记录"
                  emptyDescription="反控指令下发成功后，执行状态与回执将在此列表留痕，便于审计与故障追溯。"
                />
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center" onClick={() => setConfirmAction(null)}>
          <div className="relative w-full max-w-sm bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-blue-500/20">
              <Power className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-200 text-center mb-1">确认操作</h3>
            <p className="text-xs text-slate-400 text-center mb-5">
              确定要对 <span className="text-blue-400 font-medium">{confirmAction.device.device_name}</span> 执行 <span className="text-blue-400 font-medium">{confirmAction.action}</span> 操作吗？
              <br />
              <span className="text-[10px] text-slate-500">协议: {confirmAction.device.protocol?.toUpperCase()}</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmAction(null)}
                className="flex-1 h-9 text-xs text-slate-400 hover:text-slate-200 border border-slate-600/50 rounded-lg transition-all hover:bg-slate-700/30">
                取消
              </button>
              <button onClick={executeControl}
                className="flex-1 h-9 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98]">
                确认执行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
