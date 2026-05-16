/**
 * ═══════════════════════════════════════════════════════════════════
 * WVP-PRO 业务服务 - GB28181 设备/通道/播放/云台
 * ═══════════════════════════════════════════════════════════════════
 */
import { wvp, wvpLogin } from '@/api/wvpClient';

/* ───── 编码映射：仅映射 channelId（deviceId 保持原值）───── */
const CHANNEL_ID_MAP: Record<string, string> = {
  '34020000001300000002': '34020000001320000002',
};
function mapChannelId(channelId: string): string {
  return CHANNEL_ID_MAP[channelId] || channelId;
}

/* ───── 类型定义 ───── */
export interface WvpDevice {
  id: number;
  deviceId: string;
  name: string;
  manufacturer?: string;
  model?: string;
  firmware?: string;
  transport?: string;
  streamMode?: string;
  ip?: string;
  port?: number;
  hostAddress?: string;
  onLine: boolean;
  registerTime?: string;
  keepaliveTime?: string;
  createTime?: string;
  updateTime?: string;
  charset?: string;
  expires?: number;
  ssrcCheck?: boolean;
  geoCoordSys?: string;
  mediaServerId?: string;
  customName?: string;
  sdpIp?: string;
  localIp?: string;
  password?: string;
  asMessageChannel?: boolean;
  heartBeatInterval?: number;
  heartBeatCount?: number;
  positionCapability?: number;
  broadcastPushAfterAck?: boolean;
  serverId?: string;
  channelCount?: number;
}

export interface WvpDeviceChannel {
  id: number;
  channelId?: string;
  name: string;
  deviceId: string;
  status?: number | string;
  manufacturer?: string;
  model?: string;
  owner?: string;
  civilCode?: string;
  block?: string;
  address?: string;
  parental?: number;
  parentId?: string;
  safetyWay?: number;
  registerWay?: number;
  certNum?: string;
  certifiable?: number;
  errCode?: number;
  endTime?: string;
  secrecy?: string;
  ipAddress?: string;
  port?: number;
  password?: string;
  statusCode?: number;
  longitude?: string;
  latitude?: string;
  ptzType?: number;
  positionType?: string;
  roomType?: string;
  useType?: string;
  supplyLightType?: string;
  directionType?: string;
  resolution?: string;
  businessGroupId?: string;
  downloadSpeed?: string;
  svcSpaceSupportMod?: number;
  svcTimeSupportMode?: number;
  subCount?: number;
  streamId?: string;
  hasAudio?: boolean;
  gpsInterval?: number;
  geoCoordSys?: string;
  createTime?: string;
  updateTime?: string;
}

export interface WvpStreamContent {
  app?: string;
  stream?: string;
  ip?: string;
  flv?: string;
  httpsFlv?: string;
  wsFlv?: string;
  wssFlv?: string;
  fmp4?: string;
  httpsFmp4?: string;
  wsFmp4?: string;
  wssFmp4?: string;
  hls?: string;
  httpsHls?: string;
  wsHls?: string;
  wssHls?: string;
  ts?: string;
  httpsTs?: string;
  wsTs?: string;
  wssTs?: string;
  rtmp?: string;
  rtmps?: string;
  rtsp?: string;
  rtsps?: string;
  rtc?: string;
  rtcs?: string;
  mediaServerId?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  key?: string;
  serverId?: string;
}

/* ───── 登录 ───── */
export async function loginWvp(username: string, password: string): Promise<string> {
  return wvpLogin(username, password);
}

/* ───── 设备列表 ───── */
export async function getDeviceList(params?: { page?: number; count?: number; query?: string; online?: boolean }): Promise<{ total: number; list: WvpDevice[] }> {
  const queryParams: Record<string, any> = { page: params?.page ?? 1, count: params?.count ?? 100 };
  if (params?.query !== undefined) queryParams.query = params.query;
  if (params?.online !== undefined) queryParams.online = params.online;
  const resp = await wvp.get<any>('/api/device/query/devices', queryParams);
  return resp.data;
}

/* ───── 设备通道列表 ───── */
export async function getDeviceChannels(deviceId: string, params?: { page?: number; count?: number; query?: string; online?: boolean; channelType?: string }): Promise<{ total: number; list: WvpDeviceChannel[] }> {
  const queryParams: Record<string, any> = { page: params?.page ?? 1, count: params?.count ?? 100 };
  if (params?.query !== undefined) queryParams.query = params.query;
  if (params?.online !== undefined) queryParams.online = params.online;
  if (params?.channelType !== undefined) queryParams.channelType = params.channelType;
  const resp = await wvp.get<any>(`/api/device/query/devices/${deviceId}/channels`, queryParams);
  return resp.data;
}

/* ───── 通道列表（跨设备） ───── */
export async function getChannelList(params?: { page?: number; count?: number; query?: string; online?: boolean; channelType?: string }): Promise<{ total: number; list: WvpDeviceChannel[] }> {
  const resp = await wvp.get<any>('/api/common/channel/list', {
    page: params?.page ?? 1,
    count: params?.count ?? 100,
    query: params?.query,
    online: params?.online,
    channelType: params?.channelType,
  });
  return resp.data;
}

/* ───── 开始点播 ───── */
export async function startPlay(deviceId: string, channelId: string): Promise<WvpStreamContent> {
  const resp = await wvp.get<WvpStreamContent>(`/api/play/start/${deviceId}/${mapChannelId(channelId)}`);
  return resp.data;
}

/* ───── 停止点播 ───── */
export async function stopPlay(deviceId: string, channelId: string): Promise<void> {
  await wvp.get<void>(`/api/play/stop/${deviceId}/${mapChannelId(channelId)}`);
}

/* ───── 云台控制 ───── */
export async function ptzControl(deviceId: string, channelId: string, cmd: number, horizonSpeed: number = 50, verticalSpeed: number = 50, zoomSpeed: number = 50): Promise<void> {
  await wvp.post<void>('/api/device/control/ptz', {
    deviceId,
    channelId: mapChannelId(channelId),
    cmd,
    horizonSpeed,
    verticalSpeed,
    zoomSpeed,
  });
}

/* ───── 截图 ───── */
export async function snap(deviceId: string, channelId: string): Promise<string> {
  const resp = await wvp.get<{ snapUrl: string }>(`/api/device/query/snap/${deviceId}/${channelId}`);
  return resp.data.snapUrl;
}

/* ───── 查询设备状态 ───── */
export async function getDeviceStatus(deviceId: string): Promise<any> {
  const resp = await wvp.get<any>(`/api/device/query/devices/${deviceId}/status`);
  return resp.data;
}
