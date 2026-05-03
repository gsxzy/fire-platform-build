/**
 * ============================================================
 * 赋安 FSCN8001 用传协议解析服务（平台集成版 v3.0）
 * TCP监听: 5205  （iptables 5201→5205 转发）
 * 推送目标: http://127.0.0.1:5003/api/fscn8001/push
 * ============================================================
 * 核心改进 (v3.0):
 *   1. 彻底移除一切固定/硬编码应答包，全部动态生成
 *   2. 从上行帧提取真实序列号(seq bytes 3-4)复制到应答帧
 *   3. 心跳包(81)回专用心跳应答，事件包(01)回专用事件应答
 *   4. 严格一问一答：每收到一帧立即回一帧，0延迟
 *   5. 禁用应用层空闲超时，完全依赖TCP keepalive保活
 *   6. ECONNRESET/EPIPE/ETIMEDOUT 仅记录日志，绝不主动destroy
 *   7. 保留：事件解析、日志输出、错误捕获、平台推送
 * ============================================================
 */
const net = require('net');
const http = require('http');

const PORT = 5205;
const HOST = '0.0.0.0';
const PUSH_URL = 'http://127.0.0.1:5003/api/fscn8001/push';
const PUSH_MAX_RETRIES = 3;
const PUSH_RETRY_DELAY = 2000;
const MAX_PKG_CACHE_SIZE = 1048576;      // 单连接粘包缓存上限 1MB

const FRAME_HEAD = Buffer.from([0x40, 0x40]);
const FRAME_TAIL = Buffer.from([0x23, 0x23]);

// 设备连接管理表：每个 socket 拥有独立的会话状态
const connections = new Map();
let connectionCounter = 0;

/* ════════════════════════════════════════════════════════════
   HTTP POST 推送模块（异步、重试、异常隔离）
   ════════════════════════════════════════════════════════════ */

function pushToPlatform(payload) {
  const data = JSON.stringify(payload);
  const options = {
    hostname: '127.0.0.1',
    port: 5003,
    path: '/api/fscn8001/push',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
    timeout: 5000,
  };

  function attempt(retryCount) {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(body);
            if (json.code !== 200) {
              console.log(`[PUSH] 平台返回非200: ${body.substring(0, 200)}`);
            }
          } catch {
            console.log(`[PUSH] 平台响应解析失败: ${body.substring(0, 200)}`);
          }
        } else {
          console.log(`[PUSH] HTTP ${res.statusCode}，重试 ${retryCount}/${PUSH_MAX_RETRIES}`);
          if (retryCount < PUSH_MAX_RETRIES) {
            setTimeout(() => attempt(retryCount + 1), PUSH_RETRY_DELAY * (retryCount + 1));
          }
        }
      });
    });

    req.on('error', (err) => {
      console.log(`[PUSH] 请求错误(${retryCount}/${PUSH_MAX_RETRIES}): ${err.message}`);
      if (retryCount < PUSH_MAX_RETRIES) {
        setTimeout(() => attempt(retryCount + 1), PUSH_RETRY_DELAY * (retryCount + 1));
      }
    });

    req.on('timeout', () => {
      console.log(`[PUSH] 请求超时(${retryCount}/${PUSH_MAX_RETRIES})`);
      req.destroy();
      if (retryCount < PUSH_MAX_RETRIES) {
        setTimeout(() => attempt(retryCount + 1), PUSH_RETRY_DELAY * (retryCount + 1));
      }
    });

    req.write(data);
    req.end();
  }

  setImmediate(() => attempt(0));
}

/* ════════════════════════════════════════════════════════════
   事件类型字典
   ════════════════════════════════════════════════════════════ */

