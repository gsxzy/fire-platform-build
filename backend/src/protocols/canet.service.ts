/**
 * ═══════════════════════════════════════════════════════════════════
 * 智嵌 CANET / CANFDNET 网关 · CAN 帧解析服务
 * 职责：
 * - TCP 流式缓冲，按 CANFDNET 网络包格式拆包
 * - 解析 ZQWL-CANFDNET 协议（兼容周立功 CANFDNET / ZCANPRO）
 * - 从网络包中提取 CAN/CANFD 报文，转换为标准 ParsedCanFrame
 * - 赋安 FECbus 广播帧解析（FS5102 CAN2.0B 扩展帧）
 * ═══════════════════════════════════════════════════════════════════
 */
import logger from '@/config/logger';

/* ───── 解析后 CAN 帧结构 ───── */
export interface ParsedCanFrame {
  raw: Buffer;
  hex: string;
  frameInfo: number;
  isExtended: boolean;
  isRtr: boolean;
  dataLen: number;
  canId: number;
  canIdHex: string;
  data: Buffer;
  dataHex: string;
}

/* ───── FECbus 广播帧结构（赋安 FS5102）──── */
export interface FecbusFrame {
  rawHex: string;
  sourceAddr: number;
  targetAddr: number;
  functionCode: number;
  reserved: number;
  loop: number;
  point: number;
  status: number;
  deviceType: number;
}

/* ───── CANFDNET 网络包结构 ───── */
export interface CanfdnetPacket {
  header: number;      // 0x55
  type: number;        // 0x00=CAN, 0x01=CANFD, 0x02=定时, 0x03=利用率
  param: number;       // 类型参数
  reserved: number;    // 0
  dataLen: number;     // 数据区长度
  data: Buffer;        // 数据区
  checksum: number;    // BCC 校验（计算值）
  actualChecksum: number; // 实际收到的校验
}

/* ───── CANFDNET CAN 报文结构（24B）──── */
export interface CanfdnetCanMessage {
  timestamp: bigint;
  id: number;
  info: number;        // 2B 报文信息
  channel: number;
  dataLen: number;
  data: Buffer;        // 8B
}

/* ───── CANFDNET CANFD 报文结构（80B）──── */
export interface CanfdnetCanfdMessage {
  timestamp: bigint;
  id: number;
  info: number;
  channel: number;
  dataLen: number;
  data: Buffer;        // 64B
}

/* ───── 帧信息掩码 ───── */
const FI_FF = 0x80;      // bit7: 1=扩展帧
const FI_RTR = 0x40;     // bit6: 1=远程帧
const FI_LEN_MASK = 0x0F;

/* ───── CANFDNET 报文信息位定义 ───── */
const CANFDNET_INFO_ERR = 0x80;   // bit7: 1=错误帧
const CANFDNET_INFO_EXT = 0x40;   // bit6: 1=扩展帧
const CANFDNET_INFO_RTR = 0x20;   // bit5: 1=远程帧
const CANFDNET_INFO_FD  = 0x10;   // bit4: 1=CANFD
const CANFDNET_INFO_ECHO = 0x08;  // bit3: 1=发送回显
const CANFDNET_INFO_TX  = 0x04;   // bit2: 1=发送报文

/* ───── BCC 异或校验 ───── */
function calcBCC(buf: Buffer): number {
  let bcc = 0;
  for (let i = 0; i < buf.length; i++) {
    bcc ^= buf[i];
  }
  return bcc;
}

/* ───── CANFDNET 网络包流式解析器 ───── */
export class CanfdnetParser {
  private buffer = Buffer.alloc(0);
  private readonly MAX_BUFFER = 65536;

