"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceHeartbeatService = exports.DeviceHeartbeat = exports.HEARTBEAT_TIMEOUT = void 0;
/**
 * ═══════════════════════════════════════════════════════════════════
 * 设备心跳与在线状态检测服务
 *
 * 功能：
 * - 定时检测所有设备的最后心跳时间
 * - 超过阈值自动标记为离线
 * - 设备离线时产生告警通知
 * - 设备重新上线时自动恢复并通知
 *
 * 超时阈值：
 * - GB26875设备：10分钟（因为协议有心跳包）
 * - MQTT设备：3倍心跳间隔（默认5分钟）
 * - Modbus设备：2倍轮询间隔（默认10分钟）
 * ═══════════════════════════════════════════════════════════════════
 */
const sequelize_1 = require("sequelize");
const logger_1 = __importDefault(require("@/config/logger"));
const node_cron_1 = __importDefault(require("node-cron"));
// 设备类型对应的超时阈值（秒）
exports.HEARTBEAT_TIMEOUT = {
    'gb26875': 600, // 10分钟
    'mqtt': 300, // 5分钟
    'modbus': 600, // 10分钟
    'default': 900, // 15分钟（默认）
};
// Sequelize模型
class DeviceHeartbeat extends sequelize_1.Model {
    id;
    deviceId;
    deviceNo;
    protocolType;
    lastHeartbeatAt;
    status;
    offlineCount;
    lastOfflineAt;
    lastOnlineAt;
    averageOnlineDuration;
    createdAt;
    updatedAt;
}
exports.DeviceHeartbeat = DeviceHeartbeat;
/**
 * 设备心跳服务
 */
