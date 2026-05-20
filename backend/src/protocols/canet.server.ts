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
import net, { Socket } from 'net';
import logger from '@/config/logger';
import sequelize from '@/config/database';
import { QueryTypes } from 'sequelize';
import { AlarmService } from '@/services/alarm.service';
import { generateAlarmNo } from '@/utils/alarmNo';
import { CanfdnetParser, type ParsedCanFrame, parseFecbusFrame } from './canet.service';

/* ───── 类型定义 ───── */
interface CanetConnection {
  socket: Socket;
  clientIp: string;
  clientPort: number;
  connId: string;
  connectedAt: Date;
  lastActive: Date;
  parser: CanfdnetParser;
  frameCount: number;
}

/* ───── 设备类型名称映射（赋安 FECbus D4 字节）──── */
const DEVICE_TYPE_NAMES: Record<number, string> = {
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
  0x20: '光电烟感',      // 赋安常见编码
  0x21: '差定温探测器',
  0x22: '缆式感温',
  0x30: '未知类型',
};

/* ───── 赋安 FS5102 CAN 协议设备类型映射（与 FECbus 可能不同）──── */
const FUAN_CAN_DEVICE_TYPES: Record<number, string> = {
  0x01: '手动报警按钮',
  0x02: '感烟探测器',
  0x03: '感温探测器',
  0x04: '消火栓按钮',
  0x05: '输入模块',
  0x06: '输出模块',
  0x07: '输入输出模块',
  0x08: '声光警报器',
};

/* ───── 服务器实现 ───── */
export class CanetServer {
  private server: net.Server;
  private connections = new Map<string, CanetConnection>();
  private readonly port: number;
  private readonly host: string;

  constructor(port: number, host: string) {
    this.port = port;
    this.host = host;
    this.server = net.createServer(this.handleConnection.bind(this));
  }

  start(): void {
    this.server.listen(this.port, this.host, () => {
      logger.info(`[CANET] TCP Server started on ${this.host}:${this.port} (赋安FS5102 CAN网关接入)`);
    });
    this.server.on('error', (err) => {
      logger.error(`[CANET] Server error: ${err.message}`);
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      // 关闭所有连接
      for (const conn of this.connections.values()) {
        conn.socket.destroy();
      }
      this.connections.clear();
      this.server.close(() => {
        logger.info('[CANET] Server stopped');
        resolve();
      });
    });
  }

