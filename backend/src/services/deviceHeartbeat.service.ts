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
import { Model, DataTypes, Optional, Sequelize } from 'sequelize';
import logger from '@/config/logger';
import cron from 'node-cron';

// 设备类型对应的超时阈值（秒）
export const HEARTBEAT_TIMEOUT: Record<string, number> = {
  'gb26875': 600,      // 10分钟
  'mqtt': 300,         // 5分钟
  'modbus': 600,       // 10分钟
  'default': 900,      // 15分钟（默认）
};

// 设备状态
export type DeviceOnlineStatus = 'online' | 'offline' | 'unknown';

// 心跳记录接口
export interface DeviceHeartbeatAttributes {
  id: number;
  deviceId: number;
  deviceNo: string;
  protocolType: string;
  lastHeartbeatAt: Date;
  status: DeviceOnlineStatus;
  offlineCount: number;           // 累计离线次数
  lastOfflineAt?: Date;           // 最后一次离线时间
  lastOnlineAt?: Date;            // 最后一次上线时间
  averageOnlineDuration?: number; // 平均在线时长（秒）
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceHeartbeatCreationAttributes extends Optional<DeviceHeartbeatAttributes, 'id' | 'createdAt' | 'updatedAt' | 'offlineCount' | 'status'> {}

// Sequelize模型
export class DeviceHeartbeat extends Model<DeviceHeartbeatAttributes, DeviceHeartbeatCreationAttributes> implements DeviceHeartbeatAttributes {
  public id!: number;
  public deviceId!: number;
  public deviceNo!: string;
  public protocolType!: string;
  public lastHeartbeatAt!: Date;
  public status!: DeviceOnlineStatus;
  public offlineCount!: number;
  public lastOfflineAt?: Date;
  public lastOnlineAt?: Date;
  public averageOnlineDuration?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

/**
 * 设备心跳服务
 */
export class DeviceHeartbeatService {
  private static instance: DeviceHeartbeatService;
  private sequelize: Sequelize;
  private cronTask: cron.ScheduledTask | null = null;
  private initialized: boolean = false;

  // 状态变更回调
  private onDeviceOffline?: (device: DeviceHeartbeat) => void;
  private onDeviceOnline?: (device: DeviceHeartbeat) => void;

  private constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  public static getInstance(sequelize: Sequelize): DeviceHeartbeatService {
    if (!DeviceHeartbeatService.instance) {
      DeviceHeartbeatService.instance = new DeviceHeartbeatService(sequelize);
    }
    return DeviceHeartbeatService.instance;
  }

  /**
   * 初始化模型
   */
  public initModel(): void {
    if (this.initialized) return;

    DeviceHeartbeat.init(
      {
        id: {
          type: DataTypes.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        deviceId: {
          type: DataTypes.BIGINT.UNSIGNED,
          allowNull: false,
          unique: true,
          comment: '设备ID',
        },
        deviceNo: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
          comment: '设备编号',
        },
        protocolType: {
          type: DataTypes.STRING(20),
          allowNull: false,
          comment: '协议类型',
        },
        lastHeartbeatAt: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: '最后心跳时间',
        },
        status: {
          type: DataTypes.ENUM('online', 'offline', 'unknown'),
          allowNull: false,
          defaultValue: 'unknown',
          comment: '在线状态',
        },
        offlineCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: '累计离线次数',
        },
        lastOfflineAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: '最后一次离线时间',
        },
        lastOnlineAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: '最后一次上线时间',
        },
        averageOnlineDuration: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: '平均在线时长（秒）',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize: this.sequelize,
        tableName: 'dev_heartbeat',
        comment: '设备心跳记录表',
        indexes: [
          { fields: ['deviceId'], unique: true },
          { fields: ['deviceNo'], unique: true },
          { fields: ['status'] },
          { fields: ['lastHeartbeatAt'] },
        ],
      }
    );

    this.initialized = true;
    logger.info('[设备心跳] 模型初始化完成');
  }

  /**
   * 设置状态变更回调
   */
  public setCallbacks(callbacks: {
    onDeviceOffline?: (device: DeviceHeartbeat) => void;
    onDeviceOnline?: (device: DeviceHeartbeat) => void;
  }): void {
    this.onDeviceOffline = callbacks.onDeviceOffline;
    this.onDeviceOnline = callbacks.onDeviceOnline;
  }

  /**
   * 更新设备心跳
   */
  async updateHeartbeat(
    deviceId: number,
    deviceNo: string,
    protocolType: string
  ): Promise<void> {
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
        logger.info(`[设备心跳] 设备恢复在线: ${deviceNo}`);
        this.onDeviceOnline(heartbeat);
      }
    }

    logger.debug(`[设备心跳] 更新心跳: ${deviceNo}`);
  }

  /**
   * 执行一次心跳检测
   */
  async checkHeartbeats(): Promise<{
    total: number;
    offline: number;
    online: number;
    newOffline: number;
  }> {
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
      const timeout = HEARTBEAT_TIMEOUT[heartbeat.protocolType] || HEARTBEAT_TIMEOUT['default'];
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

        logger.warn(`[设备心跳] 设备超时离线: ${heartbeat.deviceNo}, 最后心跳: ${heartbeat.lastHeartbeatAt.toISOString()}`);

        // 触发离线回调
        if (this.onDeviceOffline) {
          this.onDeviceOffline(heartbeat);
        }
      }

      // 统计
      if (heartbeat.status === 'online') {
        stats.online++;
      } else if (heartbeat.status === 'offline') {
        stats.offline++;
      }
    }

    if (stats.newOffline > 0) {
      logger.info(`[设备心跳] 检测完成: 总计${stats.total}台, 在线${stats.online}台, 离线${stats.offline}台, 新增离线${stats.newOffline}台`);
    }

    return stats;
  }

  /**
   * 启动定时检测任务
   * @param cronExpression Cron表达式，默认每分钟检测一次
   */
  startScheduler(cronExpression: string = '* * * * *'): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }

    this.cronTask = cron.schedule(cronExpression, async () => {
      try {
        await this.checkHeartbeats();
      } catch (err: any) {
        logger.error(`[设备心跳] 定时检测失败: ${err.message}`);
      }
    });

    logger.info(`[设备心跳] 定时检测任务已启动，周期: ${cronExpression}`);
  }

  /**
   * 停止定时检测任务
   */
  stopScheduler(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      logger.info('[设备心跳] 定时检测任务已停止');
    }
  }

  /**
   * 获取设备在线统计
   */
  async getStats(): Promise<{
    total: number;
    online: number;
    offline: number;
    unknown: number;
  }> {
    const stats = await DeviceHeartbeat.findAll({
      attributes: [
        'status',
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'count'],
      ],
      group: ['status'],
    });

    const result = { total: 0, online: 0, offline: 0, unknown: 0 };
    for (const stat of stats as any) {
      const count = parseInt(stat.get('count') as string, 10);
      const st = stat.get('status') as DeviceOnlineStatus;
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
  async markOffline(deviceId: number): Promise<void> {
    const heartbeat = await DeviceHeartbeat.findOne({ where: { deviceId } });
    if (heartbeat && heartbeat.status === 'online') {
      await heartbeat.update({
        status: 'offline',
        lastOfflineAt: new Date(),
        offlineCount: heartbeat.offlineCount + 1,
      });

      logger.warn(`[设备心跳] 手动标记设备离线: ${heartbeat.deviceNo}`);

      if (this.onDeviceOffline) {
        this.onDeviceOffline(heartbeat);
      }
    }
  }
}

export default DeviceHeartbeatService;
