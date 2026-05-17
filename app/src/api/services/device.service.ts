import { api as httpApi, paginatedQuery } from '../client';
import type { QueryParams, Device, Personnel, Camera } from '@/types/db';
import { createService } from './core';

export const deviceService = {
  ...createService<Device>('/devices'),
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

export const deviceConfigService = {
  ...createService<any>('/device-configs'),
};

export const deviceMaintenanceService = {
  ...createService<any>('/device-maintenances'),
  list: (params: QueryParams = {}) => paginatedQuery<any>(`/device-maintenances/list`, params),
  getStats: () =>
    httpApi.get<{ pending: number; overdue: number; completed: number; in_progress: number }>('/device-maintenances/stats'),
};

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

export const personnelService = createService<Personnel>('/personnel');

export const cameraService = {
  ...createService<Camera>('/cameras'),
  getStreamUrl: (cameraId: string) => httpApi.get<{ cameraId: string; streamUrl: string; rtspUrl?: string; wsFlvUrl?: string; snapshotUrl?: string }>(`/cameras/${cameraId}/stream`),
};
