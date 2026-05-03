/**
 * ═══════════════════════════════════════════════════════════════════
 * 赋安 FSCN8001 私有协议 TCP 服务器 v2.0
 * 严格遵循《赋安FSCN8001私有TCP协议规范 v1.0》
 *
 * 帧结构（小端序）:
 *   [帧头:2B=0x4040] [帧序号:2B-LE] [设备ID:12B] [保留区:8B=0x00]
 *   [帧类型:2B-LE] [数据区:N] [CRC16:2B-LE]
 *
 * 监听端口: 5201
 * ═══════════════════════════════════════════════════════════════════
 */
const net = require('net');
const { pool } = require('./utils/db');
const { triggerLinkage } = require('./utils/linkageEngine');

const TCP_PORT = process.env.FSCN8001_PORT || 5201;

/* ───── 日志工具 ───── */
function log(tag, msg) {
  const t = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[FSCN8001][${t}][${tag}] ${msg}`);
}

/* ═══════════════════════════════════════════════════════════════════
   CRC16-Modbus 校验算法
   多项式: 0xA001 (反转的 0x8005)
   初始值: 0xFFFF
   计算范围: 除最后2字节CRC外的所有帧数据
   结果: 2字节小端序
   ═══════════════════════════════════════════════════════════════════ */
function crc16Modbus(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x0001) ? ((crc >> 1) ^ 0xA001) : (crc >> 1);
    }
  }
  return crc;
}

function verifyCrc(frame) {
  if (frame.length < 4) return false;
  const payload = frame.slice(0, -2);
  const expected = crc16Modbus(payload);
  const actual = frame[frame.length - 2] | (frame[frame.length - 1] << 8);
  return expected === actual;
}

function appendCrc(buf) {
  const crc = crc16Modbus(buf);
  return Buffer.concat([buf, Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF])]);
}

/* ═══════════════════════════════════════════════════════════════════
   帧类型映射表
   ═══════════════════════════════════════════════════════════════════ */
const FRAME_TYPES = {
  0x0000: { name: '确认帧', dir: '上行', ack: null },
  0x0003: { name: '心跳帧', dir: '上行', ack: 0xBE02 },
  0x0009: { name: '传报链路故障', dir: '上行', ack: 0x1802 },
  0x000A: { name: '通讯故障', dir: '上行', ack: 0x1802 },
  0x0010: { name: '状态/告警帧', dir: '上行', ack: 0x1502 },
  0x006E: { name: '设备信息帧', dir: '上行', ack: 0xBF02 },
};

const ACK_NAMES = {
  0xBE02: '心跳应答',
  0x1802: '故障应答',
  0x1502: '数据应答',
  0xBF02: '设备信息应答',
};

function getFrameTypeName(typeVal) {
  return FRAME_TYPES[typeVal]?.name || `未知类型 0x${typeVal.toString(16).padStart(4, '0').toUpperCase()}`;
}

/* ═══════════════════════════════════════════════════════════════════
   告警帧(0x0010)详细解析
   ═══════════════════════════════════════════════════════════════════ */
const EVENT_TYPE_MAP = {
  1: '火警',
  2: '故障',
  3: '反馈',
  4: '屏蔽',
  5: '复位',
  26: '系统事件',
};

function parseAlarmFrame(data) {
  if (data.length < 34) return null;
  const deviceId = data.slice(4, 16).toString('hex').toUpperCase();
  const frameSeq = data.readUInt16LE(2);
  const controllerNo = data[28];
  const loopNo = data.readUInt16LE(29);   // 字节29-30 小端序
  const pointNo = data.readUInt16LE(31);   // 字节31-32 小端序
  const eventTypeByte = data.length > 33 ? data[33] : 0;

  return {
    deviceId: `FSCN8001-${deviceId}`,
    frameSeq,
    controllerNo,
    loopNo,
    pointNo,
    eventType: EVENT_TYPE_MAP[eventTypeByte] || `未知类型${eventTypeByte}`,
    eventTypeCode: eventTypeByte,
    rawHex: data.toString('hex').toUpperCase(),
  };
}

/* ═══════════════════════════════════════════════════════════════════
   设备信息帧(0x006E)解析
   ═══════════════════════════════════════════════════════════════════ */
function parseDeviceInfoFrame(data) {
  if (data.length < 26) return null;
  const deviceId = data.slice(4, 16).toString('hex').toUpperCase();
  // 数据区从字节26开始，格式由设备固件决定，此处仅提取原始数据
  const infoData = data.slice(26, -2).toString('hex').toUpperCase();
  return {
    deviceId: `FSCN8001-${deviceId}`,
    infoData,
    rawHex: data.toString('hex').toUpperCase(),
  };
}

/* ═══════════════════════════════════════════════════════════════════
   构造应答帧
   规则:
   ✅ 保持原帧的设备ID、帧序号等所有字段不变
   ✅ 只修改字节24-25为对应的应答类型值
   ✅ 必须重新计算CRC16-Modbus
   ❌ 不要修改任何其他字节！
   ═══════════════════════════════════════════════════════════════════ */
function buildAckFrame(originalFrame, frameType) {
  const ackType = FRAME_TYPES[frameType]?.ack;
  if (!ackType) return null;

  // 复制原帧（去掉原CRC）
  const ack = Buffer.from(originalFrame.slice(0, -2));
  // 设置应答帧类型（字节24-25，小端序）
  ack.writeUInt16LE(ackType, 24);
  // 重新计算CRC并追加
  return appendCrc(ack);
}

/* ═══════════════════════════════════════════════════════════════════
   TCP 粘包处理器
   ═══════════════════════════════════════════════════════════════════ */
class FrameParser {
  constructor() {
    this.buffer = Buffer.alloc(0);
  }

  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const frames = [];

    while (this.buffer.length >= 28) { // 最小帧: 2+2+12+8+2+2=28
      // 找帧头 @@
      let start = this.buffer.indexOf(Buffer.from([0x40, 0x40]));
      if (start === -1) {
        // 没有帧头，清空缓冲区
        this.buffer = Buffer.alloc(0);
        break;
      }
      if (start > 0) {
        log('WARN', `丢弃垃圾数据 ${start} bytes`);
        this.buffer = this.buffer.slice(start);
      }

      // 需要至少28字节才能判断一帧
      if (this.buffer.length < 28) break;

      // 尝试确定帧长度：需要找到下一个帧头，或者用最小长度+数据区
      // 由于数据区长度可变，采用找下一个帧头的方式
      let nextHeader = this.buffer.indexOf(Buffer.from([0x40, 0x40]), 2);
      let frameEnd;

      if (nextHeader !== -1) {
        frameEnd = nextHeader;
      } else {
        // 没有下一个帧头，检查当前帧是否有合法CRC
        // 最小帧28字节，尝试截取并验证CRC
        frameEnd = this.buffer.length;
      }

      // 尝试提取帧：从帧头到frameEnd之间的数据
      const candidate = this.buffer.slice(0, frameEnd);

      // 验证帧长度和CRC
      if (candidate.length >= 28 && verifyCrc(candidate)) {
        frames.push(candidate);
        this.buffer = this.buffer.slice(candidate.length);
      } else if (candidate.length >= 28) {
        // CRC验证失败，尝试移动帧头
        log('WARN', `CRC校验失败，丢弃帧头 (len=${candidate.length})`);
        this.buffer = this.buffer.slice(2);
      } else {
        // 数据不够，等待更多
        break;
      }
    }

    // 缓冲区过长保护（超过1MB清空）
    if (this.buffer.length > 1048576) {
      log('WARN', `缓冲区超过1MB，强制清空`);
      this.buffer = Buffer.alloc(0);
    }

    return frames;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   数据库操作
   ═══════════════════════════════════════════════════════════════════ */
async function upsertDevice(deviceId, ip, port) {
  try {
    const sql = `
      INSERT INTO fscn8001_device (device_sn, device_name, ip, port, status, last_heartbeat, login_time)
      VALUES (?, ?, ?, ?, 'online', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        device_name = VALUES(device_name),
        ip = VALUES(ip),
        port = VALUES(port),
        status = VALUES(status),
        last_heartbeat = VALUES(last_heartbeat)
    `;
    await pool.query(sql, [deviceId, `FSCN-${deviceId.slice(-8)}`, ip, port]);
  } catch (err) {
    log('DB', `设备入库失败: ${err.message}`);
  }
}

async function insertAlarm(deviceId, eventType, eventCode, loopNo, pointNo, rawHex) {
  try {
    // 插入 fscn8001_alarm 表
    const sql = `
      INSERT INTO fscn8001_alarm (device_sn, alarm_type, alarm_level, loop_no, address, device_type, location, status, alarm_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())
    `;
    const alarmType = eventType || 'unknown';
    const alarmLevel = eventCode === 1 ? 4 : eventCode === 2 ? 3 : 2;
    await pool.query(sql, [
      deviceId, alarmType, alarmLevel,
      loopNo || 0, pointNo || 0,
      'fscn8001', `回路${loopNo}-点位${pointNo}`
    ]);
    log('DB', `告警入库: ${deviceId} ${alarmType}`);
  } catch (err) {
    log('DB', `告警入库失败: ${err.message}`);
  }
}

async function insertRawLog(deviceId, direction, cmdType, hexData) {
  try {
    const sql = `
      INSERT INTO fscn8001_raw_log (device_sn, direction, cmd_type, hex_data)
      VALUES (?, ?, ?, ?)
    `;
    await pool.query(sql, [deviceId, direction, cmdType, hexData]);
  } catch (err) {
    // 静默失败，不影响主流程
  }
}

/* ═══════════════════════════════════════════════════════════════════
   连接管理
   ═══════════════════════════════════════════════════════════════════ */
const connections = new Map();
let connectionCounter = 0;

/* ═══════════════════════════════════════════════════════════════════
   客户端处理
   ═══════════════════════════════════════════════════════════════════ */
function handleClient(socket) {
  const connId = ++connectionCounter;
  const clientIp = socket.remoteAddress;
  const clientPort = socket.remotePort;
  const clientKey = `${clientIp}:${clientPort}`;

  connections.set(connId, { socket, parser: new FrameParser(), deviceId: null, lastActive: Date.now() });
  log('CONN', `[${connId}] 设备接入: ${clientKey}`);

  socket.on('data', async (chunk) => {
    const conn = connections.get(connId);
    if (!conn) return;
    conn.lastActive = Date.now();

    const frames = conn.parser.push(chunk);
    for (const frame of frames) {
      const frameSeq = frame.readUInt16LE(2);
      const deviceIdHex = frame.slice(4, 16).toString('hex').toUpperCase();
      const frameType = frame.readUInt16LE(24);
      const typeName = getFrameTypeName(frameType);

      // 记录设备ID
      if (!conn.deviceId) {
        conn.deviceId = deviceIdHex;
        await upsertDevice(deviceIdHex, clientIp, clientPort);
      }

      const ts = new Date().toISOString().split('T')[1].slice(0, 12);
      log('RECV', `[${connId}] ${clientKey} | ${typeName} | seq=${frameSeq} | len=${frame.length}B | device=${deviceIdHex}`);

      // 记录原始日志
      await insertRawLog(deviceIdHex, 'up', `0x${frameType.toString(16).padStart(4, '0')}`, frame.toString('hex').toUpperCase());

      // 构造并发送应答
      const ack = buildAckFrame(frame, frameType);
      if (ack) {
        socket.write(ack);
        const ackType = frame.readUInt16LE(24);
        const ackTypeName = ACK_NAMES[FRAME_TYPES[frameType]?.ack] || '未知应答';
        log('SEND', `[${connId}] ${clientKey} | ${ackTypeName} | seq=${frameSeq}`);
      }

      // 业务处理
      try {
        switch (frameType) {
          case 0x0010: { // 告警帧
            const alarm = parseAlarmFrame(frame);
            if (alarm) {
              log('ALARM', `[${connId}] 回路=${alarm.loopNo} 点位=${alarm.pointNo} 事件=${alarm.eventType}`);
              await insertAlarm(alarm.deviceId, alarm.eventType, alarm.eventTypeCode, alarm.loopNo, alarm.pointNo, alarm.rawHex);
            }
            break;
          }
          case 0x006E: { // 设备信息帧
            const info = parseDeviceInfoFrame(frame);
            if (info) {
              log('INFO', `[${connId}] 设备信息: ${info.infoData}`);
            }
            break;
          }
          case 0x0003: { // 心跳帧
            await upsertDevice(deviceIdHex, clientIp, clientPort);
            break;
          }
          case 0x0009:
          case 0x000A: { // 故障帧
            log('FAULT', `[${connId}] 设备故障/链路故障: type=0x${frameType.toString(16).padStart(4, '0')}`);
            break;
          }
          default:
            log('RECV', `[${connId}] 未处理帧类型: 0x${frameType.toString(16).padStart(4, '0')}`);
        }
      } catch (err) {
        log('ERR', `[${connId}] 业务处理异常: ${err.message}`);
      }
    }
  });

  socket.on('close', () => {
    log('CONN', `[${connId}] 设备断开: ${clientKey}`);
    connections.delete(connId);
  });

  socket.on('error', (err) => {
    log('ERR', `[${connId}] Socket错误: ${err.message}`);
    connections.delete(connId);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   启动 TCP 服务器
   ═══════════════════════════════════════════════════════════════════ */
function startServer() {
  const server = net.createServer(handleClient);
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log('ERR', `端口 ${TCP_PORT} 已被占用`);
    } else {
      log('ERR', `服务器错误: ${err.message}`);
    }
  });
  server.listen(TCP_PORT, '0.0.0.0', () => {
    log('START', `FSCN8001 协议服务器已启动: 0.0.0.0:${TCP_PORT}`);
    log('START', `帧格式: [@@][Seq:2LE][ID:12][Reserved:8][Type:2LE][Data:N][CRC16:2LE]`);
    log('START', `支持帧类型: 心跳(0x0003)→0xBE02 | 告警(0x0010)→0x1502 | 设备信息(0x006E)→0xBF02 | 故障→0x1802`);
  });

  // 连接健康检查：120秒无活动断开
  setInterval(() => {
    const now = Date.now();
    for (const [id, conn] of connections.entries()) {
      if (now - conn.lastActive > 120000) {
        log('TIMEOUT', `[${id}] 120秒无活动，强制断开`);
        try { conn.socket.end(); } catch {}
        connections.delete(id);
      }
    }
  }, 30000);
}

module.exports = { startServer };
