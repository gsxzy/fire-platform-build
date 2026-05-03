/**
 * ============================================================
 * 赋安 FSCN8001 私有协议 TCP 服务器（MySQL 入库版）
 * 监听端口: 5201
 * 协议格式（真实设备帧格式）:
 *   [帧头: 40 40] [命令字: 1B] [固定: 00 01 05] [时间戳: 6B-BCD] [设备ID: 12B]
 *   [数据区: N] [校验和: 1B] [帧尾: 23 23]
 * ============================================================
 */
const net = require('net');
const http = require('http');
const mysql = require('mysql2/promise');
const { initLinkageEngine, triggerLinkage } = require('./utils/linkageEngine');
const { initDeviceService, findOrCreateDevice, updateHeartbeat, markOffline, checkOfflineDevices } = require('./services/iotDevice.service');
const { initAlarmService, createAlarm } = require('./services/alarm.service');
const dbConfig = require('./config/database').getDbConfig();

/* ── 请求速率限制（原生 http 兼容） ── */
const rateLimitStore = new Map(); // ip -> { count, resetTime }
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15分钟
const RATE_LIMIT_MAX = 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  record.count++;
  return { allowed: record.count <= RATE_LIMIT_MAX, remaining: Math.max(0, RATE_LIMIT_MAX - record.count) };
}

// 定期清理过期记录
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) rateLimitStore.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS);

const TCP_PORT = process.env.FSCN8001_PORT || 5201;

let dbPool = null;
let dbEnabled = false;

async function initDb() {
  try {
    dbPool = mysql.createPool(dbConfig);
    const conn = await dbPool.getConnection();
    await conn.ping();
    conn.release();
    dbEnabled = true;
    initLinkageEngine(dbPool);
    initDeviceService(dbPool);
    initAlarmService(dbPool);
    log('DB', 'MySQL 连接成功，联动引擎/设备服务/告警服务已初始化');
    // 启动统一心跳超时检测（3分钟）
    startHeartbeatMonitor();
  } catch (err) {
    log('DB', `MySQL 连接失败: ${err.message}，降级为纯日志模式`);
    dbPool = null;
    dbEnabled = false;
  }
}

/* ── 心跳超时检测（3分钟无心跳标记离线） ── */
const HEARTBEAT_OFFLINE_MINUTES = 3;
const HEARTBEAT_CHECK_INTERVAL_MS = 30000;
function startHeartbeatMonitor() {
  setInterval(async () => {
    const offlineDevices = await checkOfflineDevices(HEARTBEAT_OFFLINE_MINUTES);
    if (offlineDevices.length > 0) {
      log('MONITOR', `本次扫描发现 ${offlineDevices.length} 个设备心跳超时离线`);
    }
  }, HEARTBEAT_CHECK_INTERVAL_MS);
  log('MONITOR', `统一心跳超时检测已启动: ${HEARTBEAT_OFFLINE_MINUTES}分钟无心跳自动标记离线`);
}

async function upsertDevice(deviceId, ip, port, name, type) {
  if (!dbEnabled || !dbPool) return;
  try {
    const sql = `
      INSERT INTO devices (device_id, device_name, device_type, protocol, ip_address, port, status, last_heartbeat, updated_at)
      VALUES (?, ?, ?, 'tcp', ?, ?, 'online', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        device_name = VALUES(device_name),
        ip_address = VALUES(ip_address),
        port = VALUES(port),
        status = VALUES(status),
        last_heartbeat = VALUES(last_heartbeat),
        updated_at = VALUES(updated_at)
    `;
    await dbPool.execute(sql, [deviceId, name, type, ip, port]);
    log('DB', `设备入库/更新: ${deviceId}`);
  } catch (err) {
    log('DB', `设备入库失败: ${err.message}`);
  }
  // 同步写入 fscn8001_device 表（供前端 /api/fscn8001/* 查询）
  try {
    await dbPool.execute(
      `INSERT INTO fscn8001_device (device_sn, device_name, ip, port, status, last_heartbeat, login_time, updated_at)
       VALUES (?, ?, ?, ?, 1, NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         device_name = VALUES(device_name),
         ip = VALUES(ip),
         port = VALUES(port),
         status = 1,
         last_heartbeat = NOW(),
         updated_at = NOW()`,
      [deviceId, name, ip, port]
    );
  } catch (err) {
    log('DB', `fscn8001_device 同步失败: ${err.message}`);
  }
}

async function updateDeviceOffline(deviceId) {
  if (!dbEnabled || !dbPool) return;
  try {
    await dbPool.execute(
      "UPDATE devices SET status = 'offline', updated_at = NOW() WHERE device_id = ?",
      [deviceId]
    );
    log('DB', `设备离线: ${deviceId}`);
  } catch (err) {
    log('DB', `设备离线更新失败: ${err.message}`);
  }
  // 同步更新 fscn8001_device 表
  try {
    await dbPool.execute(
      "UPDATE fscn8001_device SET status = 0, updated_at = NOW() WHERE device_sn = ?",
      [deviceId]
    );
  } catch (err) {
    log('DB', `fscn8001_device 离线更新失败: ${err.message}`);
  }
}

