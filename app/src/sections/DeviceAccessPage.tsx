import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useToast } from '@/core/ToastContext';
import { iotService, deviceService } from '@/api/services';
import type { Device } from '@/types/db';
import {
  Cpu, Wifi, WifiOff, ChevronRight, Search, CheckCircle,
  AlertTriangle, Radio, Droplets, Wind, Lightbulb, Volume2,
  CircleDot, Signal, X, Server, Shield, Globe, FileText,
  Zap, Database, Plus, Save, Cable, Camera as CameraIcon, Video
} from 'lucide-react';

/* ═══════ Types ═══════ */
interface IoTDevice {
  id: string;
  name: string;
  type: string;
  category: 'fire-controller' | 'detector' | 'water' | 'electrical' | 'smoke-exhaust' | 'lighting' | 'broadcast' | 'iot-sensor' | 'camera' | 'gb28181-camera' | 'user-transmission-device';
  unit: string;
  unitId: string;
  protocol: string;
  ip?: string;
  port?: string;
  imei?: string;
  location: string;
  floor: string;
  room: string;
  status: 'online' | 'offline' | 'fault' | 'warning' | 'maintaining';
  lastHeartbeat: string;
  heartbeatInterval: number;
  dataPoints: number;
  alarmCount: number;
  faultCount: number;
  registerCount: number;
  firmware: string;
  manufacturer: string;
  model: string;
  installDate: string;
  isBound: boolean;
}