  push(chunk: Buffer): ParsedCanFrame[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (this.buffer.length > this.MAX_BUFFER) {
      logger.warn(`[CANFDNET-Parser] 缓冲区超限 ${this.buffer.length} bytes，清空`);
      this.buffer = Buffer.alloc(0);
      return [];
    }

    const frames: ParsedCanFrame[] = [];

    while (this.buffer.length >= 7) { // 最小包 = 头(1)+类型(1)+参数(1)+保留(1)+长度(2)+校验(1) = 7
      // 找同步头 0x55
      const syncIdx = this.findSyncPoint();
      if (syncIdx === -1) {
        this.buffer = Buffer.alloc(0);
        break;
      }
      if (syncIdx > 0) {
        logger.warn(`[CANFDNET-Parser] 丢弃错位 ${syncIdx} 字节，重新同步`);
        this.buffer = this.buffer.subarray(syncIdx);
      }

      if (this.buffer.length < 7) break; // 不够最小包头

      const dataLen = this.buffer.readUInt16BE(4); // 大端
      const totalLen = 6 + dataLen + 1; // 头(6) + 数据区 + 校验(1)

      if (this.buffer.length < totalLen) {
        // 数据不够完整包，等待更多数据
        break;
      }

      const packetBuf = this.buffer.subarray(0, totalLen);
      this.buffer = this.buffer.subarray(totalLen);

      const packet = this.parsePacket(packetBuf);
      if (!packet) continue;

      const packetFrames = this.extractFrames(packet);
      frames.push(...packetFrames);
    }

    return frames;
  }

