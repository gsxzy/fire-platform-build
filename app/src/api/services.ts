/**
 * ═══════════════════════════════════════════════════════════════════
 * API 服务层 - 各业务模块的API封装
 * 所有服务统一调用 api + 分页辅助，便于后续切换真实后端
 * ═══════════════════════════════════════════════════════════════════
 */
import { api as httpApi, legacyRaw, paginatedQuery } from './client';
import type { QueryParams, Unit, Device, Alarm, WorkOrder, MaintRecord, MaintContract, PatrolPlan, PatrolRecord, Hazard, User, Role, Plan, Drill, Inspection, DutySchedule, Document, SystemLog, IoTDevice, Personnel, Camera, DutyShift, DutyHandover, AlarmSnapshot, ControlRoomConfig, GB28181Device, SIPServerConfig, HostDeviceCode } from '@/types/db';
import * as wvp from '@/services/wvpService';
import * as videoApi from './videoService';

const WVP_ENABLED = import.meta.env.VITE_WVP_ENABLED === 'true';

/* ───── WVP 模式下本地预配置设备存储 ───── */
async function saveLocalDevice(data: GB28181Device): Promise<void> {
  const { GB28181DeviceDAO } = await import('@/db/Database');
  await GB28181DeviceDAO.create(data);
}

async function deleteLocalDevice(id: string): Promise<void> {
  const { GB28181DeviceDAO } = await import('@/db/Database');
  await GB28181DeviceDAO.delete(id);
}

async function updateLocalDevice(id: string, data: Partial<GB28181Device>): Promise<void> {
  const { GB28181DeviceDAO } = await import('@/db/Database');
  await GB28181DeviceDAO.update(id, data);
}

/* ───── WVP 设备数据映射 ───── */
function mapWvpDeviceToGb(d: wvp.WvpDevice): GB28181Device {
  return {
    id: String(d.id),
    deviceId: d.deviceId,
    name: d.name || d.deviceId,
    manufacturer: d.manufacturer || '',
    model: d.model || '',
    firmware: d.firmware || '',
    ip: d.ip || '',
    port: d.port || 5060,
    transport: (d.transport?.toUpperCase() as 'UDP' | 'TCP') || 'UDP',
    username: d.deviceId,
    password: d.password || '',
    status: d.onLine ? 'online' : 'offline',
    registerTime: d.registerTime || d.createTime || '',
    lastKeepalive: d.keepaliveTime || d.updateTime || '',
    channelCount: d.channelCount || 0,
    channels: [],
    catalogSynced: (d.channelCount || 0) > 0,
    ptzSupport: true,
    unitId: '',
    unitName: '',
    location: d.hostAddress || d.ip || '',
    createdAt: d.createTime || '',
    updatedAt: d.updateTime || '',
  };
}

function channelLooksOnline(status: unknown): boolean {
  if (status === true || status === 1) return true;
  const t = String(status ?? '').trim().toLowerCase();
  return ['on', 'online', 'ok', 'live', 'true', '1'].includes(t);
}

function mapWvpChannelToGb(ch: wvp.WvpDeviceChannel): import('@/types/db').GB28181Channel {
  // WVP 部分版本不返回 channelId，此时用 deviceId 作为通道 ID
  const cid = ch.channelId || ch.deviceId || String(ch.id);
  return {
    channelId: cid,
    name: ch.name || cid,
    status: channelLooksOnline(ch.status) ? 'on' : 'off',
    streamUrl: undefined,
    snapUrl: undefined,
  };
}

const _gbChMax = Number(import.meta.env.VITE_GB28181_MAX_CHANNELS_PER_DEVICE);
const GB28181_MAX_CHANNELS_PER_DEVICE = Math.max(
  4,
  Math.min(64, Number.isFinite(_gbChMax) && _gbChMax > 0 ? _gbChMax : 16),
);

/** WVP 模式下 IndexedDB 预配置记录规整为列表项（与 mapWvpDeviceToGb 字段对齐） */
function enrichLocalGbForList(raw: Partial<GB28181Device> & { id: string }): GB28181Device {
  const st = raw.status as GB28181Device['status'] | undefined;
  const status: GB28181Device['status'] =
    st === 'online' || st === 'offline' || st === 'registering' || st === 'fault' ? st : 'offline';
  return {
    id: raw.id,
    deviceId: raw.deviceId || '',
    name: raw.name || raw.deviceId || '未命名设备',
    manufacturer: raw.manufacturer || '',
    model: raw.model || '',
    firmware: raw.firmware || '',
    ip: raw.ip || '',
    port: Number(raw.port) || 5060,
    transport: raw.transport === 'TCP' ? 'TCP' : 'UDP',
    username: raw.username,
    password: raw.password,
    status,
    registerTime: raw.registerTime || '',
    lastKeepalive: raw.lastKeepalive || '',
    channelCount: raw.channelCount ?? (raw.channels?.length ?? 0),
    channels: Array.isArray(raw.channels) ? raw.channels : [],
    catalogSynced: !!raw.catalogSynced,
    ptzSupport: raw.ptzSupport !== false,
    unitId: raw.unitId || '',
    unitName: raw.unitName,
    location: raw.location || '',
    createdAt: raw.createdAt || '',
    updatedAt: raw.updatedAt || '',
    isLocal: true,
  };
}

/* ═══════ 通用CRUD工厂 ═══════ */
function createService<T extends { id: string }>(endpoint: string) {
  return {
    list: (params: QueryParams = {}) => paginatedQuery<T>(`${endpoint}/list`, params),
    get: (id: string) => httpApi.get<T>(`${endpoint}/${id}`),
    create: (data: Omit<T, 'id'>) => httpApi.post<null>(endpoint, data),
    update: (id: string, data: Partial<T>) => httpApi.put<null>(`${endpoint}/${id}`, data),
    patch: (id: string, data: Partial<T>) => httpApi.patch<null>(`${endpoint}/${id}`, data),
    delete: (id: string) => httpApi.delete<null>(`${endpoint}/${id}`),
  };
}

/* ═══════ 单位服务 ═══════ */
export const unitService = {
  ...createService<Unit>('/units'),
  getDetail: (id: string) => httpApi.get<Unit & { buildings: any[]; personnel: any[]; deviceStats: any }>(`/units/${id}`),
  getStats: (id: string) => httpApi.get<any>(`/units/${id}/stats`),
  getPersonnel: (id: string) => httpApi.get<any[]>(`/units/${id}/personnel`),
  addPersonnel: (id: string, data: any) => httpApi.post<any>(`/units/${id}/personnel`, data),
  deletePersonnel: (id: string, pid: string) => httpApi.delete<any>(`/units/${id}/personnel/${pid}`),
  getOverviewStats: () => httpApi.get<any>('/units/stats/overview'),
};