class DeviceHeartbeatService {
    static instance;
    sequelize;
    cronTask = null;
    initialized = false;
    // 状态变更回调
    onDeviceOffline;
    onDeviceOnline;
    constructor(sequelize) {
        this.sequelize = sequelize;
    }
    static getInstance(sequelize) {
        if (!DeviceHeartbeatService.instance) {
            DeviceHeartbeatService.instance = new DeviceHeartbeatService(sequelize);
        }
        return DeviceHeartbeatService.instance;
    }
    /**
     * 初始化模型
     */
    initModel() {
        if (this.initialized)
            return;
        DeviceHeartbeat.init({
            id: {
                type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },
            deviceId: {
                type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
                allowNull: false,
                unique: true,
                comment: '设备ID',
            },
            deviceNo: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                unique: true,
                comment: '设备编号',
            },
            protocolType: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                comment: '协议类型',
            },
            lastHeartbeatAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                comment: '最后心跳时间',
            },
            status: {
                type: sequelize_1.DataTypes.ENUM('online', 'offline', 'unknown'),
                allowNull: false,
                defaultValue: 'unknown',
                comment: '在线状态',
            },
            offlineCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: '累计离线次数',
            },
            lastOfflineAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: '最后一次离线时间',
            },
            lastOnlineAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: '最后一次上线时间',
            },
            averageOnlineDuration: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: '平均在线时长（秒）',
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
        }, {
            sequelize: this.sequelize,
            tableName: 'dev_heartbeat',
            comment: '设备心跳记录表',
            indexes: [
                { fields: ['deviceId'], unique: true },
                { fields: ['deviceNo'], unique: true },
                { fields: ['status'] },
                { fields: ['lastHeartbeatAt'] },
            ],
        });
        this.initialized = true;
        logger_1.default.info('[设备心跳] 模型初始化完成');
    }
    /**
     * 设置状态变更回调
     */
    setCallbacks(callbacks) {
        this.onDeviceOffline = callbacks.onDeviceOffline;
        this.onDeviceOnline = callbacks.onDeviceOnline;
    }
    /**
     * 更新设备心跳
     */
    async updateHeartbeat(deviceId, deviceNo, protocolType) {
        const now = new Date();
        // 查找或创建心跳记录
        const [heartbeat, created] = await DeviceHeartbeat.findOrCreate({
            where: { deviceId },
            defaults: {
                deviceId,
                deviceNo,
                protocolType,
                lastHeartbeatAt: now,
                status: 'online',
                lastOnlineAt: now,
            },
        });
        if (!created) {
            // 检查状态变化：离线 -> 上线
            const wasOffline = heartbeat.status === 'offline';
            await heartbeat.update({
                lastHeartbeatAt: now,
                status: 'online',
                ...(wasOffline ? { lastOnlineAt: now } : {}),
            });
            // 如果是从离线变成上线，触发回调
            if (wasOffline && this.onDeviceOnline) {
                logger_1.default.info(`[设备心跳] 设备恢复在线: ${deviceNo}`);
                this.onDeviceOnline(heartbeat);
            }
        }
        logger_1.default.debug(`[设备心跳] 更新心跳: ${deviceNo}`);
    }
    /**
     * 执行一次心跳检测
     */
    async checkHeartbeats() {
        const now = new Date();
        const nowTs = now.getTime();
        // 获取所有心跳记录
        const heartbeats = await DeviceHeartbeat.findAll();
        const stats = {
            total: heartbeats.length,
            offline: 0,
            online: 0,
            newOffline: 0,
        };
        for (const heartbeat of heartbeats) {
            // 获取超时阈值
            const timeout = exports.HEARTBEAT_TIMEOUT[heartbeat.protocolType] || exports.HEARTBEAT_TIMEOUT['default'];
            const lastHeartbeatTs = heartbeat.lastHeartbeatAt.getTime();
            const isTimeout = (nowTs - lastHeartbeatTs) > timeout * 1000;
            if (isTimeout && heartbeat.status === 'online') {
                // 设备从在线变为离线
                stats.newOffline++;
                await heartbeat.update({
                    status: 'offline',
                    lastOfflineAt: now,
                    offlineCount: heartbeat.offlineCount + 1,
                });
                logger_1.default.warn(`[设备心跳] 设备超时离线: ${heartbeat.deviceNo}, 最后心跳: ${heartbeat.lastHeartbeatAt.toISOString()}`);
                // 触发离线回调
                if (this.onDeviceOffline) {
                    this.onDeviceOffline(heartbeat);
                }
            }
            // 统计
            if (heartbeat.status === 'online') {
                stats.online++;
            }
            else if (heartbeat.status === 'offline') {
                stats.offline++;
            }
        }
        if (stats.newOffline > 0) {
            logger_1.default.info(`[设备心跳] 检测完成: 总计${stats.total}台, 在线${stats.online}台, 离线${stats.offline}台, 新增离线${stats.newOffline}台`);
        }
        return stats;
    }
    /**
     * 启动定时检测任务
     * @param cronExpression Cron表达式，默认每分钟检测一次
     */
    startScheduler(cronExpression = '* * * * *') {
        if (this.cronTask) {
            this.cronTask.stop();
            this.cronTask = null;
        }
        this.cronTask = node_cron_1.default.schedule(cronExpression, async () => {
            try {
                await this.checkHeartbeats();
            }
            catch (err) {
                logger_1.default.error(`[设备心跳] 定时检测失败: ${err.message}`);
            }
        });
        logger_1.default.info(`[设备心跳] 定时检测任务已启动，周期: ${cronExpression}`);
    }
    /**
     * 停止定时检测任务
     */
    stopScheduler() {
        if (this.cronTask) {
            this.cronTask.stop();
            this.cronTask = null;
            logger_1.default.info('[设备心跳] 定时检测任务已停止');
        }
    }
    /**
     * 获取设备在线统计
     */
    async getStats() {
        const stats = await DeviceHeartbeat.findAll({
            attributes: [
                'status',
                [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'count'],
            ],
            group: ['status'],
        });
        const result = { total: 0, online: 0, offline: 0, unknown: 0 };
        for (const stat of stats) {
            const count = parseInt(stat.get('count'), 10);
            const st = stat.get('status');
            if (st === 'online' || st === 'offline' || st === 'unknown') {
                result[st] = count;
            }
            result.total += count;
        }
        return result;
    }
    /**
     * 手动标记设备离线（当协议层明确知道断开时调用）
     */
    async markOffline(deviceId) {
        const heartbeat = await DeviceHeartbeat.findOne({ where: { deviceId } });
        if (heartbeat && heartbeat.status === 'online') {
            await heartbeat.update({
                status: 'offline',
                lastOfflineAt: new Date(),
                offlineCount: heartbeat.offlineCount + 1,
            });
            logger_1.default.warn(`[设备心跳] 手动标记设备离线: ${heartbeat.deviceNo}`);
            if (this.onDeviceOffline) {
                this.onDeviceOffline(heartbeat);
            }
        }
    }
}
exports.DeviceHeartbeatService = DeviceHeartbeatService;
exports.default = DeviceHeartbeatService;
//# sourceMappingURL=deviceHeartbeat.service.js.map