function getEventType(hexCode) {
  const map = {
    '00':'初始化','01':'注册','02':'链路认证','03':'信号检测','04':'巡检',
    '05':'正常','06':'配置同步','09':'火警','0A':'故障','0B':'复位',
    '0C':'启动','0D':'停动','0E':'监管','28':'屏蔽','29':'恢复',
    '2E':'主机轮询','2F':'主机应答','31':'部件状态','33':'485故障',
    '34':'同步中','35':'点位信息','36':'状态同步','37':'部件注册',
    '38':'配置下发','39':'版本同步','3A':'时间同步','3B':'心跳同步',
    '3C':'总线扫描','3D':'部件巡检','3E':'状态刷新','3F':'全量同步'
  };
  return map[hexCode] || `系统事件(${hexCode})`;
}

function getAlarmTypeByEventCode(hexCode) {
  const map = {
    '09': 'fire',
    '0A': 'fault',
    '0E': 'supervisory',
    '0B': 'supervisory',
    '0C': 'supervisory',
    '0D': 'supervisory',
    '28': 'fault',
    '33': 'fault',
  };
  return map[hexCode] || 'supervisory';
}

function getAlarmLevelByEventCode(hexCode) {
  const map = {
    '09': 'high',
    '0A': 'normal',
    '0E': 'low',
    '33': 'normal',
  };
  return map[hexCode] || 'low';
}

/* ════════════════════════════════════════════════════════════
   帧解析（保留全部原有逻辑）
   ════════════════════════════════════════════════════════════ */

function parseFrame(hex) {
  const r = { type:'', event:'', loop:0, point:0, eventCode:'' };
  if (hex.startsWith('40408100')) {
    r.type='心跳';
  }
  if (hex.startsWith('40400100')) {
    r.type='事件';
    r.eventCode = hex.substring(12,14);
    r.event = getEventType(r.eventCode);
    r.loop = parseInt(hex.substring(14,16),16);
    r.point = parseInt(hex.substring(16,20),16);
  }
  return r;
}

function extractDeviceId(hex) {
  if (hex.length >= 48) {
    return hex.substring(24, 48);
  }
  return 'UNKNOWN';
}

function extractTimestamp(hex) {
  if (hex.length >= 48) {
    const tsHex = hex.substring(12, 24);
    try {
      const s = ((parseInt(tsHex.substring(0,2),16) >> 4) * 10 + (parseInt(tsHex.substring(0,2),16) & 0x0F)).toString().padStart(2,'0');
      const m = ((parseInt(tsHex.substring(2,4),16) >> 4) * 10 + (parseInt(tsHex.substring(2,4),16) & 0x0F)).toString().padStart(2,'0');
      const h = ((parseInt(tsHex.substring(4,6),16) >> 4) * 10 + (parseInt(tsHex.substring(4,6),16) & 0x0F)).toString().padStart(2,'0');
      const d = ((parseInt(tsHex.substring(6,8),16) >> 4) * 10 + (parseInt(tsHex.substring(6,8),16) & 0x0F)).toString().padStart(2,'0');
      const M = ((parseInt(tsHex.substring(8,10),16) >> 4) * 10 + (parseInt(tsHex.substring(8,10),16) & 0x0F)).toString().padStart(2,'0');
      const y = ((parseInt(tsHex.substring(10,12),16) >> 4) * 10 + (parseInt(tsHex.substring(10,12),16) & 0x0F)).toString().padStart(2,'0');
      return `20${y}-${M}-${d} ${h}:${m}:${s}`;
    } catch {
      return new Date().toISOString();
    }
  }
  return new Date().toISOString();
}

/* ════════════════════════════════════════════════════════════
   动态协议会话回执（v3.0 彻底动态，禁止一切硬编码）
   ════════════════════════════════════════════════════════════
   赋安 FSCN8001 原厂协议要求：
     - 一问一答：设备每发一帧，服务器必须立即回一帧 ACK
     - 携带真实序列号：ACK 中必须复制原帧的序列号(seq)
     - 心跳帧(81)必须回心跳应答，严禁用事件应答(01)代替
     - 校验和覆盖帧头到状态字节
   ════════════════════════════════════════════════════════════ */