async function insertAlarm(deviceId, alarmType, alarmLevel, description, rawData, loopNo, pointNo) {
  if (!dbEnabled || !dbPool) return;
  let alarmId = null;
  try {
    const sql = `
      INSERT INTO alarms (device_id, alarm_type, alarm_level, description, status, start_time, loop_no, point_no, raw_frame_hex)
      VALUES (?, ?, ?, ?, 'new', NOW(), ?, ?, ?)
    `;
    const desc = description + (rawData ? ` | RAW:${rawData}` : '');
    const [result] = await dbPool.execute(sql, [
      deviceId, alarmType, alarmLevel, desc,
      loopNo !== undefined && loopNo !== null ? loopNo : null,
      pointNo !== undefined && pointNo !== null ? pointNo : null,
      rawData || null
    ]);
    alarmId = result.insertId;
    log('DB', `报警入库: ${deviceId} ${alarmType} loop=${loopNo} point=${pointNo} id=${alarmId}`);
  } catch (err) {
    log('DB', `报警入库失败: ${err.message}`);
    // alarms 表可能不存在，继续后续入库
  }

  // 统一告警入库 fire_alarm
  try {
    const levelMap = { high: 4, normal: 3, low: 2 };
    const alarmResult = await createAlarm({
      deviceId,
      deviceName: `FSCN8001-${deviceId.slice(-6)}`,
      protocol: 'fscn8001',
      alarmType,
      alarmLevel: levelMap[alarmLevel] || 2,
      location: loopNo !== undefined && loopNo !== null ? `${loopNo}回路${pointNo !== undefined && pointNo !== null ? pointNo + '号点' : ''}` : null,
      description: `${description || alarmType}${loopNo !== undefined && loopNo !== null ? ` | ${loopNo}回路${pointNo !== undefined && pointNo !== null ? pointNo + '号点' : ''}` : ''}`,
      rawData: rawData || null,
      loopNo: loopNo !== undefined && loopNo !== null ? loopNo : null,
      address: pointNo !== undefined && pointNo !== null ? pointNo : null,
    });
    if (alarmResult) {
      log('ALARM', `统一告警入库成功: alarmNo=${alarmResult.alarmNo}, type=${alarmResult.alarmType}`);
    }
  } catch (err) {
    log('ALARM', `统一告警入库失败: ${err.message}`);
  }

  // 同步写入 fscn8001_alarm 表（供前端 /api/fscn8001/* 和 /api/alarms 查询）
  try {
    await dbPool.execute(
      `INSERT INTO fscn8001_alarm (device_sn, alarm_type, alarm_level, location, status, alarm_time, loop_no, address)
       VALUES (?, ?, ?, ?, 0, NOW(), ?, ?)`,
      [deviceId, alarmType, alarmLevel, description || alarmType,
       loopNo !== undefined && loopNo !== null ? loopNo : null,
       pointNo !== undefined && pointNo !== null ? pointNo : null]
    );
    log('DB', `fscn8001_alarm 同步入库: ${deviceId} ${alarmType}`);
  } catch (err) {
    log('DB', `fscn8001_alarm 同步失败: ${err.message}`);
  }

  // 触发安消联动
  try {
    await triggerLinkage({
      alarmId,
      alarmType,
      alarmLevel: alarmLevel === 'high' ? 4 : alarmLevel === 'normal' ? 3 : 2,
      deviceId,
      deviceName: deviceId,
      deviceType: alarmType,
      location: description || '',
      description: description || ''
    });
  } catch (err) {
    log('Linkage', `联动触发失败: ${err.message}`);
  }
}

/* ── 连接管理 ── */
const connections = new Map();

function log(tag, msg) {
  console.log(`[FSCN8001][${new Date().toISOString()}][${tag}] ${msg}`);
}

/* ═══════ BCD 时间戳工具 ═══════ */

function encodeBcdTimestamp(date = new Date()) {
  const buf = Buffer.alloc(6);
  buf[0] = parseInt(date.getSeconds().toString().padStart(2, '0'), 16);
  buf[1] = parseInt(date.getMinutes().toString().padStart(2, '0'), 16);
  buf[2] = parseInt(date.getHours().toString().padStart(2, '0'), 16);
  buf[3] = parseInt(date.getDate().toString().padStart(2, '0'), 16);
  buf[4] = parseInt((date.getMonth() + 1).toString().padStart(2, '0'), 16);
  buf[5] = parseInt((date.getFullYear() % 100).toString().padStart(2, '0'), 16);
  return buf;
}

function decodeBcdTimestamp(buf) {
  if (buf.length < 6) return '??';
  // BCD 解码: 高4位为十位，低4位为个位
  const s = ((buf[0] >> 4) * 10 + (buf[0] & 0x0F)).toString().padStart(2, '0');
  const m = ((buf[1] >> 4) * 10 + (buf[1] & 0x0F)).toString().padStart(2, '0');
  const h = ((buf[2] >> 4) * 10 + (buf[2] & 0x0F)).toString().padStart(2, '0');
  const d = ((buf[3] >> 4) * 10 + (buf[3] & 0x0F)).toString().padStart(2, '0');
  const M = ((buf[4] >> 4) * 10 + (buf[4] & 0x0F)).toString().padStart(2, '0');
  const y = ((buf[5] >> 4) * 10 + (buf[5] & 0x0F)).toString().padStart(2, '0');
  return `20${y}-${M}-${d} ${h}:${m}:${s}`;
}

