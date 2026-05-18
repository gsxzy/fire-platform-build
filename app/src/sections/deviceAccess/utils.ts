import {
  Cpu, CircleDot, Bell, Droplets, Wind, Lightbulb, Volume2,
  Signal, Camera as CameraIcon, Video, Server, Zap, Flame, Waves,
} from 'lucide-react';
import type { IoTDevice } from './types';

export const categoryConfig: Record<string, { label: string; icon: typeof Cpu; color: string; bg: string }> = {
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
  'elec-monitor': { label: '电气监测', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  'pressure-sensor': { label: '压力传感器', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'fan-controller': { label: '风机控制', icon: Wind, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  'level-sensor': { label: '液位传感器', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'hikvision-smoke': { label: '海康4G烟感', icon: Flame, color: 'text-red-400', bg: 'bg-red-500/10' },
  'hikvision-pressure': { label: '海康4G压力', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'hikvision-level': { label: '海康4G液位', icon: Waves, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
};

export const getCategoryConfig = (category: string) => {
  return categoryConfig[category] || { label: category, icon: Cpu, color: 'text-slate-400', bg: 'bg-slate-500/10' };
};

export const isHikvisionCategory = (category: string) => {
  return category?.startsWith('hikvision-') ||
    category === 'pressure-sensor' ||
    category === 'level-sensor' ||
    category === 'detector';
};

export const showCtwingFields = (category: string, protocol: string) => {
  return isHikvisionCategory(category) || protocol === 'MQTT' || protocol === 'MQTT/TLS';
};

export const statusConfig = (s: string) => {
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

export const protocolColor = (p: string) => {
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
export function extractIotList(res: { data?: unknown } | null): Record<string, unknown>[] {
  const d = res?.data as Record<string, unknown> | unknown[] | undefined;
  if (Array.isArray(d)) return d as Record<string, unknown>[];
  if (d && typeof d === 'object' && Array.isArray((d as { list?: unknown[] }).list)) {
    return (d as { list: Record<string, unknown>[] }).list;
  }
  return [];
}

export function parseProtocolConfig(raw: unknown): Record<string, unknown> {
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

export function formatHeartbeat(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  return new Date(t).toLocaleTimeString('zh-CN', { hour12: false });
}

export function mapRowToIoTDevice(raw: Record<string, unknown>): IoTDevice {
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

export function iotDeviceToAddForm(d: IoTDevice) {
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
    productId: cfg.productId || '2000614607',
    ctwingDeviceId: cfg.ctwingDeviceId || '',
    ctwingPassword: cfg.ctwingPassword || '',
    broker: cfg.broker || '2000614607.non-nb.ctwing.cn',
    keepalive: cfg.keepalive || 120,
    thresholds: cfg.thresholds ? JSON.stringify(cfg.thresholds) : '',
    hostDeviceId: (d as any).hostDeviceId || '',
    hostDeviceSn: (d as any).hostDeviceSn || '',
    txDeviceId: (d as any).txDeviceId || '',
    txDeviceSn: (d as any).txDeviceSn || '',
  };
}

export function buildIotCreateBody(form: ReturnType<typeof iotDeviceToAddForm>) {
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

export const PROTOCOL_OPTIONS: { value: string; label: string }[] = [
  { value: 'GB/T 28181', label: 'GB/T 28181（视频监控联网 · 国标）' },
  { value: 'Modbus TCP', label: 'Modbus TCP（传感器、控制设备 · 主流）' },
  { value: 'Modbus RTU', label: 'Modbus RTU（RS485 现场总线）' },
  { value: 'MQTT', label: 'MQTT（低功耗物联网 · NB/蜂窝）' },
  { value: 'MQTT/TLS', label: 'MQTT over TLS（加密链路）' },
  { value: 'HTTPS', label: 'HTTPS（北向 API / 平台回调）' },
  { value: 'TCP', label: 'TCP（长连接 / 自定义帧）' },
  { value: 'UDP', label: 'UDP（低时延 · 需网络可靠设计）' },
  { value: 'TCP透传', label: 'TCP 透传（私有帧 · 配解析模板）' },
  { value: 'GB26875.1-2011', label: 'GB 26875.1 / FSCN8001（用户信息传输装置 · TCP 5200）' },
  { value: 'RTSP', label: 'RTSP（视频辅助 · 常与国标平台联动）' },
  { value: 'private', label: '厂商私有协议（需《协议解析规格书》）' },
  { value: 'Hikvision4G', label: '海康4G直连（HTTP上报 · CAT1）' },
];

export const BRAND_COMPAT_ROWS: { brand: string; note: string }[] = [
  { brand: '海湾 GST', note: '火灾自动报警 / 联动 · 私有帧需规格书与版本号' },
  { brand: '利达 LD', note: '控制器与现场部件 · 建议 Modbus/定制网关或透传+模板' },
  { brand: '青鸟 JADE', note: '报警与图形显示装置 · 对接需点位表与协议版本' },
  { brand: '泰和安 TXA', note: '报警主机与传输 · 支持国标传输装置或私有解析' },
  { brand: '赋安 FAS', note: 'FSCN8001 等传输装置 · 平台侧 GB26875 接入' },
  { brand: '海康 Hikvision', note: '视频监控 · 优先 GB28181 入网' },
  { brand: '大华 Dahua', note: '视频监控 · 优先 GB28181 入网' },
];
