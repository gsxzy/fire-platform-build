"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoController = void 0;
const respond_1 = require("@/utils/respond");
const response_1 = require("@/utils/response");
const httpError_1 = require("@/utils/httpError");
const video_service_1 = require("@/services/video.service");
const logger_1 = __importDefault(require("@/config/logger"));
function log(tag, msg) {
    logger_1.default.info(`[VideoRoute][${tag}] ${msg}`);
}
exports.VideoController = {
    /* ══════════════════════════════════════════════════════════════
       1. 设备列表
       ══════════════════════════════════════════════════════════════ */
    async list(req, res) {
        try {
            const params = {
                page: Number(req.query.page) || 1,
                count: Number(req.query.count) || 100,
                query: req.query.query,
                online: req.query.online !== undefined ? req.query.online === 'true' : undefined,
            };
            const data = await video_service_1.VideoService.getVideoDevices(params);
            (0, respond_1.sendSuccess)(res, req, data, '获取设备列表成功');
        }
        catch (err) {
            log('ERROR', `获取设备列表失败: ${err.message}`);
            return res.json((0, response_1.fail)(`获取设备列表失败: ${err.message}`));
        }
    },
    /* ══════════════════════════════════════════════════════════════
       2. 通道列表
       ══════════════════════════════════════════════════════════════ */
    async channels(req, res) {
        try {
            const { deviceId } = req.params;
            const params = {
                page: Number(req.query.page) || 1,
                count: Number(req.query.count) || 100,
            };
            const data = await video_service_1.VideoService.getDeviceChannels(deviceId, params);
            (0, respond_1.sendSuccess)(res, req, data, '获取通道列表成功');
        }
        catch (err) {
            log('ERROR', `获取通道列表失败: ${err.message}`);
            return res.json((0, response_1.fail)(`获取通道列表失败: ${err.message}`));
        }
    },
    /* ══════════════════════════════════════════════════════════════
       3. 流列表（ZLM）
       ══════════════════════════════════════════════════════════════ */
    async streams(req, res) {
        try {
            const data = await video_service_1.VideoService.getAllZLMStreamStatus();
            (0, respond_1.sendSuccess)(res, req, data, '获取流列表成功');
        }
        catch (err) {
            log('ERROR', `获取流列表失败: ${err.message}`);
            return res.json((0, response_1.fail)(`获取流列表失败: ${err.message}`));
        }
    },
    /* ══════════════════════════════════════════════════════════════
       4. 指定摄像头流状态（ZLM）
       ══════════════════════════════════════════════════════════════ */
    async streamStatus(req, res) {
        try {
            const { cameraId } = req.params;
            const data = await video_service_1.VideoService.getZLMStreamStatus(cameraId);
            if (!data) {
                throw new httpError_1.HttpError(`摄像头不存在: ${cameraId}`, 404);
            }
            (0, respond_1.sendSuccess)(res, req, data, '获取流状态成功');
        }
        catch (err) {
            log('ERROR', `获取流状态失败: ${err.message}`);
            return res.json((0, response_1.fail)(`获取流状态失败: ${err.message}`));
        }
    },
    /* ══════════════════════════════════════════════════════════════
       5. 开始推流（ZLM）
       ══════════════════════════════════════════════════════════════ */
    async startStream(req, res) {
        try {
            const { cameraId } = req.params;
            const started = await video_service_1.VideoService.startZLMStream(cameraId);
            if (!started) {
                throw new httpError_1.HttpError(`启动推流失败: ${cameraId}`, 400);
            }
            // 立即返回启动状态，客户端轮询获取流状态（避免setTimeout导致响应关闭后写res崩溃）
            (0, respond_1.sendSuccess)(res, req, { cameraId, started: true, message: '推流启动中，请稍后查询流状态' }, '推流已启动');
        }
        catch (err) {
            log('ERROR', `启动推流失败: ${err.message}`);
            throw new httpError_1.HttpError(`启动推流失败: ${err.message}`, 500);
        }
    },
    /* ══════════════════════════════════════════════════════════════
       6. 停止推流（ZLM）
       ══════════════════════════════════════════════════════════════ */
    async stopZLMStream(req, res) {
        try {
            const { cameraId } = req.params;
            const stopped = await video_service_1.VideoService.stopZLMStream(cameraId);
            (0, respond_1.sendSuccess)(res, req, { stopped }, '推流已停止');
        }
        catch (err) {
            log('ERROR', `停止推流失败: ${err.message}`);
            return res.json((0, response_1.fail)(`停止推流失败: ${err.message}`));
        }
    },
    /* ══════════════════════════════════════════════════════════════
       7. 获取播放地址（核心兼容接口）
       body: { deviceId, channelId, cameraId }
       ══════════════════════════════════════════════════════════════ */
    async getPlayUrl(req, res) {
        try {
            const { cameraId, deviceId, channelId } = req.body;
            const dev = (deviceId || cameraId || '').trim();
            const ch = (channelId || deviceId || dev || '').trim();
            if (!dev) {
                throw new httpError_1.HttpError('deviceId 不能为空', 400);
            }
            const payload = await video_service_1.VideoService.getUnifiedStream(dev, ch);
            if (!payload || !payload.streamUrl) {
                throw new httpError_1.HttpError(`取流失败或播放地址为空（deviceId=${dev} channelId=${ch}），请检查设备注册与通道 ID`, 502);
            }
            (0, respond_1.sendSuccess)(res, req, payload, '获取播放地址成功');
        }
        catch (err) {
            log('ERROR', `获取播放地址失败: ${err.message}`);
            return res.json((0, response_1.fail)(`获取播放地址失败: ${err.message}`));
        }
    },
    /* ══════════════════════════════════════════════════════════════
       8. 摄像头配置列表（ZLM）
       ══════════════════════════════════════════════════════════════ */
    async cameraConfigs(req, res) {
        try {
            const data = video_service_1.VideoService.getCameraConfigs();
            (0, respond_1.sendSuccess)(res, req, data, '获取摄像头配置成功');
        }
        catch (err) {
            log('ERROR', `获取摄像头配置失败: ${err.message}`);
            return res.json((0, response_1.fail)(`获取摄像头配置失败: ${err.message}`));
        }
    },
    /* ══════════════════════════════════════════════════════════════
       9. 停止播放
       ══════════════════════════════════════════════════════════════ */
    async stopPlay(req, res) {
        try {
            const { deviceId, channelId } = req.body;
            if (!deviceId) {
                throw new httpError_1.HttpError('deviceId 不能为空', 400);
            }
            await video_service_1.VideoService.stopStream(deviceId, channelId);
            (0, respond_1.sendSuccess)(res, req, null, '播放已停止');
        }
        catch (err) {
            log('ERROR', `停止播放失败: ${err.message}`);
            return res.json((0, response_1.fail)(`停止播放失败: ${err.message}`));
        }
    },
    /* ══════════════════════════════════════════════════════════════
       10. PTZ 云台控制
       ══════════════════════════════════════════════════════════════ */
    async ptzControl(req, res) {
        try {
            const { deviceId, channelId, cmd, horizonSpeed, verticalSpeed, zoomSpeed } = req.body;
            const devId = deviceId || req.params.deviceId;
            if (!devId || cmd === undefined) {
                throw new httpError_1.HttpError('deviceId 和 cmd 不能为空', 400);
            }
            await video_service_1.VideoService.ptzControl(devId, channelId || devId, cmd, { horizonSpeed, verticalSpeed, zoomSpeed });
            (0, respond_1.sendSuccess)(res, req, null, '云台控制已发送');
        }
        catch (err) {
            log('ERROR', `云台控制失败: ${err.message}`);
            return res.json((0, response_1.fail)(`云台控制失败: ${err.message}`));
        }
    },
    /* ══════════════════════════════════════════════════════════════
       11. 预设位控制
       ══════════════════════════════════════════════════════════════ */
    async presetControl(req, res) {
        try {
            const { deviceId, channelId, action, presetNo } = req.body;
            const devId = deviceId || req.params.deviceId;
            if (!devId || !action || presetNo === undefined) {
                throw new httpError_1.HttpError('deviceId、action 和 presetNo 不能为空', 400);
            }
            await video_service_1.VideoService.presetControl(devId, channelId || devId, action, Number(presetNo));
            (0, respond_1.sendSuccess)(res, req, null, `预设位${action}已发送`);
        }
        catch (err) {
            log('ERROR', `预设位控制失败: ${err.message}`);
            return res.json((0, response_1.fail)(`预设位控制失败: ${err.message}`));
        }
    },
    /* ══════════════════════════════════════════════════════════════
       12. 录像回放
       ══════════════════════════════════════════════════════════════ */
    async getPlayback(req, res) {
        try {
            const { deviceId, channelId, startTime, endTime } = req.body;
            const devId = deviceId || req.params.deviceId;
            if (!devId || !startTime || !endTime) {
                throw new httpError_1.HttpError('deviceId、startTime 和 endTime 不能为空', 400);
            }
            const payload = await video_service_1.VideoService.getPlayback(devId, channelId || devId, startTime, endTime);
            if (!payload) {
                return res.json((0, response_1.fail)('当前模式不支持录像回放'));
            }
            (0, respond_1.sendSuccess)(res, req, payload, '获取回放地址成功');
        }
        catch (err) {
            log('ERROR', `获取回放地址失败: ${err.message}`);
            return res.json((0, response_1.fail)(`获取回放地址失败: ${err.message}`));
        }
    },
    /* ══════════════════════════════════════════════════════════════
       13. 截图
       ══════════════════════════════════════════════════════════════ */
    async snapshot(req, res) {
        try {
            const { deviceId, channelId } = req.params;
            const devId = deviceId || req.params.deviceId;
            const chId = channelId || devId;
            const result = await video_service_1.VideoService.snapshot(devId, chId);
            if (!result) {
                return res.json((0, response_1.fail)('截图失败'));
            }
            if (result.buffer) {
                res.setHeader('Content-Type', 'image/jpeg');
                return res.send(result.buffer);
            }
            (0, respond_1.sendSuccess)(res, req, { snapUrl: result.snapUrl }, '截图成功');
        }
        catch (err) {
            log('ERROR', `截图失败: ${err.message}`);
            return res.json((0, response_1.fail)(`截图失败: ${err.message}`));
        }
    },
    /* ══════════════════════════════════════════════════════════════
       14. 实时预览（新版接口）
       ══════════════════════════════════════════════════════════════ */
    async livePreview(req, res) {
        try {
            const { deviceId } = req.params;
            const payload = await video_service_1.VideoService.getUnifiedStream(deviceId);
            if (!payload) {
                return res.json((0, response_1.fail)('无法获取视频流'));
            }
            (0, respond_1.sendSuccess)(res, req, {
                hls: payload.hls,
                rtmp: payload.rtmp,
                rtsp: payload.streamUrl,
                flv: payload.flv,
                wsFlv: payload.wsFlv,
            });
        }
        catch (err) {
            log('ERROR', `实时预览失败: ${err.message}`);
            return res.json((0, response_1.fail)(err.message));
        }
    },
    /* ══════════════════════════════════════════════════════════════
       15. 获取视频流（旧版单设备接口，保留兼容）
       ══════════════════════════════════════════════════════════════ */
    async getStream(req, res) {
        try {
            const { deviceId } = req.params;
            const payload = await video_service_1.VideoService.getUnifiedStream(deviceId);
            if (!payload) {
                return res.json((0, response_1.fail)('无法获取视频流'));
            }
            (0, respond_1.sendSuccess)(res, req, payload);
        }
        catch (err) {
            log('ERROR', `获取视频流失败: ${err.message}`);
            return res.json((0, response_1.fail)(err.message));
        }
    },
};
//# sourceMappingURL=video.controller.js.map