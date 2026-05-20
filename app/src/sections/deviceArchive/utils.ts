import { deviceService } from '@/api/services';
import type { QueryParams, Device } from '@/types/db';

export const typeMap: Record<string, string> = {
  detector: '探测器',
  button: '手报',
  pump: '消防泵',
  fan: '风机',
  sensor: '传感器',
  monitor: '监控器',
  controller: '控制器',
  alarm: '报警器',
  host: '报警主机',
  elevator: '电梯',
  broadcast: '广播',
  camera: '摄像头',
  'gb28181-camera': 'GB28181摄像头',
  'fire-controller': '火灾报警控制器',
  water: '水源监测',
  electrical: '电气火灾',
  'smoke-exhaust': '防排烟',
  lighting: '应急照明',
  'iot-sensor': 'IoT传感器',
  'elec-monitor': '电气监测',
  'pressure-sensor': '压力传感器',
  'fan-controller': '风机控制',
  'level-sensor': '液位传感器',
  'user-transmission-device': '用户信息传输装置',
};

export const archiveStatusMap: Record<string, string> = {
  draft: '草稿',
  registered: '已入库',
  accessed: '已接入',
  assigned: '已分配',
  maintenance: '维护中',
  scrapped: '已报废',
};

export const archiveStatusColorMap: Record<string, string> = {
  draft: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  registered: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
  accessed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  assigned: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  maintenance: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  scrapped: 'text-red-400 bg-red-500/10 border-red-500/20',
};

export const onlineStatusMap: Record<string, string> = {
  online: '在线',
  offline: '离线',
  unknown: '未知',
  '0': '离线',
  '1': '在线',
};

export const protocolTypeMap: Record<string, string> = {
  standard: '标准协议',
  gb26875: 'GB26875',
  fscn8001: '赋安FSCN8001',
  mqtt: 'MQTT',
  modbus: 'Modbus',
  gb28181: 'GB28181',
  ctwing: 'CTWing',
  '': '—',
};