  private findSyncPoint(): number {
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] === 0x55) {
        return i;
      }
    }
    return -1;
  }

  private parsePacket(buf: Buffer): CanfdnetPacket | null {
    const header = buf[0];
    const type = buf[1];
    const param = buf[2];
    const reserved = buf[3];
    const dataLen = buf.readUInt16BE(4);
    const data = buf.subarray(6, 6 + dataLen);
    const actualChecksum = buf[buf.length - 1];

    // 校验
    const bccRange = buf.subarray(0, buf.length - 1);
    const checksum = calcBCC(bccRange);
    if (checksum !== actualChecksum) {
      logger.warn(`[CANFDNET-Parser] BCC 校验失败: calc=0x${checksum.toString(16).padStart(2,'0')} actual=0x${actualChecksum.toString(16).padStart(2,'0')} type=0x${type.toString(16)}`);
      return null;
    }

    return { header, type, param, reserved, dataLen, data, checksum, actualChecksum };
  }

  private extractFrames(packet: CanfdnetPacket): ParsedCanFrame[] {
    const frames: ParsedCanFrame[] = [];

    if (packet.type === 0x00) {
      // CAN 数据包: 数据区 = n × 24B
      const msgLen = 24;
      for (let offset = 0; offset + msgLen <= packet.data.length; offset += msgLen) {
        const msg = this.parseCanMessage(packet.data.subarray(offset, offset + msgLen));
        if (msg) {
          const frame = this.canMessageToParsedFrame(msg);
          if (frame) frames.push(frame);
        }
      }
    } else if (packet.type === 0x01) {
      // CANFD 数据包: 数据区 = n × 80B
      const msgLen = 80;
      for (let offset = 0; offset + msgLen <= packet.data.length; offset += msgLen) {
        const msg = this.parseCanfdMessage(packet.data.subarray(offset, offset + msgLen));
        if (msg) {
          const frame = this.canfdMessageToParsedFrame(msg);
          if (frame) frames.push(frame);
        }
      }
    } else if (packet.type === 0x03) {
      // 总线利用率指示包，忽略
      logger.debug(`[CANFDNET-Parser] 总线利用率包，忽略`);
    } else {
      logger.debug(`[CANFDNET-Parser] 未知包类型: 0x${packet.type.toString(16)}`);
    }

    return frames;
  }

  private parseCanMessage(buf: Buffer): CanfdnetCanMessage | null {
    if (buf.length < 24) return null;
    const timestamp = buf.readBigUInt64BE(0);
    const id = buf.readUInt32BE(8);
    const info = buf.readUInt16BE(12);
    const channel = buf[14];
    const dataLen = buf[15];
    const data = buf.subarray(16, 24);
    return { timestamp, id, info, channel, dataLen, data };
  }

  private parseCanfdMessage(buf: Buffer): CanfdnetCanfdMessage | null {
    if (buf.length < 80) return null;
    const timestamp = buf.readBigUInt64BE(0);
    const id = buf.readUInt32BE(8);
    const info = buf.readUInt16BE(12);
    const channel = buf[14];
    const dataLen = buf[15];
    const data = buf.subarray(16, 80);
    return { timestamp, id, info, channel, dataLen, data };
  }

  private canMessageToParsedFrame(msg: CanfdnetCanMessage): ParsedCanFrame | null {
    // 跳过错误帧
    if (msg.info & CANFDNET_INFO_ERR) {
      logger.debug(`[CANFDNET-Parser] 跳过错误帧: id=0x${msg.id.toString(16)}`);
      return null;
    }
    // 跳过发送回显（避免重复处理）
    if (msg.info & CANFDNET_INFO_ECHO) {
      return null;
    }
    return this.buildParsedFrame(msg.id, msg.info, msg.dataLen, msg.data);
  }

  private lastErrorLog = 0;

  private canfdMessageToParsedFrame(msg: CanfdnetCanfdMessage): ParsedCanFrame | null {
    if (msg.info & CANFDNET_INFO_ERR) {
      const now = Date.now();
      // 每 10 秒最多记录一次错误详情，避免刷屏
      if (now - this.lastErrorLog > 10000) {
        this.lastErrorLog = now;
        const busStatus = msg.data[0];
        const errType = msg.data[1];
        const rxErr = msg.data[3];
        const txErr = msg.data[4];
        const statusMap: Record<number, string> = {
          0x00: '正常', 0xE1: '错误', 0xE2: '告警',
          0xE3: '消极', 0xE4: '关闭', 0xE5: '超载',
        };
        const errMap: Record<number, string> = {
          0x01: '位错误', 0x02: '应答错误', 0x04: 'CRC错误',
          0x08: '格式错误', 0x10: '填充错误', 0x20: '超载错误',
          0x40: '接收缓冲器满', 0x80: '发送缓冲器满',
        };
        logger.info(
          `[CANFDNET-Parser] 错误帧: 总线=${statusMap[busStatus] || '0x'+busStatus.toString(16)} ` +
          `错误类型=${errMap[errType] || '0x'+errType.toString(16)} ` +
          `RX计数=${rxErr} TX计数=${txErr} id=0x${msg.id.toString(16)} ts=${msg.timestamp}`
        );
      }
      return null;
    }
    if (msg.info & CANFDNET_INFO_ECHO) {
      return null;
    }
    // CANFD 数据长度可能大于 8，但 FECbus 只需要前 8 字节
    const effectiveLen = Math.min(msg.dataLen, 8);
    return this.buildParsedFrame(msg.id, msg.info, effectiveLen, msg.data.subarray(0, 8));
  }

  private buildParsedFrame(id: number, info: number, dataLen: number, data: Buffer): ParsedCanFrame | null {
    const isExtended = !!(info & CANFDNET_INFO_EXT);
    const isRtr = !!(info & CANFDNET_INFO_RTR);
    const effectiveLen = Math.min(dataLen, 8);

    // 构造 13 字节标准 CAN 帧格式
    const fi = (isExtended ? FI_FF : 0) | (isRtr ? FI_RTR : 0) | (effectiveLen & FI_LEN_MASK);
    const raw = Buffer.alloc(13);
    raw[0] = fi;
    raw.writeUInt32BE(id, 1);
    data.copy(raw, 5, 0, effectiveLen);

    return {
      raw,
      hex: raw.toString('hex').toUpperCase(),
      frameInfo: fi,
      isExtended,
      isRtr,
      dataLen: effectiveLen,
      canId: id,
      canIdHex: raw.subarray(1, 5).toString('hex').toUpperCase(),
      data: raw.subarray(5, 5 + effectiveLen),
      dataHex: raw.subarray(5, 5 + effectiveLen).toString('hex').toUpperCase(),
    };
  }
}

/* ───── 旧版 FrameParser（保留兼容）──── */
export class FrameParser {
  private buffer = Buffer.alloc(0);
  private readonly MAX_BUFFER = 65536;
  private readonly FRAME_LEN = 13;
  private synced = false;