/* ═══════ 协议工具函数 ═══════ */

/**
 * GB26875-2011 整包累加和校验码计算（赋安 FSCN8001 实际使用）
 * 从命令字开始到数据区最后一个字节逐字节累加，取低8位
 */
function calcChecksum(buf, start, end) {
  let sum = 0;
  for (let i = start; i < end; i++) sum += buf[i];
  return sum & 0xFF;
}

/**
 * 异或校验（部分标准版本使用）
 */
function calcXorChecksum(buf, start, end) {
  let xor = 0;
  for (let i = start; i < end; i++) xor ^= buf[i];
  return xor & 0xFF;
}

/**
 * 构造下行应答帧（GB26875-2011 标准格式）
 * 原样提取上行帧的时间戳、设备ID、数据区
 * 帧格式: [40 40] [Cmd] [00 01 05] [Time:6B-BCD] [DeviceID:12B] [Data:N] [XOR:1B] [23 23]
 */
function buildResponseFrame(upCmd, timestamp, deviceId, data) {
  const respCmd = upCmd + 0x80;           // 应答命令字 = 上行命令字 + 0x80
  const fixed = Buffer.from([0x00, 0x01, 0x05]);
  const totalLen = 2 + 1 + 3 + 6 + 12 + data.length + 1 + 2;
  const frame = Buffer.alloc(totalLen);
  let offset = 0;

  frame.writeUInt16BE(0x4040, offset);    offset += 2;  // 帧头
  frame.writeUInt8(respCmd, offset);      offset += 1;  // 应答命令字
  fixed.copy(frame, offset);              offset += 3;  // 固定字段
  timestamp.copy(frame, offset);          offset += 6;  // 原样时间戳
  deviceId.copy(frame, offset);           offset += 12; // 原样设备ID
  data.copy(frame, offset);               offset += data.length; // 原样数据区
  const cs = calcChecksum(frame, 2, offset);            // 累加和校验(命令字~数据区末字节)
  frame.writeUInt8(cs, offset);           offset += 1;  // 校验码
  frame.writeUInt16BE(0x2323, offset);    offset += 2;  // 帧尾

  return frame;
}

/**
 * 构造主动下发帧（使用当前系统时间生成时间戳）
 */
function buildFrame(cmd, deviceId, data) {
  const timestamp = encodeBcdTimestamp();
  const fixed = Buffer.from([0x00, 0x01, 0x05]);
  const totalLen = 2 + 1 + 3 + 6 + 12 + data.length + 1 + 2;
  const frame = Buffer.alloc(totalLen);
  let offset = 0;

  frame.writeUInt16BE(0x4040, offset);    offset += 2;
  frame.writeUInt8(cmd, offset);          offset += 1;
  fixed.copy(frame, offset);              offset += 3;
  timestamp.copy(frame, offset);          offset += 6;
  deviceId.copy(frame, offset);           offset += 12;
  data.copy(frame, offset);               offset += data.length;
  const cs = calcChecksum(frame, 2, offset);
  frame.writeUInt8(cs, offset);           offset += 1;
  frame.writeUInt16BE(0x2323, offset);    offset += 2;
  return frame;
}

/* ═══════ 帧解析器 ═══════ */
class FrameParser {
  constructor() {
    this.buffer = Buffer.alloc(0);
  }

  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const frames = [];

