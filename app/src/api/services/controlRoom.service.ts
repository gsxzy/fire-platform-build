/**
 * 数智消控室 API
 */
import { raw } from '../client';
import { API_DOMAINS } from '@/shared';

const BASE = API_DOMAINS.controlRoom;

export const controlRoomService = {
  list: (params?: Record<string, unknown>) => raw.get<unknown>(BASE, params),
  detail: (id: number | string) => raw.get<unknown>(`${BASE}/${id}`),
  create: (data: unknown) => raw.post<unknown>(BASE, data),
  update: (id: number | string, data: unknown) => raw.put<unknown>(`${BASE}/${id}`, data),
  delete: (id: number | string) => raw.delete<unknown>(`${BASE}/${id}`),

  hosts: (roomId?: number | string) =>
    raw.get<unknown>(`${BASE}/hosts`, roomId !== undefined ? { roomId } : undefined),
  hostDetail: (id: number) => raw.get<unknown>(`${BASE}/hosts/${id}`),
  createHost: (data: unknown) => raw.post<unknown>(`${BASE}/hosts`, data),
  updateHost: (id: number, data: unknown) => raw.put<unknown>(`${BASE}/hosts/${id}`, data),
  deleteHost: (id: number) => raw.delete<unknown>(`${BASE}/hosts/${id}`),

  silenceHost: (hostId: number) => raw.post<unknown>(`${BASE}/silence`, { hostId }),
  resetHost: (hostId: number) => raw.post<unknown>(`${BASE}/reset`, { hostId }),
  switchHostMode: (hostId: number, mode: 'manual' | 'auto') =>
    raw.post<unknown>(`${BASE}/mode`, { hostId, mode }),

  multilinePanels: (hostId?: number | string) =>
    raw.get<unknown>(`${BASE}/multiline`, hostId !== undefined ? { hostId } : undefined),
  busPoints: (hostId?: number | string, loopNo?: number) =>
    raw.get<unknown>(`${BASE}/bus-points`, { hostId, loopNo }),

  commandLogs: (params?: Record<string, unknown>) => raw.get<unknown>(`${BASE}/command-logs`, params),
  realtime: (roomId?: number | string, hostId?: number) =>
    raw.get<unknown>(`${BASE}/realtime`, { roomId, hostId }),
  shields: (roomId?: number | string, hostId?: number) =>
    raw.get<unknown>(`${BASE}/shields`, { roomId, hostId }),
  videos: (roomId?: number | string) => raw.get<unknown>(`${BASE}/videos`, { roomId }),
  videoCandidates: (roomId?: number | string) => raw.get<unknown>(`${BASE}/video-candidates`, { roomId }),
  videoLink: (data: unknown) => raw.post<unknown>(`${BASE}/video-link`, data),
  videoUnlink: (data: unknown) => raw.post<unknown>(`${BASE}/video-unlink`, data),

  addShield: (data: unknown) => raw.post<unknown>(`${BASE}/shield`, data),

  getControlRoomHosts: (roomId?: number | string) =>
    raw.get<unknown>(`${BASE}/hosts`, roomId !== undefined ? { roomId } : undefined),
  getMultilinePanels: (hostId?: number | string) =>
    raw.get<unknown>(`${BASE}/multiline`, hostId !== undefined ? { hostId } : undefined),
  getBusPoints: (hostId?: number | string, loopNo?: number) =>
    raw.get<unknown>(`${BASE}/bus-points`, { hostId, loopNo }),
  getRealtimeStatus: (roomId?: number | string, hostId?: number) =>
    raw.get<unknown>(`${BASE}/realtime`, { roomId, hostId }),
  getShields: (roomId?: number | string, hostId?: number) =>
    raw.get<unknown>(`${BASE}/shields`, { roomId, hostId }),
  getVideos: (roomId?: number | string) => raw.get<unknown>(`${BASE}/videos`, { roomId }),
  getFireAlarms: (unitId?: number | string) =>
    raw.get<unknown>('/alarms', {
      alarmType: 1,
      pageSize: 50,
      ...(unitId !== undefined && unitId !== '' ? { unitId } : {}),
    }),
  getFaultAlarms: (unitId?: number | string) =>
    raw.get<unknown>('/alarms', {
      alarmType: 2,
      pageSize: 50,
      ...(unitId !== undefined && unitId !== '' ? { unitId } : {}),
    }),
  getFeedbackAlarms: () => raw.get<unknown>('/alarms', { status: 3, pageSize: 50 }),
  getHostCommandLogs: (params?: Record<string, unknown>) =>
    raw.get<unknown>(`${BASE}/command-logs`, params),

  confirmFireAlarm: (id: number) => raw.put<unknown>(`/alarms/${id}/confirm`, {}),
  controlMultiline: (hostId: number, pointId: number, action: 'start' | 'stop') =>
    raw.post<unknown>(`${BASE}/multiline/control`, { hostId, pointId, action }),
  controlBus: (hostId: number, pointId: number, action: 'start' | 'stop') =>
    raw.post<unknown>(`${BASE}/bus/control`, { hostId, pointId, action }),
};
