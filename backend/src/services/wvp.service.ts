/**
 * ═════════════════════════════════════════════════════════════════
 * WVP-PRO HTTP API 客户端
 * 后端代理层：统一调用 WVP-PRO，管理登录/Token/异常
 * ═════════════════════════════════════════════════════════════════
 */
import crypto from 'crypto';
import logger from '@/config/logger';

const WVP_URL = process.env.WVP_PRO_URL || 'http://localhost:18080';
if (!process.env.WVP_PRO_USER) {
  throw new Error('[WVP] 错误：未设置 WVP_PRO_USER 环境变量');
}
const WVP_USER = process.env.WVP_PRO_USER;
const WVP_SECRET = process.env.WVP_PRO_SECRET;

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

let wvpToken: string | null = null;
let tokenExpiry = 0;

function logWvp(tag: string, msg: string) {
  logger.info(`[WVP][${tag}] ${msg}`);
}

async function wvpLogin(): Promise<string> {
  try {
    if (!WVP_SECRET) {
      throw new Error('[WVP] WVP_PRO_SECRET 未配置');
    }
    const rawPwd = WVP_SECRET;
    const hashedPwd = /^[a-f0-9]{32}$/i.test(rawPwd) ? rawPwd : md5(rawPwd);

    const url = new URL('/api/user/login', WVP_URL);
    url.searchParams.set('username', WVP_USER);
    url.searchParams.set('password', hashedPwd);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json() as any;

    if (data.code !== 0 && data.code !== 200) {
      throw new Error(data.msg || 'WVP登录失败');
    }
    wvpToken = data.data?.accessToken || data.data?.token;
    tokenExpiry = Date.now() + 25 * 60 * 1000;
    logWvp('AUTH', 'WVP登录成功，Token已获取');
    return wvpToken!;
  } catch (err: any) {
    logWvp('AUTH', `WVP登录失败: ${err.message}`);
    throw err;
  }
}

async function ensureToken(): Promise<string> {
  if (!wvpToken || Date.now() > tokenExpiry) {
    await wvpLogin();
  }
  return wvpToken!;
}