    while (this.buffer.length >= 10) {
      let start = this.buffer.indexOf(Buffer.from([0x40, 0x40]));
      if (start === -1) {
        this.buffer = this.buffer.slice(-1);
        break;
      }
      if (start > 0) {
        log('WARN', `丢弃垃圾数据 ${start} bytes: ${this.buffer.slice(0, start).toString('hex').toUpperCase()}`);
        this.buffer = this.buffer.slice(start);
      }

      let end = -1;
      for (let i = 4; i < this.buffer.length - 1; i++) {
        if (this.buffer[i] === 0x23 && this.buffer[i + 1] === 0x23) {
          end = i + 1;
          break;
        }
      }
      if (end === -1) break;

      if (end + 1 > 512) {
        log('WARN', `帧超长 ${end + 1} bytes，丢弃帧头`);
        this.buffer = this.buffer.slice(2);
        continue;
      }

      const frameBuf = this.buffer.slice(0, end + 1);
      this.buffer = this.buffer.slice(end + 1);
      const parsed = this.parseFrame(frameBuf);
      if (parsed) frames.push(parsed);
    }
    return frames;
  }

  parseFrame(frame) {
    const header = frame.readUInt16BE(0);
    const footer = frame.readUInt16BE(frame.length - 2);

    if (header !== 0x4040) {
      log('ERROR', `帧头错误: 期望=0x4040, 实际=0x${header.toString(16).padStart(4, '0')}`);
      return null;
    }
    if (footer !== 0x2323) {
      log('ERROR', `帧尾错误: 期望=0x2323, 实际=0x${footer.toString(16).padStart(4, '0')}`);
      return null;
    }
    if (frame.length < 27) {
      log('ERROR', `帧长度不足: ${frame.length} bytes, 最小27`);
      return null;
    }

    const cmd = frame.readUInt8(2);
    const fixed = frame.slice(3, 6);
    const timestamp = frame.slice(6, 12);
    const deviceId = frame.slice(12, 24);
    const data = frame.slice(24, frame.length - 3);
    const checksum = frame.readUInt8(frame.length - 3);

    // 兼容两种校验方式: 先尝试累加和(赋安FSCN8001实际使用)，再尝试异或校验
    let expectedCs = calcChecksum(frame, 2, frame.length - 3);
    let checksumType = 'SUM';
    if (checksum !== expectedCs) {
      expectedCs = calcXorChecksum(frame, 2, frame.length - 3);
      checksumType = 'XOR';
    }
    if (checksum !== expectedCs) {
      log('ERROR', `校验错误: 计算=SUM=0x${calcChecksum(frame, 2, frame.length - 3).toString(16).padStart(2, '0').toUpperCase()}/XOR=0x${calcXorChecksum(frame, 2, frame.length - 3).toString(16).padStart(2, '0').toUpperCase()}, 实际=0x${checksum.toString(16).padStart(2, '0').toUpperCase()} cmd=0x${cmd.toString(16).padStart(2, '0').toUpperCase()}`);
      return null;
    }

    return {
      cmd,
      deviceIdHex: deviceId.toString('hex').toUpperCase(),
      deviceId,
      timestamp,
      timestampStr: decodeBcdTimestamp(timestamp),
      data,
      dataLen: data.length,
      checksum,
      raw: frame.toString('hex').toUpperCase(),
    };
  }
}

/* ═══════ 命令字处理器 ═══════ */

