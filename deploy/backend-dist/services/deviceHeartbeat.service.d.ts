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
import { Model, Optional, Sequelize } from 'sequelize';
export declare const HEARTBEAT_TIMEOUT: Record<string, number>;
export type DeviceOnlineStatus = 'online' | 'offline' | 'unknown';
export interface DeviceHeartbeatAttributes {
    id: number;
    deviceId: number;
    deviceNo: string;
    protocolType: string;
    lastHeartbeatAt: Date;
    status: DeviceOnlineStatus;
    offlineCount: number;
    lastOfflineAt?: Date;
    lastOnlineAt?: Date;
    averageOnlineDuration?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface DeviceHeartbeatCreationAttributes extends Optional<DeviceHeartbeatAttributes, 'id' | 'createdAt' | 'updatedAt' | 'offlineCount' | 'status'> {
}
export declare class DeviceHeartbeat extends Model<DeviceHeartbeatAttributes, DeviceHeartbeatCreationAttributes> implements DeviceHeartbeatAttributes {
    id: number;
    deviceId: number;
    deviceNo: string;
    protocolType: string;
    lastHeartbeatAt: Date;
    status: DeviceOnlineStatus;
    offlineCount: number;
    lastOfflineAt?: Date;
    lastOnlineAt?: Date;
    averageOnlineDuration?: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
/**
 * 设备心跳服务
 */
export declare class DeviceHeartbeatService {
    private static instance;
    private sequelize;
    private cronTask;
    private initialized;
    private onDeviceOffline?;
    private onDeviceOnline?;
    private constructor();
    static getInstance(sequelize: Sequelize): DeviceHeartbeatService;
    /**
     * 初始化模型
     */
    initModel(): void;
    /**
     * 设置状态变更回调
     */
    setCallbacks(callbacks: {
        onDeviceOffline?: (device: DeviceHeartbeat) => void;
        onDeviceOnline?: (device: DeviceHeartbeat) => void;
    }): void;
    /**
     * 更新设备心跳
     */
    updateHeartbeat(deviceId: number, deviceNo: string, protocolType: string): Promise<void>;
    /**
     * 执行一次心跳检测
     */
    checkHeartbeats(): Promise<{
        total: number;
        offline: number;
        online: number;
        newOffline: number;
    }>;
    /**
     * 启动定时检测任务
     * @param cronExpression Cron表达式，默认每分钟检测一次
     */
    startScheduler(cronExpression?: string): void;
    /**
     * 停止定时检测任务
     */
    stopScheduler(): void;
    /**
     * 获取设备在线统计
     */
    getStats(): Promise<{
        total: number;
        online: number;
        offline: number;
        unknown: number;
    }>;
    /**
     * 手动标记设备离线（当协议层明确知道断开时调用）
     */
    markOffline(deviceId: number): Promise<void>;
}
export default DeviceHeartbeatService;
//# sourceMappingURL=deviceHeartbeat.service.d.ts.map