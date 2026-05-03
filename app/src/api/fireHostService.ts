/* ═══════════════════════════════════════════════════════════════
   报警主机 / 回路 / 设备点位 API 服务层
   ═══════════════════════════════════════════════════════════════ */
import { raw } from './client';
import type { QueryParams } from '@/types/db';
import type { FireHost, FireLoop, FireDevice, PaginatedList } from '@/types/fireHost';

/** 报警主机服务 */
export const fireHostService = {
  list: (params?: QueryParams) =>
    raw.get<PaginatedList<FireHost>>('/fire-hosts', params),
  get: (id: number | string) =>
    raw.get<FireHost>(`/fire-hosts/${id}`),
  getByDeviceId: (deviceId: string) =>
    raw.get<FireHost | null>('/fire-hosts', { deviceId }),
  create: (data: Partial<FireHost>) =>
    raw.post<FireHost>('/fire-hosts', data),
  update: (id: number | string, data: Partial<FireHost>) =>
    raw.put<FireHost>(`/fire-hosts/${id}`, data),
  delete: (id: number | string) =>
    raw.delete<void>(`/fire-hosts/${id}`),
};

/** 回路服务 */
export const fireLoopService = {
  list: (hostId: number | string, params?: QueryParams) =>
    raw.get<PaginatedList<FireLoop>>(`/fire-hosts/${hostId}/loops`, params),
  get: (hostId: number | string, id: number | string) =>
    raw.get<FireLoop>(`/fire-hosts/${hostId}/loops/${id}`),
  create: (hostId: number | string, data: Partial<FireLoop>) =>
    raw.post<FireLoop>(`/fire-hosts/${hostId}/loops`, data),
  update: (hostId: number | string, id: number | string, data: Partial<FireLoop>) =>
    raw.put<FireLoop>(`/fire-hosts/${hostId}/loops/${id}`, data),
  delete: (hostId: number | string, id: number | string) =>
    raw.delete<void>(`/fire-hosts/${hostId}/loops/${id}`),
};

/** 设备点位服务 */
export const fireDeviceService = {
  list: (hostId: number | string, loopNo: number | string, params?: QueryParams) =>
    raw.get<PaginatedList<FireDevice>>(`/fire-hosts/${hostId}/loops/${loopNo}/devices`, params),
  get: (hostId: number | string, loopNo: number | string, id: number | string) =>
    raw.get<FireDevice>(`/fire-hosts/${hostId}/loops/${loopNo}/devices/${id}`),
  create: (hostId: number | string, loopNo: number | string, data: Partial<FireDevice>) =>
    raw.post<FireDevice>(`/fire-hosts/${hostId}/loops/${loopNo}/devices`, data),
  update: (hostId: number | string, loopNo: number | string, id: number | string, data: Partial<FireDevice>) =>
    raw.put<FireDevice>(`/fire-hosts/${hostId}/loops/${loopNo}/devices/${id}`, data),
  delete: (hostId: number | string, loopNo: number | string, id: number | string) =>
    raw.delete<void>(`/fire-hosts/${hostId}/loops/${loopNo}/devices/${id}`),
};
