import { api as httpApi, paginatedQuery } from '../client';
import type { QueryParams, Alarm, AlarmSnapshot, Camera, ControlRoomConfig } from '@/types/db';
import { createService } from './core';

const ALARM_TYPE_FROM_DB: Record<number, Alarm['type']> = {
  1: 'fire', 2: 'fault', 3: 'warning', 4: 'supervisory', 5: 'test',
};
const ALARM_LEVEL_FROM_DB: Record<number, Alarm['level']> = {
  1: 'normal', 2: 'high', 3: 'urgent',
};
const ALARM_STATUS_FROM_DB: Record<number, Alarm['status']> = {
  0: 'new', 1: 'confirmed', 2: 'handled', 3: 'ignored',
};

export function mapAlarmFromBackend(raw: any): Alarm {
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
    unitName: raw.unit?.unit_name || raw.unit_name || raw.unitName || '未知单位',
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
  handle: (id: string, result: string) =>
    httpApi.put<null>(`/alarms/${id}/handle`, { handleResult: result }),
  dismiss: (id: string, result: string) =>
    httpApi.put<null>(`/alarms/${id}/dismiss`, { handleResult: result }),
  getDetail: (id: string) => httpApi.get<Alarm & { unitAddress?: string; controlRoom: ControlRoomConfig | null; snapshots: AlarmSnapshot[]; relatedCameras: Camera[]; dispatchRecords?: any[] }>(`/alarms/${id}/detail`),
};
