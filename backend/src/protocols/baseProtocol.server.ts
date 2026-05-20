/**
 * ═══════════════════════════════════════════════════════════════════
 * BaseProtocolServer - TCP 协议服务器抽象基类
 * 消除 GB26875 / FSCN8001 的重复代码（stop/getStatus/设备同步/告警创建）
 * ═══════════════════════════════════════════════════════════════════
 */
import net, { Socket } from 'net';
import logger from '@/config/logger';
import sequelize from '@/config/database';
import { EventEmitter } from 'events';
import { AlarmService } from '@/services/alarm.service';
import { DeviceHeartbeatService } from '@/services/deviceHeartbeat.service';
import { Device, Unit } from '@/models';
import { generateAlarmNo } from '@/utils/alarmNo';

export interface BaseConnection {
  socket: Socket;
  lastActive: Date;
  clientIp: string;
}

export abstract class BaseProtocolServer<T extends BaseConnection> extends EventEmitter {
  protected server: net.Server | null = null;
  protected port: number;
  protected host: string;
  protected running = false;
  protected connections = new Map<string, T>();
  protected heartbeatTimer: NodeJS.Timeout | null = null;
  protected deviceHeartbeatService: DeviceHeartbeatService;
  protected abstract readonly protocolName: string;

  constructor(port: number, host: string) {
    super();
    this.port = port;
    this.host = host;
    this.deviceHeartbeatService = DeviceHeartbeatService.getInstance(sequelize);
  }

  /* ───── 启动框架（子类可覆盖 onBeforeStart / onSocketConnected）──── */
  async start(): Promise<void> {
    await this.ensureTables();
    this.onBeforeStart();

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
        const clientIp = socket.remoteAddress || 'unknown';
        logger.info(`[${this.protocolName}] 新设备连接: ${clientAddress}`);
        this.onSocketConnected(socket, clientAddress, clientIp);
      });

      this.server.on('error', (err) => {
        logger.error(`[${this.protocolName}] 服务器启动失败: ${err.message}`);
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        this.running = true;
        logger.info(`[${this.protocolName}] ✅ 服务器启动成功，监听 ${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  /* ───── 优雅关闭（通用）──── */
  async stop(): Promise<void> {
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
          logger.info(`[${this.protocolName}] 服务器已停止`);
          this.server = null;
          resolve();
        });
      } else {
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
  protected onBeforeStart(): void { /* 子类可覆盖 */ }
  protected abstract ensureTables(): Promise<void>;
  protected onSocketConnected(_socket: Socket, _clientAddress: string, _clientIp: string): void { /* 子类可覆盖 */ }

  /* ───── 统一设备模型同步（通用）──── */
  protected async syncUnifiedDevice(deviceSn: string, _ip: string | null, state: 'online' | 'offline') {
    try {
      const status = state === 'online' ? 1 : 3;
      await sequelize.query(
        `INSERT INTO fire_device (device_no, device_sn, device_name, device_type, unit_id, status, lifecycle_status, last_online, protocol_type, created_at, updated_at)
         VALUES (?, ?, ?, '传输装置', NULL, ?, 2, NOW(), ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           device_sn = VALUES(device_sn),
           status = VALUES(status),
           lifecycle_status = VALUES(lifecycle_status),
           last_online = VALUES(last_online),
           protocol_type = VALUES(protocol_type),
           updated_at = NOW()`,
        { replacements: [deviceSn, deviceSn, deviceSn, status, this.protocolName] }
      );
      const [rows] = await sequelize.query(`SELECT id FROM fire_device WHERE device_sn = ? LIMIT 1`, { replacements: [deviceSn], type: 'SELECT' });
      const deviceId = (rows as any[])[0]?.id;
      if (deviceId) {
        await this.deviceHeartbeatService.updateHeartbeat(deviceId, deviceSn, this.protocolName);
        if (state === 'offline') {
          await this.deviceHeartbeatService.markOffline(deviceId);
        }
      }
    } catch (err: any) {
      logger.error(`[${this.protocolName}] 同步统一设备失败: ${err.message}`);
    }
  }

  /* ───── 统一告警模型创建（通用，子类可覆盖）──── */
  protected async createUnifiedAlarm(deviceSn: string, alarmType: string, alarmLevel: string, description: string | null, rawData: string | null) {
    try {
      const typeMap: Record<string, number> = { fire: 1, fault: 2, pre: 3, shield: 4, supervisory: 5, feedback: 5, test: 5 };
      const levelMap: Record<string, number> = { high: 3, normal: 2, low: 1 };
      const alarmNo = generateAlarmNo();

      // 查询档案设备和单位信息
      let archiveDeviceId: number | null = null;
      let unitId: number | null = null;
      let unitName = '';
      let location = description || alarmType;
      try {
        const device = await Device.findOne({ where: { device_sn: deviceSn } }) as any;
        if (device) {
          archiveDeviceId = device.id ?? null;
          unitId = device.unit_id ?? null;
          if (unitId && unitId > 0) {
            const unit = await Unit.findByPk(unitId, { raw: true }) as any;
            unitName = unit?.unit_name || '';
          }
          if (device.install_location) location = device.install_location;
        }
      } catch (lookupErr: any) {
        logger.error(`[${this.protocolName}] 设备档案查询失败: ${lookupErr.message}`);
      }

      await AlarmService.createAlarm({
        alarm_no: alarmNo,
        alarm_type: typeMap[alarmType] || 5,
        alarm_level: levelMap[alarmLevel] || 1,
        device_id: archiveDeviceId,
        device_name: deviceSn,
        unit_id: unitId,
        unit_name: unitName,
        location,
        alarm_desc: description || alarmType,
        protocol: this.protocolName,
        raw_data: rawData,
      });
      logger.warn(`[${this.protocolName}] 统一告警创建: ${deviceSn} ${alarmType}`);
    } catch (err: any) {
      logger.error(`[${this.protocolName}] 创建统一告警失败: ${err.message}`);
    }
  }
}
