/**
 * ============================================================
 * GB/T 26875.1-2011 用户信息传输装置 TCP 服务器
 * 监听端口: 5200
 * 功能:
 * 1. 接收 FSCN8001 等传输装置的连接
 * 2. 解析 GB26875 协议帧
 * 3. 处理登录、心跳、报警/状态上传
 * 4. 将数据写入 MySQL
 * ============================================================
 */
const net = require('net');
const mysql = require('mysql2/promise');
const { initLinkageEngine, triggerLinkage } = require('./utils/linkageEngine');
const { initDeviceService, findOrCreateDevice, updateHeartbeat, markOffline, checkOfflineDevices } = require('./services/iotDevice.service');
const { initAlarmService, createAlarm } = require('./services/alarm.service');
const dbConfig = require('./config/database').getDbConfig();

const TCP_PORT = process.env.GB26875_PORT || 5200;

const pool = mysql.createPool(dbConfig);

/* ── 连接管理 ── */
const connections = new Map(); // deviceId -> socket

/* ── 主动查询流水号 ── */
let querySeqCounter = 1;
function nextQuerySeq() {
  const seq = querySeqCounter;
  querySeqCounter = (querySeqCounter + 1) & 0xFFFF;
  if (querySeqCounter === 0) querySeqCounter = 1;
  return seq;
}

/* ── 控制命令异步等待 ── */
const pendingControlCommands = new Map(); // seq -> { resolve, reject, timeoutId, commandId }

/* ── 下发控制命令（消音/复位/手自动切换） ── */
function sendControlCommand(deviceId, commandId, commandType, params = {}) {
  const socket = connections.get(deviceId);
  if (!socket || socket.destroyed) {
    throw new Error(`设备[${deviceId}]未连接，无法下发控制命令`);
  }
  // 构建控制帧数据: [主机编号(1), 回路号(1), 设备地址(1), 子命令(1)]
  const hostNo = params.hostNo || 0;
  const loopNo = params.loopNo || 0;
  const address = params.address || 0;
  const subCmdMap = { mute: 0, reset: 1, manual: 2, auto: 3 };
  const subCmd = subCmdMap[commandType] ?? 0;
  const dataBuf = Buffer.from([hostNo, loopNo, address, subCmd]);
  const seq = sendCommand(socket, 0x50, dataBuf);
  log('CONTROL', `下发控制命令 seq=${seq} deviceId=${deviceId} cmd=${commandType} sub=${subCmd}`);

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingControlCommands.delete(seq);
      reject(new Error('控制命令超时（30秒未收到设备回执）'));
    }, 30000);
    pendingControlCommands.set(seq, { resolve, reject, timeoutId, commandId, deviceId, commandType, createdAt: Date.now() });
  });
}

/* ── 清理超时的控制命令 ── */
const COMMAND_TIMEOUT_MS = 35000; // 35秒（比30秒超时多5秒容错）
function cleanupExpiredCommands() {
  const now = Date.now();
  let cleaned = 0;
  for (const [seq, pending] of pendingControlCommands.entries()) {
    if (now - pending.createdAt > COMMAND_TIMEOUT_MS) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('控制命令清理：超时未处理'));
      pendingControlCommands.delete(seq);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    log('CONTROL', `清理了 ${cleaned} 个超时的控制命令`);
  }
}
// 每60秒清理一次
setInterval(cleanupExpiredCommands, 60000);

/* ── 日志 ── */
function log(tag, msg) {
  console.log(`[GB26875][${new Date().toISOString()}][${tag}] ${msg}`);
}

/* ── BCD 时间戳解码（兼容 FSCN8001） ── */
function decodeBcdTimestamp(buf) {
  if (buf.length < 6) return '??';
  const s = ((buf[0] >> 4) * 10 + (buf[0] & 0x0F)).toString().padStart(2, '0');
  const m = ((buf[1] >> 4) * 10 + (buf[1] & 0x0F)).toString().padStart(2, '0');
  const h = ((buf[2] >> 4) * 10 + (buf[2] & 0x0F)).toString().padStart(2, '0');
  const d = ((buf[3] >> 4) * 10 + (buf[3] & 0x0F)).toString().padStart(2, '0');
  const M = ((buf[4] >> 4) * 10 + (buf[4] & 0x0F)).toString().padStart(2, '0');
  const y = ((buf[5] >> 4) * 10 + (buf[5] & 0x0F)).toString().padStart(2, '0');
  return `20${y}-${M}-${d} ${h}:${m}:${s}`;
}

/* ── 心跳超时检测 ── */
const HEARTBEAT_OFFLINE_MINUTES = 3;
const HEARTBEAT_CHECK_INTERVAL_MS = 30000; // 每30秒检查一次