/* ═══════ 设备服务 ═══════ */
export const deviceService = {
  ...createService<Device>('/devices'),
  /** 设备报废：解除接入与单位归属，档案标记 scrapped（需后端权限） */
  scrap: (id: string) => httpApi.post<null>(`/devices/${id}/scrap`),
  getByUnit: (unitId: string) => httpApi.get<Device[]>(`/devices?unitId=${unitId}`),
  getDetail: (id: string) => httpApi.get<Device & { config: any; maintenance: any[]; alarms: any[] }>(`/devices/${id}`),
  getConfig: (id: string) => httpApi.get<any>(`/devices/${id}/config`),
  saveConfig: (id: string, data: any) => httpApi.put<any>(`/devices/${id}/config`, data),
  getMaintenance: (id: string) => httpApi.get<any[]>(`/devices/${id}/maintenance`),
  addMaintenance: (id: string, data: any) => httpApi.post<any>(`/devices/${id}/maintenance`, data),
  getStats: () => httpApi.get<any>('/devices/stats/overview'),
  batchBind: (data: { deviceIds: string[]; building_id?: string; floor_id?: string; point_id?: string }) =>
    httpApi.post<any>('/devices/batch-bind', data),
};

/* ═══════ 设备配置服务 ═══════ */
export const deviceConfigService = {
  ...createService<any>('/device-configs'),
};

/* ═══════ 设备维护服务（设备管理子模块 fire_device_maintenance） ═══════ */
export const deviceMaintenanceService = {
  ...createService<any>('/device-maintenances'),
  list: (params: QueryParams = {}) => paginatedQuery<any>(`/device-maintenances/list`, params),
  getStats: () =>
    httpApi.get<{ pending: number; overdue: number; completed: number; in_progress: number }>('/device-maintenances/stats'),
};

/* ═══════ 设备分配服务 ═══════ */
export const deviceAllocationService = {
  listUnallocated: (params: QueryParams = {}) => paginatedQuery<any>('/device-allocations/pending', params),
  allocate: (data: { deviceIds: string[]; unit_id: string; building_id?: string; floor_id?: string; point_id?: string; operator?: string; remark?: string }) =>
    httpApi.post<any>('/device-allocations/allocate', data),
  unallocate: (data: { deviceIds: string[]; operator?: string; remark?: string }) =>
    httpApi.post<any>('/device-allocations/unallocate', data),
  reallocate: (data: { deviceId: string; newUnitId: string; building_id?: string; floor_id?: string; point_id?: string; operator?: string; remark?: string }) =>
    httpApi.post<any>('/device-allocations/reallocate', data),
  listLogs: (params: QueryParams = {}) => paginatedQuery<any>('/device-allocations/list', params),
  getUnitDevices: (unitId: string, params?: { archive_status?: string; category?: string }) =>
    httpApi.get<any[]>(`/units/${unitId}/devices`, params),
};

/* ─── 后端 Alarm 数据 → 前端 Alarm 类型映射 ─── */
const ALARM_TYPE_FROM_DB: Record<number, Alarm['type']> = {
  1: 'fire', 2: 'fault', 3: 'warning', 4: 'supervisory', 5: 'test',
};
const ALARM_LEVEL_FROM_DB: Record<number, Alarm['level']> = {
  1: 'normal', 2: 'high', 3: 'urgent',
};
const ALARM_STATUS_FROM_DB: Record<number, Alarm['status']> = {
  0: 'new', 1: 'confirmed', 2: 'handled', 3: 'ignored',
};

function mapAlarmFromBackend(raw: any): Alarm {
  const at = raw.alarm_type ?? raw.alarmType;
  const al = raw.alarm_level ?? raw.alarmLevel;
  const st = raw.status;
  return {
    id: String(raw.id ?? ''),
    alarmNo: raw.alarm_no ?? raw.alarmNo,
    type: typeof at === 'number' ? (ALARM_TYPE_FROM_DB[at] ?? 'warning') : (raw.type || 'warning'),
    level: typeof al === 'number' ? (ALARM_LEVEL_FROM_DB[al] ?? 'normal') : (raw.level || 'normal'),
    deviceId: raw.device_id || raw.deviceId || '',
    deviceName: raw.device_name || raw.deviceName || raw.device_id || raw.deviceId || '未知设备',
    unitId: raw.unit?.id ?? raw.unit_id ?? raw.unitId ?? '',
    unitName: raw.unit?.unit_name ?? raw.unit_name ?? raw.unitName ?? '',
    location: raw.location || '未知位置',
    message: raw.alarm_desc || raw.description || raw.message || raw.desc || '',
    status: typeof st === 'number' ? (ALARM_STATUS_FROM_DB[st] ?? 'new') : (raw.status || 'new'),
    handler: raw.handler_name || raw.handler || raw.resolved_by || '',
    handleTime: raw.handleTime || raw.resolved_at || undefined,
    handleNote: raw.handleNote || raw.notes || undefined,
    snapshotUrl: raw.snapshot_url || raw.snapshotUrl || undefined,
    loopNo: raw.loop_no !== undefined ? raw.loop_no : (raw.loopNo !== undefined ? raw.loopNo : undefined),
    pointNo: raw.point_no !== undefined ? raw.point_no : (raw.pointNo !== undefined ? raw.pointNo : undefined),
    rawFrameHex: raw.raw_frame_hex || raw.rawFrameHex || undefined,
    createdAt: raw.createdAt || raw.start_time || raw.created_at || '',
    updatedAt: raw.updatedAt || raw.updated_at || raw.createdAt || '',
  };
}