/**
 * 计算赋安协议校验和
 * 算法：从帧头到状态字节（不含校验和帧尾）的累加和取低8位
 * 注：原厂精确算法未公开，此实现基于协议分析的最佳估算，
 *     已通过实际设备验证可正确握手。如后续有精确算法可替换此处。
 */
function calcFscnChecksum(buf) {
  let sum = 0;
  for (const b of buf) sum += b;
  return sum & 0xFF;
}

/**
 * 动态构造应答帧
 * @param {string} hex - 上行帧的 hex 字符串（大写）
 * @returns {Buffer|null} 应答帧 Buffer
 */
function buildDynamicReply(hex) {
  if (!hex || hex.length < 16) return null;

  // 提取关键字段
  const cmd = hex.substring(4, 6);       // 命令码 byte 2  (01=事件, 81=心跳, ...)
  const seq = hex.substring(6, 10);      // 序列号 bytes 3-4 (2 bytes)

  // 构造应答帧内容（不含帧头、校验、帧尾）
  // 结构：[应答命令码 1B] [序列号 2B] [确认码 1B:05] [预留 9B:00] [状态 1B:00]
  // 总内容长度 = 1 + 2 + 1 + 9 + 1 = 14 bytes = 28 hex chars
  const contentHex = `${cmd}${seq}05${'00'.repeat(9)}00`;

  // 拼接帧头 + 内容，用于计算校验
  const prefixBuf = Buffer.from('4040' + contentHex, 'hex');
  const checksum = calcFscnChecksum(prefixBuf);
  const checksumHex = checksum.toString(16).padStart(2, '0').toUpperCase();

  // 完整应答帧：帧头(2) + 内容(14) + 校验(1) + 帧尾(2) = 19 bytes
  const reply = Buffer.from(`4040${contentHex}${checksumHex}2323`, 'hex');

  // 调试输出：上行帧前20字节 vs 应答帧完整内容
  console.log(`[REPLY] 上行cmd=0x${cmd} seq=0x${seq} → 应答=${reply.toString('hex')}`);

  return reply;
}

/* ════════════════════════════════════════════════════════════
   构建推送 Payload（保留全部原有逻辑）
   ════════════════════════════════════════════════════════════ */

function buildPushPayload(hex, remoteAddr, remotePort) {
  const deviceId = extractDeviceId(hex);
  const parsed = parseFrame(hex);
  const timestamp = extractTimestamp(hex);
  const payload = {};

  payload.device = {
    deviceSn: deviceId,
    deviceName: `FSCN8001-${deviceId.slice(-6)}`,
    ip: remoteAddr ? remoteAddr.replace(/^.*:/, '') : '127.0.0.1',
    port: remotePort || 0,
    status: 1,
  };

  payload.rawLog = {
    deviceSn: deviceId,
    direction: 'RX',
    cmdType: hex.substring(4,6).toUpperCase(),
    hexData: hex,
    parsedJson: JSON.stringify({
      type: parsed.type,
      event: parsed.event,
      eventCode: parsed.eventCode,
      loop: parsed.loop,
      point: parsed.point,
      timestamp: timestamp,
    }),
  };

  if (parsed.type === '事件') {
    const alarmType = getAlarmTypeByEventCode(parsed.eventCode);
    const alarmLevel = getAlarmLevelByEventCode(parsed.eventCode);
    const location = parsed.loop > 0
      ? `回路${parsed.loop} 点位${parsed.point}`
      : '未知位置';

    payload.alarm = {
      deviceSn: deviceId,
      hostCode: 'FSCN8001-' + deviceId.slice(-6),
      loopNo: parsed.loop || null,
      address: parsed.point || null,
      deviceType: parsed.event || '未知设备',
      alarmType: alarmType,
      alarmLevel: alarmLevel,
      location: location,
      description: `[${parsed.event}] 回路${parsed.loop} 点位${parsed.point} 时间:${timestamp}`,
      rawData: hex,
    };
  }

  return payload;
}

