/**
 * ═══════════════════════════════════════════════════════════════════
 * 视频服务 - 通过后端代理调用 WVP-PRO
 * 废弃前端直接访问 WVP，统一走 /api/video/*
 * ═══════════════════════════════════════════════════════════════════
 */
import { api as httpApi } from './client';

/* ───── 流地址统一格式 ───── */
export interface StreamUrl {
  deviceId: string;
  channelId: string;
  flv: string;
  hls: string;
  rtmp: string;
  rtsps: string;
  rtc: string;
  wsFlv: string;
  httpsFlv: string;
  httpsHls: string;
  streamId: string;
  mediaServerId: string;
  startTime: string;
  ssrc: string;
}

/* ───── 设备信息 ───── */
export interface VideoDevice {
  deviceId: string;
  name: string;
  manufacturer?: string;
  model?: string;
  ip?: string;
  port?: number;
  onLine: boolean;
  channelCount?: number;
  status?: string;
}

/* ───── 通道信息 ───── */
export interface VideoChannel {
  channelId: string;
  name: string;
  deviceId: string;
  status?: string;
  hasAudio?: boolean;
}

/* ───── 1. 获取设备列表 ───── */
export async function getVideoDevices(params?: { page?: number; count?: number; query?: string; online?: boolean }): Promise<{ total: number; list: VideoDevice[] }> {
  const resp = await httpApi.get<any>('/video/devices', {
    page: params?.page ?? 1,
    count: params?.count ?? 100,
    query: params?.query,
    online: params?.online,
  });
  return resp.data || { total: 0, list: [] };
}

/* ───── 2. 获取设备通道列表 ───── */
export async function getDeviceChannels(deviceId: string, params?: { page?: number; count?: number }): Promise<{ total: number; list: VideoChannel[] }> {
  const resp = await httpApi.get<any>(`/video/devices/${deviceId}/channels`, {
    page: params?.page ?? 1,
    count: params?.count ?? 100,
  });
  return resp.data || { total: 0, list: [] };
}

/* ───── 3. 开始播放/获取流地址 ───── */
export async function getStream(deviceId: string, channelId: string): Promise<StreamUrl> {
  const resp = await httpApi.post<StreamUrl>('/video/stream', { deviceId, channelId });
  return resp.data;
}

/* ───── 4. 停止播放 ───── */
export async function stopStream(deviceId: string, channelId: string): Promise<void> {
  await httpApi.post<null>('/video/stop', { deviceId, channelId });
}

/* ───── 5. PTZ 云台控制 ───── */
export async function ptzControl(
  deviceId: string,
  channelId: string,
  cmd: 'up' | 'down' | 'left' | 'right' | 'zoomIn' | 'zoomOut' | 'stop' | number,
  speed?: number
): Promise<void> {
  await httpApi.post<null>('/video/ptz', {
    deviceId,
    channelId,
    cmd,
    horizonSpeed: speed ?? 50,
    verticalSpeed: speed ?? 50,
    zoomSpeed: speed ?? 50,
  });
}

/* ───── 6. 预设位控制 ───── */
export async function presetControl(
  deviceId: string,
  channelId: string,
  action: 'set' | 'goto' | 'remove',
  presetNo: number
): Promise<void> {
  await httpApi.post<null>('/video/preset', { deviceId, channelId, action, presetNo });
}

/* ───── 7. 录像回放 ───── */
export async function getPlayback(
  deviceId: string,
  channelId: string,
  startTime: string,
  endTime: string
): Promise<StreamUrl> {
  const resp = await httpApi.post<StreamUrl>('/video/playback', { deviceId, channelId, startTime, endTime });
  return resp.data;
}

/* ───── 8. 截图 ───── */
export async function snapshot(deviceId: string, channelId: string): Promise<string> {
  const resp = await httpApi.get<{ snapUrl: string }>(`/video/snapshot/${deviceId}/${channelId}`);
  return resp.data?.snapUrl || '';
}

/* ───── 9. 查询设备状态 ───── */
export async function getDeviceStatus(deviceId: string): Promise<any> {
  const resp = await httpApi.get<any>(`/video/devices/${deviceId}/status`);
  return resp.data;
}