const handlers = {
  /**
   * 0x01 注册帧 → 0x81 注册应答
   * 原样提取时间、设备ID、数据区，拼接应答帧
   */
  async 0x01(socket, frame) {
    const deviceId = frame.deviceIdHex;
    log('REG', `▲ 上行注册帧 deviceId=${deviceId} time=${frame.timestampStr} data=${frame.data.toString('hex').toUpperCase() || '(empty)'}`);
    log('REG', `   RAW=${frame.raw}`);

    connections.set(deviceId, {
      socket,
      lastHeartbeat: Date.now(),
      loginTime: new Date().toISOString(),
      ip: socket.remoteAddress,
      port: socket.remotePort,
    });
    socket.deviceId = deviceId;

    // 构造注册应答帧
    const resp = buildResponseFrame(0x01, frame.timestamp, frame.deviceId, Buffer.alloc(0));
    socket.write(resp);
    log('REG', `▼ 下行注册应答(81) deviceId=${deviceId} RAW=${resp.toString('hex').toUpperCase()}`);

    // 更新通用设备表
    await upsertDevice(deviceId, socket.remoteAddress, socket.remotePort, `FSCN8001-${deviceId.slice(-6)}`, 'fscn8001');

    // 统一设备注册 fire_iot_device
    const devInfo = await findOrCreateDevice({
      deviceId,
      deviceName: `赋安主机-${deviceId.slice(-6)}`,
      protocol: 'fscn8001',
      ip: socket.remoteAddress,
      port: socket.remotePort,
      manufacturer: '赋安',
      model: 'FSCN8001',
      heartbeatInterval: 60,
    });
    log('REG', `设备[${deviceId}]统一注册完成: unit=${devInfo ? devInfo.unitName : 'N/A'}`);
  },

  /**
   * 0x02 心跳帧 → 0x82 心跳应答
   * 原样提取原时间、设备ID、附属数据，拼接应答帧
   */
  async 0x02(socket, frame) {
    const deviceId = frame.deviceIdHex;
    const conn = connections.get(deviceId);
    if (conn) conn.lastHeartbeat = Date.now();

    log('HB', `▲ 上行心跳帧(02) deviceId=${deviceId} time=${frame.timestampStr} dataLen=${frame.dataLen} data=${frame.data.toString('hex').toUpperCase() || '(empty)'}`);
    log('HB', `   RAW=${frame.raw}`);

    // 构造心跳应答帧
    const resp = buildResponseFrame(0x02, frame.timestamp, frame.deviceId, frame.data);
    socket.write(resp);
    log('HB', `▼ 下行心跳应答(82) deviceId=${deviceId} RAW=${resp.toString('hex').toUpperCase()}`);

    // 更新通用设备表
    await upsertDevice(deviceId, socket.remoteAddress, socket.remotePort, `FSCN8001-${deviceId.slice(-6)}`, 'fscn8001');

    // 统一设备心跳更新
    await updateHeartbeat(deviceId, 'fscn8001', socket.remoteAddress);
  },

  /**
   * 0x03 报警/火警上报 → 0x83 报警应答
   */
  async 0x03(socket, frame) {
    const deviceId = frame.deviceIdHex;
    log('ALARM', `▲ 上行报警帧(03) deviceId=${deviceId} time=${frame.timestampStr} data=${frame.data.toString('hex').toUpperCase()}`);
    log('ALARM', `   RAW=${frame.raw}`);

    let eventTime = frame.timestampStr;
    let preData = '';
    let loopNo = null;
    let pointNo = null;
    if (frame.data.length >= 12) {
      eventTime = decodeBcdTimestamp(frame.data.slice(6, 12));
      preData = frame.data.slice(0, 6).toString('hex').toUpperCase();
    }
    // FSCN8001 报警帧: 尝试从 data[12:16] 解析回路号和点位号
    if (frame.data.length >= 16) {
      loopNo = (frame.data[13] << 8) + frame.data[12];
      pointNo = (frame.data[15] << 8) + frame.data[14];
      log('ALARM', `   解析: 回路号=${loopNo} 点位号=${pointNo}`);
    }
    log('ALARM', `   解析: 事件时间=${eventTime} 前置数据=${preData}`);

    // 发送报警应答
    const resp = buildResponseFrame(0x03, frame.timestamp, frame.deviceId, frame.data);
    socket.write(resp);
    log('ALARM', `▼ 下行报警应答(83) deviceId=${deviceId} RAW=${resp.toString('hex').toUpperCase()}`);

    const desc = `事件时间:${eventTime} 前置数据:${preData}${loopNo !== null ? ` ${loopNo}回路${pointNo}号点` : ''}`;
    await insertAlarm(deviceId, 'fire', 'high', desc, frame.raw, loopNo, pointNo);
  },

  /**
   * 0x04 故障/状态上报 → 0x84 故障应答
   */
  async 0x04(socket, frame) {
    const deviceId = frame.deviceIdHex;
    log('STATUS', `▲ 上行故障帧(04) deviceId=${deviceId} time=${frame.timestampStr} data=${frame.data.toString('hex').toUpperCase()}`);
    log('STATUS', `   RAW=${frame.raw}`);

    let eventTime = frame.timestampStr;
    let preData = '';
    let loopNo = null;
    let pointNo = null;
    if (frame.data.length >= 12) {
      eventTime = decodeBcdTimestamp(frame.data.slice(6, 12));
      preData = frame.data.slice(0, 6).toString('hex').toUpperCase();
    }
    // FSCN8001 故障帧: 尝试从 data[12:16] 解析回路号和点位号
    if (frame.data.length >= 16) {
      loopNo = (frame.data[13] << 8) + frame.data[12];
      pointNo = (frame.data[15] << 8) + frame.data[14];
      log('STATUS', `   解析: 回路号=${loopNo} 点位号=${pointNo}`);
    }
    log('STATUS', `   解析: 事件时间=${eventTime} 前置数据=${preData}`);

    // 发送故障应答
    const resp = buildResponseFrame(0x04, frame.timestamp, frame.deviceId, frame.data);
    socket.write(resp);
    log('STATUS', `▼ 下行故障应答(84) deviceId=${deviceId} RAW=${resp.toString('hex').toUpperCase()}`);

    const desc = `事件时间:${eventTime} 前置数据:${preData}${loopNo !== null ? ` ${loopNo}回路${pointNo}号点` : ''}`;
    await insertAlarm(deviceId, 'fault', 'normal', desc, frame.raw, loopNo, pointNo);
  },

  /**
   * 0x05 用传复位 → 0x85 用传复位应答
   */
  async 0x05(socket, frame) {
    const deviceId = frame.deviceIdHex;
    log('CTRL', `▲ 上行用传复位帧(05) deviceId=${deviceId} time=${frame.timestampStr} data=${frame.data.toString('hex').toUpperCase()}`);
    log('CTRL', `   RAW=${frame.raw}`);

    // 发送用传复位应答
    const resp = buildResponseFrame(0x05, frame.timestamp, frame.deviceId, frame.data);
    socket.write(resp);
    log('CTRL', `▼ 下行用传复位应答(85) deviceId=${deviceId} RAW=${resp.toString('hex').toUpperCase()}`);

    await insertAlarm(deviceId, 'supervisory', 'low', `FSCN8001用传复位 time=${frame.timestampStr}`, frame.raw);
  },
};

async function handleFrame(socket, frame) {
  const handler = handlers[frame.cmd];
  if (handler) {
    try {
      await handler(socket, frame);
    } catch (err) {
      log('ERROR', `处理帧异常: ${err.message}`);
    }
  } else {
    log('WARN', `未知命令字 0x${frame.cmd.toString(16).padStart(2, '0')} deviceId=${frame.deviceIdHex}`);
  }
}

/* ═══════ TCP Server ═══════ */

