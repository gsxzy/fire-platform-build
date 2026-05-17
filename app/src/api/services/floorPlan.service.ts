/**
 * 平面图 / 建筑 / 楼层（floorPlanApp 路由）
 */
import { raw } from '../client';

export const floorPlanService = {
  get: <T = unknown>(url: string, params?: Record<string, unknown>) => raw.get<T>(url, params),
  post: <T = unknown>(url: string, body?: unknown) => raw.post<T>(url, body),
  delete: <T = unknown>(url: string) => raw.delete<T>(url),

  listUnits: (params?: Record<string, unknown>) => raw.get<unknown>('/units/list', params),
  listBuildings: (params?: Record<string, unknown>) => raw.get<unknown>('/buildings', params),
  listFloors: (params?: Record<string, unknown>) => raw.get<unknown>('/floors', params),
  getFloor: (floorId: number | string) => raw.get<unknown>(`/floors/${floorId}`),
  getFloorDevices: (floorId: number | string) => raw.get<unknown>(`/floors/${floorId}/devices`),
  getUnmarkedDevices: (floorId: number | string) => raw.get<unknown>(`/floors/${floorId}/devices/unmarked`),
  getFloorCameras: (floorId: number | string) => raw.get<unknown>(`/floors/${floorId}/cameras`),
};