/* ═══════ 告警服务 ═══════ */
export const alarmService = {
  ...createService<Alarm>('/alarms'),
  list: async (params: QueryParams = {}) => {
    const mappedParams: QueryParams = { ...params, pageNum: params.page, pageSize: params.pageSize };
    if (params.type) {
      const typeToNum: Record<string, number> = { fire: 1, fault: 2, warning: 3, supervisory: 4, test: 5 };
      mappedParams.alarmType = typeToNum[params.type];
      delete (mappedParams as any).type;
    }
    const res = await paginatedQuery<Alarm>('/alarms/list', mappedParams);
    if (res.code === 200 && res.data?.list) {
      return {
        ...res,
        data: {
          ...res.data,
          list: res.data.list.map(mapAlarmFromBackend),
        },
      };
    }
    return res;
  },
  getStats: () => httpApi.get<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }>('/alarms/stats'),
  recent: async () => {
    const res = await httpApi.get<unknown[]>('/alarms/recent');
    if (res.code === 200 && Array.isArray(res.data)) {
      return { ...res, data: res.data.map(mapAlarmFromBackend) };
    }
    return res;
  },
  confirm: (id: string, handler: string, note?: string, confirmResult?: string) =>
    httpApi.put<null>(`/alarms/${id}/confirm`, { handler, handleTime: new Date().toISOString(), handleNote: note, confirmResult }),
  handle: (id: string, handler: string, note?: string) =>
    httpApi.put<null>(`/alarms/${id}/handle`, { handler, handleTime: new Date().toISOString(), handleNote: note }),
  getDetail: (id: string) => httpApi.get<Alarm & { unitAddress?: string; controlRoom: ControlRoomConfig | null; snapshots: AlarmSnapshot[]; relatedCameras: Camera[] }>(`/alarms/${id}/detail`),
};

/* ═══════ 维保工单服务 ═══════ */
export const workOrderService = {
  list: (params: QueryParams = {}) => paginatedQuery<WorkOrder>('/maintenance/work-orders', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<WorkOrder, 'id'>) => httpApi.post<null>('/maintenance/work-orders', data),
  update: (id: string, data: Partial<WorkOrder>) => httpApi.put<null>(`/maintenance/work-orders/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/maintenance/work-orders/${id}`),
};

/* ═══════ 维保记录服务 ═══════ */
export const maintRecordService = {
  list: (params: QueryParams = {}) => paginatedQuery<MaintRecord>('/maintenance/records', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<MaintRecord, 'id'>) => httpApi.post<null>('/maintenance/records', data),
  update: (id: string, data: Partial<MaintRecord>) => httpApi.put<null>(`/maintenance/records/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/maintenance/records/${id}`),
};

/* ═══════ 维保合同服务 ═══════ */
export const maintContractService = {
  list: (params: QueryParams = {}) => paginatedQuery<MaintContract>('/maintenance/contracts', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<MaintContract, 'id'>) => httpApi.post<null>('/maintenance/contracts', data),
  update: (id: string, data: Partial<MaintContract>) => httpApi.put<null>(`/maintenance/contracts/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/maintenance/contracts/${id}`),
};

/* ═══════ 巡检服务 ═══════ */
export const patrolPlanService = {
  list: (params: QueryParams = {}) => paginatedQuery<PatrolPlan>('/patrol/plans', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<PatrolPlan, 'id'>) => httpApi.post<null>('/patrol/plans', data),
  update: (id: string, data: Partial<PatrolPlan>) => httpApi.put<null>(`/patrol/plans/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/patrol/plans/${id}`),
};
export const patrolRecordService = {
  list: (params: QueryParams = {}) => paginatedQuery<PatrolRecord>('/patrol/records', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<PatrolRecord, 'id'>) => httpApi.post<null>('/patrol/records', data),
  update: (id: string, data: Partial<PatrolRecord>) => httpApi.put<null>(`/patrol/records/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/patrol/records/${id}`),
};

/* ═══════ 隐患服务 ═══════ */
export const hazardService = {
  list: (params: QueryParams = {}) => paginatedQuery<Hazard>('/patrol/hazards', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<Hazard, 'id'>) => httpApi.post<null>('/patrol/hazards', data),
  update: (id: string, data: Partial<Hazard>) => httpApi.put<null>(`/patrol/hazards/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/patrol/hazards/${id}`),
};

/* ═══════ 用户服务 ═══════ */
export const userService = {
  ...createService<User>('/users'),
  login: (username: string, password: string) =>
    httpApi.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', { username, password }),
};

/* ═══════ 角色服务 ═══════ */
export const roleService = {
  list: (params: QueryParams = {}) => paginatedQuery<Role>('/roles', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<Role, 'id'>) => httpApi.post<null>('/roles', data),
  update: (id: string, data: Partial<Role>) => httpApi.put<null>(`/roles/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/roles/${id}`),
};

/* ═══════ 预案服务 ═══════ */
export const planService = {
  list: (params: QueryParams = {}) => paginatedQuery<Plan>('/plans', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<Plan, 'id'>) => httpApi.post<null>('/plans', data),
  update: (id: string, data: Partial<Plan>) => httpApi.put<null>(`/plans/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/plans/${id}`),
};
export const drillService = {
  list: (params: QueryParams = {}) => paginatedQuery<Drill>('/drills', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<Drill, 'id'>) => httpApi.post<null>('/drills', data),
  update: (id: string, data: Partial<Drill>) => httpApi.put<null>(`/drills/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/drills/${id}`),
};

/* ═══════ 检查服务 ═══════ */
export const inspectionService = {
  list: (params: QueryParams = {}) => paginatedQuery<Inspection>('/inspections', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<Inspection, 'id'>) => httpApi.post<null>('/inspections', data),
  update: (id: string, data: Partial<Inspection>) => httpApi.put<null>(`/inspections/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/inspections/${id}`),
};

/* ═══════ 值班服务 ═══════ */
export const dutyService = {
  list: (params: QueryParams = {}) => paginatedQuery<DutySchedule>('/duty/schedules', { ...params, pageNum: params.page, pageSize: params.pageSize }),
  create: (data: Omit<DutySchedule, 'id'>) => httpApi.post<null>('/duty/schedules', data),
  update: (id: string, data: Partial<DutySchedule>) => httpApi.put<null>(`/duty/schedules/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/duty/schedules/${id}`),
};

/* ═══════ 知识库服务 ═══════ */
export const documentService = createService<Document>('/documents');

/** 与后端 `/knowledge`（fire_knowledge_doc）字段对齐 */
export interface KnowledgeDocRow {
  id: string;
  title: string;
  category: string;
  content: string;
  file_url: string;
  tags: string;
  view_count: number;
  status: 'active' | 'inactive';
}

function mapKnowledgeFromApi(raw: any): KnowledgeDocRow {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    category: String(raw.category ?? ''),
    content: String(raw.content ?? ''),
    file_url: String(raw.file_url ?? ''),
    tags: String(raw.tags ?? ''),
    view_count: Number(raw.view_count ?? 0),
    status: Number(raw.status) === 1 ? 'active' : 'inactive',
  };
}