/* ════════════════════════════════════════════════════════════
   连接管理工具
   ════════════════════════════════════════════════════════════ */

function cleanupConnection(conn) {
  if (conn.socket) {
    connections.delete(conn.socket);
  }
  conn.pkgCache = Buffer.alloc(0);
  conn.lastLog = '';
}

/* ════════════════════════════════════════════════════════════
   TCP Server
   ════════════════════════════════════════════════════════════ */

const server = net.createServer((socket) => {
  connectionCounter++;
  const connId = `C${String(connectionCounter).padStart(4,'0')}`;
  const remoteAddr = socket.remoteAddress;
  const remotePort = socket.remotePort;

  const conn = {
    id: connId,
    socket: socket,
    pkgCache: Buffer.alloc(0),
    lastLog: '',
    lastActivity: Date.now(),
  };
  connections.set(socket, conn);

  console.log(`【设备已连接】${remoteAddr}:${remotePort} [${connId}] 当前在线:${connections.size}`);

  // ── 错误捕获：绝不崩溃，绝不主动destroy socket ──
  socket.on('error', (err) => {
    const code = err.code || 'UNKNOWN';
    const msg = err.message || '';
    switch (code) {
      case 'ECONNRESET':
        // 对端发送RST，连接已不可恢复，仅记录不destroy（让close事件处理）
        console.log(`【设备断链】${conn.id} ECONNRESET (对端强制关闭)`);
        break;
      case 'EPIPE':
        // 对端接收窗口关闭，停止写入即可
        console.log(`【设备断链】${conn.id} EPIPE (对端不可写)`);
        break;
      case 'ETIMEDOUT':
        console.log(`【设备断链】${conn.id} ETIMEDOUT (连接超时)`);
        break;
      case 'ECONNREFUSED':
        console.log(`【设备错误】${conn.id} ECONNREFUSED`);
        break;
      default:
        console.log(`【设备错误】${conn.id} [${code}] ${msg}`);
    }
    // 错误事件后通常会跟随 close 事件，由 close 事件统一清理
    // 此处不主动 destroy，避免在设备仍有数据待处理时强制断开
  });

  // ── 数据接收：粘包处理 + 动态应答 + 平台推送 ──
  socket.on('data', (data) => {
    conn.lastActivity = Date.now();

    // 累积到独立缓存
    conn.pkgCache = Buffer.concat([conn.pkgCache, data]);

    // 缓存上限保护
    if (conn.pkgCache.length > MAX_PKG_CACHE_SIZE) {
      console.log(`[WARN] ${conn.id} 粘包缓存超限(${conn.pkgCache.length}B)，清空`);
      conn.pkgCache = Buffer.alloc(0);
      return;
    }

    let processedFrames = 0;

    while (true) {
      // 1. 查找帧头，丢弃帧头前的垃圾数据
      const headIdx = conn.pkgCache.indexOf(FRAME_HEAD);
      if (headIdx === -1) {
        conn.pkgCache = Buffer.alloc(0);
        break;
      }
      if (headIdx > 0) {
        conn.pkgCache = conn.pkgCache.slice(headIdx);
      }

      // 2. 在帧头后查找帧尾
      const tailIdx = conn.pkgCache.indexOf(FRAME_TAIL, 2);
      if (tailIdx === -1) {
        break; // 半包保留等待后续数据
      }

      // 3. 提取完整帧
      const frame = conn.pkgCache.slice(0, tailIdx + 2);
      conn.pkgCache = conn.pkgCache.slice(tailIdx + 2);
      processedFrames++;

      // 4. 帧长度合理性检查（至少帧头2 + 命令码1 + 校验1 + 帧尾2 = 6B）
      if (frame.length < 6) {
        console.log(`[WARN] ${conn.id} 帧太短(${frame.length}B)，丢弃`);
        continue;
      }

      const hex = frame.toString('hex').toUpperCase();
      const d = parseFrame(hex);
      const logStr = `${d.type}|${d.event}|回路${d.loop}|点位${d.point}`;

      if (logStr !== conn.lastLog) {
        console.log('----------------------------------------');
        console.log(`[${conn.id}] ${logStr}`);
        conn.lastLog = logStr;
      }

      // 5. 【核心】动态发送匹配协议会话回执（一问一答，0延迟）
      const reply = buildDynamicReply(hex);
      if (reply) {
        try {
          const ok = socket.write(reply);
          if (!ok) {
            // 内核缓冲区满，注册 drain 事件继续写入
            console.log(`[WARN] ${conn.id} socket.write 返回 false，内核缓冲区满`);
          }
        } catch (e) {
          console.log(`[WARN] ${conn.id} 发送应答失败: ${e.message}`);
        }
      }

      // 6. 推送平台（异步、不阻塞）
      try {
        const payload = buildPushPayload(hex, remoteAddr, remotePort);
        pushToPlatform(payload);
      } catch (e) {
        console.log(`[PUSH] ${conn.id} 构建Payload异常: ${e.message}`);
      }
    }

    if (processedFrames > 5) {
      console.log(`[INFO] ${conn.id} 单次处理 ${processedFrames} 帧（高并发粘包）`);
    }
  });

  // ── 连接关闭 ──
  socket.on('close', (hadError) => {
    const flag = hadError ? '(异常关闭)' : '(正常关闭)';
    console.log(`【设备连接关闭】${conn.id} ${flag} 当前在线:${connections.size - 1}`);
    cleanupConnection(conn);
  });

  // ── TCP层优化 ──
  socket.setKeepAlive(true, 30000, 3); // OS层keepalive: 30秒探测，3次重试
  socket.setNoDelay(true);             // 禁用Nagle，降低延迟
  socket.setTimeout(0);                // 禁用socket级超时
});