function startServer() {
  const server = net.createServer((socket) => {
    const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    log('CONN', `客户端连接: ${clientAddr}`);

    const parser = new FrameParser();

    socket.on('data', async (chunk) => {
      const hexData = chunk.toString('hex').toUpperCase();
      log('RAW', `<= ${clientAddr} ${chunk.length} bytes: ${hexData}`);
      const frames = parser.push(chunk);
      for (const frame of frames) {
        log('PARSE', `解析成功 cmd=0x${frame.cmd.toString(16).padStart(2, '0')} deviceId=${frame.deviceIdHex} dataLen=${frame.dataLen} time=${frame.timestampStr}`);
        // 同步写入原始报文日志
        if (dbEnabled && dbPool && socket.deviceId) {
          try {
            const cmdNames = { 0x01: 'register', 0x02: 'heartbeat', 0x03: 'alarm', 0x04: 'fault', 0x05: 'reset' };
            await dbPool.execute(
              `INSERT INTO fscn8001_raw_log (device_sn, direction, cmd_type, hex_data, parsed_json)
               VALUES (?, 'RX', ?, ?, ?)`,
              [socket.deviceId, cmdNames[frame.cmd] || `0x${frame.cmd.toString(16).padStart(2,'0')}`, frame.raw, JSON.stringify({ timestamp: frame.timestampStr, dataLen: frame.dataLen })]
            );
          } catch (err) {
            log('DB', `raw_log 写入失败: ${err.message}`);
          }
        }
        await handleFrame(socket, frame);
      }
    });

    socket.on('close', async (hadError) => {
      const did = socket.deviceId;
      log('CONN', `客户端断开: ${clientAddr} deviceId=${did || 'unknown'} ${hadError ? '(异常)' : ''}`);
      if (did) {
        await updateDeviceOffline(did);
        connections.delete(did);
        await markOffline(did, 'fscn8001');
        log('OFFLINE', `设备[${did}]连接断开，已标记离线`);
      }
    });

    socket.on('error', (err) => {
      log('ERROR', `Socket错误: ${clientAddr} ${err.message}`);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log('SERVER', `端口 ${TCP_PORT} 已被占用`);
    } else {
      log('SERVER', `服务器错误: ${err.message}`);
    }
  });

  server.listen(TCP_PORT, '0.0.0.0', () => {
    log('SERVER', `赋安 FSCN8001 私有协议服务器启动: 0.0.0.0:${TCP_PORT}`);
    log('SERVER', dbEnabled ? 'MySQL 入库模式已启用' : 'MySQL 未连接，纯日志模式运行');
  });

  return server;
}

/* ── 心跳超时检测（60秒无心跳认为离线） ── */
setInterval(() => {
  const now = Date.now();
  for (const [deviceId, conn] of connections.entries()) {
    if (now - conn.lastHeartbeat > 60000) {
      log('TIMEOUT', `心跳超时 deviceId=${deviceId} 强制断开`);
      conn.socket.destroy();
      connections.delete(deviceId);
    }
  }
}, 10000);

/* ── 优雅退出 ── */
process.on('SIGINT', async () => {
  log('SERVER', '收到 SIGINT，正在关闭...');
  for (const conn of connections.values()) {
    conn.socket.destroy();
  }
  connections.clear();
  if (dbPool) await dbPool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('SERVER', '收到 SIGTERM，正在关闭...');
  for (const conn of connections.values()) {
    conn.socket.destroy();
  }
  connections.clear();
  if (dbPool) await dbPool.end();
  process.exit(0);
});

/* ═══════ HTTP API 服务器 ═══════ */

const HTTP_PORT = process.env.FSCN8001_HTTP_PORT || 5004;

function sendJson(req, res, statusCode, data) {
  const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'];
  const origin = req.headers.origin;
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function parseQuery(url) {
  const q = {};
  const idx = url.indexOf('?');
  if (idx === -1) return { path: url, q };
  const path = url.slice(0, idx);
  const params = new URLSearchParams(url.slice(idx + 1));
  for (const [k, v] of params) q[k] = v;
  return { path, q };
}

async function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    // 速率限制检查
    const clientIp = req.socket.remoteAddress;
    const { allowed, remaining } = checkRateLimit(clientIp);
    res.setHeader('RateLimit-Limit', String(RATE_LIMIT_MAX));
    res.setHeader('RateLimit-Remaining', String(remaining));
    if (!allowed) {
      sendJson(req, res, 429, { code: 429, msg: '请求过于频繁，请稍后再试' });
      return;
    }

    if (req.method === 'OPTIONS') {
      sendJson(req, res, 200, { code: 200 });
      return;
    }

    const { path, q } = parseQuery(req.url);
    const method = req.method;

    try {
      // GET /api/alarms/list
      if (method === 'GET' && path === '/api/alarms/list') {
        const page = Math.max(1, parseInt(q.page || '1'));
        const pageSize = Math.min(100, parseInt(q.pageSize || '10'));
        const offset = (page - 1) * pageSize;
        const type = q.type;
        const keyword = q.keyword;
        const status = q.status;

        let where = 'WHERE 1=1';
        const params = [];
        if (type && type !== 'all') {
          where += ' AND alarm_type = ?';
          params.push(type);
        }
        if (status) {
          where += ' AND status = ?';
          params.push(status);
        }
        if (keyword) {
          where += ' AND (device_id LIKE ? OR description LIKE ?)';
          const like = `%${keyword}%`;
          params.push(like, like);
        }

        const [rows] = await dbPool.query(
          `SELECT id, device_id, alarm_type AS type, alarm_level AS level, description, status, start_time AS createdAt, loop_no, point_no, raw_frame_hex
           FROM alarms ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
          [...params, pageSize, offset]
        );
        const [[{ total }]] = await dbPool.query(
          `SELECT COUNT(*) AS total FROM alarms ${where}`,
          params
        );
        sendJson(req, res, 200, { code: 200, data: { list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
        return;
      }

      // GET /api/alarms/stats
      if (method === 'GET' && path === '/api/alarms/stats') {
        const [typeRows] = await dbPool.query(
          `SELECT alarm_type AS type, COUNT(*) AS count FROM alarms GROUP BY alarm_type`
        );
        const [statusRows] = await dbPool.query(
          `SELECT status, COUNT(*) AS count FROM alarms GROUP BY status`
        );
        const [[{ total }]] = await dbPool.query(`SELECT COUNT(*) AS total FROM alarms`);
        const byType = {};
        const byStatus = {};
        for (const r of typeRows) byType[r.type] = r.count;
        for (const r of statusRows) byStatus[r.status] = r.count;
        sendJson(req, res, 200, { code: 200, data: { total, byType, byStatus } });
        return;
      }

      // GET /api/alarms/recent
      if (method === 'GET' && path === '/api/alarms/recent') {
        const limit = Math.min(50, parseInt(q.limit || '10'));
        const [rows] = await dbPool.query(
          `SELECT id, device_id, alarm_type AS type, alarm_level AS level, description, status, start_time AS createdAt, loop_no, point_no, raw_frame_hex
           FROM alarms ORDER BY id DESC LIMIT ?`,
          [limit]
        );
        sendJson(req, res, 200, { code: 200, data: rows });
        return;
      }

      // GET /api/alarms/:id
      if (method === 'GET' && /^\/api\/alarms\/[^\/]+$/.test(path)) {
        const id = path.replace('/api/alarms/', '');
        const [rows] = await dbPool.query(
          `SELECT id, device_id, alarm_type AS type, alarm_level AS level, description, status, start_time AS createdAt, loop_no, point_no, raw_frame_hex
           FROM alarms WHERE id = ?`,
          [id]
        );
        sendJson(req, res, 200, { code: 200, data: rows[0] || null });
        return;
      }

      // GET /api/alarms/:id/detail
      if (method === 'GET' && /^\/api\/alarms\/[^\/]+\/detail$/.test(path)) {
        const id = path.replace('/api/alarms/', '').replace('/detail', '');
        const [rows] = await dbPool.query(
          `SELECT id, device_id, alarm_type AS type, alarm_level AS level, description, status, start_time AS createdAt, loop_no, point_no, raw_frame_hex
           FROM alarms WHERE id = ?`,
          [id]
        );
        const alarm = rows[0] || null;
        sendJson(req, res, 200, { code: 200, data: { ...alarm, unitAddress: null, controlRoom: null, snapshots: [], relatedCameras: [] } });
        return;
      }

      // PATCH /api/alarms/:id
      if (method === 'PATCH' && /^\/api\/alarms\/[^\/]+$/.test(path)) {
        const id = path.replace('/api/alarms/', '');
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const setParts = [];
            const params = [];
            if (data.status) { setParts.push('status = ?'); params.push(data.status); }
            if (data.handler) { setParts.push('resolved_by = ?'); params.push(data.handler); }
            if (data.handleNote) { setParts.push('notes = ?'); params.push(data.handleNote); }
            if (data.handleTime) {
              const dt = data.handleTime.replace('T', ' ').replace(/\.\d+Z?$/, '').substring(0, 19);
              setParts.push('resolved_at = ?'); params.push(dt);
            }
            if (setParts.length > 0) {
              await dbPool.query(`UPDATE alarms SET ${setParts.join(', ')} WHERE id = ?`, [...params, id]);
            }
            sendJson(req, res, 200, { code: 200, data: null });
          } catch (e) {
            sendJson(req, res, 500, { code: 500, msg: e.message });
          }
        });
        return;
      }

      // POST /api/devices
      if (method === 'POST' && path === '/api/devices') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const deviceId = data.id || data.deviceId || `DEV-${Date.now()}`;
            const deviceName = data.name || data.deviceName || '未命名设备';
            const deviceType = data.type || data.deviceType || 'unknown';
            const ipAddress = data.ip || data.ipAddress || '';
            const location = data.location || '';
            const unitName = data.unitName || '';
            const status = data.status || 'offline';
            const statusMap = { normal: 'online', offline: 'offline', fault: 'alarm', maintenance: 'maintenance', disabled: 'offline' };
            const dbStatus = statusMap[status] || status;
            await dbPool.query(
              `INSERT INTO devices (device_id, device_name, device_type, protocol, ip_address, port, location, unit_name, status, last_heartbeat, created_at, updated_at)
               VALUES (?, ?, ?, 'tcp', ?, 0, ?, ?, ?, NOW(), NOW(), NOW())`,
              [deviceId, deviceName, deviceType, ipAddress, location, unitName, dbStatus]
            );
            sendJson(req, res, 200, { code: 200, data: null });
          } catch (e) {
            sendJson(req, res, 500, { code: 500, msg: e.message });
          }
        });
        return;
      }

      // GET /api/devices/list
      if (method === 'GET' && path === '/api/devices/list') {
        const page = Math.max(1, parseInt(q.page || '1'));
        const pageSize = Math.min(100, parseInt(q.pageSize || '10'));
        const offset = (page - 1) * pageSize;
        const keyword = q.keyword;

        let where = 'WHERE 1=1';
        const params = [];
        if (keyword) {
          where += ' AND (device_id LIKE ? OR device_name LIKE ?)';
          const like = `%${keyword}%`;
          params.push(like, like);
        }

        const [rows] = await dbPool.query(
          `SELECT id, device_id, device_name, device_type, unit_name, protocol, ip_address AS ip, port, status, last_heartbeat, created_at AS createdAt
           FROM devices ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
          [...params, pageSize, offset]
        );
        const [[{ total }]] = await dbPool.query(
          `SELECT COUNT(*) AS total FROM devices ${where}`,
          params
        );
        sendJson(req, res, 200, { code: 200, data: { list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
        return;
      }

      // PUT /api/devices/:id
      if (method === 'PUT' && /^\/api\/devices\/[^\/]+$/.test(path)) {
        const id = path.replace('/api/devices/', '');
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const statusMap = { normal: 'online', offline: 'offline', fault: 'alarm', maintenance: 'maintenance', disabled: 'offline' };
            const deviceName = data.name !== undefined ? data.name : (data.deviceName || '');
            const deviceType = data.type !== undefined ? data.type : (data.deviceType || 'unknown');
            const ipAddress = data.ip !== undefined ? data.ip : (data.ipAddress || '');
            const location = data.location !== undefined ? data.location : '';
            const unitName = data.unitName !== undefined ? data.unitName : '';
            const status = data.status !== undefined ? (statusMap[data.status] || data.status) : 'offline';

            // 先查找设备（支持自增id或device_id）
            const numId = Number(id);
            const isNumId = !Number.isNaN(numId) && String(numId) === id;
            let findSql = 'SELECT id, device_id FROM devices WHERE device_id = ? LIMIT 1';
            let findParams = [id];
            if (isNumId) {
              findSql = 'SELECT id, device_id FROM devices WHERE id = ? OR device_id = ? LIMIT 1';
              findParams = [numId, id];
            }
            const [existing] = await dbPool.query(findSql, findParams);

            if (existing.length > 0) {
              // 更新现有记录
              const setParts = [];
              const params = [];
              if (deviceName) { setParts.push('device_name = ?'); params.push(deviceName); }
              if (deviceType) { setParts.push('device_type = ?'); params.push(deviceType); }
              if (ipAddress !== undefined) { setParts.push('ip_address = ?'); params.push(ipAddress); }
              if (location !== undefined) { setParts.push('location = ?'); params.push(location); }
              if (unitName !== undefined) { setParts.push('unit_name = ?'); params.push(unitName); }
              setParts.push('status = ?'); params.push(status);
              setParts.push('updated_at = NOW()');
              let updateSql = `UPDATE devices SET ${setParts.join(', ')} WHERE device_id = ?`;
              let updateParams = [...params, id];
              if (isNumId) {
                updateSql = `UPDATE devices SET ${setParts.join(', ')} WHERE id = ? OR device_id = ?`;
                updateParams = [...params, numId, id];
              }
              await dbPool.query(updateSql, updateParams);
            } else {
              // 设备不存在，创建新记录
              await dbPool.query(
                `INSERT INTO devices (device_id, device_name, device_type, protocol, ip_address, port, location, unit_name, status, last_heartbeat, created_at, updated_at)
                 VALUES (?, ?, ?, 'tcp', ?, 0, ?, ?, ?, NOW(), NOW(), NOW())`,
                [id, deviceName, deviceType, ipAddress, location, unitName, status]
              );
            }
            sendJson(req, res, 200, { code: 200, data: null });
          } catch (e) {
            sendJson(req, res, 500, { code: 500, msg: e.message });
          }
        });
        return;
      }

      sendJson(req, res, 404, { code: 404, msg: 'Not Found' });
    } catch (err) {
      log('HTTP', `API错误: ${err.message}`);
      sendJson(req, res, 500, { code: 500, msg: err.message });
    }
  });

  server.listen(HTTP_PORT, '0.0.0.0', () => {
    log('HTTP', `FSCN8001 HTTP API 启动: 0.0.0.0:${HTTP_PORT}`);
  });

  return server;
}

/* ═══════ 启动入口 ═══════ */

(async () => {
  await initDb();
  startServer();
  startHttpServer();
})();

module.exports = { startServer };

/* 直接运行时启动 */
if (require.main === module) {
  // async IIFE above handles startup
}