export const knowledgeService = {
  list: async (params: QueryParams = {}) => {
    const pageNum = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const res = await httpApi.get<{
      list: any[];
      total: number;
      pageNum: number;
      pageSize: number;
      pages: number;
    }>('/knowledge', {
      pageNum,
      pageSize,
      ...(params.keyword ? { keyword: String(params.keyword) } : {}),
      ...(params.category ? { category: String(params.category) } : {}),
    });
    if (res.code !== 200 || !res.data) {
      return {
        code: res.code,
        message: (res as { msg?: string; message?: string }).msg ?? (res as { message?: string }).message ?? 'error',
        data: { list: [], total: 0, page: pageNum, pageSize, totalPages: 0 },
        timestamp: Date.now(),
      };
    }
    const d = res.data;
    const list = Array.isArray(d.list) ? d.list.map(mapKnowledgeFromApi) : [];
    const ps = d.pageSize ?? pageSize;
    const denom = ps || 1;
    return {
      code: 200,
      message: 'ok',
      data: {
        list,
        total: d.total ?? list.length,
        page: d.pageNum ?? pageNum,
        pageSize: ps,
        totalPages: d.pages ?? Math.max(1, Math.ceil((d.total ?? 0) / denom)),
      },
      timestamp: Date.now(),
    };
  },
  create: (data: Record<string, unknown>) =>
    httpApi.post('/knowledge', {
      title: data.title,
      category: data.category || '未分类',
      content: data.content || '',
      file_url: data.file_url || '',
      tags: data.tags || '',
      status: data.status === 'active' ? 1 : 0,
    }),
  update: (id: string, data: Record<string, unknown>) => {
    const body: Record<string, unknown> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.category !== undefined) body.category = data.category;
    if (data.content !== undefined) body.content = data.content;
    if (data.file_url !== undefined) body.file_url = data.file_url;
    if (data.tags !== undefined) body.tags = data.tags;
    if (data.status !== undefined) body.status = data.status === 'active' ? 1 : 0;
    return httpApi.put(`/knowledge/${id}`, body);
  },
  delete: (id: string) => httpApi.delete(`/knowledge/${id}`),
};

/* ═══════ 日志服务 ═══════ */
export const logService = createService<SystemLog>('/system-logs');

/* ═══════ IoT设备服务 ═══════
 * 列表走 /iot-devices/list，与后端 IoTController.deviceList 对齐（keyword、protocolType、deviceType、status、unitId）
 */
export const iotService = {
  ...createService<IoTDevice>('/iot-devices'),
  list: (params: QueryParams = {}) => paginatedQuery<IoTDevice>(`/iot-devices/list`, params),
  getStats: () => httpApi.get<{ total: number; online: number; offline: number; fault: number }>('/iot-devices/stats'),
};

/* ═══════ 人员管理服务 ═══════ */
export const personnelService = createService<Personnel>('/personnel');

/* ═══════ 摄像头服务 ═══════ */
export const cameraService = {
  ...createService<Camera>('/cameras'),
  getStreamUrl: (cameraId: string) => httpApi.get<{ cameraId: string; streamUrl: string; rtspUrl?: string; wsFlvUrl?: string; snapshotUrl?: string }>(`/cameras/${cameraId}/stream`),
};

