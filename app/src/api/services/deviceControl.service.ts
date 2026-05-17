/**
 * 设备反控 — 对接 /device-control 与 /iot/devices
 */
import { api, raw } from '../client';
import type { PaginatedData, QueryParams } from '@/types/db';
import { API_DOMAINS } from '@/shared';

const BASE = API_DOMAINS.deviceControl;

export type DeviceControlCmdType = 1 | 2 | 3 | 4;

export interface DeviceControlCommandBody {
  deviceId: number;
  cmdType: DeviceControlCmdType;
  cmdParam?: Record<string, unknown>;
}

export const deviceControlService = {
  /** IoT 设备列表（反控页设备源） */
  listIotDevices: (params?: QueryParams) =>
    raw.get<PaginatedData<Record<string, unknown>>>(`${API_DOMAINS.iot}/devices`, params),

  commandHistory: (params?: QueryParams) =>
    api.get<PaginatedData<Record<string, unknown>>>(`${BASE}/history`, params),

  sendCommand: (body: DeviceControlCommandBody) =>
    api.post<{ success: boolean; message: string }>(`${BASE}/command`, body),

  startStop: (deviceId: number, action: 'start' | 'stop') =>
    api.post<{ success: boolean; message: string }>(`${BASE}/start-stop`, { deviceId, action }),

  reset: (deviceId: number) =>
    api.post<{ success: boolean; message: string }>(`${BASE}/reset`, { deviceId }),

  silence: (deviceId: number) =>
    api.post<{ success: boolean; message: string }>(`${BASE}/silence`, { deviceId }),

  batch: (deviceIds: number[], cmdType: DeviceControlCmdType, param?: Record<string, unknown>) =>
    api.post<unknown>(`${BASE}/batch`, { deviceIds, cmdType, param: param ?? {} }),
};

/** 动作文案 → 后端 cmdType（1 启 2 停 3 复位 4 消音） */
export const DEVICE_CONTROL_CMD_MAP: Record<string, DeviceControlCmdType | 'start-stop'> = {
  start: 'start-stop',
  stop: 'start-stop',
  test: 1,
  reset: 3,
  mute: 4,
  manual: 1,
  auto: 1,
};