  private handleConnection(socket: Socket): void {
    const clientIp = socket.remoteAddress?.replace(/^::ffff:/, '') || 'unknown';
    const clientPort = socket.remotePort || 0;
    const connId = `${clientIp}:${clientPort}`;

    logger.info(`[CANET] ⬆ New connection from ${connId}`);

    const parser = new CanfdnetParser();
    const conn: CanetConnection = {
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

    socket.on('data', (chunk: Buffer) => {
      conn.lastActive = new Date();
      logger.info(`[CANET] data事件 conn=${connId} bytes=${chunk.length}`);
      const frames = parser.push(chunk);
      if (frames.length > 0) {
        logger.info(`[CANET] parser返回帧数 conn=${connId} count=${frames.length}`);
        for (const frame of frames) {
          conn.frameCount++;
          this.handleFrame(frame, conn);
        }
      }
    });

    socket.on('close', (hadError: boolean) => {
      const dur = Math.floor((Date.now() - conn.connectedAt.getTime()) / 1000);
      logger.info(`[CANET] ⬇ Connection closed: ${connId} | 存活${dur}s | 处理帧${conn.frameCount} | error=${hadError}`);
      this.connections.delete(connId);
    });

    socket.on('error', (err: Error) => {
      logger.error(`[CANET] Socket error ${connId}: ${err.message}`);
      this.connections.delete(connId);
    });
  }

  /* ───── 赋安 FS5102 CAN 报警帧解析 ───── */
  private parseFuanAlarmFrame(frame: ParsedCanFrame): { loop: number; point: number; status: number; deviceType: number; rawHex: string } | null {
    // 赋安 CAN 报警帧特征：
    // - 扩展帧，数据长度=8
    // - 数据格式：D0=回路, D1=点位, D2=状态, D3=设备类型, D4-D7=保留
    // - 状态：0x01=火警, 0x02=故障
    if (!frame.isExtended || frame.dataLen !== 8) return null;

    const d = frame.data;
    const loop = d[0];
    const point = d[1];
    const status = d[2];
    const deviceType = d[3];

    // 简单启发式：状态为 0x01(火警) 或 0x02(故障)，且回路/点位在合理范围
    if ((status === 0x01 || status === 0x02) && loop > 0 && loop <= 255 && point > 0 && point <= 255) {
      return { loop, point, status, deviceType, rawHex: frame.hex };
    }
    return null;
  }

  /* ───── 单帧处理 ───── */
  private async handleFrame(frame: ParsedCanFrame, conn: CanetConnection): Promise<void> {
    try {
      logger.info(`[CANET] 收到CAN帧 conn=${conn.connId} raw=${frame.hex} canId=0x${frame.canIdHex} data=${frame.dataHex} ext=${frame.isExtended} rtr=${frame.isRtr} len=${frame.dataLen}`);

      // 扩展ID详细解析（用于调试协议）
      if (frame.isExtended) {
        const id = frame.canId;
        const src = (id >> 23) & 0x3F;
        const tgt = (id >> 17) & 0x3F;
        const func = (id >> 12) & 0x1F;
        const rsv = id & 0xFFF;
        logger.info(`[CANET] 扩展ID解析: src=0x${src.toString(16).padStart(2,'0')} tgt=0x${tgt.toString(16).padStart(2,'0')} func=0x${func.toString(16)} rsv=0x${rsv.toString(16).padStart(3,'0')} id=0x${id.toString(16).padStart(8,'0')}`);
      }

      // 记录所有帧（包括标准帧，用于协议分析）
      if (frame.isRtr) {
        logger.info(`[CANET] 跳过远程帧: ext=${frame.isExtended} len=${frame.dataLen}`);
        return;
      }

      // 解析赋安 FECbus 广播帧
      const fecbus = parseFecbusFrame(frame);
      if (fecbus) {
        logger.info(`[CANET] FECbus解析成功: src=0x${fecbus.sourceAddr.toString(16).padStart(2,'0')} tgt=0x${fecbus.targetAddr.toString(16).padStart(2,'0')} func=0x${fecbus.functionCode.toString(16)} loop=${fecbus.loop} point=${fecbus.point} status=0x${fecbus.status.toString(16)} devType=0x${fecbus.deviceType.toString(16)}`);

        // 只处理功能码=0x06（设备状态广播）且目标地址=0x00（广播）
        if (fecbus.functionCode !== 0x06 || fecbus.targetAddr !== 0x00) {
          logger.info(`[CANET] 跳过非目标功能码/地址: func=0x${fecbus.functionCode.toString(16)} tgt=0x${fecbus.targetAddr.toString(16)}`);
          return;
        }

        const binding = await this.findDeviceBinding(conn.clientIp, conn.clientPort);
        const deviceTypeName = DEVICE_TYPE_NAMES[fecbus.deviceType]
          || `未知类型(0x${fecbus.deviceType.toString(16).padStart(2, '0').toUpperCase()})`;
        const location = `${binding.hostName || 'FS5102'}(回路${fecbus.loop}/点位${fecbus.point})`;
        const deviceName = binding.hostName
          ? `${binding.hostName}(回路${fecbus.loop}/点位${fecbus.point})`
          : `FS5102(回路${fecbus.loop}/点位${fecbus.point})`;

        if (fecbus.status === 0x01) {
          await this.createAlarm('fire', 'urgent', binding, deviceName, location, deviceTypeName, conn.connId, fecbus.loop, fecbus.point, fecbus.rawHex);
        } else if (fecbus.status === 0x02) {
          await this.createAlarm('fault', 'high', binding, deviceName, location, deviceTypeName, conn.connId, fecbus.loop, fecbus.point, fecbus.rawHex);
        }
        return;
      }

      // FECbus 解析失败，尝试赋安 FS5102 CAN 报警帧
      const fuanAlarm = this.parseFuanAlarmFrame(frame);
      if (fuanAlarm) {
        logger.info(`[CANET] 赋安CAN报警帧解析成功: 回路${fuanAlarm.loop} 点位${fuanAlarm.point} 状态=0x${fuanAlarm.status.toString(16)} 类型=0x${fuanAlarm.deviceType.toString(16)}`);
        const binding = await this.findDeviceBinding(conn.clientIp, conn.clientPort);
        const deviceTypeName = FUAN_CAN_DEVICE_TYPES[fuanAlarm.deviceType]
          || DEVICE_TYPE_NAMES[fuanAlarm.deviceType]
          || `未知类型(0x${fuanAlarm.deviceType.toString(16).padStart(2, '0').toUpperCase()})`;
        const location = `${binding.hostName || 'FS5102'}(回路${fuanAlarm.loop}/点位${fuanAlarm.point})`;
        const deviceName = binding.hostName
          ? `${binding.hostName}(回路${fuanAlarm.loop}/点位${fuanAlarm.point})`
          : `FS5102(回路${fuanAlarm.loop}/点位${fuanAlarm.point})`;

        if (fuanAlarm.status === 0x01) {
          await this.createAlarm('fire', 'urgent', binding, deviceName, location, deviceTypeName, conn.connId, fuanAlarm.loop, fuanAlarm.point, fuanAlarm.rawHex);
        } else if (fuanAlarm.status === 0x02) {
          await this.createAlarm('fault', 'high', binding, deviceName, location, deviceTypeName, conn.connId, fuanAlarm.loop, fuanAlarm.point, fuanAlarm.rawHex);
        }
        return;
      }

      logger.info(`[CANET] 非 FECbus 广播帧: ID=0x${frame.canIdHex} data=${frame.dataHex}`);

    } catch (err: any) {
      logger.error(`[CANET] 帧处理错误: ${err.message}`);
    }
  }

  /* ───── 查找设备绑定 ───── */
  private async findDeviceBinding(clientIp: string, _clientPort: number): Promise<{
    deviceId: number | null;
    hostName: string | null;
    unitId: number | null;
    unitName: string | null;
  }> {
    try {
      // 策略1：通过 fire_iot_device 的 ip_address 精确匹配 protocol_type='canet'
      const rows = await sequelize.query(
        `SELECT
           i.id, i.device_sn, i.archive_device_id,
           d.id AS device_id, d.device_name, d.unit_id, u.unit_name
         FROM fire_iot_device i
         JOIN fire_device d ON i.archive_device_id = d.id
         LEFT JOIN fire_unit u ON d.unit_id = u.id
         WHERE i.protocol_type = 'canet'
           AND (i.ip_address = ? OR i.device_sn LIKE ?)
         ORDER BY i.updated_at DESC
         LIMIT 1`,
        { replacements: [clientIp, `%CANET%`], type: QueryTypes.SELECT }
      ) as any[];

      if (rows && rows.length > 0) {
        const r = rows[0];
        logger.info(`[CANET] 绑定成功(策略1/canet): device=${r.device_name} unit=${r.unit_name}`);
        return {
          deviceId: r.device_id ?? null,
          hostName: r.device_name ?? null,
          unitId: r.unit_id ?? null,
          unitName: r.unit_name ?? null,
        };
      }

      // 策略2：回退——只按 ip_address 匹配任何协议类型（兼容未正确设置 protocol_type 的设备）
      const rows2 = await sequelize.query(
        `SELECT
           i.id, i.device_sn, i.archive_device_id,
           d.id AS device_id, d.device_name, d.unit_id, u.unit_name
         FROM fire_iot_device i
         JOIN fire_device d ON i.archive_device_id = d.id
         LEFT JOIN fire_unit u ON d.unit_id = u.id
         WHERE i.ip_address = ?
         ORDER BY i.updated_at DESC
         LIMIT 1`,
        { replacements: [clientIp], type: QueryTypes.SELECT }
      ) as any[];

      if (rows2 && rows2.length > 0) {
        const r = rows2[0];
        logger.info(`[CANET] 绑定成功(策略2/IP回退): device=${r.device_name} unit=${r.unit_name}`);
        return {
          deviceId: r.device_id ?? null,
          hostName: r.device_name ?? null,
          unitId: r.unit_id ?? null,
          unitName: r.unit_name ?? null,
        };
      }

      logger.warn(`[CANET] 未找到设备绑定: ip=${clientIp}`);
      return { deviceId: null, hostName: null, unitId: null, unitName: null };
    } catch (err: any) {
      logger.error(`[CANET] 设备绑定查询失败: ${err.message}`);
      return { deviceId: null, hostName: null, unitId: null, unitName: null };
    }
  }

  /* ───── 创建统一告警 ───── */
  private async createAlarm(
    type: 'fire' | 'fault',
    level: 'urgent' | 'high',
    binding: { deviceId: number | null; hostName: string | null; unitId: number | null; unitName: string | null },
    deviceName: string,
    location: string,
    deviceTypeName: string,
    connId: string,
    loop: number,
    point: number,
    rawHex: string
  ): Promise<void> {
    const alarmNo = generateAlarmNo();
    const typeMap: Record<string, number> = { fire: 1, fault: 2 };
    const levelMap: Record<string, number> = { urgent: 3, high: 2, normal: 1 };

    logger.info(`[CANET] 正在创建告警: type=${type} level=${level} deviceName=${deviceName} unitId=${binding.unitId}`);

    try {
      await AlarmService.createAlarm({
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
        raw_data: rawHex,
        code: deviceTypeName,
        loop_no: loop,
        address: point,
        host_code: connId,
      });

      logger.warn(`[CANET] 🚨 ${type === 'fire' ? '火警' : '故障'} 回路${loop} 点位${point} ${deviceTypeName} | conn=${connId}`);
    } catch (err: any) {
      logger.error(`[CANET] 告警创建失败: ${err.message}`);
    }
  }

  /* ───── 状态接口 ───── */
  getStats(): any[] {
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

/* ───── 导出单例 ───── */
const CANET_TCP_PORT = parseInt(process.env.CANET_PORT || '1030', 10);
const CANET_TCP_HOST = process.env.CANET_HOST || '0.0.0.0';

export const canetServer = new CanetServer(CANET_TCP_PORT, CANET_TCP_HOST);
export default canetServer;
