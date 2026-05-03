import PageTemplate from '@/sections/PageTemplate';
import { deviceService, iotService, gb28181Service, cameraService } from '@/api/services';
import { Cpu } from 'lucide-react';
import type { QueryParams, Device, IoTDevice, GB28181Device, Camera } from '@/types/db';

const typeMap: Record<string, string> = {
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

const statusMap: Record<string, string> = {
  normal: '正常',
  fault: '故障',
  maintenance: '维护',
  offline: '离线',
  disabled: '禁用',
};

const archiveStatusMap: Record<string, string> = {
  unallocated: '未分配',
  allocated: '已分配',
  accessed: '已接入',
  scrapped: '报废',
};

const archiveStatusColorMap: Record<string, string> = {
  unallocated: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
  allocated: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  accessed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  scrapped: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const onlineStatusMap: Record<string, string> = {
  online: '在线',
  offline: '离线',
  unknown: '未知',
};

const typeColorMap: Record<string, string> = {
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

const statusColorMap: Record<string, string> = {
  normal: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  fault: 'text-red-400 bg-red-500/10 border-red-500/20',
  maintenance: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  offline: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  disabled: 'text-slate-500 bg-slate-600/10 border-slate-600/20',
};

const onlineStatusColorMap: Record<string, string> = {
  online: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  offline: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  unknown: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const COLUMNS = [
  { key: 'id', label: '设备编码', width: '120px' },
  { key: 'name', label: '设备名称', width: '180px' },
  { key: 'type', label: '设备类型', width: '120px', render: (v: unknown) => {
    const type = String(v);
    const label = typeMap[type] || type;
    const style = typeColorMap[type] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
  }},
  { key: 'archiveStatus', label: '档案状态', width: '90px', render: (v: unknown) => {
    const status = String(v);
    const label = archiveStatusMap[status] || status;
    const style = archiveStatusColorMap[status] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
  }},
  { key: 'unitName', label: '所属单位', width: '160px' },
  { key: 'location', label: '安装位置', width: '130px' },
  { key: 'ip', label: 'IP地址', width: '110px' },
  { key: 'status', label: '运行状态', width: '80px', render: (v: unknown) => {
    const status = String(v);
    const label = statusMap[status] || status;
    const style = statusColorMap[status] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
  }},
  { key: 'onlineStatus', label: '在线状态', width: '80px', render: (v: unknown) => {
    const s = String(v);
    const label = onlineStatusMap[s] || s;
    const style = onlineStatusColorMap[s] || 'text-slate-300 bg-slate-500/10 border-slate-500/20';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style}`}>{label}</span>;
  }},
];

const FIELDS = [
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
  { key: 'gatewayId', label: '传输装置ID', type: 'text' as const },
  { key: 'manufacturer', label: '生产厂家', type: 'text' as const },
  { key: 'model', label: '设备型号', type: 'text' as const },
  { key: 'serialNo', label: '出厂序列号', type: 'text' as const },
  { key: 'calibrationCycle', label: '校准周期(月)', type: 'number' as const },
  { key: 'scrapYear', label: '报废年限(年)', type: 'number' as const },
  { key: 'location', label: '安装位置', type: 'text' as const },
  { key: 'ip', label: 'IP地址', type: 'text' as const },
  { key: 'remark', label: '备注', type: 'textarea' as const },
];

const FILTER_FIELDS = [
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
    key: 'archive_status',
    label: '档案状态',
    options: [
      { label: '未分配', value: 'unallocated' },
      { label: '已分配', value: 'allocated' },
      { label: '已接入', value: 'accessed' },
      { label: '报废', value: 'scrapped' },
    ],
  },
];

function mapIoTToDevice(d: IoTDevice): Device {
  return {
    id: d.id,
    name: d.name,
    type: d.category,
    unitId: d.unitId,
    unitName: d.unitName,
    location: `${d.floor}${d.room ? '/' + d.room : ''}`,
    status: d.status,
    onlineStatus: d.onlineStatus,
    manufacturer: d.manufacturer,
    model: d.model,
    firmware: d.firmware,
    ip: d.ip,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  } as Device;
}

function mapGbToDevice(d: GB28181Device): Device {
  return {
    id: d.id,
    name: d.name,
    type: 'gb28181-camera',
    unitId: d.unitId,
    unitName: d.unitName,
    location: d.location,
    status: d.status === 'online' ? 'normal' : d.status === 'fault' ? 'fault' : 'offline',
    onlineStatus: d.status === 'online' ? 'online' : 'offline',
    manufacturer: d.manufacturer,
    model: d.model,
    firmware: d.firmware,
    ip: d.ip,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  } as Device;
}

function mapCamToDevice(d: Camera): Device {
  return {
    id: d.id,
    name: d.name,
    type: 'camera',
    unitId: d.unitId,
    unitName: d.unitName,
    location: d.location,
    status: d.status,
    onlineStatus: d.onlineStatus,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  } as Device;
}

/* ── IoT 类型双向同步 ── */
const IOT_CATEGORIES = new Set([
  'fire-controller', 'detector', 'water', 'electrical', 'smoke-exhaust',
  'lighting', 'broadcast', 'iot-sensor', 'elec-monitor', 'pressure-sensor',
  'fan-controller', 'level-sensor', 'user-transmission-device',
]);

function isIoTCategory(type?: string): boolean {
  return !!type && IOT_CATEGORIES.has(type);
}

function mapDeviceToIoT(d: Device): IoTDevice {
  const [floor, room] = (d.location || '').includes('/')
    ? d.location!.split('/')
    : ['', d.location || ''];
  const protoMap: Record<string, string> = {
    'fire-controller': 'Modbus TCP',
    'detector': 'MQTT',
    'water': 'Modbus TCP',
    'electrical': 'Modbus TCP',
    'smoke-exhaust': 'Modbus TCP',
    'lighting': 'TCP透传',
    'broadcast': 'TCP透传',
    'iot-sensor': 'MQTT',
    'elec-monitor': 'Modbus TCP',
    'pressure-sensor': 'MQTT',
    'fan-controller': 'Modbus RTU',
    'level-sensor': 'MQTT',
    'user-transmission-device': 'GB26875.1-2011',
  };
  const portMap: Record<string, number | undefined> = {
    'fire-controller': 502,
    'detector': undefined,
    'water': 502,
    'electrical': 502,
    'smoke-exhaust': 502,
    'lighting': undefined,
    'broadcast': undefined,
    'iot-sensor': undefined,
    'elec-monitor': 502,
    'pressure-sensor': undefined,
    'fan-controller': 503,
    'level-sensor': undefined,
    'user-transmission-device': 5200,
  };
  return {
    id: d.id,
    name: d.name || '',
    category: d.type as IoTDevice['category'],
    protocol: protoMap[d.type || ''] || 'Modbus TCP',
    ip: d.ip,
    port: portMap[d.type || ''],
    unitId: d.unitId || '',
    unitName: d.unitName || '',
    floor: floor || '1F',
    room: room || undefined,
    onlineStatus: (d.onlineStatus || 'offline') as IoTDevice['onlineStatus'],
    heartbeatInterval: 30,
    registerCount: 0,
    manufacturer: d.manufacturer || '',
    model: d.model || '',
    firmware: d.firmware || '',
    status: (d.status || 'offline') as IoTDevice['status'],
    lastHeartbeat: new Date().toISOString(),
    createdAt: d.createdAt || new Date().toISOString(),
    updatedAt: d.updatedAt || new Date().toISOString(),
  } as IoTDevice;
}

function detectSource(id: string): 'device' | 'iot' | 'gb28181' | 'camera' {
  if (id.startsWith('IOT-')) return 'iot';
  if (id.startsWith('GB-')) return 'gb28181';
  if (id.startsWith('CAM-')) return 'camera';
  // 国标设备编码为20位数字（如34020000001320000001）
  if (/^\d{20}$/.test(id)) return 'gb28181';
  return 'device';
}

/* ── 记录每个ID的真实来源，解决合并去重后的删除路由问题 ── */
let sourceMap = new Map<string, 'device' | 'iot' | 'gb28181' | 'camera'>();

const archiveService = {
  async list(params: QueryParams) {
    const [deviceRes, iotRes, gbRes, camRes] = await Promise.all([
      deviceService.list({ pageSize: 9999 }),
      iotService.list({ pageSize: 9999 }).catch(() => null),
      gb28181Service.list({ pageSize: 9999 }).catch(() => null),
      cameraService.list({ pageSize: 9999 }).catch(() => null),
    ]);

    const devices = ((deviceRes.data as any)?.list || []) as Device[];
    const iotDevices = ((iotRes?.data as any)?.list || []) as IoTDevice[];
    const gbDevices = ((gbRes?.data as any)?.list || []) as GB28181Device[];
    const cameras = ((camRes?.data as any)?.list || []) as Camera[];

    // 重建来源映射（每次列表刷新时重置）
    sourceMap = new Map();
    devices.forEach(d => sourceMap.set(d.id, 'device'));
    iotDevices.forEach(d => sourceMap.set(d.id, 'iot'));
    gbDevices.forEach(d => sourceMap.set(d.id, 'gb28181'));
    cameras.forEach(d => sourceMap.set(d.id, 'camera'));

    const all: Device[] = [
      ...devices,
      ...iotDevices.map(mapIoTToDevice),
      ...gbDevices.map(mapGbToDevice),
      ...cameras.map(mapCamToDevice),
    ];

    // 按ID去重，档案设备优先，但摄像头/国标设备保留自己的type
    const seen = new Map<string, Device>();
    for (const d of all) {
      const existing = seen.get(d.id);
      if (!existing) {
        seen.set(d.id, d);
      } else if (d.type === 'camera' || d.type === 'gb28181-camera') {
        // 摄像头/国标摄像头优先保留，避免被普通设备覆盖导致删错表
        seen.set(d.id, d);
      }
    }
    const deduped = Array.from(seen.values());

    let filtered = deduped;
    if (params.keyword) {
      const q = params.keyword.toLowerCase();
      filtered = filtered.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.id?.toLowerCase().includes(q) ||
        d.unitName?.toLowerCase().includes(q)
      );
    }
    if (params.type) {
      filtered = filtered.filter(d => d.type === params.type);
    }

    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 10;
    const total = filtered.length;
    const start = (page - 1) * pageSize;

    return {
      code: 200,
      message: 'success',
      data: {
        list: filtered.slice(start, start + pageSize),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }
    };
  },
  create: async (data: Partial<Device>) => {
    const deviceId = data.id || `DEV-${Date.now()}`;
    // 核心约束：创建设备档案时禁止绑定单位，后端自动生成 id 和 code
    const payload = {
      ...data,
      id: deviceId,
      onlineStatus: data.onlineStatus || 'offline',
      unitId: '',
      unitName: '',
    };
    // IoT类型设备：同步创建档案 + IoT记录
    if (isIoTCategory(data.type)) {
      const iotData = mapDeviceToIoT({ ...payload, unitId: '', unitName: '' } as Device);
      const [deviceRes] = await Promise.all([
        deviceService.create(payload as any),
        iotService.create(iotData as any),
      ]);
      return deviceRes;
    }
    // 摄像头类型：同步创建档案 + 摄像头记录
    if (data.type === 'camera') {
      const camData = {
        id: deviceId,
        name: data.name || deviceId,
        unitId: '',
        unitName: '',
        location: data.location || '',
        type: 'indoor',
        status: data.status || 'normal',
        onlineStatus: data.onlineStatus || 'offline',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const [deviceRes] = await Promise.all([
        deviceService.create(payload as any),
        cameraService.create(camData as any),
      ]);
      return deviceRes;
    }
    return deviceService.create(payload as any);
  },
  update: async (id: string, data: Partial<Device>) => {
    const source = detectSource(id);
    // IoT来源设备：同步更新IoT记录与设备档案
    if (source === 'iot') {
      const iotData = mapDeviceToIoT({ ...data, id } as Device);
      const [iotRes] = await Promise.all([
        iotService.update(id, iotData as any),
        deviceService.update(id, data).catch(() => null),
      ]);
      return iotRes;
    }
    if (source === 'camera') return cameraService.update(id, data as any);
    if (source === 'gb28181') {
      // GB28181 设备在 WVP 模式下无法直接修改，同步更新到 devices 档案表
      const deviceData = {
        ...data,
        deviceName: data.name,
        deviceType: data.type,
        ipAddress: data.ip,
      };
      const res = await deviceService.update(id, deviceData as any).catch(async () => {
        // 如果 devices 表中没有该设备，尝试创建
        return deviceService.create({ ...deviceData, id } as any);
      });
      return res || { code: 200, message: 'success', data: null };
    }
    // 普通设备更新
    const res = await deviceService.update(id, data);
    // 若类型变为IoT，需创建/更新IoT记录
    if (isIoTCategory(data.type)) {
      const existingIoT = await iotService.get(id);
      const iotData = mapDeviceToIoT({ ...data, id } as Device);
      if (!existingIoT.data) {
        await iotService.create(iotData as any).catch(() => null);
      } else {
        await iotService.update(id, iotData as any).catch(() => null);
      }
    }
    // 若类型从IoT变为非IoT，清理IoT记录
    if (data.type && !isIoTCategory(data.type)) {
      await iotService.delete(id).catch(() => {});
    }
    return res;
  },
  delete: async (id: string) => {
    const source = sourceMap.get(id) || detectSource(id);
    // IoT来源设备：同步删除IoT记录与设备档案
    if (source === 'iot') {
      const [iotRes] = await Promise.all([
        iotService.delete(id),
        deviceService.delete(id).catch(() => null),
      ]);
      return iotRes;
    }
    if (source === 'gb28181') {
      // 同步删除GB28181记录与设备档案
      const [gbRes] = await Promise.all([
        gb28181Service.delete(id),
        deviceService.delete(id).catch(() => null),
      ]);
      return gbRes;
    }
    if (source === 'camera') {
      // 同步删除摄像头记录与设备档案（避免DeviceDAO中残留同名记录导致"删不掉"）
      const [camRes] = await Promise.all([
        cameraService.delete(id),
        deviceService.delete(id).catch(() => null),
      ]);
      return camRes;
    }
    // 普通设备删除：若存在关联记录，一并清理
    const existingGb = await gb28181Service.get(id);
    if (existingGb.data) {
      await gb28181Service.delete(id).catch(() => {});
    }
    const existingIoT = await iotService.get(id);
    if (existingIoT.data) {
      await iotService.delete(id).catch(() => {});
    }
    return deviceService.delete(id);
  },
};

export default function DeviceArchivePage() {
  return (
    <PageTemplate
      title="设备档案"
      icon={Cpu}
      columns={COLUMNS}
      service={archiveService as any}
      fields={FIELDS}
      filterFields={FILTER_FIELDS}
      renderExtraActions={(row: any) => {
        if (row.archiveStatus === 'unallocated') {
          return (
            <button
              onClick={() => window.location.href = `/device/allocate?deviceId=${row.id}`}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
              title="去分配"
            >
              去分配
            </button>
          );
        }
        if (row.archiveStatus === 'allocated') {
          return (
            <button
              onClick={() => window.location.href = `/iot/access?deviceId=${row.id}`}
              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
              title="去接入"
            >
              去接入
            </button>
          );
        }
        return null;
      }}
    />
  );
}