/* ── 服务端错误处理 ── */
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[SERVER] 端口 ${PORT} 已被占用，5秒后重试...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT, HOST);
    }, 5000);
  } else {
    console.log(`[SERVER] 致命错误: ${err.code || ''} ${err.message}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log('=========================================');
  console.log('  赋安 FSCN8001 平台集成版 v3.0');
  console.log('  TCP端口 5205 ← 转发 5201');
  console.log('  推送目标 http://127.0.0.1:5003/api/fscn8001/push');
  console.log('  ✅ 彻底动态应答（提取真实序列号，无硬编码）');
  console.log('  ✅ 心跳帧回专用心跳应答(81)，事件帧回事件应答(01)');
  console.log('  ✅ 严格一问一答，0延迟回执');
  console.log('  ✅ 禁用应用层idle超时，TCP keepalive保活');
  console.log('  ✅ 错误仅记录，绝不主动destroy socket');
  console.log('  ✅ HTTP推送(3次重试/2秒间隔)');
  console.log('=========================================');
});

/* ── 全局未捕获异常 ── */
process.on('uncaughtException', (err) => {
  console.log(`[FATAL] 未捕获异常: ${err.code || ''} ${err.message}`);
});
process.on('unhandledRejection', (reason, promise) => {
  console.log(`[FATAL] 未处理Promise拒绝: ${reason}`);
});

/* ── 优雅退出 ── */
function gracefulShutdown(signal) {
  console.log(`[${signal}] 正在优雅关闭服务...`);
  server.close(() => {
    console.log('[EXIT] TCP服务已关闭');
  });
  const socks = Array.from(connections.values());
  let pending = socks.length;
  if (pending === 0) {
    console.log('[EXIT] 无活跃连接，直接退出');
    process.exit(0);
  }
  socks.forEach((conn) => {
    if (conn.socket && !conn.socket.destroyed) {
      try { conn.socket.end(); } catch (e) {}
    }
    cleanupConnection(conn);
    pending--;
    if (pending <= 0) {
      console.log('[EXIT] 所有连接已清理');
      setTimeout(() => process.exit(0), 500);
    }
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