async function wvpRequest(method: string, path: string, options: { params?: Record<string, any>; body?: any; timeout?: number } = {}): Promise<any> {
  const token = await ensureToken();
  const url = new URL(path, WVP_URL);
  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || 15000);
  try {
    const resp = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access-token': token,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (resp.status === 401) {
      // Token 过期，重新登录并重试一次
      logWvp('AUTH', 'Token过期，重新登录...');
      wvpToken = null;
      const newToken = await ensureToken();
      const retryResp = await fetch(url.toString(), {
        method,
        headers: {
          'Content-Type': 'application/json',
          'access-token': newToken,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      if (!retryResp.ok) throw new Error(`HTTP ${retryResp.status}`);
      const retryData = await retryResp.json() as any;
      if (retryData.code !== 0 && retryData.code !== 200) {
        throw new Error(retryData.msg || `WVP请求重试失败: ${path}`);
      }
      return retryData;
    }

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json() as any;
    if (data.code !== 0 && data.code !== 200) {
      const err = new Error(data.msg || `WVP请求失败: ${path}`);
      (err as any).code = data.code;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/* ── 编码映射：修复摄像头通道 ID 配置错误 ── */
const CHANNEL_ID_MAP: Record<string, string> = {
  '34020000001300000002': '34020000001320000002',
};
function mapChannelId(channelId: string): string {
  return CHANNEL_ID_MAP[channelId] || channelId;
}

/* ── 1. 获取设备列表 ── */
export async function getVideoDevices(params: { page?: number; count?: number; query?: string; online?: boolean } = {}): Promise<{ total: number; list: any[] }> {
  const { page = 1, count = 100, query, online } = params;
  const q: Record<string, any> = { page, count };
  if (query !== undefined) q.query = query;
  if (online !== undefined) q.online = online;
  const data = await wvpRequest('GET', '/api/device/query/devices', { params: q });
  return data.data || { total: 0, list: [] };
}

/* ── 2. 获取通道列表 ── */
export async function getDeviceChannels(deviceId: string, params: { page?: number; count?: number; query?: string; online?: boolean } = {}): Promise<{ total: number; list: any[] }> {
  const { page = 1, count = 100, query, online } = params;
  const q: Record<string, any> = { page, count };
  if (query !== undefined) q.query = query;
  if (online !== undefined) q.online = online;
  const data = await wvpRequest('GET', `/api/device/query/devices/${deviceId}/channels`, { params: q });
  return data.data || { total: 0, list: [] };
}

export interface WVPStreamInfo {
  deviceId: string;
  channelId: string;
  flv: string;
  hls: string;
  rtmp: string;
  rtsps: string;
  rtc: string;
  wsFlv: string;
  wsHls: string;
  httpsFlv: string;
  httpsHls: string;
  streamId: string;
  mediaServerId: string;
  startTime: string;
  ssrc: string;
}

/* ── 3. 开始播放（返回统一格式） ── */
export async function getStream(deviceId: string, channelId: string): Promise<WVPStreamInfo> {
  const actualChannelId = mapChannelId(channelId);
  const data = await wvpRequest('GET', `/api/play/start/${deviceId}/${actualChannelId}`);
  const raw = data.data || {};
  return {
    deviceId,
    channelId,
    flv: raw.flv || raw.wsFlv || '',
    hls: raw.hls || raw.wsHls || '',
    rtmp: raw.rtmp || '',
    rtsps: raw.rtsps || '',
    rtc: raw.rtc || '',
    wsFlv: raw.wsFlv || '',
    wsHls: raw.wsHls || '',
    httpsFlv: raw.httpsFlv || '',
    httpsHls: raw.httpsHls || '',
    streamId: raw.stream || '',
    mediaServerId: raw.mediaServerId || '',
    startTime: raw.startTime || '',
    ssrc: raw.ssrc || '',
  };
}

/* ── 4. 停止播放 ── */
export async function stopStream(deviceId: string, channelId: string): Promise<any> {
  const actualChannelId = mapChannelId(channelId);
  const data = await wvpRequest('GET', `/api/play/stop/${deviceId}/${actualChannelId}`);
  return data.data || null;
}

/* ── 5. PTZ 云台控制 ── */
export async function ptzControl(
  deviceId: string,
  channelId: string,
  cmd: number,
  horizonSpeed = 50,
  verticalSpeed = 50,
  zoomSpeed = 50
): Promise<any> {
  const body = {
    deviceId,
    channelId: mapChannelId(channelId),
    cmd: Number(cmd),
    horizonSpeed: Number(horizonSpeed),
    verticalSpeed: Number(verticalSpeed),
    zoomSpeed: Number(zoomSpeed),
  };
  const data = await wvpRequest('POST', '/api/device/control/ptz', { body });
  return data.data || null;
}

/* ── 6. 预设位控制 ── */
export async function presetControl(deviceId: string, channelId: string, action: 'set' | 'goto' | 'remove', presetNo: number): Promise<any> {
  const presetCmdMap = { set: 129, goto: 130, remove: 131 };
  const cmd = presetCmdMap[action];
  if (cmd === undefined) {
    throw new Error(`不支持的预设位操作: ${action}，支持 set/goto/remove`);
  }
  const data = await wvpRequest('POST', `/api/ptz/preset/${deviceId}/${channelId}`, {
    body: { cmd, presetNo: Number(presetNo) },
  });
  return data.data || null;
}

export interface WVPPlaybackInfo {
  deviceId: string;
  channelId: string;
  flv: string;
  hls: string;
  rtmp: string;
  wsFlv: string;
  streamId: string;
  startTime: string;
  endTime: string;
  duration: number;
}

/* ── 7. 回放查询 ── */
export async function getPlayback(deviceId: string, channelId: string, startTime: string, endTime: string): Promise<WVPPlaybackInfo> {
  const actualChannelId = mapChannelId(channelId);
  const data = await wvpRequest('GET', `/api/playback/start/${deviceId}/${actualChannelId}`, {
    params: { startTime, endTime },
  });
  const raw = data.data || {};
  return {
    deviceId,
    channelId,
    flv: raw.flv || raw.wsFlv || '',
    hls: raw.hls || raw.wsHls || '',
    rtmp: raw.rtmp || '',
    wsFlv: raw.wsFlv || '',
    streamId: raw.stream || '',
    startTime: raw.startTime || startTime,
    endTime: raw.endTime || endTime,
    duration: raw.duration || 0,
  };
}

/* ── 8. 截图 ── */
export async function snapshot(deviceId: string, channelId: string): Promise<string> {
  const actualChannelId = mapChannelId(channelId);
  const data = await wvpRequest('GET', `/api/device/query/snap/${deviceId}/${actualChannelId}`);
  return data.data?.snapUrl || data.data || '';
}

/* ── 9. 查询设备状态 ── */
export async function getDeviceStatus(deviceId: string): Promise<any> {
  const data = await wvpRequest('GET', `/api/device/query/devices/${deviceId}/status`);
  return data.data || null;
}