/* ═══════ Mock Data ═══════ */
const iotDevices: IoTDevice[] = [
  { id: 'FAC-001', name: '火灾报警控制器#1', type: '赋安JB_LBZ2_FS5116', category: 'fire-controller', unit: '万达广场商业中心', unitId: 'UN-001', protocol: 'Modbus TCP', ip: '192.168.1.101', port: '502', location: '消防控制室', floor: 'B1', room: '消防控制室', status: 'online', lastHeartbeat: '2026-04-19 10:05:32', heartbeatInterval: 30, dataPoints: 968, alarmCount: 2, faultCount: 3, registerCount: 2450, firmware: 'V2.4.1', manufacturer: '赋安', model: 'FS5116', installDate: '2024-01-15', isBound: true },
  { id: 'FAC-002', name: '火灾报警控制器#2', type: '海湾GST5000H', category: 'fire-controller', unit: '兰州大学第二医院', unitId: 'UN-002', protocol: 'TCP透传', ip: '192.168.2.101', port: '8080', location: '消防控制室', floor: '1F', room: '消防控制室', status: 'online', lastHeartbeat: '2026-04-19 10:05:28', heartbeatInterval: 60, dataPoints: 1560, alarmCount: 0, faultCount: 2, registerCount: 1800, firmware: 'V3.1.0', manufacturer: '海湾', model: 'GST5000H', installDate: '2024-03-20', isBound: true },
  { id: 'NB-001', name: 'NB烟感探测器#1', type: '赋安JTY-GD-Y102', category: 'detector', unit: '万达广场商业中心', unitId: 'UN-001', protocol: 'MQTT', imei: '866234567890123', location: '1F大厅', floor: '1F', room: '大厅', status: 'online', lastHeartbeat: '2026-04-19 10:05:15', heartbeatInterval: 300, dataPoints: 12, alarmCount: 1, faultCount: 0, registerCount: 6, firmware: 'V1.2.3', manufacturer: '赋安', model: 'Y102', installDate: '2024-06-10', isBound: true },
  { id: 'NB-002', name: 'NB温感探测器#1', type: '赋安JTW-ZD-Y103', category: 'detector', unit: '万达广场商业中心', unitId: 'UN-001', protocol: 'MQTT', imei: '866234567890124', location: '1F走廊', floor: '1F', room: '走廊', status: 'online', lastHeartbeat: '2026-04-19 10:04:55', heartbeatInterval: 300, dataPoints: 8, alarmCount: 0, faultCount: 0, registerCount: 4, firmware: 'V1.2.3', manufacturer: '赋安', model: 'Y103', installDate: '2024-06-10', isBound: true },
  { id: 'WT-001', name: '管网压力传感器#1', type: 'PT-100消防压力', category: 'water', unit: '万达广场商业中心', unitId: 'UN-001', protocol: 'Modbus RTU', ip: '192.168.1.201', port: '503', location: '水泵房', floor: 'B2', room: '水泵房', status: 'online', lastHeartbeat: '2026-04-19 10:05:30', heartbeatInterval: 10, dataPoints: 156, alarmCount: 0, faultCount: 1, registerCount: 8, firmware: 'V1.0.5', manufacturer: '华为', model: 'PT-100', installDate: '2024-02-28', isBound: true },
  { id: 'WT-002', name: '消防水池液位传感器', type: '超声波液位计', category: 'water', unit: '万达广场商业中心', unitId: 'UN-001', protocol: 'Modbus TCP', ip: '192.168.1.202', port: '502', location: '消防水池', floor: 'B3', room: '水池间', status: 'online', lastHeartbeat: '2026-04-19 10:05:25', heartbeatInterval: 10, dataPoints: 89, alarmCount: 0, faultCount: 0, registerCount: 6, firmware: 'V2.0.1', manufacturer: '西门子', model: 'ULM-200', installDate: '2024-02-28', isBound: true },
  { id: 'EL-001', name: '剩余电流探测器#1', type: 'DH-A-FT剩余电流', category: 'electrical', unit: '兰州中心', unitId: 'UN-003', protocol: 'Modbus TCP', ip: '192.168.3.105', port: '502', location: '配电室', floor: 'B1', room: '配电室A', status: 'warning', lastHeartbeat: '2026-04-19 10:03:12', heartbeatInterval: 15, dataPoints: 234, alarmCount: 0, faultCount: 2, registerCount: 12, firmware: 'V1.3.0', manufacturer: '泰和安', model: 'DH-A-FT', installDate: '2024-05-15', isBound: true },
  { id: 'EL-002', name: '线缆温度传感器#1', type: 'NTC温度传感器', category: 'electrical', unit: '兰州中心', unitId: 'UN-003', protocol: 'Modbus RTU', ip: '192.168.3.106', port: '503', location: '配电室', floor: 'B1', room: '配电室B', status: 'online', lastHeartbeat: '2026-04-19 10:05:20', heartbeatInterval: 15, dataPoints: 189, alarmCount: 0, faultCount: 0, registerCount: 8, firmware: 'V1.1.2', manufacturer: '利达', model: 'NTC-100', installDate: '2024-05-15', isBound: true },
  { id: 'SE-001', name: '排烟风机#1', type: 'HTF-II排烟风机', category: 'smoke-exhaust', unit: '万达广场商业中心', unitId: 'UN-001', protocol: 'Modbus TCP', ip: '192.168.1.301', port: '502', location: '屋顶机房', floor: 'RF', room: '机房A', status: 'online', lastHeartbeat: '2026-04-19 10:05:33', heartbeatInterval: 5, dataPoints: 45, alarmCount: 0, faultCount: 0, registerCount: 10, firmware: 'V1.0.8', manufacturer: '青鸟', model: 'HTF-II-5', installDate: '2024-01-15', isBound: true },
  { id: 'SE-002', name: '防火阀控制器#1', type: 'FD防火阀执行器', category: 'smoke-exhaust', unit: '万达广场商业中心', unitId: 'UN-001', protocol: 'Modbus RTU', ip: '192.168.1.302', port: '503', location: '空调机房', floor: 'B1', room: '机房B', status: 'fault', lastHeartbeat: '2026-04-18 16:22:10', heartbeatInterval: 30, dataPoints: 12, alarmCount: 0, faultCount: 3, registerCount: 6, firmware: 'V1.0.3', manufacturer: '泰和安', model: 'FD-240', installDate: '2024-01-15', isBound: true },
  { id: 'LT-001', name: '应急照明控制器', type: '应急照明集中控制器', category: 'lighting', unit: '万达广场商业中心', unitId: 'UN-001', protocol: 'TCP透传', ip: '192.168.1.401', port: '9090', location: '配电室', floor: 'B1', room: '配电室', status: 'online', lastHeartbeat: '2026-04-19 10:05:18', heartbeatInterval: 60, dataPoints: 567, alarmCount: 0, faultCount: 0, registerCount: 24, firmware: 'V2.1.0', manufacturer: '青鸟', model: 'ZM-C-100', installDate: '2024-03-10', isBound: true },
  { id: 'BC-001', name: '消防广播控制器', type: '消防应急广播主机', category: 'broadcast', unit: '万达广场商业中心', unitId: 'UN-001', protocol: 'TCP透传', ip: '192.168.1.501', port: '9091', location: '消防控制室', floor: 'B1', room: '消防控制室', status: 'online', lastHeartbeat: '2026-04-19 10:05:10', heartbeatInterval: 60, dataPoints: 23, alarmCount: 0, faultCount: 0, registerCount: 8, firmware: 'V1.5.0', manufacturer: '海湾', model: 'GB-C-50', installDate: '2024-03-10', isBound: true },
  { id: 'CAM-001', name: '大厅高清摄像头#1', type: '海康威视DS-2CD3T25', category: 'camera', unit: '万达广场商业中心', unitId: 'UN-001', protocol: 'RTSP', ip: '192.168.1.601', port: '554', location: '1F大厅', floor: '1F', room: '大厅', status: 'online', lastHeartbeat: '2026-04-19 10:05:05', heartbeatInterval: 30, dataPoints: 1, alarmCount: 0, faultCount: 0, registerCount: 1, firmware: 'V5.6.0', manufacturer: '海康威视', model: 'DS-2CD3T25', installDate: '2024-04-10', isBound: true },
  { id: 'CAM-002', name: '走廊监控摄像头#1', type: '大华DH-IPC-HFW2433', category: 'camera', unit: '兰州大学第二医院', unitId: 'UN-002', protocol: 'GB28181', ip: '192.168.2.201', port: '5060', location: '2F走廊', floor: '2F', room: '走廊', status: 'online', lastHeartbeat: '2026-04-19 10:04:50', heartbeatInterval: 30, dataPoints: 1, alarmCount: 0, faultCount: 0, registerCount: 1, firmware: 'V4.2.1', manufacturer: '大华', model: 'DH-IPC-HFW2433', installDate: '2024-05-20', isBound: true },
  { id: 'GB-001', name: '国标接入摄像头#1', type: '宇视IPC232L-IR3', category: 'gb28181-camera', unit: '兰州中心', unitId: 'UN-003', protocol: 'GB28181', ip: '192.168.3.301', port: '5060', location: '地下车库入口', floor: 'B2', room: '车库入口', status: 'online', lastHeartbeat: '2026-04-19 10:05:12', heartbeatInterval: 30, dataPoints: 1, alarmCount: 0, faultCount: 0, registerCount: 1, firmware: 'V3.1.5', manufacturer: '宇视', model: 'IPC232L-IR3', installDate: '2024-06-01', isBound: true },
  { id: 'UTD-001', name: '赋安用户信息传输装置#1', type: '赋安FSCN8001', category: 'user-transmission-device', unit: '万达广场商业中心', unitId: 'UN-001', protocol: 'GB26875.1-2011', ip: '192.168.1.100', port: '5200', location: '消防控制室', floor: 'B1', room: '消防控制室', status: 'online', lastHeartbeat: '2026-04-19 10:05:32', heartbeatInterval: 30, dataPoints: 2450, alarmCount: 2, faultCount: 1, registerCount: 2450, firmware: 'V1.2.0', manufacturer: '赋安', model: 'FSCN8001', installDate: '2024-01-15', isBound: true },
  { id: 'FAC-003', name: '赋安火灾报警控制器#3', type: '赋安JB_LBZ2_FS5116', category: 'fire-controller', unit: '万达广场商业中心', unitId: 'UN-001', protocol: 'GB26875.1-2011', ip: '192.168.1.101', port: '502', location: '消防控制室', floor: 'B1', room: '消防控制室', status: 'online', lastHeartbeat: '2026-04-19 10:05:32', heartbeatInterval: 30, dataPoints: 968, alarmCount: 2, faultCount: 3, registerCount: 2450, firmware: 'V2.4.1', manufacturer: '赋安', model: 'FS5116', installDate: '2024-01-15', isBound: true },
];

