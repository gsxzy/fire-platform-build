"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZLMService = void 0;
/**
 * ═════════════════════════════════════════════════════════════════
 * ZLMediaKit 流媒体服务客户端
 * 通过 ZLMediaKit 直接拉取摄像头 RTSP 流，转为 FLV/HLS
 * ═════════════════════════════════════════════════════════════════
 */
const logger_1 = __importDefault(require("@/config/logger"));
const ZLM_API_URL = process.env.ZLM_API_URL || 'http://localhost:8081';
if (!process.env.ZLM_SECRET) {
    console.error('[ZLM] 错误：未设置 ZLM_SECRET 环境变量，系统无法启动');
    process.exit(1);
}
const ZLM_SECRET = process.env.ZLM_SECRET;
const ZLM_PLAY_HOST = process.env.ZLM_PLAY_HOST || '127.0.0.1';
// 摄像头配置（RTSP 密码从环境变量读取）
const CAMERA_CONFIGS = {
    'CAM-001': {
        name: 'IP CAMERA',
        ip: process.env.CAM1_IP || '127.0.0.1',
        username: process.env.CAM1_USER || '',
        password: process.env.CAM1_PASS || '',
        channel: 1,
        streamKey: 'cam001',
    },
    'CAM-002': {
        name: 'IP CAMERA2',
        ip: process.env.CAM2_IP || '127.0.0.1',
        username: process.env.CAM2_USER || '',
        password: process.env.CAM2_PASS || '',
        channel: 1,
        streamKey: 'cam002',
    },
};
function buildRtspUrl(config) {
    return `rtsp://${config.username}:${config.password}@${config.ip}:554/h264/ch${config.channel}/main/av_stream`;
}
async function zlmRequest(path, params = {}, timeoutMs = 15000) {
    const url = new URL(path, ZLM_API_URL);
    url.searchParams.set('secret', ZLM_SECRET);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const resp = await fetch(url.toString(), { signal: controller.signal });
        if (!resp.ok)
            throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    }
    finally {
        clearTimeout(timer);
    }
}
class ZLMService {
    /**
     * 获取支持的摄像头 ID 列表
     */
    static getCameraIds() {
        return Object.keys(CAMERA_CONFIGS);
    }
    /**
     * 获取指定摄像头配置
     */
    static getCameraConfig(cameraId) {
        return CAMERA_CONFIGS[cameraId] || null;
    }
    /**
     * 通过 ZLMediaKit 添加流代理
     */
    static async addStreamProxy(cameraId) {
        const config = CAMERA_CONFIGS[cameraId];
        if (!config) {
            logger_1.default.error(`[ZLM] 未知摄像头: ${cameraId}`);
            return false;
        }
        if (!config.username || !config.password) {
            logger_1.default.warn(`[ZLM] 跳过 ${cameraId}: RTSP 用户名或密码未配置`);
            return false;
        }
        const rtspUrl = buildRtspUrl(config);
        try {
            logger_1.default.info(`[ZLM] 添加流代理 ${cameraId}: ${rtspUrl}`);
            const data = await zlmRequest('/index/api/addStreamProxy', {
                vhost: '__defaultVhost__',
                app: 'live',
                stream: config.streamKey,
                url: rtspUrl,
                rtp_type: '0',
                timeout_sec: '10',
            });
            if (data.code === 0) {
                logger_1.default.info(`[ZLM] 流代理添加成功 ${cameraId}`);
                return true;
            }
            logger_1.default.warn(`[ZLM] 流代理添加失败 ${cameraId}: ${data.msg}`);
            return false;
        }
        catch (err) {
            logger_1.default.error(`[ZLM] 流代理异常 ${cameraId}: ${err.message}`);
            return false;
        }
    }
    /**
     * 获取流状态
     */
    static async getStreamStatus(cameraId) {
        const config = CAMERA_CONFIGS[cameraId];
        if (!config)
            return null;
        try {
            const data = await zlmRequest('/index/api/getMediaList', {
                schema: 'rtsp',
                vhost: '__defaultVhost__',
                app: 'live',
                stream: config.streamKey,
            }, 10000);
            const streams = data.data || [];
            const stream = streams.find((s) => s.stream === config.streamKey);
            const isAlive = !!stream && stream.readerCount >= 0;
            if (!isAlive) {
                return {
                    cameraId,
                    name: config.name,
                    streamKey: config.streamKey,
                    isAlive: false,
                    flv: '',
                    hls: '',
                    rtmp: '',
                    wsFlv: '',
                };
            }
            return {
                cameraId,
                name: config.name,
                streamKey: config.streamKey,
                isAlive: true,
                flv: `http://${ZLM_PLAY_HOST}:8081/live/${config.streamKey}.live.flv`,
                hls: `http://${ZLM_PLAY_HOST}:8081/live/${config.streamKey}/hls.m3u8`,
                rtmp: `rtmp://${ZLM_PLAY_HOST}/live/${config.streamKey}`,
                wsFlv: `ws://${ZLM_PLAY_HOST}:8081/live/${config.streamKey}.live.flv`,
            };
        }
        catch (err) {
            logger_1.default.warn(`[ZLM] 获取流状态失败 ${cameraId}: ${err.message}`);
            return {
                cameraId,
                name: config.name,
                streamKey: config.streamKey,
                isAlive: false,
                flv: '',
                hls: '',
                rtmp: '',
                wsFlv: '',
            };
        }
    }
    /**
     * 获取所有流状态
     */
    static async getAllStreamStatus() {
        const results = [];
        for (const cameraId of Object.keys(CAMERA_CONFIGS)) {
            const status = await this.getStreamStatus(cameraId);
            if (status)
                results.push(status);
        }
        return results;
    }
    /**
     * 启动指定摄像头推流
     */
    static async startStream(cameraId) {
        return this.addStreamProxy(cameraId);
    }
    /**
     * 停止指定摄像头推流
     */
    static async stopStream(cameraId) {
        const config = CAMERA_CONFIGS[cameraId];
        if (!config) {
            logger_1.default.warn(`[ZLM] 停止推流: 未知摄像头 ${cameraId}`);
            return false;
        }
        try {
            const data = await zlmRequest('/index/api/delStreamProxy', {
                key: `live/${config.streamKey}`,
            }, 10000);
            if (data.code === 0) {
                logger_1.default.info(`[ZLM] 推流已停止 ${cameraId}`);
                return true;
            }
            logger_1.default.warn(`[ZLM] 停止推流失败 ${cameraId}: ${data.msg}`);
            return false;
        }
        catch (err) {
            logger_1.default.error(`[ZLM] 停止推流异常 ${cameraId}: ${err.message}`);
            return false;
        }
    }
    /**
     * 获取播放地址（不检测状态）
     */
    static getPlayUrls(cameraId) {
        const config = CAMERA_CONFIGS[cameraId];
        if (!config)
            return null;
        return {
            flv: `http://${ZLM_PLAY_HOST}:8081/live/${config.streamKey}.live.flv`,
            hls: `http://${ZLM_PLAY_HOST}:8081/live/${config.streamKey}/hls.m3u8`,
            rtmp: `rtmp://${ZLM_PLAY_HOST}/live/${config.streamKey}`,
            wsFlv: `ws://${ZLM_PLAY_HOST}:8081/live/${config.streamKey}.live.flv`,
        };
    }
    /**
     * 自动添加所有摄像头代理
     */
    static async startAll() {
        for (const cameraId of Object.keys(CAMERA_CONFIGS)) {
            const config = CAMERA_CONFIGS[cameraId];
            if (!config.password) {
                logger_1.default.info(`[ZLM] 跳过 ${cameraId}: RTSP 密码未配置`);
                continue;
            }
            await this.addStreamProxy(cameraId);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}
exports.ZLMService = ZLMService;
//# sourceMappingURL=zlm.service.js.map