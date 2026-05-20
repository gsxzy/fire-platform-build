"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canetServer = exports.CanetServer = void 0;
/**
 * ═══════════════════════════════════════════════════════════════════
 * 智嵌 CANET 网关 TCP 服务器
 * 功能：
 * - 监听 TCP 1030（或配置端口），接收 CANET TCP_CLIENT 连接
 * - CAN 帧流式拆包（13 字节 / 帧）
 * - 赋安 FECbus 帧解析（FS5102 CAN 广播帧）
 * - 火警 / 故障 → 统一告警模型
 * - 连接保活管理（CANET keepalive 兼容）
 * ═══════════════════════════════════════════════════════════════════
 */
const net_1 = __importDefault(require("net"));
const logger_1 = __importDefault(require("@/config/logger"));
const database_1 = __importDefault(require("@/config/database"));
const sequelize_1 = require("sequelize");
const alarm_service_1 = require("@/services/alarm.service");
const alarmNo_1 = require("@/utils/alarmNo");
const canet_service_1 = require("./canet.service");
/* ───── 设备类型名称映射（赋安 FECbus D4 字节）──── */
const DEVICE_TYPE_NAMES = {
    0x01: '光电感烟探测器',
    0x02: '感温探测器',
    0x03: '手动报警按钮',
    0x04: '消火栓按钮',
    0x05: '输入模块',
    0x06: '输出模块',
    0x07: '输入输出模块',
    0x08: '声光警报器',
    0x09: '消防广播',
    0x0A: '消防电话',
    0x0B: '防火卷帘',
    0x0C: '防火门',
    0x0D: '应急照明',
    0x0E: '疏散指示',
    0x0F: '气体灭火',
    0x10: '电气火灾探测器',
    0x11: '消防电源',
    0x12: '水位探测器',
    0x13: '压力探测器',
    0x20: '光电烟感', // 赋安常见编码
    0x21: '差定温探测器',
    0x22: '缆式感温',
    0x30: '未知类型',
};
/* ───── 服务器实现 ───── */
class CanetServer {
    server;
    connections = new Map();
    port;
    host;
    constructor(port, host) {
        this.port = port;
        this.host = host;
        this.server = net_1.default.createServer(this.handleConnection.bind(this));
    }
    start() {
        this.server.listen(this.port, this.host, () => {
            logger_1.default.info(`[CANET] TCP Server started on ${this.host}:${this.port} (赋安FS5102 CAN网关接入)`);
        });
        this.server.on('error', (err) => {
            logger_1.default.error(`[CANET] Server error: ${err.message}`);
        });
    }
    stop() {
        return new Promise((resolve) => {
            // 关闭所有连接
            for (const conn of this.connections.values()) {
                conn.socket.destroy();
            }
            this.connections.clear();
            this.server.close(() => {
                logger_1.default.info('[CANET] Server stopped');
                resolve();
            });
        });
    }
    handleConnection(socket) {
        const clientIp = socket.remoteAddress?.replace(/^::ffff:/, '') || 'unknown';
        const clientPort = socket.remotePort || 0;
        const connId = `${clientIp}:${clientPort}`;
        logger_1.default.info(`[CANET] ⬆ New connection from ${connId}`);
        const parser = new canet_service_1.FrameParser();
        const conn = {
            socket,
            clientIp,
            clientPort,
            connId,
            connectedAt: new Date(),
            lastActive: new Date(),
            parser,
            frameCount: 0,
        };
        this.connections.set(connId, conn);
        socket.on('data', (chunk) => {
            conn.lastActive = new Date();
            const frames = parser.push(chunk);
            for (const frame of frames) {
                conn.frameCount++;
                this.handleFrame(frame, conn);
            }
        });
        socket.on('close', (hadError) => {
            const dur = Math.floor((Date.now() - conn.connectedAt.getTime()) / 1000);
            logger_1.default.info(`[CANET] ⬇ Connection closed: ${connId} | 存活${dur}s | 处理帧${conn.frameCount} | error=${hadError}`);
            this.connections.delete(connId);
        });
        socket.on('error', (err) => {
            logger_1.default.error(`[CANET] Socket error ${connId}: ${err.message}`);
            this.connections.delete(connId);
        });
    }
    /* ───── 单帧处理 ───── */
    async handleFrame(frame, conn) {
        try {
            // 只处理扩展数据帧，且数据长度=8（赋安 FECbus 固定 DLC=8）
            if (!frame.isExtended || frame.isRtr || frame.dataLen !== 8) {
                logger_1.default.debug(`[CANET] 跳过非目标帧: ext=${frame.isExtended} rtr=${frame.isRtr} len=${frame.dataLen}`);
                return;
            }
            // 解析赋安 FECbus 广播帧
            const fecbus = (0, canet_service_1.parseFecbusFrame)(frame);
            if (!fecbus) {
                logger_1.default.debug(`[CANET] 非 FECbus 广播帧: ID=0x${frame.canIdHex}`);
                return;
            }
            // 只处理功能码=0x06（设备状态广播）且目标地址=0x00（广播）
            if (fecbus.functionCode !== 0x06 || fecbus.targetAddr !== 0x00) {
                return;
            }
            // 查找关联的 CANET 网关档案和主机档案
            const binding = await this.findDeviceBinding(conn.clientIp, conn.clientPort);
            const deviceTypeName = DEVICE_TYPE_NAMES[fecbus.deviceType]
                || `未知类型(0x${fecbus.deviceType.toString(16).padStart(2, '0').toUpperCase()})`;
            const location = `${binding.hostName || 'FS5102'}(回路${fecbus.loop}/点位${fecbus.point})`;
            const deviceName = binding.hostName
                ? `${binding.hostName}(回路${fecbus.loop}/点位${fecbus.point})`
                : `FS5102(回路${fecbus.loop}/点位${fecbus.point})`;
            // 状态处理
            if (fecbus.status === 0x01) {
                // 火警
                await this.createAlarm('fire', 'urgent', fecbus, binding, deviceName, location, deviceTypeName, conn.connId);
            }
            else if (fecbus.status === 0x02) {
                // 故障
                await this.createAlarm('fault', 'high', fecbus, binding, deviceName, location, deviceTypeName, conn.connId);
            }
            else if (fecbus.status === 0x04) {
                // 屏蔽
                logger_1.default.info(`[CANET] 屏蔽状态: ${location} 类型=${deviceTypeName}`);
            }
            else if (fecbus.status === 0x08) {
                // 启动/动作
                logger_1.default.info(`[CANET] 启动/动作: ${location} 类型=${deviceTypeName}`);
            }
            else if (fecbus.status === 0x10) {
                // 反馈
                logger_1.default.info(`[CANET] 反馈: ${location} 类型=${deviceTypeName}`);
            }
            else if (fecbus.status === 0x00) {
                // 正常——记录日志用于恢复逻辑
                logger_1.default.debug(`[CANET] 正常状态: ${location}`);
            }
            else {
                logger_1.default.warn(`[CANET] 未知状态码 0x${fecbus.status.toString(16)}: ${location}`);
            }
        }
        catch (err) {
            logger_1.default.error(`[CANET] 帧处理错误: ${err.message}`);
        }
    }
    /* ───── 查找设备绑定 ───── */
    async findDeviceBinding(clientIp, clientPort) {
        try {
            // 策略1：通过 fire_iot_device 的 ip_address 精确匹配
            const rows = await database_1.default.query(`SELECT
           i.id, i.device_sn, i.archive_device_id,
           d.id AS device_id, d.device_name, d.unit_id, u.unit_name
         FROM fire_iot_device i
         JOIN fire_device d ON i.archive_device_id = d.id
         LEFT JOIN fire_unit u ON d.unit_id = u.id
         WHERE i.protocol_type = 'canet'
           AND (i.ip_address = ? OR i.device_sn LIKE ?)
         ORDER BY i.updated_at DESC
         LIMIT 1`, { replacements: [clientIp, `%CANET%`], type: sequelize_1.QueryTypes.SELECT });
            if (rows && rows.length > 0) {
                const r = rows[0];
                return {
                    deviceId: r.device_id ?? null,
                    hostName: r.device_name ?? null,
                    unitId: r.unit_id ?? null,
                    unitName: r.unit_name ?? null,
                };
            }
            // 策略2：找不到绑定，返回空，告警仍创建但显示原始信息
            return { deviceId: null, hostName: null, unitId: null, unitName: null };
        }
        catch (err) {
            logger_1.default.error(`[CANET] 设备绑定查询失败: ${err.message}`);
            return { deviceId: null, hostName: null, unitId: null, unitName: null };
        }
    }
    /* ───── 创建统一告警 ───── */
    async createAlarm(type, level, fecbus, binding, deviceName, location, deviceTypeName, connId) {
        const alarmNo = (0, alarmNo_1.generateAlarmNo)();
        const typeMap = { fire: 1, fault: 2 };
        const levelMap = { urgent: 3, high: 2, normal: 1 };
        await alarm_service_1.AlarmService.createAlarm({
            alarm_no: alarmNo,
            alarm_type: typeMap[type] || 2,
            alarm_level: levelMap[level] || 1,
            device_id: binding.deviceId,
            device_name: deviceName,
            unit_id: binding.unitId,
            unit_name: binding.unitName,
            location,
            alarm_desc: `${type === 'fire' ? '火警' : '故障'} ${location} ${deviceTypeName}`,
            protocol: 'CANET-FECbus',
            raw_data: fecbus.rawHex,
            code: deviceTypeName,
            loop_no: fecbus.loop,
            address: fecbus.point,
            host_code: connId,
        });
        logger_1.default.warn(`[CANET] 🚨 ${type === 'fire' ? '火警' : '故障'} 回路${fecbus.loop} 点位${fecbus.point} ${deviceTypeName} | conn=${connId}`);
    }
    /* ───── 状态接口 ───── */
    getStats() {
        return Array.from(this.connections.values()).map((conn) => ({
            connId: conn.connId,
            clientIp: conn.clientIp,
            clientPort: conn.clientPort,
            connectedAt: conn.connectedAt,
            lastActive: conn.lastActive,
            durationSec: Math.floor((Date.now() - conn.connectedAt.getTime()) / 1000),
            frameCount: conn.frameCount,
        }));
    }
}
exports.CanetServer = CanetServer;
/* ───── 导出单例 ───── */
const CANET_TCP_PORT = parseInt(process.env.CANET_PORT || '1030', 10);
const CANET_TCP_HOST = process.env.CANET_HOST || '0.0.0.0';
exports.canetServer = new CanetServer(CANET_TCP_PORT, CANET_TCP_HOST);
exports.default = exports.canetServer;
//# sourceMappingURL=canet.server.js.map