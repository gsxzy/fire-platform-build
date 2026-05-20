"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
/**
 * ═══════════════════════════════════════════════════════════════════
 * WebSocket实时通信服务
 * 告警推送、设备状态更新、联动状态广播
 * ═══════════════════════════════════════════════════════════════════
 */
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = __importDefault(require("@/config/redis"));
const logger_1 = __importDefault(require("@/config/logger"));
const jwt_1 = require("@/utils/jwt");
const models_1 = require("@/models");
class WebSocketService {
    static wss = null;
    static clients = new Map();
    static redisAlarmBridgeBound = false;
    static JWT_SECRET = jwt_1.SECRET;
    // 连接限制
    static MAX_CONNECTIONS = parseInt(process.env.WS_MAX_CONNECTIONS || '1000', 10);
    static MAX_CONNECTIONS_PER_IP = parseInt(process.env.WS_MAX_CONN_PER_IP || '10', 10);
    static ipConnectionCounts = new Map();
    // 消息速率限制
    static MAX_MSG_PER_MINUTE = parseInt(process.env.WS_MAX_MSG_PER_MIN || '60', 10);
    static messageCounts = new Map();
    static getWss() {
        return this.wss;
    }
    /**
     * 初始化WebSocket服务器（全局仅应调用一次）
     */
    static init(server) {
        if (this.wss) {
            logger_1.default.warn('[WS] init() called again; existing server kept, skip duplicate attach');
            return;
        }
        this.wss = new ws_1.WebSocketServer({ server, path: '/ws' });
        this.wss.on('connection', (ws, req) => {
            // 全局连接数限制
            if (this.clients.size >= this.MAX_CONNECTIONS) {
                logger_1.default.warn(`[WS] Max connections reached (${this.MAX_CONNECTIONS}), rejecting new connection`);
                ws.close(1013, 'Server overloaded');
                return;
            }
            // 单IP连接数限制
            const clientIp = req.socket.remoteAddress || 'unknown';
            const ipCount = this.ipConnectionCounts.get(clientIp) || 0;
            if (ipCount >= this.MAX_CONNECTIONS_PER_IP) {
                logger_1.default.warn(`[WS] Max connections per IP reached for ${clientIp} (${this.MAX_CONNECTIONS_PER_IP})`);
                ws.close(1013, 'Too many connections');
                return;
            }
            this.ipConnectionCounts.set(clientIp, ipCount + 1);
            this.handleConnection(ws, req, clientIp);
        });
        this.wss.on('error', (err) => {
            logger_1.default.error(`[WS] Server error: ${err.message}`);
        });
        this.bindRedisAlarmBridge();
        logger_1.default.info('[WS] Server initialized');
    }
    /** Redis fire:alarm → 推送给所有在线连接（与旧 index 行为一致） */
    static bindRedisAlarmBridge() {
        if (this.redisAlarmBridgeBound)
            return;
        this.redisAlarmBridgeBound = true;
        const subRedis = redis_1.default.duplicate();
        subRedis.subscribe('fire:alarm', (err) => {
            if (err)
                logger_1.default.error('[WS] Redis subscribe error:', err);
            else
                logger_1.default.info('[WS] Subscribed to fire:alarm');
        });
        subRedis.on('message', (channel, message) => {
            if (channel !== 'fire:alarm')
                return;
            try {
                const payload = JSON.parse(message);
                // payload = { type: 'new_alarm', data: alarm }
                this.broadcastAlarm(payload.data);
            }
            catch (e) {
                logger_1.default.error(`[WS] Invalid Redis alarm payload: ${e?.message}`);
            }
        });
    }
    /** 广播 { type, data, timestamp } 给所有已连接客户端 */
    static broadcastSimple(type, data) {
        const payload = JSON.stringify({ type, data, timestamp: Date.now() });
        for (const ws of this.clients.keys()) {
            if (ws.readyState === ws_1.WebSocket.OPEN)
                ws.send(payload);
        }
    }
    /** 向指定用户推送 { type, data, timestamp }（JWT userId 需一致） */
    static sendToUserByType(userId, type, data) {
        const payload = JSON.stringify({ type, data, timestamp: Date.now() });
        for (const [ws, client] of this.clients.entries()) {
            if (client.userId === userId && ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(payload);
            }
        }
    }
    /**
     * 处理新连接
     */
    static async handleConnection(ws, req, clientIp) {
        const client = {
            ws,
            subscribedTopics: new Set(),
            connectedAt: new Date()
        };
        // 验证 JWT：支持 Authorization 头或查询参数 ?token=（浏览器 WebSocket 常用）
        let token = req.headers.authorization?.replace(/^Bearer\s+/i, '')?.trim();
        if (!token && req.url) {
            try {
                token = new URL(req.url, 'http://localhost').searchParams.get('token') || '';
            }
            catch {
                token = '';
            }
        }
        if (token) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
                client.userId = decoded.userId ?? decoded.id;
                client.userName = decoded.username;
            }
            catch {
                logger_1.default.warn('[WS] Invalid JWT token');
                try {
                    ws.send(JSON.stringify({
                        type: 'error',
                        data: { message: '认证失败' },
                        timestamp: Date.now()
                    }));
                }
                catch { /* ignore */ }
                try {
                    ws.close();
                }
                catch { /* ignore */ }
                return;
            }
        }
        // 保存客户端
        this.clients.set(ws, client);
        // 设置心跳
        const heartbeat = setInterval(() => {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'ping',
                    timestamp: Date.now()
                }));
            }
            else {
                clearInterval(heartbeat);
            }
        }, 30000);
        ws.on('message', (message) => {
            this.handleMessage(ws, message, client);
        });
        ws.on('close', () => {
            clearInterval(heartbeat);
            this.clients.delete(ws);
            this.messageCounts.delete(ws);
            const currentIpCount = this.ipConnectionCounts.get(clientIp) || 0;
            if (currentIpCount > 1) {
                this.ipConnectionCounts.set(clientIp, currentIpCount - 1);
            }
            else {
                this.ipConnectionCounts.delete(clientIp);
            }
            logger_1.default.info(`[WS] Client disconnected: ${client.userName || 'anonymous'}`);
        });
        ws.on('error', (err) => {
            logger_1.default.error(`[WS] Client error: ${err.message}`);
        });
        // 发送连接成功消息
        ws.send(JSON.stringify({
            type: 'connected',
            data: { userId: client.userId, userName: client.userName },
            timestamp: Date.now()
        }));
        logger_1.default.info(`[WS] New connection: ${client.userName || 'anonymous'}`);
    }
    /**
     * 处理客户端消息
     */
    static async handleMessage(ws, message, client) {
        // 消息速率限制
        const now = Date.now();
        const msgCount = this.messageCounts.get(ws);
        if (msgCount) {
            if (now - msgCount.windowStart > 60000) {
                this.messageCounts.set(ws, { count: 1, windowStart: now });
            }
            else if (msgCount.count >= this.MAX_MSG_PER_MINUTE) {
                logger_1.default.warn(`[WS] Message rate limit exceeded for client ${client.userName || 'anonymous'}`);
                ws.send(JSON.stringify({ type: 'error', data: { message: '消息发送过于频繁' }, timestamp: now }));
                return;
            }
            else {
                msgCount.count++;
            }
        }
        else {
            this.messageCounts.set(ws, { count: 1, windowStart: now });
        }
        try {
            const msg = JSON.parse(message);
            switch (msg.type) {
                case 'subscribe':
                    // 订阅主题
                    if (msg.topic) {
                        client.subscribedTopics.add(msg.topic);
                        logger_1.default.info(`[WS] Client subscribed to: ${msg.topic}`);
                    }
                    break;
                case 'unsubscribe':
                    // 取消订阅
                    if (msg.topic) {
                        client.subscribedTopics.delete(msg.topic);
                    }
                    break;
                case 'ping':
                    // 心跳响应
                    ws.send(JSON.stringify({
                        type: 'pong',
                        timestamp: Date.now()
                    }));
                    break;
                default:
                    logger_1.default.warn(`[WS] Unknown message type: ${msg.type}`);
            }
        }
        catch (err) {
            logger_1.default.error(`[WS] Message handling error: ${err.message}`);
        }
    }
    /**
     * 广播告警
     */
    static async broadcastAlarm(alarm) {
        const message = {
            type: 'new_alarm',
            data: {
                id: alarm.id,
                alarm_no: alarm.alarm_no,
                alarm_type: alarm.alarm_type,
                alarm_level: alarm.alarm_level,
                device_id: alarm.device_id,
                device_name: alarm.device_name,
                unit_id: alarm.unit_id,
                unit_name: alarm.unit_name,
                location: alarm.location,
                alarm_desc: alarm.alarm_desc,
                status: alarm.status,
                created_at: alarm.created_at
            },
            timestamp: Date.now()
        };
        this.broadcast(message, 'alarm');
    }
    /**
     * 广播设备状态更新
     */
    static async broadcastDeviceStatus(deviceId, status) {
        const device = await models_1.Device.findByPk(deviceId);
        const message = {
            type: 'device_status',
            data: {
                id: device?.id,
                device_no: device?.device_no,
                device_name: device?.device_name,
                device_type: device?.device_type,
                status: status,
                last_online: new Date()
            },
            timestamp: Date.now()
        };
        this.broadcast(message, 'device');
    }
    /**
     * 广播联动状态
     */
    static async broadcastLinkageStatus(alarmId, linkageData) {
        const message = {
            type: 'linkage_status',
            data: {
                alarmId,
                status: linkageData.status,
                actions: linkageData.actions,
                results: linkageData.results,
                startTime: linkageData.startTime,
                completedTime: linkageData.completedTime
            },
            timestamp: Date.now()
        };
        this.broadcast(message, 'linkage');
    }
    /**
     * 广播控制指令状态
     */
    static async broadcastCommandStatus(commandId, status) {
        const command = await models_1.ControlCommand.findByPk(commandId);
        let parsedResult = null;
        if (command?.result) {
            try {
                parsedResult = JSON.parse(command.result);
            }
            catch {
                parsedResult = command.result;
            }
        }
        const message = {
            type: 'command_status',
            data: {
                id: command?.id,
                cmd_no: command?.cmd_no,
                device_id: command?.device_id,
                device_name: command?.device_name,
                status: status,
                result: parsedResult,
                execute_time: command?.execute_time
            },
            timestamp: Date.now()
        };
        this.broadcast(message, 'command');
    }
    /**
     * 发送系统通知
     */
    static async sendSystemNotify(userId, notify) {
        const message = {
            type: 'system_notify',
            data: {
                userId,
                ...notify
            },
            timestamp: Date.now()
        };
        // 发送给指定用户
        for (const [ws, client] of this.clients.entries()) {
            if (client.userId === userId && ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        }
    }
    /**
     * 广播消息（所有订阅该主题的客户端）
     */
    static broadcast(message, topic) {
        const messageStr = JSON.stringify(message);
        for (const [ws, client] of this.clients.entries()) {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                // 如果客户端订阅了主题，或者是系统管理员
                if (client.subscribedTopics.has(topic) || client.subscribedTopics.has('all')) {
                    ws.send(messageStr);
                }
            }
        }
        logger_1.default.info(`[WS] Broadcast: ${message.type} to ${this.clients.size} clients`);
    }
    /**
     * 获取在线客户端数
     */
    static getOnlineCount() {
        return this.clients.size;
    }
    /**
     * 获取客户端列表
     */
    static getClients() {
        return Array.from(this.clients.values());
    }
    /**
     * 关闭所有连接
     */
    static closeAll() {
        for (const [ws] of this.clients.entries()) {
            ws.close();
        }
        this.clients.clear();
        logger_1.default.info('[WS] All connections closed');
    }
}
exports.WebSocketService = WebSocketService;
//# sourceMappingURL=websocket.service.js.map