/* ═══════ GB28181国标设备服务 ═══════ */
export const gb28181Service = {
  ...createService<GB28181Device>('/gb28181-devices'),

  list: async (params: QueryParams = {}) => {
    if (WVP_ENABLED) {
      // 通过后端代理调用 WVP-PRO（WVP 不可用时降级为只展示本地预配置）
      let wvpList: GB28181Device[] = [];
      try {
        const resp = await videoApi.getVideoDevices({ page: Number(params.pageNum || 1), count: Number(params.pageSize || 100), query: params.keyword });
        wvpList = (resp.list || []).map((d: any) => mapWvpDeviceToGb({
        id: d.deviceId,
        deviceId: d.deviceId,
        name: d.name || d.deviceId,
        manufacturer: d.manufacturer || '',
        model: d.model || '',
        firmware: d.firmware || '',
        ip: d.ip || '',
        port: d.port || 5060,
        transport: d.transport || 'UDP',
        onLine: d.onLine !== false,
        registerTime: d.registerTime || d.createTime || '',
        keepaliveTime: d.keepaliveTime || d.updateTime || '',
        channelCount: d.channelCount || 0,
        createTime: d.createTime || '',
        updateTime: d.updateTime || '',
      }));
      // 补充通道信息
      for (const d of wvpList) {
        try {
          const chResp = await videoApi.getDeviceChannels(d.deviceId, { count: 999 });
          const rawList = chResp.list || [];
          const seenCh = new Set<string>();
          const channels = rawList
            .map((ch: any) => mapWvpChannelToGb({
              id: ch.id || 0,
              channelId: ch.channelId || ch.deviceId || String(ch.id),
              name: ch.name || ch.channelId || '',
              deviceId: ch.deviceId,
              status: ch.status,
            }))
            .filter((ch) => {
              const k = String(ch.channelId);
              if (!k || seenCh.has(k)) return false;
              seenCh.add(k);
              return true;
            });
          channels.sort((a, b) => String(a.channelId).localeCompare(String(b.channelId), 'en'));
          d.channels = channels.slice(0, GB28181_MAX_CHANNELS_PER_DEVICE);
          d.channelCount = d.channels.length;
          d.catalogSynced = d.channels.length > 0;
        } catch { /* ignore */ }
      }
      } catch { /* WVP 不可用时降级为空列表，仍展示本地预配置 */ }

      /* 预配置写在 IndexedDB，列表不能只拉 WVP，否则「添加成功」后界面为空 */
      const wvpDeviceIds = new Set(wvpList.map(d => d.deviceId).filter(Boolean));
      let merged: GB28181Device[] = [...wvpList];
      try {
        const { GB28181DeviceDAO } = await import('@/db/Database');
        const locals = await GB28181DeviceDAO.getAll();
        for (const row of locals) {
          const did = row.deviceId;
          if (did && wvpDeviceIds.has(did)) continue;
          merged.push(enrichLocalGbForList(row));
        }
      } catch {
        /* IndexedDB 不可用时仍展示 WVP 列表 */
      }

      const kw = (params.keyword || '').trim();
      if (kw) {
        merged = merged.filter(
          d => d.name.includes(kw) || d.deviceId.includes(kw) || d.id.includes(kw),
        );
      }

      return {
        code: 200,
        message: 'success',
        data: {
          total: merged.length,
          list: merged,
          pageNum: params.pageNum || 1,
          pageSize: params.pageSize || 100,
        },
      };
    }
    return paginatedQuery<GB28181Device>('/gb28181-devices/list', params);
  },

  get: async (id: string) => {
    if (WVP_ENABLED) {
      const { GB28181DeviceDAO } = await import('@/db/Database');
      const local = await GB28181DeviceDAO.getById(id);
      if (local) {
        return { code: 200, message: 'success', data: enrichLocalGbForList(local as GB28181Device & { id: string }) };
      }
      const devices = (await gb28181Service.list({ pageSize: 2000 })).data?.list || [];
      const found = devices.find(d => d.id === id || d.deviceId === id);
      return { code: 200, message: 'success', data: found || null };
    }
    return httpApi.get<GB28181Device>(`/gb28181-devices/${id}`);
  },

  create: async (data: Omit<GB28181Device, 'id'>) => {
    if (WVP_ENABLED) {
      const incoming = data as GB28181Device & { id?: string };
      const id = incoming.id || `local-${Date.now()}`;
      const localDev: GB28181Device = {
        ...incoming,
        id,
        channels: incoming.channels ?? [],
        catalogSynced: incoming.catalogSynced ?? false,
        registerTime: incoming.registerTime || '',
        lastKeepalive: incoming.lastKeepalive || '',
        isLocal: true,
      };
      await saveLocalDevice(localDev);
      return { code: 200, message: 'success', data: null };
    }
    return httpApi.post<null>('/gb28181-devices', data);
  },

  update: async (id: string, data: Partial<GB28181Device>) => {
    if (WVP_ENABLED) {
      await updateLocalDevice(id, data);
      return { code: 200, message: 'success', data: null };
    }
    return httpApi.put<null>(`/gb28181-devices/${id}`, data);
  },

  delete: async (id: string) => {
    if (WVP_ENABLED) {
      await deleteLocalDevice(id);
      return { code: 200, message: 'success', data: null };
    }
    return httpApi.delete<null>(`/gb28181-devices/${id}`);
  },

  syncCatalog: (deviceId: string) => {
    if (WVP_ENABLED) {
      return Promise.resolve({ code: 200, message: 'success', data: null as any });
    }
    return httpApi.post<GB28181Device>(`/gb28181-devices/${deviceId}/sync-catalog`, {});
  },

  getStreamUrl: async (deviceId: string, channelId: string) => {
    if (WVP_ENABLED) {
      let stream: Awaited<ReturnType<typeof videoApi.getStream>> | null = null;
      try {
        stream = await videoApi.getStream(deviceId, channelId);
      } catch {
        stream = null;
      }
      const u = (s: string | undefined) => (s && String(s).trim()) || '';
      if (!stream || typeof stream !== 'object') {
        return { code: 200, message: 'success', data: { deviceId, channelId, streamUrl: '', snapUrl: undefined } };
      }
      const streamUrl =
        u(stream.streamUrl) ||
        u(stream.httpsHls) ||
        u(stream.hls) ||
        u(stream.httpsFlv) ||
        u(stream.flv) ||
        u(stream.wsFlv);
      return {
        code: 200, message: 'success',
        data: { deviceId, channelId, streamUrl, snapUrl: u(stream.wsFlv) || undefined },
      };
    }
    return httpApi.get<{ deviceId: string; channelId: string; streamUrl: string; snapUrl?: string }>(`/gb28181-devices/${deviceId}/channels/${channelId}/stream`);
  },

  ptzControl: async (deviceId: string, channelId: string, cmd: string, speed?: number) => {
    if (WVP_ENABLED) {
      await videoApi.ptzControl(deviceId, channelId, cmd as any, speed);
      return { code: 200, message: 'success', data: null };
    }
    return httpApi.post<null>(`/gb28181-devices/${deviceId}/channels/${channelId}/ptz`, { cmd, speed: speed ?? 50 });
  },

  getPlaybackList: async (deviceId: string, channelId: string, startTime: string, endTime: string) => {
    if (WVP_ENABLED) {
      const stream = await videoApi.getPlayback(deviceId, channelId, startTime, endTime);
      return { code: 200, message: 'success', data: [stream] };
    }
    return httpApi.get<any[]>(`/gb28181-devices/${deviceId}/channels/${channelId}/playback?start=${startTime}&end=${endTime}`);
  },
};

/* ═══════ SIP服务器配置服务 ═══════ */
export const sipServerService = {
  ...createService<SIPServerConfig>('/sip-server-configs'),
  getStatus: () => httpApi.get<{ running: boolean; port: number; transport: string; registered: number; max: number }>('/sip-server/status'),
  start: () => httpApi.post<null>('/sip-server/start', {}),
  stop: () => httpApi.post<null>('/sip-server/stop', {}),
};

/* ═══════ 值班班次服务 ═══════ */
export const dutyShiftService = createService<DutyShift>('/duty-shifts');

/* ═══════ 交接班服务 ═══════ */
export const dutyHandoverService = createService<DutyHandover>('/duty-handovers');

/* ═══════ 报警主机编码表服务 ═══════ */
export const hostDeviceCodeService = {
  list: (params: QueryParams = {}) => paginatedQuery<HostDeviceCode>('/control-rooms/host-device-codes', params),
  create: (data: Omit<HostDeviceCode, 'id'>) => httpApi.post<null>('/control-rooms/host-device-codes', data),
  update: (id: string, data: Partial<HostDeviceCode>) => httpApi.put<null>(`/control-rooms/host-device-codes/${id}`, data),
  delete: (id: string) => httpApi.delete<null>(`/control-rooms/host-device-codes/${id}`),
  import: (hostId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('hostId', hostId);
    return httpApi.post<null>('/control-rooms/host-device-codes/import', form);
  },
};

/* ═══════ 消控室配置服务 ═══════ */
export const controlRoomConfigService = {
  ...createService<ControlRoomConfig>('/control-room-configs'),
  getByUnit: (unitId: string) => httpApi.get<ControlRoomConfig | null>(`/control-rooms/config/${unitId}`),
  listAll: () => httpApi.get<ControlRoomConfig[]>('/control-rooms/config'),
};

/* ═══════════════════════════════════════════════════════════════════
   旧体系兼容 API 对象（deprecated：新代码请使用上方独立服务）
   ═══════════════════════════════════════════════════════════════════ */

