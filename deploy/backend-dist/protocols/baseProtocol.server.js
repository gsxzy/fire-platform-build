"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProtocolServer = void 0;
/**
 * ═══════════════════════════════════════════════════════════════════
 * BaseProtocolServer - TCP 协议服务器抽象基类
 * 消除 GB26875 / FSCN8001 的重复代码（stop/getStatus/设备同步/告警创建）
 * ═══════════════════════════════════════════════════════════════════
 */
const net_1 = __importDefault(require("net"));
const logger_1 = __importDefault(require("@/config/logger"));
const database_1 = __importDefault(require("@/config/database"));
const events_1 = require("events");
const alarm_service_1 = require("@/services/alarm.service");
const deviceHeartbeat_service_1 = require("@/services/deviceHeartbeat.service");
const alarmNo_1 = require("@/utils/alarmNo");
class BaseProtocolServer extends events_1.EventEmitter {
    server = null;
    port;
    host;
    running = false;
    connections = new Map();
    heartbeatTimer = null;
    deviceHeartbeatService;
    constructor(port, host) {
        super();
        this.port = port;
        this.host = host;
        this.deviceHeartbeatService = deviceHeartbeat_service_1.DeviceHeartbeatService.getInstance(database_1.default);
    }
    /* ───── 启动框架（子类可覆盖 onBeforeStart / onSocketConnected）──── */
    async start() {
        await this.ensureTables();
        this.onBeforeStart();
        return new Promise((resolve, reject) => {
            this.server = net_1.default.createServer((socket) => {
                const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
                const clientIp = socket.remoteAddress || 'unknown';
                logger_1.default.info(`[${this.protocolName}] 新设备连接: ${clientAddress}`);
                this.onSocketConnected(socket, clientAddress, clientIp);
            });
            this.server.on('error', (err) => {
                logger_1.default.error(`[${this.protocolName}] 服务器启动失败: ${err.message}`);
                reject(err);
            });
            this.server.listen(this.port, this.host, () => {
                this.running = true;
                logger_1.default.info(`[${this.protocolName}] ✅ 服务器启动成功，监听 ${this.host}:${this.port}`);
                resolve();
            });
        });
    }
    /* ───── 优雅关闭（通用）──── */
    async stop() {
        return new Promise((resolve) => {
            this.running = false;
            if (this.heartbeatTimer) {
                clearInterval(this.heartbeatTimer);
                this.heartbeatTimer = null;
            }
            for (const conn of this.connections.values()) {
                conn.socket.destroy();
            }
            this.connections.clear();
            if (this.server) {
                this.server.close(() => {
                    logger_1.default.info(`[${this.protocolName}] 服务器已停止`);
                    this.server = null;
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
    /* ───── 状态（通用）──── */
    getStatus() {
        return {
            running: this.running,
            port: this.port,
            host: this.host,
            onlineCount: this.connections.size,
        };
    }
    /* ───── 子类钩子 ───── */
    onBeforeStart() { }
    onSocketConnected(_socket, _clientAddress, _clientIp) { }
    /* ───── 统一设备模型同步（通用）──── */
    async syncUnifiedDevice(deviceSn, ip, state) {
        try {
            const status = state === 'online' ? 1 : 3;
            await database_1.default.query(`INSERT INTO fire_device (device_no, device_sn, device_name, device_type, unit_id, status, lifecycle_status, last_online, protocol_type, created_at, updated_at)
         VALUES (?, ?, ?, '传输装置', 0, ?, 2, NOW(), ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           device_sn = VALUES(device_sn),
           status = VALUES(status),
           lifecycle_status = VALUES(lifecycle_status),
           last_online = VALUES(last_online),
           protocol_type = VALUES(protocol_type),
           updated_at = NOW()`, { replacements: [deviceSn, deviceSn, deviceSn, status, this.protocolName] });
            const [rows] = await database_1.default.query(`SELECT id FROM fire_device WHERE device_sn = ? LIMIT 1`, { replacements: [deviceSn], type: 'SELECT' });
            const deviceId = rows[0]?.id;
            if (deviceId) {
                await this.deviceHeartbeatService.updateHeartbeat(deviceId, deviceSn, this.protocolName);
                if (state === 'offline') {
                    await this.deviceHeartbeatService.markOffline(deviceId);
                }
            }
        }
        catch (err) {
            logger_1.default.error(`[${this.protocolName}] 同步统一设备失败: ${err.message}`);
        }
    }
    /* ───── 统一告警模型创建（通用，子类可覆盖）──── */
    async createUnifiedAlarm(deviceSn, alarmType, alarmLevel, description, rawData) {
        try {
            const typeMap = { fire: 1, fault: 2, pre: 3, shield: 4, supervisory: 5, feedback: 5, test: 5 };
            const levelMap = { high: 3, normal: 2, low: 1 };
            const alarmNo = (0, alarmNo_1.generateAlarmNo)();
            await alarm_service_1.AlarmService.createAlarm({
                alarm_no: alarmNo,
                alarm_type: typeMap[alarmType] || 5,
                alarm_level: levelMap[alarmLevel] || 1,
                device_id: null,
                device_name: deviceSn,
                unit_id: null,
                location: description || alarmType,
                alarm_desc: description || alarmType,
                protocol: this.protocolName,
                raw_data: rawData,
            });
            logger_1.default.warn(`[${this.protocolName}] 统一告警创建: ${deviceSn} ${alarmType}`);
        }
        catch (err) {
            logger_1.default.error(`[${this.protocolName}] 创建统一告警失败: ${err.message}`);
        }
    }
}
exports.BaseProtocolServer = BaseProtocolServer;
//# sourceMappingURL=baseProtocol.server.js.map