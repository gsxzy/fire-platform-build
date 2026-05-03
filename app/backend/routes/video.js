/**
 * ═══════════════════════════════════════════════════════════════
 * 视频设备路由 - 统一对接 WVP-PRO HTTP API
 * 废弃硬编码 RTSP，后端代理调用 WVP
 * ═══════════════════════════════════════════════════════════════
 */
const express = require('express');
const router = express.Router();
const wvp = require('../services/wvp.service');

function log(tag, msg) {
  console.log(`[VideoRoute][${new Date().toISOString()}][${tag}] ${msg}`);
}

/* ── 统一成功响应 ── */
function ok(res, data, msg = 'success') {
  res.json({ code: 200, msg, data });
}

/* ── 统一错误响应 ── */
function fail(res, msg, code = 500, statusCode = 500) {
  log('ERROR', msg);
  res.status(statusCode).json({ code, msg, data: null });
}

/* ── 1. 获取视频设备列表 ──
 * GET /api/video/devices?page=1&count=100&query=&online=
 */
router.get('/devices', async (req, res) => {
  try {
    const params = {
      page: Number(req.query.page) || 1,
      count: Number(req.query.count) || 100,
      query: req.query.query,
      online: req.query.online !== undefined ? req.query.online === 'true' : undefined,
    };
    log('REQ', `获取设备列表 page=${params.page} count=${params.count}`);
    const data = await wvp.getVideoDevices(params);
    ok(res, data, '获取设备列表成功');
  } catch (err) {
    log('WARN', `WVP-PRO 不可用: ${err.message}，返回空列表`);
    ok(res, { total: 0, list: [] }, 'WVP-PRO 服务暂不可用');
  }
});

/* ── 2. 获取设备通道列表 ──
 * GET /api/video/devices/:deviceId/channels
 */
router.get('/devices/:deviceId/channels', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const params = {
      page: Number(req.query.page) || 1,
      count: Number(req.query.count) || 100,
    };
    log('REQ', `获取通道列表 deviceId=${deviceId}`);
    const data = await wvp.getDeviceChannels(deviceId, params);
    ok(res, data, '获取通道列表成功');
  } catch (err) {
    fail(res, `获取通道列表失败: ${err.message}`, 500);
  }
});

/* ── 3. 开始播放/获取流地址 ──
 * POST /api/video/stream
 * body: { deviceId, channelId }
 */
router.post('/stream', async (req, res) => {
  try {
    const { deviceId, channelId } = req.body;
    if (!deviceId || !channelId) {
      return fail(res, 'deviceId 和 channelId 不能为空', 400, 400);
    }
    log('REQ', `开始播放 deviceId=${deviceId} channelId=${channelId}`);
    const stream = await wvp.getStream(deviceId, channelId);
    ok(res, stream, '获取播放地址成功');
  } catch (err) {
    if (err.message && err.message.includes('offline')) {
      return fail(res, '设备离线，无法播放', 503, 503);
    }
    fail(res, `获取播放地址失败: ${err.message}`, 500);
  }
});

/* ── 4. 停止播放 ──
 * POST /api/video/stop
 * body: { deviceId, channelId }
 */
router.post('/stop', async (req, res) => {
  try {
    const { deviceId, channelId } = req.body;
    if (!deviceId || !channelId) {
      return fail(res, 'deviceId 和 channelId 不能为空', 400, 400);
    }
    log('REQ', `停止播放 deviceId=${deviceId} channelId=${channelId}`);
    await wvp.stopStream(deviceId, channelId);
    ok(res, null, '停止播放成功');
  } catch (err) {
    fail(res, `停止播放失败: ${err.message}`, 500);
  }
});

/* ── 5. PTZ 云台控制 ──
 * POST /api/video/ptz
 * body: { deviceId, channelId, cmd, horizonSpeed, verticalSpeed, zoomSpeed }
 * cmd: 0=上 1=下 2=左 3=右 8=放大 9=缩小 7=停止
 */
router.post('/ptz', async (req, res) => {
  try {
    const { deviceId, channelId, cmd, horizonSpeed, verticalSpeed, zoomSpeed } = req.body;
    if (!deviceId || !channelId || cmd === undefined) {
      return fail(res, 'deviceId、channelId 和 cmd 不能为空', 400, 400);
    }
    const cmdMap = {
      up: 0, down: 1, left: 2, right: 3,
      zoomIn: 8, zoomOut: 9, stop: 7,
    };
    const cmdNum = cmdMap[cmd] !== undefined ? cmdMap[cmd] : Number(cmd);
    log('REQ', `PTZ控制 deviceId=${deviceId} channelId=${channelId} cmd=${cmdNum}`);
    await wvp.ptzControl(deviceId, channelId, cmdNum, horizonSpeed, verticalSpeed, zoomSpeed);
    ok(res, null, '云台控制成功');
  } catch (err) {
    fail(res, `云台控制失败: ${err.message}`, 500);
  }
});

/* ── 6. 预设位控制 ──
 * POST /api/video/preset
 * body: { deviceId, channelId, action, presetNo }
 * action: set/goto/remove
 */
router.post('/preset', async (req, res) => {
  try {
    const { deviceId, channelId, action, presetNo } = req.body;
    if (!deviceId || !channelId || !action || presetNo === undefined) {
      return fail(res, 'deviceId、channelId、action 和 presetNo 不能为空', 400, 400);
    }
    log('REQ', `预设位控制 deviceId=${deviceId} action=${action} presetNo=${presetNo}`);
    await wvp.presetControl(deviceId, channelId, action, presetNo);
    ok(res, null, '预设位控制成功');
  } catch (err) {
    fail(res, `预设位控制失败: ${err.message}`, 500);
  }
});

/* ── 7. 录像回放 ──
 * POST /api/video/playback
 * body: { deviceId, channelId, startTime, endTime }
 */
router.post('/playback', async (req, res) => {
  try {
    const { deviceId, channelId, startTime, endTime } = req.body;
    if (!deviceId || !channelId || !startTime || !endTime) {
      return fail(res, 'deviceId、channelId、startTime 和 endTime 不能为空', 400, 400);
    }
    log('REQ', `录像回放 deviceId=${deviceId} start=${startTime} end=${endTime}`);
    const stream = await wvp.getPlayback(deviceId, channelId, startTime, endTime);
    ok(res, stream, '获取回放地址成功');
  } catch (err) {
    fail(res, `获取回放地址失败: ${err.message}`, 500);
  }
});

/* ── 8. 截图 ──
 * GET /api/video/snapshot/:deviceId/:channelId
 */
router.get('/snapshot/:deviceId/:channelId', async (req, res) => {
  try {
    const { deviceId, channelId } = req.params;
    log('REQ', `截图 deviceId=${deviceId} channelId=${channelId}`);
    const snapUrl = await wvp.snapshot(deviceId, channelId);
    ok(res, { snapUrl }, '截图成功');
  } catch (err) {
    fail(res, `截图失败: ${err.message}`, 500);
  }
});

/* ── 9. 查询设备状态 ──
 * GET /api/video/devices/:deviceId/status
 */
router.get('/devices/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;
    log('REQ', `查询设备状态 deviceId=${deviceId}`);
    const status = await wvp.getDeviceStatus(deviceId);
    ok(res, status, '查询设备状态成功');
  } catch (err) {
    fail(res, `查询设备状态失败: ${err.message}`, 500);
  }
});

module.exports = router;