function startHeartbeatMonitor() {
  setInterval(async () => {
    const offlineDevices = await checkOfflineDevices(HEARTBEAT_OFFLINE_MINUTES);
    if (offlineDevices.length > 0) {
      log('MONITOR', `本次扫描发现 ${offlineDevices.length} 个设备心跳超时离线`);
    }
  }, HEARTBEAT_CHECK_INTERVAL_MS);
  log('MONITOR', `心跳超时检测已启动: ${HEARTBEAT_OFFLINE_MINUTES}分钟无心跳自动标记离线，检查间隔${HEARTBEAT_CHECK_INTERVAL_MS/1000}秒`);
}

/* ── 确保数据表存在 ── */
async function ensureTables() {
  initLinkageEngine(pool);
  initDeviceService(pool);
  initAlarmService(pool);
  log('INIT', '安消联动引擎、设备服务、告警服务已初始化');
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS gb26875_raw_log (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        device_id VARCHAR(32) DEFAULT NULL COMMENT '传输装置编号',
        direction TINYINT DEFAULT 1 COMMENT '1=上行 2=下行',
        cmd_type VARCHAR(8) DEFAULT NULL COMMENT '命令字',
        raw_data BLOB COMMENT '原始报文',
        hex_data TEXT COMMENT '报文HEX',
        parsed_json JSON DEFAULT NULL COMMENT '解析后的JSON',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_device_id (device_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='GB26875原始报文日志'
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS gb26875_device (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        device_id VARCHAR(32) NOT NULL COMMENT '传输装置编号',
        device_name VARCHAR(128) DEFAULT NULL COMMENT '装置名称',
        ip VARCHAR(32) DEFAULT NULL COMMENT 'IP地址',
        port INT DEFAULT 5200 COMMENT '端口',
        building_id VARCHAR(32) DEFAULT NULL COMMENT '建筑物编号',
        status TINYINT DEFAULT 1 COMMENT '0=离线 1=在线 2=故障',
        last_heartbeat TIMESTAMP DEFAULT NULL,
        login_time TIMESTAMP DEFAULT NULL,
        version VARCHAR(32) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_device_id (device_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='GB26875传输装置表'
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS gb26875_alarm (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        device_id VARCHAR(32) NOT NULL COMMENT '传输装置编号',
        host_code VARCHAR(32) DEFAULT NULL COMMENT '主机编号',
        loop_no INT DEFAULT NULL COMMENT '回路号',
        address INT DEFAULT NULL COMMENT '设备地址',
        device_type VARCHAR(64) DEFAULT NULL COMMENT '设备类型',
        alarm_type VARCHAR(64) DEFAULT NULL COMMENT '报警类型',
        alarm_level TINYINT DEFAULT 1 COMMENT '报警等级',
        location VARCHAR(128) DEFAULT NULL COMMENT '位置',
        status TINYINT DEFAULT 1 COMMENT '1=报警中 2=已恢复',
        alarm_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        recover_time TIMESTAMP DEFAULT NULL,
        raw_data TEXT DEFAULT NULL,
        INDEX idx_device_id (device_id),
        INDEX idx_alarm_time (alarm_time),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='GB26875报警记录表'
    `);
    log('DB', '数据表检查/创建完成');

    // 确保统一设备/告警表存在
    await conn.query(`
      CREATE TABLE IF NOT EXISTS fire_iot_device (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        device_id VARCHAR(64) NOT NULL,
        device_name VARCHAR(128) DEFAULT NULL,
        protocol VARCHAR(32) NOT NULL,
        ip VARCHAR(32) DEFAULT NULL,
        port INT DEFAULT NULL,
        unit_id VARCHAR(64) DEFAULT 'PENDING',
        unit_name VARCHAR(128) DEFAULT '待分配单位',
        building_id VARCHAR(64) DEFAULT NULL,
        location VARCHAR(256) DEFAULT NULL,
        manufacturer VARCHAR(128) DEFAULT NULL,
        model VARCHAR(128) DEFAULT NULL,
        firmware VARCHAR(64) DEFAULT NULL,
        status VARCHAR(32) DEFAULT 'normal',
        online_status VARCHAR(32) DEFAULT 'offline',
        last_online TIMESTAMP DEFAULT NULL,
        login_time TIMESTAMP DEFAULT NULL,
        offline_time TIMESTAMP DEFAULT NULL,
        heartbeat_interval INT DEFAULT 60,
        register_count INT DEFAULT 0,
        alarm_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_device_id_protocol (device_id, protocol),
        INDEX idx_protocol (protocol),
        INDEX idx_unit_id (unit_id),
        INDEX idx_online_status (online_status),
        INDEX idx_last_online (last_online)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='IoT设备统一档案表'
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS fire_alarm (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        alarm_no VARCHAR(32) NOT NULL,
        device_id VARCHAR(64) NOT NULL,
        device_name VARCHAR(128) DEFAULT NULL,
        protocol VARCHAR(32) NOT NULL,
        unit_id VARCHAR(64) DEFAULT 'PENDING',
        unit_name VARCHAR(128) DEFAULT '待分配单位',
        alarm_type VARCHAR(32) NOT NULL,
        alarm_level TINYINT DEFAULT 1,
        alarm_status TINYINT DEFAULT 1,
        location VARCHAR(256) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        raw_data TEXT DEFAULT NULL,
        loop_no INT DEFAULT NULL,
        address INT DEFAULT NULL,
        host_code VARCHAR(32) DEFAULT NULL,
        trigger_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirm_time TIMESTAMP DEFAULT NULL,
        recover_time TIMESTAMP DEFAULT NULL,
        handler_id VARCHAR(64) DEFAULT NULL,
        handler_name VARCHAR(64) DEFAULT NULL,
        handle_remark TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_device_id (device_id),
        INDEX idx_alarm_type (alarm_type),
        INDEX idx_alarm_status (alarm_status),
        INDEX idx_trigger_time (trigger_time),
        INDEX idx_unit_id (unit_id),
        INDEX idx_protocol (protocol)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='统一告警记录表'
    `);
    log('DB', 'fire_iot_device / fire_alarm 表检查/创建完成');
  } catch (err) {
    log('DB', `建表失败: ${err.message}`);
  } finally {
    conn.release();
  }
}

/* ── 保存原始报文 ── */
async function saveRawLog(deviceId, direction, cmdType, rawBuf, parsed) {
  try {
    await pool.execute(
      `INSERT INTO gb26875_raw_log (device_id, direction, cmd_type, raw_data, hex_data, parsed_json) VALUES (?, ?, ?, ?, ?, ?)`,
      [deviceId, direction, cmdType, rawBuf, rawBuf.toString('hex').toUpperCase(), parsed ? JSON.stringify(parsed) : null]
    );
  } catch (err) {
    log('DB', `保存报文失败: ${err.message}`);
  }
}

/* ── 更新传输装置状态 ── */
async function updateDeviceStatus(deviceId, ip, updates) {
  try {
    const fields = [];
    const vals = [];
    for (const [k, v] of Object.entries(updates)) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k)) {
        throw new Error(`非法字段名: ${k}`);
      }
      fields.push(`${k} = ?`);
      vals.push(v);
    }
    if (fields.length === 0) return;
    vals.push(deviceId, deviceId);
    
    // 使用参数化查询，禁止 SQL 注入
    await pool.execute(
      `INSERT INTO gb26875_device (device_id, ip, status, last_heartbeat)
       VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE ip=VALUES(ip), status=VALUES(status), last_heartbeat=VALUES(last_heartbeat)`,
      [deviceId, ip]
    );
    
    if (Object.keys(updates).length > 0) {
      const setFields = Object.entries(updates)
        .filter(([k]) => k !== 'status' && k !== 'last_heartbeat')
        .map(([k]) => `${k} = ?`)
        .join(', ');
      if (setFields) {
        const setVals = Object.entries(updates)
          .filter(([k]) => k !== 'status' && k !== 'last_heartbeat')
          .map(([, v]) => v);
        await pool.execute(
          `UPDATE gb26875_device SET ${setFields} WHERE device_id = ?`,
          [...setVals, deviceId]
        );
      }
    }
  } catch (err) {
    log('DB', `更新设备状态失败: ${err.message}`);
  }
}

/* ── 保存报警记录 ── */
async function saveAlarm(deviceId, alarm) {
  let alarmId = null;
  try {
    const [result] = await pool.execute(
      `INSERT INTO gb26875_alarm (device_id, host_code, loop_no, address, device_type, alarm_type, alarm_level, location, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, alarm.hostCode, alarm.loopNo, alarm.address, alarm.deviceType, alarm.alarmType, alarm.level, alarm.location, alarm.raw]
    );
    alarmId = result.insertId;
    log('DB', `保存报警成功: ${deviceId} ${alarm.alarmType} id=${alarmId}`);
  } catch (err) {
    log('DB', `保存报警失败: ${err.message}`);
    return;
  }

  // 触发安消联动
  try {
    await triggerLinkage({
      alarmId,
      alarmType: alarm.alarmType || 'fire',
      alarmLevel: alarm.level || 1,
      deviceId,
      deviceName: alarm.deviceType || '',
      deviceType: alarm.deviceType || '',
      location: alarm.location || '',
      description: `${alarm.deviceType} ${alarm.alarmType} ${alarm.location}`
    });
  } catch (err) {
    log('Linkage', `联动触发失败: ${err.message}`);
  }
}

/* ── 帧校验和计算 ── */
function calcChecksum(buf, start, end) {
  let sum = 0;
  for (let i = start; i < end; i++) sum += buf[i];
  return sum & 0xFF;
}

/* ── 发送应答帧 ── */
function sendResponse(socket, seq, cmd, dataBuf, frame) {
  if (!socket || socket.destroyed) return;
  
  if (frame && frame.isFscnFormat) {
    // FSCN8001 私有协议格式应答
    const respCmd = cmd + 0x80;
    const fixed = Buffer.from([0x00, 0x01, 0x05]);
    const dataLen = dataBuf ? dataBuf.length : 0;
    const totalLen = 2 + 1 + 3 + 6 + 12 + dataLen + 1 + 2;
    const resp = Buffer.alloc(totalLen);
    let off = 0;
    resp.writeUInt16BE(0x4040, off); off += 2; // 帧头
    resp.writeUInt8(respCmd, off); off += 1;   // 应答命令字
    fixed.copy(resp, off); off += 3;           // 固定字段
    frame.fscnTimestamp.copy(resp, off); off += 6; // 原样时间戳
    Buffer.from(frame.fscnDeviceId, 'hex').copy(resp, off); off += 12; // 原样设备ID
    if (dataBuf && dataBuf.length > 0) {
      dataBuf.copy(resp, off); off += dataBuf.length; // 数据区
    }
    const cs = calcChecksum(resp, 2, off);     // 校验和
    resp.writeUInt8(cs, off); off += 1;
    resp.writeUInt16BE(0x2323, off); off += 2; // 帧尾
    socket.write(resp);
    log('TX', `-> FSCN8001 应答 cmd=0x${respCmd.toString(16).padStart(2,'0')} deviceId=${frame.fscnDeviceId} len=${resp.length}`);
    return;
  }
  
  // GB26875 简化格式应答
  const respCmd = cmd | 0x80;
  const len = dataBuf ? dataBuf.length : 0;
  const frameBuf = Buffer.allocUnsafe(5 + len + 1); // @@(2) + seq(2) + cmd(1) + data(n) + cs(1)
  let off = 0;
  frameBuf[off++] = 0x40; frameBuf[off++] = 0x40;
  frameBuf[off++] = (seq >> 8) & 0xFF; frameBuf[off++] = seq & 0xFF;
  frameBuf[off++] = respCmd;
  if (dataBuf && len > 0) {
    dataBuf.copy(frameBuf, off);
    off += len;
  }
  const cs = calcChecksum(frameBuf, 2, off);
  frameBuf[off++] = cs;
  const final = Buffer.concat([frameBuf, Buffer.from([0x23, 0x23])]);
  socket.write(final);
  log('TX', `-> 应答 cmd=0x${respCmd.toString(16).padStart(2,'0')} seq=${seq} len=${final.length}`);
}

/* ── 主动下发查询指令 ── */
function sendCommand(socket, cmd, dataBuf) {
  if (!socket || socket.destroyed) return;
  const seq = nextQuerySeq();
  const len = dataBuf ? dataBuf.length : 0;
  const frame = Buffer.allocUnsafe(5 + len + 1); // @@(2) + seq(2) + cmd(1) + data(n) + cs(1)
  let off = 0;
  frame[off++] = 0x40; frame[off++] = 0x40; // @@
  frame[off++] = (seq >> 8) & 0xFF; frame[off++] = seq & 0xFF;
  frame[off++] = cmd;
  if (dataBuf && len > 0) {
    dataBuf.copy(frame, off);
    off += len;
  }
  const cs = calcChecksum(frame, 2, off);
  frame[off++] = cs;
  const final = Buffer.concat([frame, Buffer.from([0x23, 0x23])]); // + ##
  socket.write(final);
  log('TX', `-> 查询 cmd=0x${cmd.toString(16).padStart(2,'0')} seq=${seq} len=${final.length}`);
  return seq;
}

/* ── 登录成功后下发主动查询 ── */
function scheduleQueries(socket, deviceId) {
  if (!socket || socket.destroyed) return;
  setTimeout(() => {
    if (!socket.destroyed) {
      log('QUERY', `下发系统状态查询 deviceId=${deviceId}`);
      sendCommand(socket, 0x42, Buffer.alloc(0)); // 查询建筑消防设施系统状态
    }
  }, 1000);
  setTimeout(() => {
    if (!socket.destroyed) {
      log('QUERY', `下发部件状态查询 deviceId=${deviceId}`);
      sendCommand(socket, 0x43, Buffer.alloc(0)); // 查询建筑消防设施部件运行状态
    }
  }, 2000);
  setTimeout(() => {
    if (!socket.destroyed) {
      log('QUERY', `下发传输装置状态查询 deviceId=${deviceId}`);
      sendCommand(socket, 0x41, Buffer.alloc(0)); // 查询用户信息传输装置信息
    }
  }, 3000);
}

/* ── 帧解析 ──
 * 支持的帧格式（简化 GB26875.1-2011）:
 * [@@][流水号2][版本1][时间戳6][源地址6][目的地址6][长度2][命令1][数据n][校验1][##]
 * 实际兼容: 以 @@ 开头、## 结尾，中间按命令字解析
 */
class FrameParser {
  constructor() {
    this.buffer = Buffer.alloc(0);
  }

  push(data) {
    // 限制 buffer 最大长度，防止 DoS 攻击
    const MAX_BUFFER_SIZE = 65536; // 64KB
    this.buffer = Buffer.concat([this.buffer, data]);

    if (this.buffer.length > MAX_BUFFER_SIZE) {
      log('WARN', `Buffer 超限 (${this.buffer.length} bytes)，清空重置`);
      this.buffer = Buffer.alloc(0);
      return [];
    }

    const frames = [];
    while (true) {
      const frame = this.extractFrame();
      if (!frame) break;
      frames.push(frame);
    }
    return frames;
  }

  extractFrame() {
    const buf = this.buffer;
    const start = buf.indexOf(Buffer.from([0x40, 0x40]));
    if (start === -1) { this.buffer = Buffer.alloc(0); return null; }
    const end = buf.indexOf(Buffer.from([0x23, 0x23]), start + 2);
    if (end === -1) return null; // 未收到完整帧尾
    const frameBuf = buf.slice(start, end + 2);
    this.buffer = buf.slice(end + 2);
    return this.parseFrame(frameBuf);
  }

  parseFrame(buf) {
    if (buf.length < 10) return null; // 太短不合法
    
    // 检测 FSCN8001 私有协议格式
    if (buf.length >= 27 && buf[3] === 0x00 && buf[4] === 0x01 && buf[5] === 0x05) {
      const cmd = buf[2];
      const timestamp = buf.slice(6, 12);
      const deviceId = buf.slice(12, 24);
      const dataLen = Math.max(0, buf.length - 27); // 2+1+3+6+12+1+2 = 27
      const data = dataLen > 0 ? buf.slice(24, 24 + dataLen) : Buffer.alloc(0);
      const receivedCs = buf[buf.length - 3];
      const expectedCs = calcChecksum(buf, 2, buf.length - 3);
      const valid = receivedCs === expectedCs;
      return {
        raw: buf, seq: (buf[2] << 8) | buf[3], cmd, data, valid,
        hex: buf.toString('hex').toUpperCase(),
        isFscnFormat: true,
        fscnTimestamp: timestamp,
        fscnDeviceId: deviceId.toString('hex').toUpperCase()
      };
    }
    
    // GB26875 简化格式
    const seq = (buf[2] << 8) | buf[3];
    const cmd = buf[4];
    const dataLen = Math.max(0, buf.length - 8); // 修正：@@(2) + seq(2) + cmd(1) + cs(1) + ##(2) = 8
    const data = dataLen > 0 ? buf.slice(5, 5 + dataLen) : Buffer.alloc(0);
    const receivedCs = buf[buf.length - 3];
    const expectedCs = calcChecksum(buf, 2, buf.length - 3);
    const valid = receivedCs === expectedCs;
    return { raw: buf, seq, cmd, data, valid, hex: buf.toString('hex').toUpperCase() };
  }
}

/* ── 命令处理器 ── */
const handlers = {
  // 0x01 = 登录
  async 0x01(socket, frame, deviceId) {
    let data = frame.data;
    let bid = '', did = deviceId || socket.deviceId || '';
    
    if (frame.isFscnFormat) {
      did = frame.fscnDeviceId;
      log('HANDLER', `FSCN8001 登录/注册 cmd=0x01 deviceId=${did}`);
    } else {
      if (data.length >= 10) {
        bid = data.slice(0, 4).toString('hex').toUpperCase();
        did = data.slice(4, 10).toString('hex').toUpperCase();
      }
      log('HANDLER', `登录请求 seq=${frame.seq} deviceId=${did || deviceId || 'unknown'} buildingId=${bid}`);
    }

    if (did) {
      socket.deviceId = did;
      connections.set(did, socket);

      // 更新 gb26875_device 表
      await updateDeviceStatus(did, socket.remoteAddress, { login_time: new Date(), building_id: bid, version: data.length >= 12 ? data.slice(10, 12).toString('hex') : null });

      // 统一设备注册/关联 fire_iot_device
      const devInfo = await findOrCreateDevice({
        deviceId: did,
        deviceName: frame.isFscnFormat ? `FSCN8001-${did.slice(-6)}` : null,
        protocol: frame.isFscnFormat ? 'fscn8001' : 'gb26875',
        ip: socket.remoteAddress,
        port: socket.remotePort,
        buildingId: bid,
        location: null,
        manufacturer: frame.isFscnFormat ? '赋安' : null,
        model: frame.isFscnFormat ? 'FSCN8001' : null,
        firmware: data.length >= 12 ? data.slice(10, 12).toString('hex') : null,
        heartbeatInterval: 60,
      });
      log('REG', `设备[${did}]注册完成: unit=${devInfo ? devInfo.unitName : 'N/A'}, online=online`);
    } else {
      log('WARN', `登录帧未解析出deviceId，跳过设备注册 seq=${frame.seq}`);
    }

    await saveRawLog(did || deviceId, 1, '01', frame.raw, { type: 'login', buildingId: bid, deviceId: did, isFscn: frame.isFscnFormat });
    sendResponse(socket, frame.seq, 0x01, Buffer.from([0x00]), frame); // 0x00=成功
    if (!frame.isFscnFormat) {
      scheduleQueries(socket, did || deviceId);
    }
  },

  // 0x02 = 心跳
  async 0x02(socket, frame, deviceId) {
    const did = deviceId || socket.deviceId;
    log('HANDLER', `心跳 seq=${frame.seq} deviceId=${did || 'unknown'}${frame.isFscnFormat ? ' [FSCN]' : ''}`);
    if (did) {
      // 更新 gb26875_device 心跳
      await updateDeviceStatus(did, socket.remoteAddress, { last_heartbeat: new Date() });
      // 更新统一设备档案心跳
      await updateHeartbeat(did, frame.isFscnFormat ? 'fscn8001' : 'gb26875', socket.remoteAddress);
    }
    await saveRawLog(did, 1, '02', frame.raw, { type: 'heartbeat', isFscn: frame.isFscnFormat });
    sendResponse(socket, frame.seq, 0x02, Buffer.alloc(0), frame);
  },

  // 0x03 = 注销（仅 GB26875；FSCN8001 的 0x03 已映射到 0x22 报警处理器）
  async 0x03(socket, frame, deviceId) {
    const did = deviceId || socket.deviceId;
    log('HANDLER', `注销 seq=${frame.seq} deviceId=${did || 'unknown'}`);
    if (did) {
      await updateDeviceStatus(did, socket.remoteAddress, { status: 0 });
      connections.delete(did);
    }
    await saveRawLog(did, 1, '03', frame.raw, { type: 'logout' });
    sendResponse(socket, frame.seq, 0x03, Buffer.alloc(0), frame);
  },

  // 0x21 = 上传建筑消防设施系统状态
  async 0x21(socket, frame, deviceId) {
    const did = deviceId || socket.deviceId;
    log('HANDLER', `系统状态上传 seq=${frame.seq} deviceId=${did || 'unknown'}`);
    await saveRawLog(did, 1, '21', frame.raw, { type: 'system_status', data: frame.data.toString('hex').toUpperCase() });
    sendResponse(socket, frame.seq, 0x21, Buffer.alloc(0), frame);
  },

  // 0x22 = 上传建筑消防设施部件运行状态（含 FSCN8001 报警/故障兼容）
  async 0x22(socket, frame, deviceId) {
    const did = deviceId || socket.deviceId;
    log('HANDLER', `部件状态上传 seq=${frame.seq} deviceId=${did || 'unknown'}${frame.isFscnFormat ? ' [FSCN]' : ''}`);
    const d = frame.data;
    let parsed = null;
    
    if (frame.isFscnFormat) {
      // FSCN8001 格式：data 包含 BCD 时间戳(6) + 前置数据(6) + 其他
      if (d.length >= 12) {
        const eventTime = decodeBcdTimestamp(d.slice(6, 12));
        const preData = d.slice(0, 6).toString('hex').toUpperCase();
        parsed = { eventTime, preData };
        
        // FSCN8001 命令字判定报警类型：0x03=报警, 0x04=故障
        let alarmType = 'fault';
        let alarmLevel = 3;
        if (frame.cmd === 0x03) { alarmType = 'fire'; alarmLevel = 4; }
        else if (frame.cmd === 0x04) { alarmType = 'fault'; alarmLevel = 3; }
        else if (frame.cmd === 0x05) { alarmType = 'supervisory'; alarmLevel = 2; }
        
        const desc = `事件时间:${eventTime} 前置数据:${preData}`;
        const location = `FSCN8001 ${alarmType}`;
        
        // 1. 写入 gb26875_alarm
        await saveAlarm(did, {
          hostCode: did,
          loopNo: null,
          address: null,
          deviceType: 'fscn8001',
          alarmType: alarmType === 'fire' ? '火警' : alarmType === 'fault' ? '故障' : '监管',
          level: alarmLevel,
          location,
          raw: frame.hex,
        });
        
        // 2. 写入 fscn8001_alarm（供前端查询）
        try {
          await pool.execute(
            `INSERT INTO fscn8001_alarm (device_sn, alarm_type, alarm_level, location, status, alarm_time)
             VALUES (?, ?, ?, ?, 0, NOW())`,
            [did, alarmType, alarmLevel === 4 ? 'high' : 'normal', desc]
          );
          log('DB', `fscn8001_alarm 入库: ${did} ${alarmType}`);
        } catch (e) {
          log('DB', `fscn8001_alarm 入库失败: ${e.message}`);
        }
        
        // 3. 写入统一告警表 fire_alarm
        const alarmResult = await createAlarm({
          deviceId: did,
          deviceName: `FSCN8001-${did.slice(-6)}`,
          protocol: 'fscn8001',
          alarmType,
          alarmLevel,
          location,
          description: desc,
          rawData: frame.hex,
        });
        if (alarmResult) {
          log('ALARM', `统一告警入库成功: alarmNo=${alarmResult.alarmNo}, type=${alarmResult.alarmType}`);
        }
      }
    } else {
      // GB26875 简化格式
      if (d.length >= 4) {
        parsed = {
          loopNo: d[0],
          address: d[1],
          deviceType: d[2],
          deviceStatus: d[3],
        };
        if (d.length > 4) parsed.location = d.slice(4).toString('hex');

        // 解析告警类型（bit0=火警, bit1=故障, bit2=反馈, bit3=监管）
        const status = parsed.deviceStatus;
        let alarmType = null;
        let alarmLevel = 1;
        if (status & 0x01) { alarmType = '火警'; alarmLevel = 4; }
        else if (status & 0x02) { alarmType = '故障'; alarmLevel = 3; }
        else if (status & 0x04) { alarmType = '反馈'; alarmLevel = 2; }
        else if (status & 0x08) { alarmType = '监管'; alarmLevel = 2; }

        if (alarmType) {
          // 1. 写入 gb26875_alarm（保留原表兼容）
          await saveAlarm(did, {
            hostCode: did,
            loopNo: parsed.loopNo,
            address: parsed.address,
            deviceType: String(parsed.deviceType),
            alarmType,
            level: alarmLevel,
            location: parsed.location || '',
            raw: frame.hex,
          });

          // 2. 写入统一告警表 fire_alarm
          const alarmResult = await createAlarm({
            deviceId: did,
            deviceName: `部件-${parsed.loopNo}-${parsed.address}`,
            protocol: 'gb26875',
            unitId: null,
            unitName: null,
            alarmType,
            alarmLevel,
            location: parsed.location || `回路${parsed.loopNo} 地址${parsed.address}`,
            description: `GB26875 ${alarmType} 回路=${parsed.loopNo} 地址=${parsed.address} 类型=${parsed.deviceType}`,
            rawData: frame.hex,
            loopNo: parsed.loopNo,
            address: parsed.address,
            hostCode: did,
          });
          if (alarmResult) {
            log('ALARM', `统一告警入库成功: alarmNo=${alarmResult.alarmNo}, type=${alarmResult.alarmType}, level=${alarmResult.level}`);
          }
        }
      }
    }
    await saveRawLog(did, 1, frame.isFscnFormat ? String(frame.cmd) : '22', frame.raw, { type: frame.isFscnFormat ? 'fscn_alarm' : 'device_status', ...parsed });
    sendResponse(socket, frame.seq, 0x22, Buffer.alloc(0), frame);
  },

  // 0x24 = 上传建筑消防设施部件模拟值
  async 0x24(socket, frame, deviceId) {
    const did = deviceId || socket.deviceId;
    log('HANDLER', `模拟值上传 seq=${frame.seq} deviceId=${did || 'unknown'}`);
    await saveRawLog(did, 1, '24', frame.raw, { type: 'analog_value' });
    sendResponse(socket, frame.seq, 0x24, Buffer.alloc(0), frame);
  },

  // 0x2A = 上传用户信息传输装置运行状态
  async 0x2A(socket, frame, deviceId) {
    const did = deviceId || socket.deviceId;
    log('HANDLER', `传输装置状态上传 seq=${frame.seq} deviceId=${did || 'unknown'}`);
    await saveRawLog(did, 1, '2A', frame.raw, { type: 'utd_status' });
    sendResponse(socket, frame.seq, 0x2A, Buffer.alloc(0), frame);
  },

  // 0xC2 = 查询系统状态应答
  async 0xC2(socket, frame, deviceId) {
    const did = deviceId || socket.deviceId;
    log('HANDLER', `系统状态查询应答 seq=${frame.seq} deviceId=${did || 'unknown'} data=${frame.data.toString('hex').toUpperCase()}`);
    await saveRawLog(did, 1, 'C2', frame.raw, { type: 'query_system_status_resp', data: frame.data.toString('hex').toUpperCase() });
  },

  // 0xC3 = 查询部件状态应答
  async 0xC3(socket, frame, deviceId) {
    const did = deviceId || socket.deviceId;
    log('HANDLER', `部件状态查询应答 seq=${frame.seq} deviceId=${did || 'unknown'} data=${frame.data.toString('hex').toUpperCase()}`);
    await saveRawLog(did, 1, 'C3', frame.raw, { type: 'query_device_status_resp', data: frame.data.toString('hex').toUpperCase() });
  },

  // 0xC1 = 查询传输装置信息应答
  async 0xC1(socket, frame, deviceId) {
    const did = deviceId || socket.deviceId;
    log('HANDLER', `传输装置查询应答 seq=${frame.seq} deviceId=${did || 'unknown'} data=${frame.data.toString('hex').toUpperCase()}`);
    await saveRawLog(did, 1, 'C1', frame.raw, { type: 'query_utd_info_resp', data: frame.data.toString('hex').toUpperCase() });
  },

  // 0xD0 = 控制命令应答（消音/复位/手自动切换回执）
  async 0xD0(socket, frame, deviceId) {
    const did = deviceId || socket.deviceId;
    log('HANDLER', `控制命令应答 seq=${frame.seq} deviceId=${did || 'unknown'} data=${frame.data.toString('hex').toUpperCase()}`);
    const pending = pendingControlCommands.get(frame.seq);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pendingControlCommands.delete(frame.seq);
      const result = frame.data.length > 0 ? frame.data[0] : 0;
      if (result === 0) {
        pending.resolve({ success: true, data: frame.data.toString('hex').toUpperCase() });
      } else {
        pending.resolve({ success: false, error: `设备返回错误码: ${result}` });
      }
      log('CONTROL', `控制命令回执处理完成 seq=${frame.seq} result=${result} success=${result === 0}`);
    } else {
      log('WARN', `收到未预期的控制命令应答 seq=${frame.seq}`);
    }
    await saveRawLog(did, 1, 'D0', frame.raw, { type: 'control_resp', seq: frame.seq, data: frame.data.toString('hex').toUpperCase() });
  },

  // 默认处理器
  async default(socket, frame, deviceId) {
    const did = deviceId || socket.deviceId;
    const cmdHex = frame.cmd.toString(16).padStart(2, '0').toUpperCase();
    log('HANDLER', `未定义命令 cmd=0x${cmdHex} seq=${frame.seq} deviceId=${did || 'unknown'} len=${frame.data.length}`);
    await saveRawLog(did, 1, cmdHex, frame.raw, { type: 'unknown', cmd: frame.cmd });
    sendResponse(socket, frame.seq, frame.cmd, Buffer.alloc(0), frame);
  }
};

async function handleFrame(socket, frame) {
  if (!frame.valid) {
    log('WARN', `校验失败 seq=${frame.seq} hex=${frame.hex.substring(0, 60)}...`);
  }
  let deviceId = socket.deviceId || null;
  if (frame.isFscnFormat && frame.fscnDeviceId) {
    deviceId = frame.fscnDeviceId;
    socket.deviceId = deviceId;
  }
  
  // FSCN8001 命令字映射到 GB26875 handler
  let handlerCmd = frame.cmd;
  if (frame.isFscnFormat) {
    if (frame.cmd === 0x03 || frame.cmd === 0x04) handlerCmd = 0x22; // 报警/故障 -> 部件状态
  }
  
  const handler = handlers[handlerCmd] || handlers.default;
  try {
    await handler(socket, frame, deviceId);
  } catch (err) {
    log('ERROR', `处理帧异常: ${err.message}`);
  }
}

/* ── 启动 TCP 服务器 ── */
function startServer() {
  ensureTables();
  startHeartbeatMonitor();

  const server = net.createServer((socket) => {
    const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`;
    log('CONN', `新连接: ${clientInfo}`);
    socket.deviceId = null;
    const parser = new FrameParser();

    socket.on('data', (data) => {
      log('RX', `<- ${clientInfo} 收到 ${data.length} 字节: ${data.toString('hex').toUpperCase()}`);
      const frames = parser.push(data);
      for (const frame of frames) {
        handleFrame(socket, frame);
      }
    });

    socket.on('close', () => {
      const did = socket.deviceId;
      log('CONN', `连接关闭: ${clientInfo} deviceId=${did || 'unknown'}`);
      if (did) {
        connections.delete(did);
        updateDeviceStatus(did, socket.remoteAddress, { status: 0 }).catch(() => {});
        markOffline(did, 'gb26875').catch(() => {});
        log('OFFLINE', `设备[${did}]连接断开，已标记离线`);
      }
    });

    socket.on('error', (err) => {
      log('ERROR', `连接异常 ${clientInfo}: ${err.message}`);
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
    log('SERVER', `GB/T 26875.1-2011 TCP 服务器已启动: 0.0.0.0:${TCP_PORT}`);
  });

  return server;
}

/* ── 优雅退出 ── */
async function gracefulShutdown(signal) {
  log('SERVER', `收到 ${signal}，正在关闭...`);
  
  // 关闭所有连接
  for (const [deviceId, socket] of connections.entries()) {
    try {
      socket.destroy();
      connections.delete(deviceId);
    } catch (err) {
      log('ERROR', `关闭连接失败: ${err.message}`);
    }
  }
  
  // 等待数据库连接池关闭
  try {
    await pool.end();
    log('DB', '数据库连接池已关闭');
  } catch (err) {
    log('ERROR', `关闭数据库连接池失败: ${err.message}`);
  }
  
  process.exit(0);
}
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = { startServer, connections, sendControlCommand };
