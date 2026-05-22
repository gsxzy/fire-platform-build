/**
 * ═══════════════════════════════════════════════════════════════════
 * FSCN8001 TCP 服务器
 * 监听端口: 5201（默认，可通过 FSCN8001_PORT 覆盖）
 * 移植自旧版 JS 后端 fscn8001Server.js
 * ═══════════════════════════════════════════════════════════════════
 */
import net, { Socket } from 'net';
import sequelize from '@/config/database';
import { Device, Unit } from '@/models';
import logger from '@/config/logger';
import { AlarmService } from '@/services/alarm.service';
import { insertRawLog } from '@/services/tdengine.service';
import { generateAlarmNo } from '@/utils/alarmNo';
import { BaseProtocolServer } from './baseProtocol.server';
import {
  FrameParser, buildAckFrame, parseDeviceStatus,
  decodeBcdTimestamp, ParsedFrame, fscn8001Protocol,
  DEVICE_TYPE_NAMES,
} from './fscn8001.service';

interface FSCN8001Connection {
  socket: Socket;
  lastActive: Date;
  clientIp: string;
  lastHeartbeat: number;
  loginTime: string;
  ip?: string;
  port?: number;
}

export class FSCN8001Server extends BaseProtocolServer<FSCN8001Connection> {
  protected readonly protocolName = 'FSCN8001';

  constructor(port = 5201, host = '0.0.0.0') {
    super(port, host);
  }