  push(chunk: Buffer): ParsedCanFrame[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (this.buffer.length > this.MAX_BUFFER) {
      logger.warn(`[CANET-Parser] 缓冲区超限 ${this.buffer.length} bytes，清空`);
      this.buffer = Buffer.alloc(0);
      this.synced = false;
      return [];
    }

    const frames: ParsedCanFrame[] = [];
    while (this.buffer.length >= this.FRAME_LEN) {
      if (!this.synced) {
        const syncIdx = this.findSyncPoint();
        if (syncIdx === -1) {
          this.buffer = Buffer.alloc(0);
          break;
        }
        if (syncIdx > 0) {
          logger.warn(`[CANET-Parser] 丢弃错位 ${syncIdx} 字节，重新同步`);
          this.buffer = this.buffer.subarray(syncIdx);
        }
        this.synced = true;
      }

      const frame = this.parseAlignedFrame();
      if (!frame) {
        this.synced = false;
        this.buffer = this.buffer.subarray(1);
        continue;
      }

      frames.push(frame);
    }
    return frames;
  }

  private findSyncPoint(): number {
    for (let i = 0; i < this.buffer.length; i++) {
      const fi = this.buffer[i];
      const ff = (fi >> 7) & 1;
      const rtr = (fi >> 6) & 1;
      const dataLen = fi & FI_LEN_MASK;

      if (ff === 1 && rtr === 0 && dataLen <= 8 && dataLen > 0) {
        if (this.buffer.length >= i + this.FRAME_LEN) {
          const id = this.buffer.readUInt32BE(i + 1);
          const reserved = id & 0xFFF;
          if (reserved === 0) {
            return i;
          }
        } else {
          return i;
        }
      }
    }
    return -1;
  }

  private parseAlignedFrame(): ParsedCanFrame | null {
    if (this.buffer.length < this.FRAME_LEN) return null;

    const frameBuf = this.buffer.subarray(0, this.FRAME_LEN);
    const fi = frameBuf[0];
    const ff = (fi >> 7) & 1;
    const rtr = (fi >> 6) & 1;
    const dataLen = fi & FI_LEN_MASK;

    if (ff !== 1 || rtr !== 0 || dataLen > 8 || dataLen < 1) {
      return null;
    }

    const canId = frameBuf.readUInt32BE(1);
    const reserved = canId & 0xFFF;
    if (reserved !== 0) {
      return null;
    }

    const data = frameBuf.subarray(5, 5 + dataLen);
    this.buffer = this.buffer.subarray(this.FRAME_LEN);

    return {
      raw: frameBuf,
      hex: frameBuf.toString('hex').toUpperCase(),
      frameInfo: fi,
      isExtended: true,
      isRtr: false,
      dataLen,
      canId,
      canIdHex: frameBuf.subarray(1, 5).toString('hex').toUpperCase(),
      data,
      dataHex: data.toString('hex').toUpperCase(),
    };
  }
}

/**
 * 解析赋安 FECbus 广播帧（FS5102 CAN2.0B 扩展帧）
 *
 * 29 位扩展 ID 布局：
 *   bits 28-23 : 源地址 (6位)
 *   bits 22-17 : 目标地址 (6位)  广播=0x00
 *   bits 16-12 : 功能码 (5位)   0x06=状态广播
 *   bits 11-0  : 保留 (12位)    固定为 0
 *
 * 数据段 8 字节：
 *   D0 : 回路号 (1或2)
 *   D1 : 点位号高字节
 *   D2 : 点位号低字节 (大端: point = D1<<8 | D2)
 *   D3 : 状态 (0x00正常 0x01火警 0x02故障 0x04屏蔽 0x08启动 0x10反馈)
 *   D4 : 设备类型
 *   D5~D7 : 保留
 */
export function parseFecbusFrame(frame: ParsedCanFrame): FecbusFrame | null {
  if (!frame.isExtended || frame.isRtr || frame.dataLen !== 8) return null;

  const id = frame.canId;

  // 29位扩展ID解析
  const sourceAddr = (id >> 23) & 0x3F;      // 6位
  const targetAddr = (id >> 17) & 0x3F;      // 6位
  const functionCode = (id >> 12) & 0x1F;    // 5位
  const reserved = id & 0xFFF;                // 12位

  // FECbus 广播帧特征校验
  if (targetAddr !== 0x00 || functionCode !== 0x06 || reserved !== 0) {
    return null;
  }

  const d = frame.data;
  const loop = d[0];
  const point = (d[1] << 8) | d[2];
  const status = d[3];
  const deviceType = d[4];

  return {
    rawHex: frame.hex,
    sourceAddr,
    targetAddr,
    functionCode,
    reserved,
    loop,
    point,
    status,
    deviceType,
  };
}