const categoryConfig: Record<string, { label: string; icon: typeof Cpu; color: string; bg: string }> = {
  'fire-controller': { label: '火灾报警控制器', icon: Cpu, color: 'text-red-400', bg: 'bg-red-500/10' },
  'detector': { label: '探测器', icon: CircleDot, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  'water': { label: '水源监测', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'electrical': { label: '电气火灾', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  'smoke-exhaust': { label: '防排烟', icon: Wind, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  'lighting': { label: '应急照明', icon: Lightbulb, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  'broadcast': { label: '消防广播', icon: Volume2, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  'iot-sensor': { label: 'IoT传感器', icon: Signal, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  'camera': { label: '摄像头', icon: CameraIcon, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'gb28181-camera': { label: '国标摄像头', icon: Video, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  'user-transmission-device': { label: '用户信息传输装置', icon: Server, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  /* 数据库种子中的额外分类 */
  'elec-monitor': { label: '电气监测', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  'pressure-sensor': { label: '压力传感器', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'fan-controller': { label: '风机控制', icon: Wind, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  'level-sensor': { label: '液位传感器', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
};

/* 安全获取分类配置 */
const getCategoryConfig = (category: string) => {
  return categoryConfig[category] || { label: category, icon: Cpu, color: 'text-slate-400', bg: 'bg-slate-500/10' };
};

const statusConfig = (s: string) => {
  switch (s) {
    case 'online': return { label: '在线', color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400 animate-pulse' };
    case 'offline': return { label: '离线', color: 'text-slate-500', bg: 'bg-slate-500/10', dot: 'bg-slate-500' };
    case 'fault': return { label: '故障', color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400 animate-pulse' };
    case 'warning': return { label: '预警', color: 'text-yellow-400', bg: 'bg-yellow-500/10', dot: 'bg-yellow-400' };
    case 'maintaining': return { label: '维护', color: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-400' };
    case 'normal': return { label: '正常', color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' };
    case 'disabled': return { label: '禁用', color: 'text-slate-500', bg: 'bg-slate-500/10', dot: 'bg-slate-500' };
    default: return { label: s, color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-500' };
  }
};

const protocolColor = (p: string) => {
  if (p.includes('Modbus')) return 'text-blue-400 bg-blue-500/10';
  if (p.includes('MQTT')) return 'text-purple-400 bg-purple-500/10';
  if (p.includes('TCP')) return 'text-cyan-400 bg-cyan-500/10';
  if (p.includes('GB26875')) return 'text-rose-400 bg-rose-500/10';
  return 'text-slate-400 bg-slate-500/10';
};

/* ═══════ Main ═══════ */
export default function DeviceAccessPage() {
  const navigate = useNavigate();
  const { success } = useToast();
  const [devices, setDevices] = useState<IoTDevice[]>(iotDevices);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'topology'>('list');
  const [liveData, setLiveData] = useState<{ packets: number; parsed: number; alarms: number }>({ packets: 12456, parsed: 12450, alarms: 23 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [archiveDevices, setArchiveDevices] = useState<Device[]>([]);
  const [addForm, setAddForm] = useState({
    deviceCode: '', deviceName: '', category: 'fire-controller', protocol: 'Modbus TCP',
    ip: '', port: '502', imei: '', unitId: '', unitName: '',
    floor: '1F', room: '', heartbeatInterval: 30, registerCount: 10,
    manufacturer: '', model: '', firmware: '',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(prev => ({ packets: prev.packets + Math.floor(Math.random() * 5), parsed: prev.parsed + Math.floor(Math.random() * 5), alarms: prev.alarms }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    iotService.list().then((res: any) => {
      const data = Array.isArray(res.data) ? res.data : (res.data?.list || res.data || []);
      if (data.length > 0) setDevices(data as any);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    deviceService.list({ pageSize: 9999, archive_status: 'allocated' }).then((res: any) => {
      const list = res.data?.list || [];
      setArchiveDevices(list);
    }).catch(() => {});
  }, []);

  const filtered = devices.filter(d => {
    if (catFilter !== 'all' && d.category !== catFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (search && !d.name.includes(search) && !d.id.includes(search) && !d.unit.includes(search)) return false;
    return true;
  });

  const stats = {
    total: devices.length, online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    fault: devices.filter(d => d.status === 'fault').length,
    warning: devices.filter(d => d.status === 'warning').length,
    bound: devices.filter(d => d.isBound).length,
    totalPoints: devices.reduce((s: any, d: any) => s + d.dataPoints, 0),
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Server className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">设备接入</h2>
            <p className="text-[10px] text-slate-500">第三方设备IoT接入配置</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-emerald-400">服务运行中</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">报文: {liveData.packets.toLocaleString()}</span>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-[10px] px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" />接入新设备
          </button>
          <button
            onClick={() => navigate('/iot/gb28181')}
            className="text-[10px] px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded flex items-center gap-1.5 transition-colors"
          >
            <Video className="w-3 h-3" />GB28181接入
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-7 gap-2">
        {[
          { label: '接入设备', value: stats.total, unit: '台', icon: Cpu, color: 'blue' },
          { label: '在线', value: stats.online, unit: '台', icon: Wifi, color: 'emerald' },
          { label: '离线', value: stats.offline, unit: '台', icon: WifiOff, color: 'slate' },
          { label: '故障', value: stats.fault, unit: '台', icon: AlertTriangle, color: 'red' },
          { label: '预警', value: stats.warning, unit: '台', icon: Shield, color: 'yellow' },
          { label: '已绑定', value: stats.bound, unit: '台', icon: CheckCircle, color: 'purple' },
          { label: '采集点位', value: stats.totalPoints, unit: '个', icon: Database, color: 'cyan' },
        ].map((s: any, i: number) => (
          <div key={i} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-1"><s.icon className={`w-3.5 h-3.5 text-${s.color}-400`} /><span className="text-[10px] text-slate-400">{s.label}</span></div>
            <div className="text-lg font-bold text-slate-100">{s.value}<span className="text-[9px] font-normal text-slate-500 ml-0.5">{s.unit}</span></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit border border-slate-700/30">
        <button onClick={() => setActiveTab('list')} className={`px-4 py-2 text-xs rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'list' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}><FileText className="w-3.5 h-3.5" />设备清单</button>
        <button onClick={() => setActiveTab('topology')} className={`px-4 py-2 text-xs rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'topology' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}><Globe className="w-3.5 h-3.5" />接入拓扑</button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          <button onClick={() => setCatFilter('all')} className={`text-[10px] px-2.5 py-1 rounded transition-colors ${catFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-700/30 text-slate-400'}`}>全部</button>
          {Object.entries(categoryConfig).map(([k, v]) => (
            <button key={k} onClick={() => setCatFilter(k)} className={`text-[10px] px-2 py-1 rounded transition-colors flex items-center gap-1 ${catFilter === k ? 'bg-blue-500 text-white' : 'bg-slate-700/30 text-slate-400'}`}><v.icon className="w-2.5 h-2.5" />{v.label}</button>
          ))}
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-700/30 border border-slate-600/30 rounded text-[10px] text-slate-300 px-2 py-1 outline-none">
          <option value="all">全部状态</option><option value="online">在线</option><option value="offline">离线</option><option value="fault">故障</option><option value="warning">预警</option>
        </select>
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索设备ID/名称/单位" className="bg-slate-700/30 border border-slate-600/30 rounded pl-6 pr-2 py-1 text-[10px] text-slate-200 outline-none w-44" />
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30">
          <table className="w-full">
            <thead><tr className="text-[10px] text-slate-500 border-b border-slate-700/30">
              <th className="text-left p-2.5 font-medium">设备ID</th>
              <th className="text-left p-2.5 font-medium">设备名称</th>
              <th className="text-left p-2.5 font-medium">类型</th>
              <th className="text-left p-2.5 font-medium">协议</th>
              <th className="text-left p-2.5 font-medium">联网单位</th>
              <th className="text-left p-2.5 font-medium">位置</th>
              <th className="text-left p-2.5 font-medium">状态</th>
              <th className="text-left p-2.5 font-medium">心跳</th>
              <th className="text-left p-2.5 font-medium">点位</th>
              <th className="text-left p-2.5 font-medium">操作</th>
            </tr></thead>
            <tbody className="text-[10px]">
              {filtered.map(d => {
                const cc = getCategoryConfig(d.category);
                const sc = statusConfig(d.status);
                return (
                  <tr key={d.id} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors cursor-pointer" onClick={() => setSelectedDevice(d)}>
                    <td className="p-2.5 text-slate-400 font-mono">{d.id}</td>
                    <td className="p-2.5"><span className="text-slate-200 font-medium">{d.name}</span></td>
                    <td className="p-2.5"><span className={`flex items-center gap-1 ${cc.color}`}><cc.icon className="w-3 h-3" />{cc.label}</span></td>
                    <td className="p-2.5"><span className={`text-[9px] px-1.5 py-0.5 rounded ${protocolColor(d.protocol)}`}>{d.protocol}</span></td>
                    <td className="p-2.5 text-slate-400">{d.unit}</td>
                    <td className="p-2.5 text-slate-500">{d.floor}/{d.room}</td>
                    <td className="p-2.5"><span className={`flex items-center gap-1 ${sc.color}`}><div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}</span></td>
                    <td className="p-2.5 text-slate-500 font-mono">{d.lastHeartbeat.split(' ')[1]}</td>
                    <td className="p-2.5"><span className="text-slate-300">{d.dataPoints}</span><span className="text-slate-600">/{d.registerCount}</span></td>
                    <td className="p-2.5"><button className="text-blue-400 hover:text-blue-300 text-[9px]">详情</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Topology View */
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-6">
          <div className="flex items-center justify-center gap-8">
            {/* Platform */}
            <div className="text-center">
              <div className="w-24 h-16 rounded-lg bg-blue-500/10 border border-blue-500/30 flex flex-col items-center justify-center">
                <Server className="w-6 h-6 text-blue-400" />
                <span className="text-[9px] text-blue-400 mt-1">采集服务端</span>
              </div>
              <div className="mt-2 text-[9px] text-slate-500">TCP/UDP Server<br/>MQTT Broker<br/>Modbus Master</div>
            </div>
            {/* Arrows */}
            <div className="flex flex-col gap-1 items-center">
              <div className="w-16 h-0.5 bg-blue-500/30" />
              <div className="w-16 h-0.5 bg-purple-500/30" />
              <div className="w-16 h-0.5 bg-cyan-500/30" />
              <span className="text-[8px] text-slate-500 mt-1">长连接</span>
            </div>
            {/* Devices */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { p: 'Modbus TCP', c: 'blue', d: '火灾报警控制器 x2' },
                { p: 'Modbus RTU', c: 'indigo', d: '压力/液位/温度 x4' },
                { p: 'MQTT', c: 'purple', d: 'NB烟感/温感 x2' },
                { p: 'TCP透传', c: 'cyan', d: '照明/广播主机 x2' },
              ].map((item: any, i: number) => (
                <div key={i} className={`w-28 p-2 rounded border bg-${item.c}-500/5 border-${item.c}-500/20`}>
                  <span className={`text-[9px] text-${item.c}-400 font-medium`}>{item.p}</span>
                  <div className="text-[8px] text-slate-500 mt-0.5">{item.d}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Data Flow Down */}
          <div className="flex justify-center mt-4">
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-slate-600/30" />
              <span className="text-[8px] text-slate-500 my-1">数据流转</span>
              <div className="w-0.5 h-6 bg-slate-600/30" />
            </div>
          </div>
          <div className="flex justify-center gap-3 mt-2">
            {[
              { label: 'Kafka事件', sub: '告警/故障', c: 'orange' },
              { label: 'InfluxDB', sub: '时序数据', c: 'cyan' },
              { label: 'PostgreSQL', sub: '业务数据', c: 'blue' },
            ].map((item: any, i: number) => (
              <div key={i} className={`px-4 py-2 rounded-lg border bg-${item.c}-500/5 border-${item.c}-500/20 text-center`}>
                <span className={`text-[10px] text-${item.c}-400 font-medium`}>{item.label}</span>
                <div className="text-[8px] text-slate-500">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 接入新设备弹窗 ═══ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-slate-700/30 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2"><Cable className="w-4 h-4 text-blue-400" />接入新设备</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200" aria-label="关闭"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* Step Indicator */}
              <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-2">
                <span className="text-blue-400 font-medium">Step 1: 选择设备</span>
                <ChevronRight className="w-3 h-3" />
                <span>Step 2: 配置通信</span>
                <ChevronRight className="w-3 h-3" />
                <span>Step 3: 确认接入</span>
              </div>

              {/* Device Selection */}
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">从设备档案选择 <span className="text-red-400">*</span></label>
                <select
                  value={addForm.deviceCode}
                  onChange={e => {
                    const d = archiveDevices.find(x => x.id === e.target.value);
                    if (d) setAddForm({ ...addForm, deviceCode: d.id, deviceName: d.name, unitId: d.unitId, unitName: d.unitName || '', category: d.type as any || 'fire-controller', manufacturer: d.manufacturer || '', model: d.model || '', firmware: d.firmware || '' });
                  }}
                  className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none"
                >
                  <option value="">请选择待接入设备</option>
                  {archiveDevices
                    .filter(d => d.type !== 'gb28181-camera' && !devices.some(dev => dev.id === d.id))
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.id} - {d.name} ({d.unitName || d.unitId} / {d.location})</option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">设备分类 <span className="text-red-400">*</span></label>
                  <select value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none">
                    {Object.entries(categoryConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">通信协议 <span className="text-red-400">*</span></label>
                  <select value={addForm.protocol} onChange={e => setAddForm({ ...addForm, protocol: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none">
                    <option>Modbus TCP</option><option>Modbus RTU</option><option>MQTT</option><option>TCP透传</option><option>GB28181</option><option>GB26875.1-2011</option><option>RTSP</option><option>私有协议</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">IP地址</label>
                  <input value={addForm.ip} onChange={e => setAddForm({ ...addForm, ip: e.target.value })} placeholder="192.168.1.xxx" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">端口</label>
                  <input value={addForm.port} onChange={e => setAddForm({ ...addForm, port: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">IMEI (NB设备)</label>
                  <input value={addForm.imei} onChange={e => setAddForm({ ...addForm, imei: e.target.value })} placeholder="866xxxxxxxxxxxx" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">心跳间隔(秒)</label>
                  <input type="number" value={addForm.heartbeatInterval} onChange={e => setAddForm({ ...addForm, heartbeatInterval: Number(e.target.value) })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">楼层</label>
                  <input value={addForm.floor} onChange={e => setAddForm({ ...addForm, floor: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">房间</label>
                  <input value={addForm.room} onChange={e => setAddForm({ ...addForm, room: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">寄存器数量</label>
                  <input type="number" value={addForm.registerCount} onChange={e => setAddForm({ ...addForm, registerCount: Number(e.target.value) })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">厂商</label>
                  <input value={addForm.manufacturer} onChange={e => setAddForm({ ...addForm, manufacturer: e.target.value })} placeholder="赋安/海湾/泰和安" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">型号</label>
                  <input value={addForm.model} onChange={e => setAddForm({ ...addForm, model: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">固件版本</label>
                  <input value={addForm.firmware} onChange={e => setAddForm({ ...addForm, firmware: e.target.value })} placeholder="V1.0.0" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 rounded-md transition-colors">取消</button>
              <button
                onClick={async () => {
                  if (!addForm.deviceCode) return;
                  const iotData = {
                    id: addForm.deviceCode,
                    name: addForm.deviceName || '新接入设备',
                    category: addForm.category,
                    protocol: addForm.protocol,
                    ip: addForm.ip || undefined,
                    port: addForm.port ? Number(addForm.port) : undefined,
                    imei: addForm.imei || undefined,
                    unitId: addForm.unitId || 'UN-001',
                    unitName: addForm.unitName,
                    floor: addForm.floor,
                    room: addForm.room || undefined,
                    onlineStatus: 'offline' as const,
                    heartbeatInterval: addForm.heartbeatInterval,
                    registerCount: addForm.registerCount,
                    manufacturer: addForm.manufacturer || undefined,
                    model: addForm.model || undefined,
                    firmware: addForm.firmware || undefined,
                    status: 'offline' as const,
                    lastHeartbeat: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  try {
                    const res = await iotService.create(iotData as any);
                    if (res.code !== 200) {
                      return;
                    }
                    // 同步更新设备档案为已接入状态
                    await deviceService.update(iotData.id, {
                      archiveStatus: 'accessed',
                      status: 'normal',
                      protocolType: iotData.protocol,
                      ip: iotData.ip,
                    } as any).catch(() => null);
                    success('设备接入成功', `${iotData.name} (${iotData.id}) 已成功接入系统`);
                    const listRes = await iotService.list();
                    const data = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.list || listRes.data || []);
                    if (data.length > 0) setDevices(data as any);
                    // 刷新可选档案列表
                    deviceService.list({ pageSize: 9999, archive_status: 'allocated' }).then((r: any) => {
                      setArchiveDevices(r.data?.list || []);
                    }).catch(() => {});
                    setShowAddModal(false);
                    setAddForm({ deviceCode: '', deviceName: '', category: 'fire-controller', protocol: 'Modbus TCP', ip: '', port: '502', imei: '', unitId: '', unitName: '', floor: '1F', room: '', heartbeatInterval: 30, registerCount: 10, manufacturer: '', model: '', firmware: '' });
                  } catch {
                    // ignore
                  }
                }}
                disabled={!addForm.deviceCode}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-xs rounded-md flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />确认接入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedDevice && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {(() => { const cc = getCategoryConfig(selectedDevice.category); return <cc.icon className={`w-5 h-5 ${cc.color}`} />; })()}
              <span className="text-sm font-bold text-slate-200">{selectedDevice.name}</span>
              <span className="text-[9px] text-slate-500 font-mono">{selectedDevice.id}</span>
            </div>
            <button onClick={() => setSelectedDevice(null)} className="text-slate-500 hover:text-slate-300" aria-label="关闭"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-4 gap-3 text-[10px]">
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">通信协议</span><span className={`${protocolColor(selectedDevice.protocol)} px-1.5 py-0.5 rounded text-[9px]`}>{selectedDevice.protocol}</span></div>
            {selectedDevice.ip && <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">IP地址</span><span className="text-slate-300 font-mono">{selectedDevice.ip}:{selectedDevice.port}</span></div>}
            {selectedDevice.imei && <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">IMEI</span><span className="text-slate-300 font-mono">{selectedDevice.imei}</span></div>}
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">心跳间隔</span><span className="text-slate-300">{selectedDevice.heartbeatInterval}s</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">固件版本</span><span className="text-slate-300">{selectedDevice.firmware}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">厂商/型号</span><span className="text-slate-300">{selectedDevice.manufacturer} {selectedDevice.model}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">安装日期</span><span className="text-slate-300">{selectedDevice.installDate}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">绑定状态</span><span className={selectedDevice.isBound ? 'text-emerald-400' : 'text-yellow-400'}>{selectedDevice.isBound ? '已绑定台账' : '未绑定'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
