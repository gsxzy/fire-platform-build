/**
 * 设备反控 — 对接 /device-control 与 /iot/devices
 * 高危操作（复位/消音/批量）支持后端二次确认 Token 机制
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
  confirmToken?: string;
}

/** 高危操作二次确认辅助 */
async function withConfirm<T>(
  fn: (token?: string) => Promise<T>,
  actionName: string
): Promise<T> {
  const first = await fn();
  const data = (first as any)?.data ?? first;
  if (data && typeof data === 'object' && data.needConfirm && data.confirmToken) {
    const ok = window.confirm(`【高危操作】${actionName}\n此操作将影响设备运行，请再次确认是否执行？`);
    if (!ok) throw new Error('用户取消操作');
    return fn(data.confirmToken);
  }
  return first;
}

export const deviceControlService = {
  /** IoT 设备列表（反控页设备源） */
  listIotDevices: (params?: QueryParams) =>
    raw.get<PaginatedData<Record<string, unknown>>>(`${API_DOMAINS.iot}/devices`, params),

  commandHistory: (params?: QueryParams) =>
    api.get<PaginatedData<Record<string, unknown>>>(`${BASE}/history`, params),

  sendCommand: (body: DeviceControlCommandBody) =>
    api.post<{ success: boolean; message: string; needConfirm?: boolean; confirmToken?: string }>(`${BASE}/command`, body),

  startStop: (deviceId: number, action: 'start' | 'stop', confirmToken?: string) =>
    api.post<{ success: boolean; message: string; needConfirm?: boolean; confirmToken?: string }>(`${BASE}/start-stop`, { deviceId, action, confirmToken }),

  reset: (deviceId: number, _confirmToken?: string) =>
    withConfirm(
      (token) => api.post<{ success: boolean; message: string; needConfirm?: boolean; confirmToken?: string }>(`${BASE}/reset`, { deviceId, confirmToken: token }),
      '远程复位'
    ),

  silence: (deviceId: number, _confirmToken?: string) =>
    withConfirm(
      (token) => api.post<{ success: boolean; message: string; needConfirm?: boolean; confirmToken?: string }>(`${BASE}/silence`, { deviceId, confirmToken: token }),
      '远程消音'
    ),

  batch: (deviceIds: number[], cmdType: DeviceControlCmdType, param?: Record<string, unknown>, _confirmToken?: string) =>
    withConfirm(
      (token) => api.post<unknown>(`${BASE}/batch`, { deviceIds, cmdType, param: param ?? {}, confirmToken: token }),
      '批量控制'
    ),
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