export const typeColorMap: Record<string, string> = {
  detector: 'text-red-400 bg-red-500/10 border-red-500/20',
  button: 'text-red-400 bg-red-500/10 border-red-500/20',
  alarm: 'text-red-400 bg-red-500/10 border-red-500/20',
  host: 'text-red-400 bg-red-500/10 border-red-500/20',
  'fire-controller': 'text-red-400 bg-red-500/10 border-red-500/20',
  pump: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  water: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  sensor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'level-sensor': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'pressure-sensor': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  fan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  'smoke-exhaust': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  monitor: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  electrical: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'elec-monitor': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  camera: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  'gb28181-camera': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  controller: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  lighting: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  broadcast: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  elevator: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'iot-sensor': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'fan-controller': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'user-transmission-device': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

export const onlineStatusColorMap: Record<string, string> = {
  online: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  offline: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  unknown: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  '0': 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  '1': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export function mapLifecycleToArchiveStatus(ls: number | undefined): NonNullable<Device['archiveStatus']> {
  const n = ls ?? 1;
  if (n >= 5) return 'scrapped';
  if (n === 4) return 'maintenance';
  if (n === 3) return 'assigned';
  if (n === 2) return 'accessed';
  if (n === 1) return 'registered';
  if (n === 0) return 'draft';
  return 'registered';
}

export function mapBackendDeviceToDevice(raw: any): Device {
  const statusNumMap: Record<number, string> = { 0: 'disabled', 1: 'normal', 2: 'fault', 3: 'offline', 4: 'scrapped' };
  const st = raw.status;
  const statusStr =
    typeof st === 'number' ? (statusNumMap[st] ?? 'offline') : (st ?? 'offline');
  const uid = raw.unit_id ?? raw.unitId ?? raw.unit?.id;
  const unitIdStr = uid != null && uid !== '' && uid !== '0' ? String(uid) : '';
  const lifecycle = Number(raw.lifecycle_status ?? raw.lifecycleStatus ?? 1) || 1;
  const fallbackUnitName = unitIdStr ? `单位ID:${unitIdStr}` : '';
  return {
    id: String(raw.id ?? ''),
    deviceNo: String(raw.device_no ?? ''),
    name: raw.device_name ?? raw.name ?? '',
    type: raw.device_type ?? raw.type ?? '',
    model: raw.device_model ?? raw.model ?? '',
    manufacturer: raw.manufacturer ?? '',
    unitId: unitIdStr,
    unitName: raw.unit?.unit_name ?? raw.unit_name ?? raw.unitName ?? fallbackUnitName,
    location: raw.install_location ?? raw.location ?? '',
    ip: raw.iot_id ?? raw.ip ?? '',
    status: statusStr as Device['status'],
    onlineStatus: raw.online_status ?? raw.onlineStatus ?? 'offline',
    installDate: raw.install_date ?? raw.installDate ?? '',
    productionDate: raw.production_date ?? raw.productionDate ?? '',
    warrantyPeriod: raw.warranty_period ?? raw.warrantyPeriod ?? undefined,
    warrantyExpire: raw.warranty_expire ?? raw.warrantyExpire ?? '',
    maintenanceExpire: raw.maintenance_expire ?? raw.maintenanceExpire ?? '',
    firmware: raw.firmware ?? '',
    remark: raw.remark ?? '',
    createdAt: raw.created_at ?? raw.createdAt ?? '',
    updatedAt: raw.updated_at ?? raw.updatedAt ?? '',
    lifecycleStatus: lifecycle,
    archiveStatus: mapLifecycleToArchiveStatus(lifecycle),
    hasIotConfig: !!raw.has_iot_config,
    gatewayId: raw.gateway_id ?? raw.gatewayId ?? '',
    protocolType: raw.protocol_type ?? raw.protocolType ?? '',
    lastOnline: raw.last_online ?? raw.lastOnline ?? '',
    alarmCount: Number(raw.alarm_count ?? raw.alarmCount ?? 0),
  } as Device;
}

export function mapDeviceToBackend(data: Partial<Device>): any {
  const base: Record<string, unknown> = {
    name: data.name,
    type: data.type,
    device_model: data.model,
    manufacturer: data.manufacturer,
    serialNo: data.serialNo,
    productionDate: data.productionDate,
    installDate: data.installDate,
    warrantyPeriod: data.warrantyPeriod,
    warrantyExpire: data.warrantyExpire,
    maintenanceExpire: data.maintenanceExpire,
    calibrationCycle: data.calibrationCycle,
    scrapYear: data.scrapYear,
    location: data.location,
    ip: data.ip,
    remark: data.remark,
    protocolType: data.protocolType,
    gatewayId: data.gatewayId,
    status: data.status,
  };
  if (data.unitId !== undefined && data.unitId !== null && data.unitId !== '') {
    base.unitId = data.unitId;
  }
  if (data.lifecycleStatus !== undefined && data.lifecycleStatus !== null) {
    base.lifecycleStatus = data.lifecycleStatus;
  }
  return base;
}

export const archiveService = {
  async list(params: QueryParams) {
    const q: QueryParams = { ...params };
    if ((q as any).archive_status) {
      const mapOld: Record<string, string> = {
        draft: '0',
        unallocated: '1',
        allocated: '3',
        accessed: '2',
        scrapped: '5',
      };
      const v = String((q as any).archive_status);
      if (mapOld[v]) (q as any).lifecycleStatus = mapOld[v];
      delete (q as any).archive_status;
    }
    const deviceRes = await deviceService.list(q);
    if (deviceRes.code !== 200 || !deviceRes.data?.list) return deviceRes as any;
    const list = ((deviceRes.data.list as any[]) || []).map(mapBackendDeviceToDevice);
    return {
      ...deviceRes,
      data: {
        ...deviceRes.data,
        list,
      },
    };
  },
  create: async (data: Partial<Device>) => {
    const payload = mapDeviceToBackend(data) as Record<string, unknown>;
    payload.onlineStatus = 'offline';
    payload.lifecycleStatus = 0;
    return deviceService.create(payload as any);
  },
  update: async (id: string, data: Partial<Device>) => {
    const payload = mapDeviceToBackend(data);
    return deviceService.update(id, payload as any);
  },
  delete: async (id: string) => deviceService.delete(id),
};

export const FIELDS = [
  { key: 'name', label: '设备名称', type: 'text' as const, required: true },
  { key: 'type', label: '设备类型', type: 'select' as const, required: true, options: [
    { label: '报警主机', value: 'host' },
    { label: '探测器', value: 'detector' },
    { label: '手报', value: 'button' },
    { label: '消防泵', value: 'pump' },
    { label: '风机', value: 'fan' },
    { label: '监控器', value: 'monitor' },
    { label: '传感器', value: 'sensor' },
    { label: '报警器', value: 'alarm' },
    { label: '控制器', value: 'controller' },
    { label: '电梯', value: 'elevator' },
    { label: '广播', value: 'broadcast' },
    { label: '摄像头', value: 'camera' },
    { label: 'GB28181摄像头', value: 'gb28181-camera' },
    { label: '火灾报警控制器', value: 'fire-controller' },
    { label: '水源监测', value: 'water' },
    { label: '电气火灾', value: 'electrical' },
    { label: '防排烟', value: 'smoke-exhaust' },
    { label: '应急照明', value: 'lighting' },
    { label: 'IoT传感器', value: 'iot-sensor' },
    { label: '电气监测', value: 'elec-monitor' },
    { label: '压力传感器', value: 'pressure-sensor' },
    { label: '风机控制', value: 'fan-controller' },
    { label: '液位传感器', value: 'level-sensor' },
    { label: '用户信息传输装置', value: 'user-transmission-device' },
  ]},
  { key: 'protocolType', label: '协议类型', type: 'select' as const, options: [
    { label: '标准协议', value: 'standard' },
    { label: 'GB26875', value: 'gb26875' },
    { label: '赋安FSCN8001', value: 'fscn8001' },
  ]},
  { key: 'gatewayId', label: '关联网关/传输装置(SN)', type: 'text' as const, placeholder: '填写关联的FSCN8001传输装置序列号' },
  { key: 'manufacturer', label: '生产厂家', type: 'text' as const },
  { key: 'model', label: '设备型号', type: 'text' as const },
  { key: 'serialNo', label: '出厂序列号(SN)', type: 'text' as const, required: true },
  { key: 'productionDate', label: '生产日期', type: 'date' as const },
  { key: 'installDate', label: '安装日期', type: 'date' as const },
  { key: 'warrantyPeriod', label: '质保期(月)', type: 'number' as const },
  { key: 'warrantyExpire', label: '质保到期日', type: 'date' as const },
  { key: 'maintenanceExpire', label: '维保到期日', type: 'date' as const },
  { key: 'calibrationCycle', label: '校准周期(月)', type: 'number' as const },
  { key: 'scrapYear', label: '报废年限(年)', type: 'number' as const },
  { key: 'location', label: '安装位置', type: 'text' as const },
  { key: 'ip', label: 'IP地址', type: 'text' as const },
  { key: 'remark', label: '备注', type: 'textarea' as const },
];

export const FILTER_FIELDS = [
  {
    key: 'type',
    label: '设备类型',
    options: [
      { label: '报警主机', value: 'host' },
      { label: '探测器', value: 'detector' },
      { label: '手报', value: 'button' },
      { label: '消防泵', value: 'pump' },
      { label: '风机', value: 'fan' },
      { label: '监控器', value: 'monitor' },
      { label: '传感器', value: 'sensor' },
      { label: '报警器', value: 'alarm' },
      { label: '控制器', value: 'controller' },
      { label: '电梯', value: 'elevator' },
      { label: '广播', value: 'broadcast' },
      { label: '摄像头', value: 'camera' },
      { label: 'GB28181摄像头', value: 'gb28181-camera' },
      { label: '火灾报警控制器', value: 'fire-controller' },
      { label: '水源监测', value: 'water' },
      { label: '电气火灾', value: 'electrical' },
      { label: '防排烟', value: 'smoke-exhaust' },
      { label: '应急照明', value: 'lighting' },
      { label: 'IoT传感器', value: 'iot-sensor' },
      { label: '电气监测', value: 'elec-monitor' },
      { label: '压力传感器', value: 'pressure-sensor' },
      { label: '风机控制', value: 'fan-controller' },
      { label: '液位传感器', value: 'level-sensor' },
      { label: '用户信息传输装置', value: 'user-transmission-device' },
    ],
  },
  {
    key: 'lifecycleStatus',
    label: '流程状态',
    options: [
      { label: '草稿', value: '0' },
      { label: '已入库', value: '1' },
      { label: '已接入', value: '2' },
      { label: '已分配', value: '3' },
      { label: '维护中', value: '4' },
      { label: '报废', value: '5' },
    ],
  },
  {
    key: 'onlineStatus',
    label: '在线状态',
    options: [
      { label: '在线', value: 'online' },
      { label: '离线', value: 'offline' },
    ],
  },
];
