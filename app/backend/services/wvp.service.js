/**
 * WVP-PRO HTTP API 客户端
 * 后端代理层：统一调用 WVP-PRO，管理登录/Token/异常
 */
const axios = require('axios');

const WVP_URL = process.env.WVP_PRO_URL || 'http://localhost:18080';
const WVP_SECRET = process.env.WVP_PRO_SECRET || '';

let wvpToken = null;
let tokenExpiry = 0;

function log(tag, msg) {
  console.log(`[WVP][${new Date().toISOString()}][${tag}] ${msg}`);
}

/* ── WVP 请求客户端 ── */
const wvpClient = axios.create({
  baseURL: WVP_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/* ── 登录获取 Token ── */
async function wvpLogin() {
  try {
    const resp = await wvpClient.get('/api/user/login', {
      params: { username: 'admin', password: WVP_SECRET || 'admin' },
    });
    const data = resp.data;
    if (data.code !== 0 && data.code !== 200) {
      throw new Error(data.msg || 'WVP登录失败');
    }
    wvpToken = data.data?.accessToken || data.data?.token;
    tokenExpiry = Date.now() + 25 * 60 * 1000; // 25分钟后过期
    log('AUTH', `WVP登录成功，Token已获取`);
    return wvpToken;
  } catch (err) {
    log('AUTH', `WVP登录失败: ${err.message}`);
    throw err;
  }
}

/* ── 确保 Token 有效 ── */
async function ensureToken() {
  if (!wvpToken || Date.now() > tokenExpiry) {
    await wvpLogin();
  }
}

/* ── 统一请求包装 ── */
async function wvpRequest(method, url, options = {}) {
  await ensureToken();
  const config = {
    method,
    url,
    headers: { 'access-token': wvpToken },
    ...options,
  };
  try {
    const resp = await wvpClient(config);
    const data = resp.data;
    if (data.code !== 0 && data.code !== 200) {
      const err = new Error(data.msg || `WVP请求失败: ${url}`);
      err.code = data.code;
      throw err;
    }
    return data;
  } catch (err) {
    if (err.code === 401 || (err.response && err.response.status === 401)) {
      // Token 过期，重新登录并重试一次
      log('AUTH', 'Token过期，重新登录...');
      wvpToken = null;
      await ensureToken();
      config.headers['access-token'] = wvpToken;
      const retry = await wvpClient(config);
      const retryData = retry.data;
      if (retryData.code !== 0 && retryData.code !== 200) {
        throw new Error(retryData.msg || `WVP请求重试失败: ${url}`);
      }
      return retryData;
    }
    throw err;
  }
}

/* ── 1. 获取设备列表 ── */
async function getVideoDevices(params = {}) {
  const { page = 1, count = 100, query, online } = params;
  const q = { page, count };
  if (query !== undefined) q.query = query;
  if (online !== undefined) q.online = online;
  const data = await wvpRequest('GET', '/api/device/query/devices', { params: q });
  return data.data || { total: 0, list: [] };
}

/* ── 2. 获取通道列表 ── */
async function getDeviceChannels(deviceId, params = {}) {
  const { page = 1, count = 100, query, online } = params;
  const q = { page, count };
  if (query !== undefined) q.query = query;
  if (online !== undefined) q.online = online;
  const data = await wvpRequest('GET', `/api/device/query/devices/${deviceId}/channels`, { params: q });
  return data.data || { total: 0, list: [] };
}

/* ── 3. 开始播放（返回统一格式） ── */
async function getStream(deviceId, channelId) {
  const data = await wvpRequest('GET', `/api/play/start/${deviceId}/${channelId}`);
  const raw = data.data || {};
  // 统一返回三种播放地址
  return {
    deviceId,
    channelId,
    flv: raw.flv || raw.wsFlv || '',
    hls: raw.hls || raw.wsHls || '',
    rtmp: raw.rtmp || '',
    rtsps: raw.rtsps || '',
    rtc: raw.rtc || '',
    wsFlv: raw.wsFlv || '',
    httpsFlv: raw.httpsFlv || '',
    httpsHls: raw.httpsHls || '',
    streamId: raw.stream || '',
    mediaServerId: raw.mediaServerId || '',
    startTime: raw.startTime || '',
    ssrc: raw.ssrc || '',
  };
}

/* ── 4. 停止播放 ── */
async function stopStream(deviceId, channelId) {
  const data = await wvpRequest('GET', `/api/play/stop/${deviceId}/${channelId}`);
  return data.data || null;
}

/* ── 5. PTZ 云台控制 ── */
async function ptzControl(deviceId, channelId, cmd, horizonSpeed = 50, verticalSpeed = 50, zoomSpeed = 50) {
  const body = {
    deviceId,
    channelId,
    cmd: Number(cmd),
    horizonSpeed: Number(horizonSpeed),
    verticalSpeed: Number(verticalSpeed),
    zoomSpeed: Number(zoomSpeed),
  };
  const data = await wvpRequest('POST', '/api/device/control/ptz', { data: body });
  return data.data || null;
}

/* ── 6. 预设位控制 ── */
async function presetControl(deviceId, channelId, action, presetNo) {
  // WVP 预设位接口：/api/ptz/preset/{deviceId}/{channelId}
  // action: set(设置)/goto(调用)/remove(删除)
  const presetCmdMap = { set: 129, goto: 130, remove: 131 };
  const cmd = presetCmdMap[action];
  if (cmd === undefined) {
    throw new Error(`不支持的预设位操作: ${action}，支持 set/goto/remove`);
  }
  const data = await wvpRequest('POST', `/api/ptz/preset/${deviceId}/${channelId}`, {
    data: { cmd, presetNo: Number(presetNo) },
  });
  return data.data || null;
}

/* ── 7. 回放查询 ── */
async function getPlayback(deviceId, channelId, startTime, endTime) {
  // WVP 回放接口
  const data = await wvpRequest('GET', `/api/playback/start/${deviceId}/${channelId}`, {
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
async function snapshot(deviceId, channelId) {
  const data = await wvpRequest('GET', `/api/device/query/snap/${deviceId}/${channelId}`);
  return data.data?.snapUrl || data.data || '';
}

/* ── 9. 查询设备状态 ── */
async function getDeviceStatus(deviceId) {
  const data = await wvpRequest('GET', `/api/device/query/devices/${deviceId}/status`);
  return data.data || null;
}

module.exports = {
  getVideoDevices,
  getDeviceChannels,
  getStream,
  stopStream,
  ptzControl,
  presetControl,
  getPlayback,
  snapshot,
  getDeviceStatus,
};