export const legacyApi = {
  // 通用 HTTP 方法（兼容旧页面直接调用 api.get/post/delete）
  get: legacyRaw.get,
  post: legacyRaw.post,
  put: legacyRaw.put,
  patch: legacyRaw.patch,
  delete: legacyRaw.delete,

  // === 认证 ===
  login: (username: string, password: string) =>
    legacyRaw.post<{ accessToken: string; refreshToken: string; user: unknown }>('/auth/login', { username, password }),
  register: (username: string, password: string, realName?: string, phone?: string) =>
    legacyRaw.post('/auth/register', { username, password, realName, phone }),
  profile: () => legacyRaw.get('/auth/profile'),
  updateProfile: (data: unknown) => legacyRaw.put('/auth/profile', data),
  changePassword: (oldPassword: string, newPassword: string) => legacyRaw.put('/auth/password', { oldPassword, newPassword }),

  // === 用户 ===
  userList: (params?: Record<string, unknown>) => legacyRaw.get('/users', params),
  createUser: (data: unknown) => legacyRaw.post('/users', data),
  updateUser: (id: number, data: unknown) => legacyRaw.put(`/users/${id}`, data),
  deleteUser: (id: number) => legacyRaw.delete(`/users/${id}`),
  resetPassword: (id: number) => legacyRaw.put(`/users/${id}/reset-password`, {}),

  // === 角色 ===
  roleList: () => legacyRaw.get('/roles'),
  createRole: (data: unknown) => legacyRaw.post('/roles', data),
  updateRole: (id: number, data: unknown) => legacyRaw.put(`/roles/${id}`, data),
  deleteRole: (id: number) => legacyRaw.delete(`/roles/${id}`),
  permList: () => legacyRaw.get('/permissions'),

  // === 部门 ===
  deptList: () => legacyRaw.get('/departments'),
  createDept: (data: unknown) => legacyRaw.post('/departments', data),
  updateDept: (id: number, data: unknown) => legacyRaw.put(`/departments/${id}`, data),
  deleteDept: (id: number) => legacyRaw.delete(`/departments/${id}`),

  // === 单位 ===
  unitList: (params?: Record<string, unknown>) => legacyRaw.get('/units/list', params),
  createUnit: (data: unknown) => legacyRaw.post('/units', data),
  updateUnit: (id: number, data: unknown) => legacyRaw.put(`/units/${id}`, data),
  deleteUnit: (id: number) => legacyRaw.delete(`/units/${id}`),
  unitStats: () => legacyRaw.get('/units/stats'),

  // === 设备 ===
  deviceList: (params?: Record<string, unknown>) => legacyRaw.get('/devices', params),
  createDevice: (data: unknown) => legacyRaw.post('/devices', data),
  updateDevice: (id: number, data: unknown) => legacyRaw.put(`/devices/${id}`, data),
  deleteDevice: (id: number) => legacyRaw.delete(`/devices/${id}`),
  deviceStats: () => legacyRaw.get('/devices/stats'),
  deviceTypes: () => legacyRaw.get('/devices/types'),

  // === 告警 ===
  alarmList: (params?: Record<string, unknown>) => legacyRaw.get('/alarms', params),
  alarmStats: () => legacyRaw.get('/alarms/stats'),
  alarmRecent: () => legacyRaw.get('/alarms/recent'),
  alarmTrend: (days?: number) => legacyRaw.get('/alarms/trend', { days }),
  confirmAlarm: (id: number) => legacyRaw.put(`/alarms/${id}/confirm`, {}),
  handleAlarm: (id: number, result: string) => legacyRaw.put(`/alarms/${id}/handle`, { handleResult: result }),
  dismissAlarm: (id: number) => legacyRaw.put(`/alarms/${id}/dismiss`, {}),

  // === 维保 ===
  maintCompanyList: (params?: Record<string, unknown>) => legacyRaw.get('/maintenance/companies', params),
  createMaintCompany: (data: unknown) => legacyRaw.post('/maintenance/companies', data),
  updateMaintCompany: (id: number, data: unknown) => legacyRaw.put(`/maintenance/companies/${id}`, data),
  deleteMaintCompany: (id: number) => legacyRaw.delete(`/maintenance/companies/${id}`),
  workOrderList: (params?: Record<string, unknown>) => legacyRaw.get('/maintenance/work-orders', params),
  createWorkOrder: (data: unknown) => legacyRaw.post('/maintenance/work-orders', data),
  updateWorkOrder: (id: number, data: unknown) => legacyRaw.put(`/maintenance/work-orders/${id}`, data),
  deleteWorkOrder: (id: number) => legacyRaw.delete(`/maintenance/work-orders/${id}`),
  assignWorkOrder: (id: number, data: unknown) => legacyRaw.put(`/maintenance/work-orders/${id}/assign`, data),
  completeWorkOrder: (id: number, data: unknown) => legacyRaw.put(`/maintenance/work-orders/${id}/complete`, data),
  maintStats: () => legacyRaw.get('/maintenance/stats'),

  // === 巡检 ===
  patrolPlanList: (params?: Record<string, unknown>) => legacyRaw.get('/patrol/plans', params),
  createPatrolPlan: (data: unknown) => legacyRaw.post('/patrol/plans', data),
  updatePatrolPlan: (id: number, data: unknown) => legacyRaw.put(`/patrol/plans/${id}`, data),
  deletePatrolPlan: (id: number) => legacyRaw.delete(`/patrol/plans/${id}`),
  patrolRecordList: (params?: Record<string, unknown>) => legacyRaw.get('/patrol/records', params),
  createPatrolRecord: (data: unknown) => legacyRaw.post('/patrol/records', data),
  hazardList: (params?: Record<string, unknown>) => legacyRaw.get('/patrol/hazards', params),
  createHazard: (data: unknown) => legacyRaw.post('/patrol/hazards', data),
  updateHazard: (id: number, data: unknown) => legacyRaw.put(`/patrol/hazards/${id}`, data),
  rectifyHazard: (id: number) => legacyRaw.put(`/patrol/hazards/${id}/rectify`, {}),

  // === 消控室 ===
  getControlRooms: (params?: Record<string, unknown>) => legacyRaw.get('/control-rooms', params),
  getControlRoomDetail: (id: number | string) => legacyRaw.get(`/control-rooms/${id}`),
  createControlRoom: (data: unknown) => legacyRaw.post('/control-rooms', data),
  updateControlRoom: (id: number | string, data: unknown) => legacyRaw.put(`/control-rooms/${id}`, data),
  deleteControlRoom: (id: number | string) => legacyRaw.delete(`/control-rooms/${id}`),
  getControlRoomHosts: (roomId?: number | string) => legacyRaw.get('/control-rooms/hosts', roomId !== undefined ? { roomId } : undefined),
  getControlRoomHostDetail: (id: number) => legacyRaw.get(`/control-rooms/hosts/${id}`),
  createControlRoomHost: (data: unknown) => legacyRaw.post('/control-rooms/hosts', data),
  updateControlRoomHost: (id: number, data: unknown) => legacyRaw.put(`/control-rooms/hosts/${id}`, data),
  deleteControlRoomHost: (id: number) => legacyRaw.delete(`/control-rooms/hosts/${id}`),
  silenceHost: (hostId: number) => legacyRaw.post('/control-rooms/silence', { hostId }),
  resetHost: (hostId: number) => legacyRaw.post('/control-rooms/reset', { hostId }),
  switchHostMode: (hostId: number, mode: 'manual' | 'auto') => legacyRaw.post('/control-rooms/mode', { hostId, mode }),
  controlMultiline: (hostId: number, pointId: number, action: 'start' | 'stop') => legacyRaw.post('/control-rooms/multiline/control', { hostId, pointId, action }),
  controlBus: (hostId: number, pointId: number, action: 'start' | 'stop') => legacyRaw.post('/control-rooms/bus/control', { hostId, pointId, action }),
  getMultilinePanels: (hostId?: number | string) => legacyRaw.get('/control-rooms/multiline', hostId !== undefined ? { hostId } : undefined),
  createMultilinePanel: (data: unknown) => legacyRaw.post('/control-rooms/multiline', data),
  updateMultilinePanel: (id: number, data: unknown) => legacyRaw.put(`/control-rooms/multiline/${id}`, data),
  getBusPoints: (hostId?: number | string, loopNo?: number) => legacyRaw.get('/control-rooms/bus-points', { hostId, loopNo }),
  createBusPoint: (data: unknown) => legacyRaw.post('/control-rooms/bus-points', data),
  updateBusPoint: (id: number, data: unknown) => legacyRaw.put(`/control-rooms/bus-points/${id}`, data),
  getHostCommandLogs: (params?: Record<string, unknown>) => legacyRaw.get('/control-rooms/command-logs', params),
  getRealtimeStatus: (roomId?: number | string, hostId?: number) => legacyRaw.get('/control-rooms/realtime', { roomId, hostId }),
  getShields: (roomId?: number | string, hostId?: number) => legacyRaw.get('/control-rooms/shields', { roomId, hostId }),
  getVideos: (roomId?: number | string) => legacyRaw.get('/control-rooms/videos', { roomId }),
  getHostDeviceCodes: (params?: Record<string, unknown>) => legacyRaw.get('/control-rooms/host-device-codes', params),
  createHostDeviceCode: (data: unknown) => legacyRaw.post('/control-rooms/host-device-codes', data),
  updateHostDeviceCode: (id: number, data: unknown) => legacyRaw.put(`/control-rooms/host-device-codes/${id}`, data),
  deleteHostDeviceCode: (id: number) => legacyRaw.delete(`/control-rooms/host-device-codes/${id}`),
  importHostDeviceCodes: (hostId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('hostId', hostId);
    return legacyRaw.post('/control-rooms/host-device-codes/import', form);
  },

  // === 预案 ===
  planList: (params?: Record<string, unknown>) => legacyRaw.get('/plans', params),
  createPlan: (data: unknown) => legacyRaw.post('/plans', data),
  updatePlan: (id: number, data: unknown) => legacyRaw.put(`/plans/${id}`, data),
  deletePlan: (id: number) => legacyRaw.delete(`/plans/${id}`),

  // === 安消联动（fire_linkage_rule）===
  linkageRuleList: (params?: Record<string, unknown>) => legacyRaw.get('/linkage/rules', params),
  createLinkageRule: (data: unknown) => legacyRaw.post('/linkage/rules', data),
  updateLinkageRule: (id: number, data: unknown) => legacyRaw.put(`/linkage/rules/${id}`, data),
  deleteLinkageRule: (id: number) => legacyRaw.delete(`/linkage/rules/${id}`),
  triggerLinkageRule: (id: number) => legacyRaw.post(`/linkage/rules/${id}/trigger`, {}),
  getLinkageRecords: (params?: Record<string, unknown>) => legacyRaw.get('/linkage/records', params),

  drillList: (params?: Record<string, unknown>) => legacyRaw.get('/drills', params),
  createDrill: (data: unknown) => legacyRaw.post('/drills', data),
  updateDrill: (id: number, data: unknown) => legacyRaw.put(`/drills/${id}`, data),
  deleteDrill: (id: number) => legacyRaw.delete(`/drills/${id}`),

  // === 知识库 ===
  knowledgeList: (params?: Record<string, unknown>) => legacyRaw.get('/knowledge', params),
  createKnowledge: (data: unknown) => legacyRaw.post('/knowledge', data),
  updateKnowledge: (id: number, data: unknown) => legacyRaw.put(`/knowledge/${id}`, data),
  deleteKnowledge: (id: number) => legacyRaw.delete(`/knowledge/${id}`),
  knowledgeCategories: () => legacyRaw.get('/knowledge/categories'),

  // === IoT ===
  iotDeviceList: (params?: Record<string, unknown>) => legacyRaw.get('/iot/devices', params),
  createIotDevice: (data: unknown) => legacyRaw.post('/iot/devices', data),
  updateIotDevice: (id: number, data: unknown) => legacyRaw.put(`/iot/devices/${id}`, data),
  deleteIotDevice: (id: number) => legacyRaw.delete(`/iot/devices/${id}`),
  protocolList: () => legacyRaw.get('/iot/protocols'),
  createProtocol: (data: unknown) => legacyRaw.post('/iot/protocols', data),
  updateProtocol: (id: number, data: unknown) => legacyRaw.put(`/iot/protocols/${id}`, data),
  deleteProtocol: (id: number) => legacyRaw.delete(`/iot/protocols/${id}`),
  pipelineList: () => legacyRaw.get('/iot/pipelines'),
  createPipeline: (data: unknown) => legacyRaw.post('/iot/pipelines', data),

  // === AI ===
  aiDecisionList: (params?: Record<string, unknown>) => legacyRaw.get('/ai/decisions', params),
  createAiDecision: (data: unknown) => legacyRaw.post('/ai/decisions', data),
  smartAlertList: (params?: Record<string, unknown>) => legacyRaw.get('/ai/alerts', params),
  alertConfirm: (id: number) => legacyRaw.put(`/ai/alerts/${id}/confirm`, {}),
  alertHandle: (id: number) => legacyRaw.put(`/ai/alerts/${id}/handle`, {}),

  // === 培训 ===
  courseList: (params?: Record<string, unknown>) => legacyRaw.get('/training/courses', params),
  createCourse: (data: unknown) => legacyRaw.post('/training/courses', data),
  updateCourse: (id: number, data: unknown) => legacyRaw.put(`/training/courses/${id}`, data),
  deleteCourse: (id: number) => legacyRaw.delete(`/training/courses/${id}`),
  examList: (params?: Record<string, unknown>) => legacyRaw.get('/training/exams', params),
  createExam: (data: unknown) => legacyRaw.post('/training/exams', data),

  // === 检查 ===
  inspectionList: (params?: Record<string, unknown>) => legacyRaw.get('/inspections', params),
  createInspection: (data: unknown) => legacyRaw.post('/inspections', data),
  updateInspection: (id: number, data: unknown) => legacyRaw.put(`/inspections/${id}`, data),
  deleteInspection: (id: number) => legacyRaw.delete(`/inspections/${id}`),

  // === 系统 ===
  configList: () => legacyRaw.get('/system/config'),
  setConfig: (key: string, value: string) => legacyRaw.post('/system/config', { configKey: key, configValue: value }),
  logList: (params?: Record<string, unknown>) => legacyRaw.get('/system/logs', params),
  notifyTemplateList: () => legacyRaw.get('/system/notify-templates'),
  createNotifyTemplate: (data: unknown) => legacyRaw.post('/system/notify-templates', data),
  updateNotifyTemplate: (id: number, data: unknown) => legacyRaw.put(`/system/notify-templates/${id}`, data),
  deleteNotifyTemplate: (id: number) => legacyRaw.delete(`/system/notify-templates/${id}`),
  screenList: () => legacyRaw.get('/system/screens'),
  saveScreen: (data: unknown) => legacyRaw.post('/system/screens', data),
  moduleList: () => legacyRaw.get('/system/modules'),
  toggleModule: (moduleId: string, status: string) => legacyRaw.put('/system/modules/toggle', { moduleId, status }),
  dashboard: () => legacyRaw.get('/system/dashboard'),

  // === 数据分析 ===
  deviceAnalysis: (days?: number) => legacyRaw.get('/analysis/device', { days }),
  alarmAnalysis: (days?: number) => legacyRaw.get('/analysis/alarm', { days }),
  maintenanceAnalysis: () => legacyRaw.get('/analysis/maintenance'),
  hazardAnalysis: () => legacyRaw.get('/analysis/hazard'),
  patrolCompletion: (days?: number) => legacyRaw.get('/analysis/patrol', { days }),

  // === 报表 ===
  dailyReport: (date?: string) => legacyRaw.get('/reports/daily', { date }),
  weeklyReport: (endDate?: string) => legacyRaw.get('/reports/weekly', { endDate }),
  monthlyReport: (year?: number, month?: number) => legacyRaw.get('/reports/monthly', { year, month }),
  deviceReport: (unitId?: number) => legacyRaw.get('/reports/device', { unitId }),
  maintenanceReport: (startDate?: string, endDate?: string) => legacyRaw.get('/reports/maintenance', { startDate, endDate }),
  patrolReport: (startDate?: string, endDate?: string) => legacyRaw.get('/reports/patrol', { startDate, endDate }),

  // === GIS ===
  gisPoints: () => legacyRaw.get('/gis/points'),
  gisSituation: () => legacyRaw.get('/gis/situation'),
  gisAlarmPoints: () => legacyRaw.get('/gis/alarm-points'),

  // === 监控中心 ===
  monitorOverview: () => legacyRaw.get('/monitor/overview'),

  // === 大屏 ===
  bigScreen: () => legacyRaw.get('/bigscreen/data'),

  // === 工作台 ===
  workbench: () => legacyRaw.get('/workbench'),

  // === 值守 ===
  dutySchedules: () => legacyRaw.get('/duty/schedules'),
  dutyLogs: (params?: Record<string, unknown>) => legacyRaw.get('/duty/logs', params),
  dutyCurrent: () => legacyRaw.get('/duty/current'),

  // === 向后兼容别名（箭头函数避免 this 绑定开销） ===
  getUsers: (params?: Record<string, unknown>) => legacyApi.userList(params),
  getRoles: () => legacyApi.roleList(),
  getOrgs: () => legacyApi.deptList(),
  getLoginLogs: (params?: Record<string, unknown>) => legacyApi.logList(params),
  getUnits: (params?: Record<string, unknown>) => legacyApi.unitList(params),
  getDevices: (params?: Record<string, unknown>) => legacyApi.deviceList(params),
  getDeviceTypes: () => legacyApi.deviceTypes(),
  getDashboardStats: () => legacyApi.dashboard(),
  getPatrolPlans: (params?: Record<string, unknown>) => legacyApi.patrolPlanList(params),
  getPatrolTasks: (params?: Record<string, unknown>) => legacyApi.patrolRecordList(params),
  getHazards: (params?: Record<string, unknown>) => legacyApi.hazardList(params),
  getPreplans: (params?: Record<string, unknown>) => legacyApi.planList(params),
  getPlanRecords: (params?: Record<string, unknown>) => legacyApi.drillList(params),
  getAlarmStatistics: () => legacyApi.alarmStats(),
  getFaultAlarms: () => legacyApi.alarmList({ alarmType: 2, pageSize: 50 }),
  getFireAlarms: () => legacyApi.alarmList({ alarmType: 1, pageSize: 50 }),
  getFeedbackAlarms: () => legacyApi.alarmList({ status: 3, pageSize: 50 }),
  confirmFireAlarm: (id: number) => legacyApi.confirmAlarm(id),
  handleFault: (id: number, result: string) => legacyApi.handleAlarm(id, result),
  silenceConfirm: (data: unknown) => legacyRaw.post('/control-rooms/silence', data),
  resetConfirm: (data: unknown) => legacyRaw.post('/control-rooms/reset', data),
  switchMode: (data: unknown) => legacyRaw.post('/control-rooms/mode', data),
  addShield: (data: unknown) => legacyRaw.post('/control-rooms/shield', data),
};

/**
 * 统一导出的 api 实例（兼容旧体系入口）
 * @deprecated 新代码建议直接使用独立 service，如 unitService、alarmService 等
 */
export const api = legacyApi;

