import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { DeviceManagementFlowHint } from '@/sections/device/DeviceManagementFlowHint';
import { useToast } from '@/core/ToastContext';
import { iotService, deviceService } from '@/api/services';
import type { Device } from '@/types/db';
import TableBodyPlaceholder from '@/components/TableBodyPlaceholder';
import {
  Cpu, Wifi, WifiOff, ChevronRight, Search, CheckCircle,
  AlertTriangle, Radio, Droplets, Wind, Lightbulb, Volume2,
  CircleDot, Signal, X, Server, Shield, Globe, FileText,
  Zap, Database, Plus, Save, Cable, Camera as CameraIcon, Video,
  BookOpen, ArrowRightLeft, Layers, Bell, RefreshCw, ExternalLink,
  Flame, Waves,
} from 'lucide-react';

/* ═══════ Types ═══════ */
interface IoTDevice {
  /** 展示用设备编码（与档案 id / device_sn 一致） */
  id: string;
  /** fire_device.id */
  archiveDeviceId?: string;
  /** fire_iot_device 主键，用于更新、删除 */
  dbId: string;
  deviceSn: string;
  deviceNo: string;
  name: string;
  type: string;
  category: string;
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
  productionDate: string;
  warrantyPeriod: number;
  warrantyExpire: string;
  maintenanceExpire: string;
  isBound: boolean;
  /** CTWing MQTT 接入配置（存储在 protocol_config 中） */
  protocolConfig?: {
    productId?: string;
    ctwingDeviceId?: string;
    ctwingPassword?: string;
    broker?: string;
    keepalive?: number;
    thresholds?: Record<string, unknown>;
  };
}

/* ═══════ 静态数据已清理，所有设备须通过后端 API 获取 ═══════ */

