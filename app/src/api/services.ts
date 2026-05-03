/**
 * ═══════════════════════════════════════════════════════════════════
 * API 服务层 - 各业务模块的API封装
 * 所有服务统一调用 api + 分页辅助，便于后续切换真实后端
 * ═══════════════════════════════════════════════════════════════════
 */
import { api as httpApi, legacyRaw, paginatedQuery } from './client';
import type { QueryParams, Unit, Device, Alarm, ControlRoom, WorkOrder, MaintRecord, MaintContract, PatrolPlan, PatrolRecord, Hazard, User, Role, Plan, Drill, Inspection, Notification, DutySchedule, Document, SystemLog, IoTDevice, Personnel, Camera, FloorPlan, FloorDevice, DutyShift, DutyHandover, AlarmSnapshot, ControlRoomConfig, GB28181Device, SIPServerConfig } from '@/types/db';
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

function mapWvpChannelToGb(ch: wvp.WvpDeviceChannel): import('@/types/db').GB28181Channel {
  // WVP 部分版本不返回 channelId，此时用 deviceId 作为通道 ID
  const cid = ch.channelId || ch.deviceId || String(ch.id);
  return {
    channelId: cid,
    name: ch.name || cid,
    status: (ch.status === 'ON' || ch.status === 'on' || ch.status === 1) ? 'on' : 'off',
    streamUrl: undefined,
    snapUrl: undefined,
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

/* ═══════ 设备维护服务 ═══════ */
export const deviceMaintenanceService = {
  ...createService<any>('/device-maintenances'),
};

/* ═══════ 设备分配服务 ═══════ */
export const deviceAllocationService = {
  listUnallocated: (params: QueryParams = {}) => paginatedQuery<any>('/devices/unallocated', params),
  allocate: (data: { deviceIds: string[]; unit_id: string; building_id?: string; floor_id?: string; point_id?: string; operator?: string; remark?: string }) =>
    httpApi.post<any>('/device-allocations/allocate', data),
  unallocate: (data: { deviceIds: string[]; operator?: string; remark?: string }) =>
    httpApi.post<any>('/device-allocations/unallocate', data),
  reallocate: (data: { deviceId: string; newUnitId: string; building_id?: string; floor_id?: string; point_id?: string; operator?: string; remark?: string }) =>
    httpApi.post<any>('/device-allocations/reallocate', data),
  listLogs: (params: QueryParams = {}) => paginatedQuery<any>('/device-allocations/list', params),
  getUnitDevices: (unitId: string, params?: { archive_status?: string; category?: string }) =>
    httpApi.get<any[]>(`/units/${unitId}/devices`, { params }),
};

/* ═══════ 设备接入服务 ═══════ */
export const deviceAccessService = {
  list: (params: QueryParams = {}) => paginatedQuery<any>('/device-accesses/list', params),
  listAllocatable: (params?: { unit_id?: string; category?: string; keyword?: string }) =>
    httpApi.get<any[]>('/device-accesses/allocatable', { params }),
  create: (data: any) => httpApi.post<any>('/device-accesses', data),
  update: (id: string, data: any) => httpApi.put<any>(`/device-accesses/${id}`, data),
  test: (id: string, data?: { operator?: string }) => httpApi.post<any>(`/device-accesses/${id}/test`, data),
  disconnect: (id: string, data?: { operator?: string; reason?: string }) => httpApi.post<any>(`/device-accesses/${id}/disconnect`, data),
  delete: (id: string) => httpApi.delete<any>(`/device-accesses/${id}`),
  getLogs: (id: string, params: QueryParams = {}) => paginatedQuery<any>(`/device-accesses/${id}/logs`, params),
  batchCreate: (data: any) => httpApi.post<any>('/device-accesses/batch', data),
};

/* ─── 后端 Alarm 数据 → 前端 Alarm 类型映射 ─── */
function mapAlarmFromBackend(raw: any): Alarm {
  return {
    id: String(raw.id ?? ''),
    type: raw.type || 'warning',
    level: raw.level || 'normal',
    deviceId: raw.device_id || raw.deviceId || '',
    deviceName: raw.device_name || raw.deviceName || raw.device_id || raw.deviceId || '未知设备',
    unitId: raw.unit_id || raw.unitId || '',
    unitName: raw.unit_name || raw.unitName || '未分配单位',
    location: raw.location || '未知位置',
    message: raw.description || raw.message || raw.desc || '',
    status: raw.status || 'new',
    handler: raw.handler || raw.resolved_by || '',
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
    const res = await paginatedQuery<Alarm>('/alarms/list', params);
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
  confirm: (id: string, handler: string, note?: string) =>
    httpApi.patch<null>(`/alarms/${id}`, { status: 'confirmed', handler, handleTime: new Date().toISOString(), handleNote: note }),
  handle: (id: string, handler: string, note?: string) =>
    httpApi.patch<null>(`/alarms/${id}`, { status: 'handled', handler, handleTime: new Date().toISOString(), handleNote: note }),
  getDetail: (id: string) => httpApi.get<Alarm & { unitAddress?: string; controlRoom: ControlRoomConfig | null; snapshots: AlarmSnapshot[]; relatedCameras: Camera[] }>(`/alarms/${id}/detail`),
};

/* ═══════ 消控室服务 ═══════ */
export const controlRoomService = {
  ...createService<ControlRoom>('/control-rooms'),
};

/* ═══════ 维保工单服务 ═══════ */
export const workOrderService = {
  ...createService<WorkOrder>('/work-orders'),
};

/* ═══════ 维保记录服务 ═══════ */
export const maintRecordService = createService<MaintRecord>('/maint-records');

/* ═══════ 维保合同服务 ═══════ */
export const maintContractService = createService<MaintContract>('/maint-contracts');

/* ═══════ 巡检服务 ═══════ */
export const patrolPlanService = createService<PatrolPlan>('/patrol-plans');
export const patrolRecordService = createService<PatrolRecord>('/patrol-records');

/* ═══════ 隐患服务 ═══════ */
export const hazardService = createService<Hazard>('/hazards');

/* ═══════ 用户服务 ═══════ */
export const userService = {
  ...createService<User>('/users'),
  login: (username: string, password: string) =>
    httpApi.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', { username, password }),
};

/* ═══════ 角色服务 ═══════ */
export const roleService = createService<Role>('/roles');

/* ═══════ 预案服务 ═══════ */
export const planService = createService<Plan>('/plans');
export const drillService = createService<Drill>('/drills');

/* ═══════ 检查服务 ═══════ */
export const inspectionService = createService<Inspection>('/inspections');

/* ═══════ 通知服务 ═══════ */
export const notificationService = {
  ...createService<Notification>('/notifications'),
  list: (params: QueryParams = {}) => paginatedQuery<Notification>('/notifications/list', params),
  getUnread: () => httpApi.get<Notification[]>('/notifications/unread'),
  markRead: (id: string) => httpApi.post<null>(`/notifications/${id}/read`, {}),
};

/* ═══════ 值班服务 ═══════ */
export const dutyService = createService<DutySchedule>('/duty-schedules');

/* ═══════ 知识库服务 ═══════ */
export const documentService = createService<Document>('/documents');

/* ═══════ 日志服务 ═══════ */
export const logService = createService<SystemLog>('/system-logs');

/* ═══════ IoT设备服务 ═══════ */
export const iotService = {
  ...createService<IoTDevice>('/iot-devices'),
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
      // 通过后端代理调用 WVP-PRO
      const resp = await videoApi.getVideoDevices({ page: Number(params.pageNum || 1), count: Number(params.pageSize || 100), query: params.keyword });
      const wvpList = (resp.list || []).map((d: any) => mapWvpDeviceToGb({
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
          d.channels = (chResp.list || []).map((ch: any) => mapWvpChannelToGb({
            id: ch.id || 0,
            channelId: ch.channelId || ch.deviceId || String(ch.id),
            name: ch.name || ch.channelId || '',
            deviceId: ch.deviceId,
            status: ch.status,
          }));
          d.channelCount = d.channels.length;
          d.catalogSynced = d.channels.length > 0;
        } catch { /* ignore */ }
      }
      return { code: 200, message: 'success', data: { total: wvpList.length, list: wvpList, pageNum: params.pageNum || 1, pageSize: params.pageSize || 100 } };
    }
    return paginatedQuery<GB28181Device>('/gb28181-devices/list', params);
  },

  get: async (id: string) => {
    if (WVP_ENABLED) {
      const devices = (await gb28181Service.list({ pageSize: 1, keyword: id })).data?.list || [];
      const found = devices.find(d => d.id === id || d.deviceId === id);
      return { code: 200, message: 'success', data: found || null };
    }
    return httpApi.get<GB28181Device>(`/gb28181-devices/${id}`);
  },

  create: async (data: Omit<GB28181Device, 'id'>) => {
    if (WVP_ENABLED) {
      // WVP 模式下将预配置设备存入本地 IndexedDB
      const localDev = { ...data, id: `local-${Date.now()}` } as GB28181Device;
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
      const stream = await videoApi.getStream(deviceId, channelId);
      return {
        code: 200, message: 'success',
        data: { deviceId, channelId, streamUrl: stream.hls || stream.flv || '', snapUrl: stream.wsFlv || '' }
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

/* ═══════ 楼层设备服务 ═══════ */
export const floorDeviceService = createService<FloorDevice>('/floor-devices');

/* ═══════ 建筑平面图服务 ═══════ */
export const floorPlanService = {
  ...createService<FloorPlan>('/floor-plans'),
  getFloorDevices: (floorPlanId: string) => httpApi.get<FloorDevice[]>(`/floor-plans/${floorPlanId}/devices`),
};

/* ═══════ 值班班次服务 ═══════ */
export const dutyShiftService = createService<DutyShift>('/duty-shifts');

/* ═══════ 交接班服务 ═══════ */
export const dutyHandoverService = createService<DutyHandover>('/duty-handovers');

/* ═══════ 报警快照服务 ═══════ */
export const alarmSnapshotService = createService<AlarmSnapshot>('/alarm-snapshots');

/* ═══════ 消控室配置服务 ═══════ */
export const controlRoomConfigService = {
  ...createService<ControlRoomConfig>('/control-room-configs'),
  getByUnit: (unitId: string) => httpApi.get<ControlRoomConfig | null>(`/control-rooms/config/${unitId}`),
  listAll: () => httpApi.get<ControlRoomConfig[]>('/control-rooms/config'),
};

/* ═══════ 仪表盘服务 ═══════ */
export const dashboardService = {
  getStats: () => httpApi.get<{
    unitCount: number;
    deviceCount: number;
    onlineDeviceCount: number;
    alarmCount24h: number;
    unhandledAlarmCount: number;
    controlRoomCount: number;
    pendingWorkOrderCount: number;
    deviceOnlineRate: string;
  }>('/dashboard/stats'),
  getUnitRank: () => httpApi.get<{ name: string; online: number; alarm: number; fault: number; status: string }[]>('/dashboard/unit-rank'),
  getSubsystems: () => httpApi.get<{ name: string; total: number; online: number; alarm: number }[]>('/dashboard/subsystems'),
};

/* ═══════ GIS服务 ═══════ */
export const gisService = {
  getPoints: () => httpApi.get<unknown[]>('/gis/points-rich'),
};

/* ═══════ 数据库管理服务 ═══════ */
export const dbService = {
  getStats: () => httpApi.get<Record<string, number>>('/db/stats'),
  reset: () => httpApi.post<null>('/db/reset', {}),
  seed: () => httpApi.post<null>('/db/seed', {}),
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
  unitList: (params?: Record<string, unknown>) => legacyRaw.get('/units', params),
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

  // === 预案 ===
  planList: (params?: Record<string, unknown>) => legacyRaw.get('/plans', params),
  createPlan: (data: unknown) => legacyRaw.post('/plans', data),
  updatePlan: (id: number, data: unknown) => legacyRaw.put(`/plans/${id}`, data),
  deletePlan: (id: number) => legacyRaw.delete(`/plans/${id}`),
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

  // === 向后兼容别名 ===
  getUsers: function(params?: Record<string, unknown>) { return this.userList(params); },
  getRoles: function() { return this.roleList(); },
  getOrgs: function() { return this.deptList(); },
  getLoginLogs: function(params?: Record<string, unknown>) { return this.logList(params); },
  getUnits: function(params?: Record<string, unknown>) { return this.unitList(params); },
  getDevices: function(params?: Record<string, unknown>) { return this.deviceList(params); },
  getDeviceTypes: function() { return this.deviceTypes(); },
  getDashboardStats: function() { return this.dashboard(); },
  getPatrolPlans: function(params?: Record<string, unknown>) { return this.patrolPlanList(params); },
  getPatrolTasks: function(params?: Record<string, unknown>) { return this.patrolRecordList(params); },
  getHazards: function(params?: Record<string, unknown>) { return this.hazardList(params); },
  getPreplans: function(params?: Record<string, unknown>) { return this.planList(params); },
  getPlanRecords: function(params?: Record<string, unknown>) { return this.drillList(params); },
  getAlarmStatistics: function() { return this.alarmStats(); },
  getFaultAlarms: function() { return this.alarmList({ alarmType: 2, pageSize: 50 }); },
  getFireAlarms: function() { return this.alarmList({ alarmType: 1, pageSize: 50 }); },
  getFeedbackAlarms: function() { return this.alarmList({ status: 3, pageSize: 50 }); },
  confirmFireAlarm: function(id: number) { return this.confirmAlarm(id); },
  handleFault: function(id: number, result: string) { return this.handleAlarm(id, result); },
  silenceConfirm: function(data: unknown) { return legacyRaw.post('/control-rooms/silence', data); },
  resetConfirm: function(data: unknown) { return legacyRaw.post('/control-rooms/reset', data); },
  switchMode: function(data: unknown) { return legacyRaw.post('/control-rooms/mode', data); },
  addShield: function(data: unknown) { return legacyRaw.post('/control-rooms/shield', data); },
};

/**
 * 统一导出的 api 实例（兼容旧体系入口）
 * @deprecated 新代码建议直接使用独立 service，如 unitService、alarmService 等
 */
export const api = legacyApi;