  async start(): Promise<void> {
    await this.ensureTables();
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
        logger.info(`[FSCN8001] 客户端连接: ${clientAddr}`);
        const parser = new FrameParser();

        socket.on('data', async (chunk: Buffer) => {
          logger.debug(`[FSCN8001] <= ${clientAddr} ${chunk.length} bytes: ${chunk.toString('hex').toUpperCase()}`);
          const frames = parser.push(chunk);
          for (const frame of frames) {
            logger.info(`[FSCN8001] 解析成功 cmd=0x${frame.cmd.toString(16).padStart(2,'0').toUpperCase()} seq=${frame.seq} deviceId=${frame.deviceId}`);
            await this.onFrame(socket, frame);
          }
        });

        socket.on('close', async (hadError: boolean) => {
          const did = (socket as any).deviceId as string | undefined;
          logger.info(`[FSCN8001] 客户端断开: ${clientAddr} deviceId=${did || 'unknown'} ${hadError ? '(异常)' : ''}`);
          if (did) {
            await this.updateDeviceOffline(did);
            this.connections.delete(did);
          }
        });

        socket.on('error', (err: Error) => {
          logger.error(`[FSCN8001] Socket错误: ${clientAddr} ${err.message}`);
        });
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          logger.error(`[FSCN8001] ❌ 端口 ${this.port} 已被占用！`);
        } else {
          logger.error(`[FSCN8001] 服务器错误: ${err.message}`);
        }
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        this.running = true;
        logger.info(`[FSCN8001] ✅ TCP 服务器启动: ${this.host}:${this.port}`);
        this.startHeartbeatMonitor();
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    await super.stop();
    this.connections.clear();
  }

  /* ───── 帧处理 ───── */
  private async onFrame(socket: Socket, frame: ParsedFrame) {
    const deviceId = frame.deviceId;

    // 心跳/数据上报时记录连接
    if (frame.cmd === 0x01 || frame.cmd === 0x02) {
      if (!this.connections.has(deviceId)) {
        this.connections.set(deviceId, {
          socket,
          lastActive: new Date(),
          clientIp: socket.remoteAddress || 'unknown',
          lastHeartbeat: Date.now(),
          loginTime: new Date().toISOString(),
          ip: socket.remoteAddress || undefined,
          port: socket.remotePort || undefined,
        });
        (socket as any).deviceId = deviceId;
        await this.upsertDevice(deviceId, socket.remoteAddress, socket.remotePort, null);
      } else {
        const conn = this.connections.get(deviceId)!;
        conn.lastHeartbeat = Date.now();
      }
    }

    switch (frame.cmd) {
      case 0x01:
        await this.handleHeartbeat(socket, frame);
        break;
      case 0x02:
        await this.handleData(socket, frame);
        break;
      case 0x03:
        await this.handleFireAlarm(socket, frame);
        break;
      case 0x04:
        await this.handleFault(socket, frame);
        break;
      case 0x05:
        await this.handleAck(socket, frame);
        break;
      default:
        await this.handleUnknown(socket, frame);
    }
  }

  private async handleHeartbeat(socket: Socket, frame: ParsedFrame) {
    const deviceId = frame.deviceId;
    logger.info(`[FSCN8001][HB] ▲ 心跳 seq=${frame.seq} deviceId=${deviceId}`);
    await this.upsertDevice(deviceId, socket.remoteAddress, socket.remotePort, null);
    await this.saveRawLog(deviceId, 'RX', '01', frame.hex, { type: 'heartbeat', seq: frame.seq });
    const ack = buildAckFrame(frame);
    socket.write(ack);
    logger.info(`[FSCN8001][HB] ▼ 心跳确认 seq=${frame.seq}`);
  }

  private async handleData(socket: Socket, frame: ParsedFrame) {
    const deviceId = frame.deviceId;
    logger.info(`[FSCN8001][DATA] ▲ 数据上报 seq=${frame.seq} deviceId=${deviceId} dataLen=${frame.dataLen}`);

    if (frame.dataLen > 0) {
      const typeFlag = frame.data[0];
      if (typeFlag === 0x02) {
        const events = parseDeviceStatus(frame.data);
        logger.info(`[FSCN8001][DATA] 解析出 ${events.length} 个信息对象 (typeFlag=0x02)`);
        for (const ev of events) {
          if (ev.alarmType) {
            const eventTime = frame.timestampStr !== 'N/A' ? frame.timestampStr : ev.eventTime;
            const desc = `${ev.devTypeName} ${ev.alarmType === 'fire' ? '火警' : ev.alarmType === 'fault' ? '故障' : ev.alarmType}
              系统类型=${ev.sysType} 回路=${ev.loopNo} 点位=${ev.pointNo}
              状态=${ev.statusHex} 时间=${eventTime}`;
            logger.warn(`[FSCN8001][ALARM] ${desc}`);
            await this.insertAlarm(deviceId, ev.alarmType, ev.alarmLevel, desc, frame.hex, ev.loopNo, ev.pointNo, ev.sysAddr, ev.devType);
          }
        }
      } else if (typeFlag === 0x1C) {
        // typeFlag=0x1C 通常是心跳/状态数据，不应直接解析为报警
        logger.info(`[FSCN8001][DATA] 设备状态/心跳数据 typeFlag=0x1C, dataLen=${frame.dataLen}`);
      } else if (typeFlag === 0x01) {
        logger.info(`[FSCN8001][DATA] 系统状态上传`);
      } else if (typeFlag === 0x03) {
        logger.info(`[FSCN8001][DATA] 模拟量上传`);
      } else if (typeFlag === 0x15) {
        logger.info(`[FSCN8001][DATA] 传输装置运行状态上传`);
      } else {
        logger.info(`[FSCN8001][DATA] 未知类型标志=0x${typeFlag.toString(16).padStart(2,'0').toUpperCase()}`);
      }
    }

    await this.saveRawLog(deviceId, 'RX', '02', frame.hex, { type: 'data', dataLen: frame.dataLen, typeFlag: frame.data[0] });
    const ack = buildAckFrame(frame);
    socket.write(ack);
    logger.info(`[FSCN8001][DATA] ▼ 数据确认 seq=${frame.seq}`);
  }

  private async handleFireAlarm(socket: Socket, frame: ParsedFrame) {
    const deviceId = frame.deviceId;
    logger.warn(`[FSCN8001][ALARM] ▲ 火警上报 seq=${frame.seq} deviceId=${deviceId}`);
    let desc = 'FSCN8001 火警上报';
    let eventTime = decodeBcdTimestamp(frame.raw.subarray(6, 12));

    if (frame.dataLen > 0) {
      const typeFlag = frame.data[0];
      if (typeFlag === 0x02 && frame.dataLen >= 17) {
        const events = parseDeviceStatus(frame.data);
        for (const ev of events) {
          if (ev.alarmType) {
            const evDesc = `${ev.devTypeName} ${ev.alarmType === 'fire' ? '火警' : ev.alarmType === 'fault' ? '故障' : ev.alarmType}
              系统类型=${ev.sysType} 回路=${ev.loopNo} 点位=${ev.pointNo}
              状态=${ev.statusHex} 时间=${ev.eventTime}`;
            await this.insertAlarm(deviceId, ev.alarmType, ev.alarmLevel, evDesc, frame.hex, ev.loopNo, ev.pointNo, ev.sysAddr, ev.devType);
            await this.createUnifiedAlarm(deviceId, ev.alarmType, ev.alarmLevel, evDesc, frame.hex, ev.devType, ev.loopNo, ev.pointNo, ev.sysAddr);
          }
        }
        await this.saveRawLog(deviceId, 'RX', '03', frame.hex, { type: 'fire_alarm_with_status', eventTime: frame.timestampStr });
        const ack = buildAckFrame(frame);
        socket.write(ack);
        logger.warn(`[FSCN8001][ALARM] ▼ 火警确认(带状态) seq=${frame.seq}`);
        return;
      }
      if (frame.dataLen >= 12) {
        const preData = frame.data.subarray(0, 6).toString('hex').toUpperCase();
        eventTime = decodeBcdTimestamp(frame.data.subarray(6, 12));
        desc = `事件时间:${eventTime} 前置数据:${preData}`;
      } else {
        desc += ` 数据:${frame.data.toString('hex').toUpperCase()}`;
      }
    }

    await this.insertAlarm(deviceId, 'fire', 'high', desc, frame.hex, null, null, null, null);
    await this.createUnifiedAlarm(deviceId, 'fire', 'high', desc, frame.hex, null, null, null, null);
    await this.saveRawLog(deviceId, 'RX', '03', frame.hex, { type: 'fire_alarm', eventTime });
    const ack = buildAckFrame(frame);
    socket.write(ack);
    logger.warn(`[FSCN8001][ALARM] ▼ 火警确认 seq=${frame.seq}`);
  }

  private async handleFault(socket: Socket, frame: ParsedFrame) {
    const deviceId = frame.deviceId;
    logger.warn(`[FSCN8001][ALARM] ▲ 故障上报 seq=${frame.seq} deviceId=${deviceId}`);
    let desc = 'FSCN8001 故障上报';
    let eventTime = decodeBcdTimestamp(frame.raw.subarray(6, 12));

    if (frame.dataLen > 0) {
      const typeFlag = frame.data[0];
      if (typeFlag === 0x02 && frame.dataLen >= 17) {
        const events = parseDeviceStatus(frame.data);
        for (const ev of events) {
          if (ev.alarmType) {
            const evDesc = `${ev.alarmType === 'fire' ? '火警' : ev.alarmType === 'fault' ? '故障' : ev.alarmType}
              系统类型=${ev.sysType} 回路=${ev.loopNo} 点位=${ev.pointNo}
              状态=${ev.statusHex} 时间=${ev.eventTime}`;
            await this.insertAlarm(deviceId, ev.alarmType, ev.alarmLevel, evDesc, frame.hex, ev.loopNo, ev.pointNo, ev.sysAddr, ev.devType);
            await this.createUnifiedAlarm(deviceId, ev.alarmType, ev.alarmLevel, evDesc, frame.hex, ev.devType, ev.loopNo, ev.pointNo, ev.sysAddr);
          }
        }
        await this.saveRawLog(deviceId, 'RX', '04', frame.hex, { type: 'fault_with_status', eventTime });
        const ack = buildAckFrame(frame);
        socket.write(ack);
        logger.warn(`[FSCN8001][ALARM] ▼ 故障确认(带状态) seq=${frame.seq}`);
        return;
      }
      if (frame.dataLen >= 12) {
        const preData = frame.data.subarray(0, 6).toString('hex').toUpperCase();
        eventTime = decodeBcdTimestamp(frame.data.subarray(6, 12));
        desc = `事件时间:${eventTime} 前置数据:${preData}`;
      } else {
        desc += ` 数据:${frame.data.toString('hex').toUpperCase()}`;
      }
    }

    await this.insertAlarm(deviceId, 'fault', 'normal', desc, frame.hex, null, null, null, null);
    await this.createUnifiedAlarm(deviceId, 'fault', 'normal', desc, frame.hex, null, null, null, null);
    await this.saveRawLog(deviceId, 'RX', '04', frame.hex, { type: 'fault', eventTime });
    const ack = buildAckFrame(frame);
    socket.write(ack);
    logger.warn(`[FSCN8001][ALARM] ▼ 故障确认 seq=${frame.seq}`);
  }

  private async handleAck(_socket: Socket, frame: ParsedFrame) {
    const deviceId = frame.deviceId;
    logger.info(`[FSCN8001][ACK] ▲ 设备应答/监管 seq=${frame.seq} deviceId=${deviceId}`);
    if (frame.dataLen > 0) {
      let desc = 'FSCN8001 监管事件';
      if (frame.dataLen >= 12) {
        const preData = frame.data.subarray(0, 6).toString('hex').toUpperCase();
        const eventTime = decodeBcdTimestamp(frame.data.subarray(6, 12));
        desc = `事件时间:${eventTime} 前置数据:${preData}`;
      } else {
        desc += ` 数据:${frame.data.toString('hex').toUpperCase()}`;
      }
      await this.insertAlarm(deviceId, 'supervisory', 'low', desc, frame.hex, null, null, null, null);
    }
    await this.saveRawLog(deviceId, 'RX', '05', frame.hex, { type: 'device_ack', seq: frame.seq });
  }

  private async handleUnknown(socket: Socket, frame: ParsedFrame) {
    const cmdHex = `0x${frame.cmd.toString(16).padStart(2, '0').toUpperCase()}`;
    logger.warn(`[FSCN8001] 未知命令字 ${cmdHex} seq=${frame.seq} deviceId=${frame.deviceId}`);
    await this.saveRawLog(frame.deviceId, 'RX', cmdHex, frame.hex, { type: 'unknown', cmd: frame.cmd });
    const ack = buildAckFrame(frame);
    socket.write(ack);
    logger.info(`[FSCN8001] ▼ 未知命令确认 ${cmdHex} seq=${frame.seq}`);
  }

  /* ───── 心跳超时检测 ───── */
  private startHeartbeatMonitor() {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [deviceId, conn] of this.connections.entries()) {
        if (now - conn.lastHeartbeat > 60000) {
          logger.warn(`[FSCN8001] 心跳超时 deviceId=${deviceId} 强制断开`);
          conn.socket.destroy();
          this.connections.delete(deviceId);
        }
      }
    }, 10000);
  }

  /* ───── 数据库操作 ───── */
  protected async ensureTables() {
    try {
      // fscn8001_raw_log 已迁移至 TDengine 时序库
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS fscn8001_device (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          device_sn VARCHAR(32) NOT NULL,
          device_name VARCHAR(128) DEFAULT NULL,
          ip VARCHAR(32) DEFAULT NULL,
          port INT DEFAULT 5201,
          status SMALLINT DEFAULT 1,
          last_heartbeat TIMESTAMP DEFAULT NULL,
          login_time TIMESTAMP DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uk_fscn_sn UNIQUE(device_sn)
        )
      `);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fscn_device_status ON fscn8001_device(status)`);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS fscn8001_alarm (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          device_sn VARCHAR(32) NOT NULL,
          alarm_type VARCHAR(32) DEFAULT NULL,
          alarm_level VARCHAR(16) DEFAULT NULL,
          location VARCHAR(256) DEFAULT NULL,
          loop_no INT DEFAULT NULL,
          address INT DEFAULT NULL,
          host_code VARCHAR(32) DEFAULT NULL,
          device_type VARCHAR(32) DEFAULT NULL,
          status SMALLINT DEFAULT 0,
          alarm_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          raw_data TEXT
        )
      `);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fscn_alm_sn ON fscn8001_alarm(device_sn)`);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fscn_alm_time ON fscn8001_alarm(alarm_time)`);
      logger.info('[FSCN8001] 数据表检查/创建完成');
    } catch (err: any) {
      logger.error(`[FSCN8001] 建表失败: ${err.message}`);
    }
  }

  private async upsertDevice(deviceId: string, ip: string | null | undefined, port: number | null | undefined, name: string | null) {
    try {
      const deviceName = name || `FSCN8001-${deviceId.slice(-6)}`;
      await sequelize.query(
        `INSERT INTO fscn8001_device (device_sn, device_name, ip, port, status, last_heartbeat, login_time, updated_at)
         VALUES (?, ?, ?, ?, 1, NOW(), NOW(), NOW())
         ON CONFLICT (device_sn) DO UPDATE SET
           device_name = EXCLUDED.device_name,
           ip = EXCLUDED.ip,
           port = EXCLUDED.port,
           status = 1,
           last_heartbeat = EXCLUDED.last_heartbeat,
           login_time = EXCLUDED.login_time,
           updated_at = NOW()`,
        { replacements: [deviceId, deviceName, ip || null, port || null] }
      );
      logger.debug(`[FSCN8001] 设备注册/更新: ${deviceId}`);
      // 同步统一设备模型
      await this.syncUnifiedDevice(deviceId, ip || null, 'online');
    } catch (err: any) {
      logger.error(`[FSCN8001] 设备入库失败: ${err.message}`);
    }
  }

  private async updateDeviceOffline(deviceId: string) {
    try {
      await sequelize.query(
        `UPDATE fscn8001_device SET status = 0, updated_at = NOW() WHERE device_sn = ?`,
        { replacements: [deviceId] }
      );
      logger.info(`[FSCN8001] 设备离线: ${deviceId}`);
      await this.syncUnifiedDevice(deviceId, null, 'offline');
    } catch (err: any) {
      logger.error(`[FSCN8001] 离线更新失败: ${err.message}`);
    }
  }

  private async saveRawLog(deviceId: string, direction: string, cmdType: string, hexData: string, parsed: Record<string, unknown> | null) {
    try {
      await insertRawLog('fscn8001', deviceId, {
        direction,
        cmd_type: cmdType,
        hex_data: hexData,
        raw_json: parsed ? JSON.stringify(parsed) : undefined,
      });
    } catch (err: any) {
      logger.error(`[FSCN8001] raw_log 写入失败: ${err.message}`);
    }
  }

  private async insertAlarm(
    deviceId: string, alarmType: string, alarmLevel: string,
    description: string | null, rawData: string | null,
    loopNo: number | null, address: number | null,
    hostCode: number | null, deviceType: number | null
  ) {
    try {
      await sequelize.query(
        `INSERT INTO fscn8001_alarm
         (device_sn, alarm_type, alarm_level, location, loop_no, address, host_code, device_type, status, alarm_time, raw_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), ?)`,
        { replacements: [
          deviceId, alarmType, alarmLevel, description || alarmType,
          loopNo !== undefined ? loopNo : null,
          address !== undefined ? address : null,
          hostCode !== undefined ? hostCode : null,
          deviceType !== undefined ? deviceType : null,
          rawData || null
        ]}
      );
      logger.warn(`[FSCN8001] 告警入库: ${deviceId} ${alarmType}`);
      // 同步创建统一告警
      await this.createUnifiedAlarm(deviceId, alarmType, alarmLevel, description || alarmType, rawData, deviceType);

      // 发射事件供外部监听（可触发联动、WebSocket 广播等）
      fscn8001Protocol.emit('alarm', {
        deviceId,
        alarmType,
        alarmLevel,
        description,
        loopNo,
        address,
        hostCode,
        deviceType,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error(`[FSCN8001] 告警入库失败: ${err.message}`);
    }
  }

  /* ───── 统一告警模型创建（FSCN8001 扩展版：含 Device/Unit 档案查询 + 编码表关联 + 网关主机关联）──── */
  protected async createUnifiedAlarm(
    deviceSn: string, alarmType: string, alarmLevel: string,
    description: string | null, rawData: string | null,
    deviceType: number | null = null,
    loopNo: number | null = null, address: number | null = null,
    hostCode: number | null = null
  ) {
    try {
      const typeMap: Record<string, number> = { fire: 1, fault: 2, pre: 3, shield: 4, supervisory: 5, feedback: 5, test: 5 };
      const levelMap: Record<string, number> = { high: 3, normal: 2, low: 1 };
      const alarmNo = generateAlarmNo();

      let deviceId: number | null = null;
      let unitId: number | null = null;
      let unitName: string | null = null;

      let gatewayDeviceName: string | null = null;
      let hostDeviceName: string | null = null;

      try {
        // 1. 查 FSCN8001 传输装置档案
        const txDevice = await Device.findOne({ where: { device_sn: deviceSn } }) as any;
        if (txDevice) {
          deviceId = txDevice.id ?? null;
          unitId = txDevice.unit_id ?? null;

          gatewayDeviceName = txDevice.device_name ?? deviceSn;

          // 2. 若传输装置有关联主机(gateway_id)，查主机档案
          if (txDevice.gateway_id) {
            const hostDevice = await Device.findOne({ where: { device_sn: txDevice.gateway_id } }) as any;
            if (hostDevice) {
              hostDeviceName = hostDevice.device_name ?? txDevice.gateway_id;
              // 若传输装置未分配单位，但主机已分配，则以主机单位为准
              if (!unitId && hostDevice.unit_id) {
                unitId = hostDevice.unit_id;
              }
            }
          }

          if (unitId != null && unitId > 0) {
            const unit = await Unit.findByPk(unitId, { raw: true }) as any;
            unitName = unit?.unit_name ?? null;
          }
        }
      } catch (lookupErr: any) {
        logger.error(`[FSCN8001] 设备档案查询失败: ${lookupErr.message}`);
      }

      const deviceTypeName = deviceType !== null ? (DEVICE_TYPE_NAMES[deviceType] || `未知类型(0x${deviceType.toString(16).padStart(2, '0').toUpperCase()})`) : undefined;

      // 告警位置描述：优先使用主机名，若无主机则使用传输装置名
      const locationPrefix = hostDeviceName
        ? `${hostDeviceName}(回路${loopNo ?? '-'}/点位${address ?? '-'})`
        : (gatewayDeviceName ? `${gatewayDeviceName}(回路${loopNo ?? '-'}/点位${address ?? '-'})` : deviceSn);
      const alarmLocation = description
        ? `${locationPrefix} — ${description}`
        : locationPrefix;

      await AlarmService.createAlarm({
        alarm_no: alarmNo,
        alarm_type: typeMap[alarmType] || 5,
        alarm_level: levelMap[alarmLevel] || 1,
        device_id: deviceId,
        device_name: hostDeviceName || gatewayDeviceName || deviceSn,
        unit_id: unitId,
        unit_name: unitName,
        location: alarmLocation,
        alarm_desc: description || alarmType,
        protocol: 'FSCN8001',
        raw_data: rawData,
        code: deviceTypeName,
        loop_no: loopNo,
        address: address,
        host_code: hostCode !== null ? String(hostCode) : null,
      });
      logger.warn(`[FSCN8001] 统一告警创建: ${deviceSn} ${alarmType} loop=${loopNo} point=${address} host=${hostDeviceName || '-'}`);
    } catch (err: any) {
      logger.error(`[FSCN8001] 创建统一告警失败: ${err.message}`);
    }
  }
}

/* ───── 导出单例 ───── */
// FSCN8001 用户信息传输装置使用 TCP 端口 5200（与 GB26875 同端口，赋安私有帧格式兼容）
const FSCN8001_TCP_PORT = parseInt(process.env.FSCN8001_PORT || '5200', 10);
const FSCN8001_HOST = process.env.FSCN8001_HOST || '0.0.0.0';

export const fscn8001Server = new FSCN8001Server(FSCN8001_TCP_PORT, FSCN8001_HOST);
export default fscn8001Server;