const categoryConfig: Record<string, { label: string; icon: typeof Cpu; color: string; bg: string }> = {
  'fire-controller': { label: '火灾报警控制器', icon: Cpu, color: 'text-red-400', bg: 'bg-red-500/10' },
  'host': { label: '报警主机', icon: Cpu, color: 'text-red-400', bg: 'bg-red-500/10' },
  'detector': { label: '探测器', icon: CircleDot, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  'button': { label: '手报', icon: Bell, color: 'text-red-400', bg: 'bg-red-500/10' },
  'pump': { label: '消防泵', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'fan': { label: '风机', icon: Wind, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  'water': { label: '水源监测', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'electrical': { label: '电气火灾', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  'smoke-exhaust': { label: '防排烟', icon: Wind, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  'lighting': { label: '应急照明', icon: Lightbulb, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  'broadcast': { label: '消防广播', icon: Volume2, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  'iot-sensor': { label: 'IoT传感器', icon: Signal, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  'sensor': { label: '传感器', icon: Signal, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  'camera': { label: '摄像头', icon: CameraIcon, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'gb28181-camera': { label: '国标摄像头', icon: Video, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  'user-transmission-device': { label: '用户信息传输装置', icon: Server, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  'monitor': { label: '监控器', icon: CameraIcon, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  'controller': { label: '控制器', icon: Cpu, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  'alarm': { label: '报警器', icon: Bell, color: 'text-red-400', bg: 'bg-red-500/10' },
  'elevator': { label: '电梯', icon: Server, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  /* 数据库种子中的额外分类 */
  'elec-monitor': { label: '电气监测', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  'pressure-sensor': { label: '压力传感器', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'fan-controller': { label: '风机控制', icon: Wind, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  'level-sensor': { label: '液位传感器', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'hikvision-smoke': { label: '海康4G烟感', icon: Flame, color: 'text-red-400', bg: 'bg-red-500/10' },
  'hikvision-pressure': { label: '海康4G压力', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'hikvision-level': { label: '海康4G液位', icon: Waves, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
};

/* 安全获取分类配置 */
const getCategoryConfig = (category: string) => {
  return categoryConfig[category] || { label: category, icon: Cpu, color: 'text-slate-400', bg: 'bg-slate-500/10' };
};

/* 判断是否为海康4G设备分类（CTWing MQTT 需要显示专属配置） */
const isHikvisionCategory = (category: string) => {
  return category?.startsWith('hikvision-') ||
    category === 'pressure-sensor' ||
    category === 'level-sensor' ||
    category === 'detector';
};

/* 判断是否显示 CTWing MQTT 专属配置字段 */
const showCtwingFields = (category: string, protocol: string) => {
  return isHikvisionCategory(category) || protocol === 'MQTT' || protocol === 'MQTT/TLS';
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
  const u = p.toUpperCase();
  if (u.includes('GB28181')) return 'text-indigo-400 bg-indigo-500/10';
  if (p.includes('Modbus')) return 'text-blue-400 bg-blue-500/10';
  if (p.includes('MQTT')) return 'text-purple-400 bg-purple-500/10';
  if (p.includes('HTTPS')) return 'text-emerald-400 bg-emerald-500/10';
  if (p.includes('UDP')) return 'text-amber-400 bg-amber-500/10';
  if (p.includes('TCP')) return 'text-cyan-400 bg-cyan-500/10';
  if (p.includes('GB26875')) return 'text-rose-400 bg-rose-500/10';
  if (p.includes('私有') || u.includes('PRIVATE')) return 'text-orange-400 bg-orange-500/10';
  return 'text-slate-400 bg-slate-500/10';
};

/** 后端 fire_iot_device（snake）与前端列表字段对齐 */
function extractIotList(res: { data?: unknown } | null): Record<string, unknown>[] {
  const d = res?.data as Record<string, unknown> | unknown[] | undefined;
  if (Array.isArray(d)) return d as Record<string, unknown>[];
  if (d && typeof d === 'object' && Array.isArray((d as { list?: unknown[] }).list)) {
    return (d as { list: Record<string, unknown>[] }).list;
  }
  return [];
}

function parseProtocolConfig(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const o = JSON.parse(raw) as unknown;
      return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return {};
}

function formatHeartbeat(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  return new Date(t).toLocaleTimeString('zh-CN', { hour12: false });
}

function mapRowToIoTDevice(raw: Record<string, unknown>): IoTDevice {
  const dbId = String(raw.id ?? '');
  const deviceSn = String(raw.device_sn ?? '').trim();
  const id = deviceSn || dbId;
  const category = String(raw.device_type ?? raw.category ?? 'iot-sensor');
  let status: IoTDevice['status'] = 'offline';
  const st = raw.status;
  if (st === 1 || st === '1' || st === 'online') status = 'online';
  else if (st === 2 || st === '2' || st === 'fault') status = 'fault';
  else if (st === 'warning') status = 'warning';
  else if (st === 'maintaining') status = 'maintaining';
  else if (st === 'offline' || st === 0 || st === '0') status = 'offline';

  const lastRaw = raw.last_online ?? raw.updated_at ?? raw.updatedAt ?? new Date().toISOString();
  const lastHeartbeat = typeof lastRaw === 'string' ? lastRaw : new Date(lastRaw as string).toISOString();

  const pc = parseProtocolConfig(raw.protocol_config);
  const meta = (pc.accessMeta && typeof pc.accessMeta === 'object' && !Array.isArray(pc.accessMeta))
    ? (pc.accessMeta as Record<string, unknown>)
    : {};

  const floor = String(meta.floor ?? raw.floor ?? '');
  const room = String(meta.room ?? raw.room ?? '');
  const loc = [floor, room].filter(Boolean).join('/') || String(raw.install_location ?? raw.location ?? '');
  const unitFromMeta = String(meta.unitName ?? meta.unit_name ?? '');
  const unitName = (raw.unit && typeof raw.unit === 'object' && !Array.isArray(raw.unit))
    ? String((raw.unit as Record<string, unknown>).unit_name ?? raw.unit_name ?? raw.unitName ?? unitFromMeta)
    : String(raw.unit_name ?? raw.unitName ?? raw.unit ?? unitFromMeta);

  const archiveDev = (raw.archiveDevice || raw.archive_device || {}) as Record<string, unknown>;
  return {
    id,
    archiveDeviceId: raw.archive_device_id != null ? String(raw.archive_device_id) : '',
    dbId,
    deviceSn,
    deviceNo: String(archiveDev.device_no ?? raw.device_no ?? ''),
    name: String(raw.device_name ?? raw.name ?? ''),
    type: category,
    category,
    unit: unitName,
    unitId: String(raw.unit_id ?? raw.unitId ?? ''),
    protocol: String(raw.protocol_type ?? raw.protocol ?? '—'),
    ip: raw.ip_address != null ? String(raw.ip_address) : raw.ip != null ? String(raw.ip) : undefined,
    port: raw.port != null ? String(raw.port) : undefined,
    imei: meta.imei != null ? String(meta.imei) : raw.imei != null ? String(raw.imei) : undefined,
    location: loc,
    floor,
    room,
    status,
    lastHeartbeat,
    heartbeatInterval: Number(meta.heartbeatInterval ?? meta.heartbeat_interval ?? raw.heartbeat_interval ?? raw.heartbeatInterval ?? 30),
    dataPoints: Number(raw.data_points ?? raw.dataPoints ?? 0),
    alarmCount: Number(raw.alarm_count ?? raw.alarmCount ?? 0),
    faultCount: Number(raw.fault_count ?? raw.faultCount ?? 0),
    registerCount: Number(meta.registerCount ?? meta.register_count ?? raw.register_count ?? raw.registerCount ?? 0),
    firmware: String(meta.firmware ?? raw.firmware ?? ''),
    manufacturer: String(meta.manufacturer ?? archiveDev.manufacturer ?? raw.manufacturer ?? ''),
    model: String(meta.model ?? raw.model ?? raw.device_model ?? ''),
    installDate: String(meta.installDate ?? archiveDev.install_date ?? raw.install_date ?? raw.installDate ?? ''),
    productionDate: String(archiveDev.production_date ?? raw.production_date ?? raw.productionDate ?? ''),
    warrantyPeriod: Number(archiveDev.warranty_period ?? raw.warranty_period ?? raw.warrantyPeriod ?? 0),
    warrantyExpire: String(archiveDev.warranty_expire ?? raw.warranty_expire ?? raw.warrantyExpire ?? ''),
    maintenanceExpire: String(archiveDev.maintenance_expire ?? raw.maintenance_expire ?? raw.maintenanceExpire ?? ''),
    protocolConfig: {
      productId: String(meta.productId || meta.product_id || pc.productId || pc.product_id || ''),
      ctwingDeviceId: String(meta.ctwingDeviceId || meta.ctwing_device_id || pc.ctwingDeviceId || pc.ctwing_device_id || ''),
      ctwingPassword: String(meta.ctwingPassword || meta.ctwing_password || pc.ctwingPassword || pc.ctwing_password || ''),
      broker: String(meta.broker || pc.broker || ''),
      keepalive: Number(meta.keepalive || pc.keepalive || 0) || undefined,
      thresholds: (meta.thresholds || pc.thresholds) as Record<string, unknown> | undefined,
    },
    isBound: Boolean(
      (raw.unit_id != null && String(raw.unit_id) !== '' && Number(raw.unit_id) > 0) ||
        (id && deviceSn),
    ),
  };
}

function iotDeviceToAddForm(d: IoTDevice) {
  const cfg = d.protocolConfig || {};
  return {
    archiveDeviceId: d.archiveDeviceId || '',
    deviceName: d.name,
    category: d.category,
    protocol: d.protocol === '—' ? 'Modbus TCP' : d.protocol,
    ip: d.ip || '',
    port: d.port || '',
    imei: d.imei || '',
    unitId: d.unitId || '',
    unitName: d.unit || '',
    floor: d.floor || '1F',
    room: d.room || '',
    heartbeatInterval: d.heartbeatInterval,
    registerCount: d.registerCount,
    manufacturer: d.manufacturer || '',
    model: d.model || '',
    firmware: d.firmware || '',
    productionDate: d.productionDate || '',
    installDate: d.installDate || '',
    warrantyPeriod: String(d.warrantyPeriod || ''),
    warrantyExpire: d.warrantyExpire || '',
    maintenanceExpire: d.maintenanceExpire || '',
    // CTWing
    productId: cfg.productId || '2000614607',
    ctwingDeviceId: cfg.ctwingDeviceId || '',
    ctwingPassword: cfg.ctwingPassword || '',
    broker: cfg.broker || '2000614607.non-nb.ctwing.cn',
    keepalive: cfg.keepalive || 120,
    thresholds: cfg.thresholds ? JSON.stringify(cfg.thresholds) : '',
  };
}

function buildIotCreateBody(form: ReturnType<typeof iotDeviceToAddForm>) {
  const thresholds = (() => {
    if (!form.thresholds) return undefined;
    try { return JSON.parse(form.thresholds); } catch { return undefined; }
  })();
  return {
    archiveDeviceId: form.archiveDeviceId?.trim(),
    name: form.deviceName || '新接入设备',
    category: form.category,
    protocol: form.protocol,
    ip: form.ip || undefined,
    port: form.port ? Number(form.port) : undefined,
    imei: form.imei || undefined,
    floor: form.floor,
    room: form.room || undefined,
    heartbeatInterval: form.heartbeatInterval,
    registerCount: form.registerCount,
    manufacturer: form.manufacturer || undefined,
    model: form.model || undefined,
    firmware: form.firmware || undefined,
    productionDate: form.productionDate || undefined,
    installDate: form.installDate || undefined,
    warrantyPeriod: form.warrantyPeriod ? Number(form.warrantyPeriod) : undefined,
    warrantyExpire: form.warrantyExpire || undefined,
    maintenanceExpire: form.maintenanceExpire || undefined,
    // CTWing 海康4G MQTT 配置
    productId: form.productId || undefined,
    ctwingDeviceId: form.ctwingDeviceId || undefined,
    ctwingPassword: form.ctwingPassword || undefined,
    broker: form.broker || undefined,
    keepalive: form.keepalive || undefined,
    thresholds,
    onlineStatus: 'offline' as const,
    status: 'offline' as const,
    lastHeartbeat: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** 接入表单：应用层协议（国标优先） */
const PROTOCOL_OPTIONS: { value: string; label: string }[] = [
  { value: 'GB/T 28181', label: 'GB/T 28181（视频监控联网 · 国标）' },
  { value: 'Modbus TCP', label: 'Modbus TCP（传感器、控制设备 · 主流）' },
  { value: 'Modbus RTU', label: 'Modbus RTU（RS485 现场总线）' },
  { value: 'MQTT', label: 'MQTT（低功耗物联网 · NB/蜂窝）' },
  { value: 'MQTT/TLS', label: 'MQTT over TLS（加密链路）' },
  { value: 'HTTPS', label: 'HTTPS（北向 API / 平台回调）' },
  { value: 'TCP', label: 'TCP（长连接 / 自定义帧）' },
  { value: 'UDP', label: 'UDP（低时延 · 需网络可靠设计）' },
  { value: 'TCP透传', label: 'TCP 透传（私有帧 · 配解析模板）' },
  { value: 'GB26875.1-2011', label: 'GB 26875.1（用户信息传输装置）' },
  { value: 'RTSP', label: 'RTSP（视频辅助 · 常与国标平台联动）' },
  { value: 'private', label: '厂商私有协议（需《协议解析规格书》）' },
  { value: 'Hikvision4G', label: '海康4G直连（HTTP上报 · CAT1）' },
];

const BRAND_COMPAT_ROWS: { brand: string; note: string }[] = [
  { brand: '海湾 GST', note: '火灾自动报警 / 联动 · 私有帧需规格书与版本号' },
  { brand: '利达 LD', note: '控制器与现场部件 · 建议 Modbus/定制网关或透传+模板' },
  { brand: '青鸟 JADE', note: '报警与图形显示装置 · 对接需点位表与协议版本' },
  { brand: '泰和安 TXA', note: '报警主机与传输 · 支持国标传输装置或私有解析' },
  { brand: '赋安 FAS', note: 'FSCN8001 等传输装置 · 平台侧 GB26875 接入' },
  { brand: '海康 Hikvision', note: '视频监控 · 优先 GB28181 入网' },
  { brand: '大华 Dahua', note: '视频监控 · 优先 GB28181 入网' },
];

/* ═══════ Main ═══════ */
export default function DeviceAccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error: toastError } = useToast();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [protocolFilter, setProtocolFilter] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'topology' | 'guide'>('list');
  const [listLoading, setListLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDbId, setEditingDbId] = useState<string | null>(null);
  const [archiveDevices, setArchiveDevices] = useState<
    (Device & { archiveId: string })[]
  >([]);
  const [addForm, setAddForm] = useState({
    archiveDeviceId: '', deviceName: '', category: 'fire-controller', protocol: 'Modbus TCP',
    ip: '', port: '502', imei: '', unitId: '', unitName: '',
    floor: '1F', room: '', heartbeatInterval: 30, registerCount: 10,
    manufacturer: '', model: '', firmware: '',
    productionDate: '', installDate: '', warrantyPeriod: '', warrantyExpire: '', maintenanceExpire: '',
    // CTWing 海康4G MQTT 配置
    productId: '2000614607',
    ctwingDeviceId: '',
    ctwingPassword: '',
    broker: '2000614607.non-nb.ctwing.cn',
    keepalive: 120,
    thresholds: '',
  });

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 320);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadDevices = useCallback(async () => {
    setListLoading(true);
    try {
      const statusApi =
        statusFilter === 'online' ? 1
        : statusFilter === 'offline' ? 0
        : statusFilter === 'fault' ? 2
        : undefined;
      const res = await iotService.list({
        pageNum: 1,
        pageSize: 500,
        keyword: debouncedSearch || undefined,
        protocolType: protocolFilter === 'all' ? undefined : protocolFilter,
        deviceType: catFilter === 'all' ? undefined : catFilter,
        status: statusApi !== undefined ? statusApi : undefined,
      });
      const rows = extractIotList(res as { data?: unknown }).map(mapRowToIoTDevice);
      setDevices(rows);
      setLastSyncAt(new Date());
    } catch {
      setDevices([]);
      toastError('加载失败', '无法获取 IoT 设备列表，请检查网络与登录状态');
    } finally {
      setListLoading(false);
    }
  }, [toastError, debouncedSearch, protocolFilter, catFilter, statusFilter]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    deviceService
      .list({ pageSize: 999, lifecycleStatus: '1,2,3' })
      .then((res: any) => {
        const rows = res.data?.list || [];
        const list = rows.map((raw: any) => ({
          archiveId: String(raw.id ?? ''),
          id: String(raw.id ?? ''),
          deviceNo: String(raw.device_no ?? ''),
          name: raw.device_name ?? raw.name ?? '',
          type: raw.device_type ?? raw.type ?? '',
          model: raw.device_model ?? raw.model ?? '',
          manufacturer: raw.manufacturer ?? '',
          unitId: raw.unit_id != null ? String(raw.unit_id) : '',
          unitName: raw.unit_name ?? raw.unitName ?? '',
          location: raw.install_location ?? raw.location ?? '',
          status: String(raw.status ?? ''),
          onlineStatus: raw.online_status ?? raw.onlineStatus ?? 'offline',
          ip: raw.iot_id ?? raw.ip ?? '',
          firmware: raw.firmware ?? '',
          installDate: raw.install_date ?? raw.installDate ?? '',
          createdAt: raw.created_at ?? raw.createdAt ?? '',
          updatedAt: raw.updated_at ?? raw.updatedAt ?? '',
        })) as (Device & { archiveId: string })[];
        setArchiveDevices(list);
      })
      .catch(() => {});
  }, []);

  const pendingDeviceId = searchParams.get('deviceId');
  useEffect(() => {
    if (!pendingDeviceId || archiveDevices.length === 0) return;
    const d = archiveDevices.find(
      (x) => x.archiveId === pendingDeviceId || x.id === pendingDeviceId || x.deviceNo === pendingDeviceId
    );
    if (!d) return;
    setAddForm((prev) => ({
      ...prev,
      archiveDeviceId: d.archiveId,
      deviceName: d.name,
      unitId: d.unitId || '',
      unitName: d.unitName || '',
      category: (d.type || 'fire-controller') as any,
      manufacturer: d.manufacturer || '',
      model: d.model || '',
      firmware: d.firmware || '',
    }));
    setEditingDbId(null);
    setShowAddModal(true);
  }, [pendingDeviceId, archiveDevices]);

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    fault: devices.filter(d => d.status === 'fault').length,
    warning: devices.filter(d => d.status === 'warning').length,
    bound: devices.filter(d => d.isBound).length,
    totalPoints: devices.reduce((s, d) => s + d.dataPoints, 0),
  };

  const statCards = [
    { label: '接入设备', value: stats.total, unit: '台', Icon: Cpu, iconClass: 'text-blue-400' },
    { label: '在线', value: stats.online, unit: '台', Icon: Wifi, iconClass: 'text-emerald-400' },
    { label: '离线', value: stats.offline, unit: '台', Icon: WifiOff, iconClass: 'text-slate-400' },
    { label: '故障', value: stats.fault, unit: '台', Icon: AlertTriangle, iconClass: 'text-red-400' },
    { label: '预警', value: stats.warning, unit: '台', Icon: Shield, iconClass: 'text-yellow-400' },
    { label: '已绑定', value: stats.bound, unit: '台', Icon: CheckCircle, iconClass: 'text-purple-400' },
    { label: '采集点位', value: stats.totalPoints, unit: '个', Icon: Database, iconClass: 'text-cyan-400' },
  ];

  return (
    <div className="p-4 space-y-4">
      <DeviceManagementFlowHint active="access" />
      {/* Header — glass */}
      <div className="glass rounded-xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Server className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 leading-tight">设备接入</h2>
            <p className="text-[10px] text-slate-500 max-w-xl">
              仅允许选择已在「入库管理」<span className="text-slate-400">提交入库（已入库）</span>的设备，配置
              <span className="text-slate-400">协议 / IP / 端口 / 连通性</span>；单位绑定请在「设备分配」完成，业务阈值与联动请在「设备配置」维护。
            </p>
            <div className="mt-2">
              <Link
                to="/device/access/ctwing"
                className="inline-block text-[10px] px-2.5 py-1 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 transition-colors"
              >
                打开 CTWing 海康4G 专用配置页
              </Link>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-emerald-400">接入服务</span>
          </div>
          {lastSyncAt && (
            <span className="text-[10px] text-slate-500" title="列表数据同步时间">
              同步 {lastSyncAt.toLocaleTimeString('zh-CN', { hour12: false })}
            </span>
          )}
          <button
            type="button"
            onClick={() => loadDevices()}
            disabled={listLoading}
            className="text-[10px] px-2.5 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600/40 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${listLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            type="button"
            onClick={() => { setEditingDbId(null); setShowAddModal(true); }}
            className="text-[10px] px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" />从档案接入
          </button>
          <button
            type="button"
            onClick={() => navigate('/iot/gb28181')}
            className="text-[10px] px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded flex items-center gap-1.5 transition-colors"
          >
            <Video className="w-3 h-3" />GB28181
          </button>
          <button
            type="button"
            onClick={() => navigate('/iot/protocol')}
            className="text-[10px] px-3 py-1.5 bg-slate-700/40 hover:bg-slate-700/60 text-slate-300 border border-slate-600/30 rounded flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3 h-3" />协议配置
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {statCards.map((s, i) => (
          <div key={i} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-1">
              <s.Icon className={`w-3.5 h-3.5 ${s.iconClass}`} />
              <span className="text-[10px] text-slate-400">{s.label}</span>
            </div>
            <div className="text-lg font-bold text-slate-100">
              {s.value}
              <span className="text-[9px] font-normal text-slate-500 ml-0.5">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-800/50 rounded-lg w-fit border border-slate-700/30">
        <button type="button" onClick={() => setActiveTab('list')} className={`px-3 sm:px-4 py-2 text-xs rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'list' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}><FileText className="w-3.5 h-3.5" />设备清单</button>
        <button type="button" onClick={() => setActiveTab('topology')} className={`px-3 sm:px-4 py-2 text-xs rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'topology' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}><Globe className="w-3.5 h-3.5" />接入拓扑</button>
        <button type="button" onClick={() => setActiveTab('guide')} className={`px-3 sm:px-4 py-2 text-xs rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'guide' ? 'bg-blue-500 text-white' : 'text-slate-400'}`}><BookOpen className="w-3.5 h-3.5" />协议与能力</button>
      </div>

      {/* Filter Bar — 条件参与服务端筛选，减少大包传输 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap max-w-[min(100%,52rem)] overflow-x-auto pb-1">
          <button type="button" onClick={() => setCatFilter('all')} className={`text-[10px] px-2.5 py-1 rounded transition-colors shrink-0 ${catFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-700/30 text-slate-400'}`}>全部类型</button>
          {Object.entries(categoryConfig).map(([k, v]) => (
            <button key={k} type="button" onClick={() => setCatFilter(k)} className={`text-[10px] px-2 py-1 rounded transition-colors flex items-center gap-1 shrink-0 ${catFilter === k ? 'bg-blue-500 text-white' : 'bg-slate-700/30 text-slate-400'}`}><v.icon className="w-2.5 h-2.5" />{v.label}</button>
          ))}
        </div>
        <div className="h-4 w-px bg-slate-700 hidden sm:block" />
        <select value={protocolFilter} onChange={(e) => setProtocolFilter(e.target.value)} className="bg-slate-700/30 border border-slate-600/30 rounded text-[10px] text-slate-300 px-2 py-1 outline-none max-w-[10rem]">
          <option value="all">全部协议</option>
          {PROTOCOL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-700/30 border border-slate-600/30 rounded text-[10px] text-slate-300 px-2 py-1 outline-none">
          <option value="all">全部状态</option>
          <option value="online">在线</option>
          <option value="offline">离线</option>
          <option value="fault">故障</option>
        </select>
        <div className="relative ml-auto min-w-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索设备编码/名称（服务端）" className="bg-slate-700/30 border border-slate-600/30 rounded pl-6 pr-2 py-1 text-[10px] text-slate-200 outline-none w-44 max-w-[100vw]" />
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead><tr className="text-[10px] text-slate-500 border-b border-slate-700/30">
              <th className="text-left p-2.5 font-medium">档案编号</th>
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
              {listLoading ? (
                <TableBodyPlaceholder colSpan={10} loading />
              ) : devices.length === 0 ? (
                <TableBodyPlaceholder
                  colSpan={10}
                  isEmpty
                  emptyTitle="暂无接入设备"
                  emptyDescription="请先在「设备档案 / 设备分配」中完成建档与归属绑定，再回到本页使用「接入新设备」。若已操作仍为空，请确认接口权限与联网状态。"
                />
              ) : (
                devices.map(d => {
                  const cc = getCategoryConfig(d.category);
                  const sc = statusConfig(d.status);
                  return (
                    <tr key={d.dbId} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors cursor-pointer" onClick={() => setSelectedDevice(d)}>
                      <td className="p-2.5 text-slate-400 font-mono">
                        <span title={d.dbId ? `内部ID: ${d.dbId}` : undefined}>{d.deviceNo || d.deviceSn || d.id}</span>
                      </td>
                      <td className="p-2.5"><span className="text-slate-200 font-medium">{d.name}</span></td>
                      <td className="p-2.5"><span className={`flex items-center gap-1 ${cc.color}`}><cc.icon className="w-3 h-3" />{cc.label}</span></td>
                      <td className="p-2.5"><span className={`text-[9px] px-1.5 py-0.5 rounded ${protocolColor(d.protocol)}`}>{d.protocol}</span></td>
                      <td className="p-2.5 text-slate-400">{d.unit || '—'}</td>
                      <td className="p-2.5 text-slate-500">{d.floor || d.room ? `${d.floor}/${d.room}` : d.location || '—'}</td>
                      <td className="p-2.5"><span className={`flex items-center gap-1 ${sc.color}`}><div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}</span></td>
                      <td className="p-2.5 text-slate-500 font-mono">{formatHeartbeat(d.lastHeartbeat)}</td>
                      <td className="p-2.5"><span className="text-slate-300">{d.dataPoints}</span><span className="text-slate-600">/{d.registerCount}</span></td>
                      <td className="p-2.5">
                        <button
                          type="button"
                          className="text-blue-400 hover:text-blue-300 text-[9px]"
                          onClick={(e) => { e.stopPropagation(); setSelectedDevice(d); }}
                        >
                          详情
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'topology' && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-6 space-y-6">
          <p className="text-[11px] text-slate-400 text-center max-w-3xl mx-auto">
            传输层可选用 <span className="text-slate-300">TCP（长连接）</span>、<span className="text-slate-300">UDP（低时延）</span>、<span className="text-slate-300">TLS/HTTPS（加密）</span>；
            视频监控系统建议 <span className="text-indigo-400">有线专网或高可靠局域网</span>；独立式探测报警、NB 设备建议 <span className="text-purple-400">蜂窝 / 低功耗广域网</span>，并保证信号覆盖与链路冗余。
          </p>
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10">
            <div className="text-center">
              <div className="w-28 h-20 rounded-lg bg-blue-500/10 border border-blue-500/30 flex flex-col items-center justify-center">
                <Server className="w-7 h-7 text-blue-400" />
                <span className="text-[10px] text-blue-400 mt-1 font-medium">智慧消防平台</span>
              </div>
              <div className="mt-2 text-[9px] text-slate-500 leading-relaxed">
                协议解析 · 告警入库<br />控制下发 · 反馈校验
              </div>
            </div>
            <div className="flex flex-col gap-1.5 items-center">
              <ArrowRightLeft className="w-4 h-4 text-slate-500" />
              <span className="text-[9px] text-slate-500">上报 / 指令 / 回执</span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              <div className="w-full p-2.5 rounded-lg border bg-indigo-500/5 border-indigo-500/20">
                <span className="text-[9px] text-indigo-400 font-medium">GB/T 28181</span>
                <div className="text-[8px] text-slate-500 mt-0.5">海康 / 大华等视频设备国标注册与信令</div>
              </div>
              <div className="w-full p-2.5 rounded-lg border bg-blue-500/5 border-blue-500/20">
                <span className="text-[9px] text-blue-400 font-medium">Modbus TCP/RTU</span>
                <div className="text-[8px] text-slate-500 mt-0.5">传感器、风机水泵、电气监测等</div>
              </div>
              <div className="w-full p-2.5 rounded-lg border bg-purple-500/5 border-purple-500/20">
                <span className="text-[9px] text-purple-400 font-medium">MQTT / MQTT+TLS</span>
                <div className="text-[8px] text-slate-500 mt-0.5">低功耗终端、边缘网关北向</div>
              </div>
              <div className="w-full p-2.5 rounded-lg border bg-rose-500/5 border-rose-500/20">
                <span className="text-[9px] text-rose-400 font-medium">GB 26875.1</span>
                <div className="text-[8px] text-slate-500 mt-0.5">赋安等用户信息传输装置</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-px h-8 bg-slate-600/40" />
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <div className="px-4 py-2 rounded-lg border border-orange-500/20 bg-orange-500/5 text-center">
              <span className="text-[10px] text-orange-400 font-medium">告警与事件</span>
              <div className="text-[8px] text-slate-500">火警 / 故障 / 预警 → 业务库</div>
            </div>
            <div className="px-4 py-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 text-center">
              <span className="text-[10px] text-cyan-400 font-medium">设备状态</span>
              <div className="text-[8px] text-slate-500">在线、工况、寄存器快照</div>
            </div>
            <div className="px-4 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-center">
              <span className="text-[10px] text-emerald-400 font-medium">远程控制</span>
              <div className="text-[8px] text-slate-500">启停 · 参数 · 执行回执闭环</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'guide' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 p-4">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-blue-400" />核心应用协议（国标与主流）
              </h3>
              <ul className="space-y-2 text-[10px] text-slate-400 leading-relaxed">
                <li><span className="text-indigo-400">GB/T 28181</span>：视频监控设备联网，与海康、大华等主流 NVR/IPC 平台级对接。</li>
                <li><span className="text-blue-400">Modbus</span>：工业与消防电子装置通用现场总线，适合传感器、风机、泵阀等控制类设备。</li>
                <li><span className="text-purple-400">MQTT</span>：轻量发布订阅，适合 NB-IoT、4G 网关及低功耗传感场景；可叠加 TLS。</li>
                <li><span className="text-rose-400">GB 26875.1</span>：城市消防远程监控用户信息传输装置报文规范（如赋安 FSCN8001 链路）。</li>
              </ul>
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 p-4">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-cyan-400" />传输层与网络建议
              </h3>
              <ul className="space-y-2 text-[10px] text-slate-400 leading-relaxed">
                <li>平台侧支持 <span className="text-slate-300">TCP、UDP、HTTPS</span> 等传输承载，按设备厂商接口选配。</li>
                <li><span className="text-slate-300">视频监控</span>：优先有线专网或高带宽光纤，降低丢包与抖动。</li>
                <li><span className="text-slate-300">独立式探测报警 / 无线烟感</span>：采用运营商蜂窝或低功耗广域网时，需评估覆盖与心跳周期。</li>
                <li>涉密或公网穿越场景建议启用 <span className="text-emerald-400">TLS / VPN</span>，与平台安全策略一致。</li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 p-4">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2 mb-3">
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />四类核心信息与「上报 · 指令 · 反馈」闭环
            </h3>
            <div className="grid sm:grid-cols-4 gap-2 mb-4">
              {[
                { t: '运行状态', d: '在线/离线、工况、信号质量', c: 'text-emerald-400' },
                { t: '故障', d: '设备自检、线路、通信异常', c: 'text-red-400' },
                { t: '预警', d: '阈值越限、趋势异常', c: 'text-yellow-400' },
                { t: '报警', d: '火警、手动报警、监管报警', c: 'text-orange-400' },
              ].map(x => (
                <div key={x.t} className="rounded-lg bg-slate-900/40 border border-slate-700/40 p-2.5">
                  <div className={`text-[10px] font-medium ${x.c}`}>{x.t}</div>
                  <div className="text-[9px] text-slate-500 mt-1">{x.d}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-400">
              <span className="px-2 py-1 rounded bg-slate-700/40 border border-slate-600/30">设备上报</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">平台解析与入库</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="px-2 py-1 rounded bg-slate-700/40 border border-slate-600/30">控制指令下发</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">设备执行与回执</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-3 text-center">具体点位映射与指令集在「协议配置」中维护；私有协议需配套《协议解析规格书》与版本号以便升级兼容。</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 p-4">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-orange-400" />主流品牌兼容与协议演进
            </h3>
            <p className="text-[10px] text-slate-500 mb-3">
              海湾、利达、青鸟、泰和安、赋安等火灾自动报警品牌，以及海康、大华等视频厂商：国标协议优先接入；私有协议须由设备方提供 <span className="text-slate-400">帧格式、寄存器/命令字、CRC、示例报文与异常码</span> 等文档。平台支持按版本迭代扩展解析插件与模板，满足后续协议升级需求。
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {BRAND_COMPAT_ROWS.map(row => (
                <div key={row.brand} className="rounded-lg border border-slate-700/40 bg-slate-900/30 p-2.5">
                  <div className="text-[10px] text-slate-200 font-medium">{row.brand}</div>
                  <div className="text-[9px] text-slate-500 mt-1 leading-snug">{row.note}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <button type="button" onClick={() => navigate('/iot/protocol')} className="text-[10px] px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> 打开协议解析配置
              </button>
              <button type="button" onClick={() => navigate('/device/control')} className="text-[10px] px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/40 hover:bg-slate-700 flex items-center gap-1">
                <Bell className="w-3 h-3" /> 设备反控（指令下发）
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 接入新设备弹窗 ═══ */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={() => { setShowAddModal(false); setEditingDbId(null); }}
        >
          <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-slate-700/30 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
              <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Cable className="w-4 h-4 text-blue-400" />
                {editingDbId ? '编辑接入配置' : '从档案接入平台'}
              </h3>
              <button type="button" onClick={() => { setShowAddModal(false); setEditingDbId(null); }} className="text-slate-400 hover:text-slate-200" aria-label="关闭"><X className="w-4 h-4" /></button>
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
                  value={addForm.archiveDeviceId}
                  disabled={!!editingDbId}
                  onChange={(e) => {
                    const d = archiveDevices.find((x) => x.archiveId === e.target.value);
                    if (d)
                      setAddForm({
                        ...addForm,
                        archiveDeviceId: d.archiveId,
                        deviceName: d.name,
                        unitId: d.unitId || '',
                        unitName: d.unitName || '',
                        category: (d.type || 'fire-controller') as any,
                        manufacturer: d.manufacturer || '',
                        model: d.model || '',
                        firmware: d.firmware || '',
                        productionDate: d.productionDate || '',
                        installDate: d.installDate || '',
                        warrantyPeriod: String(d.warrantyPeriod || ''),
                        warrantyExpire: d.warrantyExpire || '',
                        maintenanceExpire: d.maintenanceExpire || '',
                      });
                  }}
                  className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none disabled:opacity-50"
                >
                  <option value="">请选择设备（已入库/已接入/已分配均可配置）</option>
                  {archiveDevices
                    .filter(
                      (d) =>
                        d.type !== 'gb28181-camera'
                    )
                    .map((d) => {
                      const alreadyConnected = devices.some((dev) => dev.archiveDeviceId && dev.archiveDeviceId === d.archiveId);
                      return (
                        <option key={d.archiveId} value={d.archiveId}>
                          {d.deviceNo || d.archiveId} · {d.name} {alreadyConnected ? '（已接入，编辑配置）' : d.location ? `· ${d.location}` : ''}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">设备分类 <span className="text-red-400">*</span></label>
                  <select value={addForm.category} onChange={e => {
                    const cat = e.target.value;
                    const isHikvision = isHikvisionCategory(cat);
                    setAddForm({ ...addForm, category: cat, protocol: isHikvision ? 'MQTT' : addForm.protocol });
                  }} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none">
                    {Object.entries(categoryConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">通信协议 <span className="text-red-400">*</span></label>
                  <select value={addForm.protocol} onChange={e => setAddForm({ ...addForm, protocol: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none">
                    {PROTOCOL_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
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

              {/* CTWing 海康4G MQTT 接入配置 */}
              {showCtwingFields(addForm.category, addForm.protocol) && (
                <div className="space-y-3 border border-cyan-500/20 rounded-lg p-3 bg-cyan-500/5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium text-cyan-400">CTWing MQTT 接入配置</span>
                    <span className="text-[9px] text-slate-500">海康4G设备必填</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 mb-1 block">产品ID <span className="text-red-400">*</span></label>
                      <input value={addForm.productId} onChange={e => setAddForm({ ...addForm, productId: e.target.value })} placeholder="2000614607" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 mb-1 block">CTWing设备ID <span className="text-red-400">*</span></label>
                      <input value={addForm.ctwingDeviceId} onChange={e => setAddForm({ ...addForm, ctwingDeviceId: e.target.value })} placeholder="99013914869646085145332" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 mb-1 block">特征串/密码 <span className="text-red-400">*</span></label>
                      <input value={addForm.ctwingPassword} onChange={e => setAddForm({ ...addForm, ctwingPassword: e.target.value })} placeholder="pnnbCufLrnsd4zMs3qbozmQ4gD90e5JIzbSA3cNfc8M" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 mb-1 block">MQTT Broker <span className="text-red-400">*</span></label>
                      <input value={addForm.broker} onChange={e => setAddForm({ ...addForm, broker: e.target.value })} placeholder="2000614607.non-nb.ctwing.cn" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 mb-1 block">Keepalive(秒)</label>
                      <input type="number" value={addForm.keepalive} onChange={e => setAddForm({ ...addForm, keepalive: Number(e.target.value) })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 mb-1 block">告警阈值JSON</label>
                      <input value={addForm.thresholds} onChange={e => setAddForm({ ...addForm, thresholds: e.target.value })} placeholder='{"smoke":1,"voltage":3.0}' className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none font-mono" />
                    </div>
                  </div>
                </div>
              )}

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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">生产日期</label>
                  <input type="date" value={addForm.productionDate} onChange={e => setAddForm({ ...addForm, productionDate: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">安装日期</label>
                  <input type="date" value={addForm.installDate} onChange={e => setAddForm({ ...addForm, installDate: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">质保期(月)</label>
                  <input type="number" value={addForm.warrantyPeriod} onChange={e => setAddForm({ ...addForm, warrantyPeriod: e.target.value })} placeholder="12" className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">质保到期日</label>
                  <input type="date" value={addForm.warrantyExpire} onChange={e => setAddForm({ ...addForm, warrantyExpire: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">维保到期日</label>
                  <input type="date" value={addForm.maintenanceExpire} onChange={e => setAddForm({ ...addForm, maintenanceExpire: e.target.value })} className="w-full bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2 text-xs text-slate-200 outline-none" />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700/30 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowAddModal(false); setEditingDbId(null); }} className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-600 rounded-md transition-colors">取消</button>
              <button
                type="button"
                onClick={async () => {
                  if (!addForm.archiveDeviceId) return;
                  const iotData = buildIotCreateBody(addForm);
                  try {
                    if (editingDbId) {
                      await iotService.update(editingDbId, iotData as any);
                      success('已保存', `${iotData.name} 接入参数已更新`);
                    } else {
                      await iotService.create(iotData as any);
                      success('设备接入成功', `${iotData.name} 已完成平台接入`);
                    }
                    await loadDevices();
                    deviceService
                      .list({ pageSize: 999, lifecycleStatus: '1,2,3' })
                      .then((r: any) => {
                        const rows = r.data?.list || [];
                        setArchiveDevices(
                          rows.map((raw: any) => ({
                            archiveId: String(raw.id ?? ''),
                            id: String(raw.id ?? ''),
                            deviceNo: String(raw.device_no ?? ''),
                            name: raw.device_name ?? raw.name ?? '',
                            type: raw.device_type ?? raw.type ?? '',
                            model: raw.device_model ?? raw.model ?? '',
                            manufacturer: raw.manufacturer ?? '',
                            unitId: raw.unit_id != null ? String(raw.unit_id) : '',
                            unitName: raw.unit_name ?? raw.unitName ?? '',
                            location: raw.install_location ?? raw.location ?? '',
                            status: String(raw.status ?? ''),
                            onlineStatus: raw.online_status ?? raw.onlineStatus ?? 'offline',
                            ip: raw.iot_id ?? raw.ip ?? '',
                            firmware: raw.firmware ?? '',
                            installDate: raw.install_date ?? raw.installDate ?? '',
                            createdAt: raw.created_at ?? raw.createdAt ?? '',
                            updatedAt: raw.updated_at ?? raw.updatedAt ?? '',
                          })) as (Device & { archiveId: string })[]
                        );
                      })
                      .catch(() => {});
                    setShowAddModal(false);
                    setEditingDbId(null);
                    setAddForm({
                      archiveDeviceId: '',
                      deviceName: '',
                      category: 'fire-controller',
                      protocol: 'Modbus TCP',
                      ip: '',
                      port: '502',
                      imei: '',
                      unitId: '',
                      unitName: '',
                      floor: '1F',
                      room: '',
                      heartbeatInterval: 30,
                      registerCount: 10,
                      manufacturer: '',
                      model: '',
                      firmware: '',
                      productionDate: '',
                      installDate: '',
                      warrantyPeriod: '',
                      warrantyExpire: '',
                      maintenanceExpire: '',
                      // CTWing reset
                      productId: '2000614607',
                      ctwingDeviceId: '',
                      ctwingPassword: '',
                      broker: '2000614607.non-nb.ctwing.cn',
                      keepalive: 120,
                      thresholds: '',
                    });
                  } catch (e: unknown) {
                    toastError(editingDbId ? '保存失败' : '接入失败', e instanceof Error ? e.message : '网络或服务器异常');
                  }
                }}
                disabled={!addForm.archiveDeviceId}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-xs rounded-md flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />{editingDbId ? '保存修改' : '确认接入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedDevice && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              {(() => { const cc = getCategoryConfig(selectedDevice.category); return <cc.icon className={`w-5 h-5 shrink-0 ${cc.color}`} />; })()}
              <span className="text-sm font-bold text-slate-200 truncate">{selectedDevice.name}</span>
              <span className="text-[9px] text-slate-500 font-mono shrink-0" title={`内部ID ${selectedDevice.dbId}`}>{selectedDevice.deviceSn || selectedDevice.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddForm(iotDeviceToAddForm(selectedDevice));
                  setEditingDbId(selectedDevice.dbId);
                  setShowAddModal(true);
                }}
                className="text-[10px] px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25"
              >
                编辑
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(`确定从接入表移除「${selectedDevice.name}」？不会删除设备档案。`)) return;
                  try {
                    await iotService.delete(selectedDevice.dbId);
                    success('已移除接入', selectedDevice.name);
                    setSelectedDevice(null);
                    await loadDevices();
                    deviceService
                      .list({ pageSize: 999, lifecycleStatus: '1,2,3' })
                      .then((r: any) => {
                        const rows = r.data?.list || [];
                        setArchiveDevices(
                          rows.map((raw: any) => ({
                            archiveId: String(raw.id ?? ''),
                            id: String(raw.id ?? ''),
                            deviceNo: String(raw.device_no ?? ''),
                            name: raw.device_name ?? raw.name ?? '',
                            type: raw.device_type ?? raw.type ?? '',
                            model: raw.device_model ?? raw.model ?? '',
                            manufacturer: raw.manufacturer ?? '',
                            unitId: raw.unit_id != null ? String(raw.unit_id) : '',
                            unitName: raw.unit_name ?? raw.unitName ?? '',
                            location: raw.install_location ?? raw.location ?? '',
                            status: String(raw.status ?? ''),
                            onlineStatus: raw.online_status ?? raw.onlineStatus ?? 'offline',
                            ip: raw.iot_id ?? raw.ip ?? '',
                            firmware: raw.firmware ?? '',
                            installDate: raw.install_date ?? raw.installDate ?? '',
                            createdAt: raw.created_at ?? raw.createdAt ?? '',
                            updatedAt: raw.updated_at ?? raw.updatedAt ?? '',
                          })) as (Device & { archiveId: string })[]
                        );
                      })
                      .catch(() => {});
                  } catch (e: unknown) {
                    toastError('删除失败', e instanceof Error ? e.message : '请稍后重试');
                  }
                }}
                className="text-[10px] px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
              >
                移除接入
              </button>
              <button type="button" onClick={() => setSelectedDevice(null)} className="text-slate-500 hover:text-slate-300 p-1" aria-label="关闭"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 text-[10px]">
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">档案编号</span><span className="text-slate-300 font-mono">{selectedDevice.deviceNo || selectedDevice.deviceSn || '—'}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">通信协议</span><span className={`${protocolColor(selectedDevice.protocol)} px-1.5 py-0.5 rounded text-[9px]`}>{selectedDevice.protocol}</span></div>
            {selectedDevice.ip && <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">IP地址</span><span className="text-slate-300 font-mono">{selectedDevice.ip}:{selectedDevice.port}</span></div>}
            {selectedDevice.imei && <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">IMEI</span><span className="text-slate-300 font-mono">{selectedDevice.imei}</span></div>}
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">心跳间隔</span><span className="text-slate-300">{selectedDevice.heartbeatInterval}s</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">固件版本</span><span className="text-slate-300">{selectedDevice.firmware || '—'}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">厂商/型号</span><span className="text-slate-300">{selectedDevice.manufacturer || '—'} {selectedDevice.model || '—'}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">生产日期</span><span className="text-slate-300">{selectedDevice.productionDate || '—'}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">安装日期</span><span className="text-slate-300">{selectedDevice.installDate || '—'}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">质保期</span><span className="text-slate-300">{selectedDevice.warrantyPeriod ? `${selectedDevice.warrantyPeriod}个月` : '—'}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">质保到期</span><span className="text-slate-300">{selectedDevice.warrantyExpire || '—'}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">维保到期</span><span className="text-slate-300">{selectedDevice.maintenanceExpire || '—'}</span></div>
            <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">绑定状态</span><span className={selectedDevice.isBound ? 'text-emerald-400' : 'text-yellow-400'}>{selectedDevice.isBound ? '已绑定台账' : '未绑定'}</span></div>
            {selectedDevice.category && showCtwingFields(selectedDevice.category, selectedDevice.protocol) && (
              <>
                <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">产品ID</span><span className="text-slate-300 font-mono">{selectedDevice.protocolConfig?.productId || '—'}</span></div>
                <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">CTWing设备ID</span><span className="text-slate-300 font-mono">{selectedDevice.protocolConfig?.ctwingDeviceId || '—'}</span></div>
                <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">MQTT Broker</span><span className="text-slate-300 font-mono">{selectedDevice.protocolConfig?.broker || '—'}</span></div>
                <div className="p-2 bg-slate-700/20 rounded"><span className="text-slate-500 block">Keepalive</span><span className="text-slate-300">{selectedDevice.protocolConfig?.keepalive || '—'}s</span></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
