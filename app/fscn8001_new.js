/**
 * ============================================================
 * 赋安 FSCN8001 用传协议解析服务（平台集成版 v2.0）
 * TCP监听: 5205  （iptables 5201→5205 转发）
 * 推送目标: http://127.0.0.1:5003/api/fscn8001/push
 * ============================================================
 * 改进点 (v2.0):
 *   1. 移除无效固定定时保活包(0x88)，改为"收到上行即回动态应答"
 *   2. 多设备独立会话管理，每个socket独立缓存/超时/状态
 *   3. TCP粘包优化：缓存上限保护、垃圾前缀丢弃、半包保留
 *   4. 120秒空闲超时检测，自动销毁僵死连接
 *   5. ECONNRESET/EPIPE/ETIMEDOUT 分类捕获，服务永不崩溃
 *   6. 动态协议会话回执：按原帧命令码构造匹配ACK，一问一答
 *   7. HTTP POST 推送平台（异步、重试、异常隔离）
 *   8. 原始报文全量入库
 *   9. 优雅退出(SIGTERM)
 * ============================================================
 */
const net = require('net');
const http = require('http');

const PORT = 5205;
const HOST = '0.0.0.0';
const PUSH_URL = 'http://127.0.0.1:5003/api/fscn8001/push';
const PUSH_MAX_RETRIES = 3;
const PUSH_RETRY_DELAY = 2000;
const IDLE_TIMEOUT_MS = 120000;          // 2分钟无数据视为断链
const MAX_PKG_CACHE_SIZE = 1048576;      // 单连接粘包缓存上限 1MB

const FRAME_HEAD = Buffer.from([0x40, 0x40]);
const FRAME_TAIL = Buffer.from([0x23, 0x23]);

// 已知正确的硬编码通用应答帧（01事件应答，校验B8已验证）
const REPLY_TEMPLATE_01 = Buffer.from('40400100010500000000000000000000B82323', 'hex');

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

  // 异步推送，绝不阻塞 TCP 主线程
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
    '09': 'fire',      // 火警
    '0A': 'fault',     // 故障
    '0E': 'supervisory', // 监管
    '0B': 'supervisory', // 复位（作为监管事件记录）
    '0C': 'supervisory', // 启动
    '0D': 'supervisory', // 停动
    '28': 'fault',     // 屏蔽视为故障
    '33': 'fault',     // 485故障
  };
  return map[hexCode] || 'supervisory';
}

function getAlarmLevelByEventCode(hexCode) {
  const map = {
    '09': 'high',   // 火警
    '0A': 'normal', // 故障
    '0E': 'low',    // 监管
    '33': 'normal', // 485故障
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

// 提取设备ID（12字节 = 24个hex字符）
function extractDeviceId(hex) {
  if (hex.length >= 48) {
    return hex.substring(24, 48);
  }
  return 'UNKNOWN';
}

// 提取BCD时间（6字节 = 12个hex字符，位于固定头之后）
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
   动态协议会话回执（一问一答，匹配原帧命令码）
   ════════════════════════════════════════════════════════════
   原理：
     - 设备每发一帧，服务器必须实时回一帧ACK，设备才认为链路正常
     - 原代码使用固定 0x88 定时保活包，设备不认识 → 报链路故障
     - 现改为：解析上行帧命令码，回同命令码的匹配ACK
     - 01 事件帧使用已验证正确的硬编码应答；其他帧动态构造
   ════════════════════════════════════════════════════════════ */

function buildDynamicReply(hex) {
  if (!hex || hex.length < 8) return null;

  const cmd = hex.substring(4, 6); // 原帧命令码（01=事件, 81=心跳, ...）

  // 01 事件帧：使用硬编码正确应答（校验 B8 已验证有效）
  if (cmd === '01') {
    return REPLY_TEMPLATE_01;
  }

  // 81 心跳帧及其他命令码：动态构造同结构应答
  // 格式：帧头(4040) + 原命令码 + 子命令00 + 数据长度01 + 确认码05
  //       + 预留9B(00) + 状态00 + 校验 + 帧尾(2323)
  // 校验字节暂复用 B8（实际测试中对心跳帧校验容忍度良好）
  // 如后续设备对特定命令码校验严格，可在此补充对应硬编码帧
  return Buffer.from(`4040${cmd}00010500000000000000000000B82323`, 'hex');
}

/* ════════════════════════════════════════════════════════════
   构建推送 Payload（保留全部原有逻辑）
   ════════════════════════════════════════════════════════════ */

function buildPushPayload(hex, remoteAddr, remotePort) {
  const deviceId = extractDeviceId(hex);
  const parsed = parseFrame(hex);
  const timestamp = extractTimestamp(hex);
  const payload = {};

  // 1. 设备信息（所有帧都推送，用于保活更新）
  payload.device = {
    deviceSn: deviceId,
    deviceName: `FSCN8001-${deviceId.slice(-6)}`,
    ip: remoteAddr ? remoteAddr.replace(/^.*:/, '') : '127.0.0.1',
    port: remotePort || 0,
    status: 1, // 在线
  };

  // 2. 原始报文（所有帧都推送）
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

  // 3. 报警事件（仅事件帧推送）
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

function setIdleTimeout(conn) {
  if (conn.idleTimer) clearTimeout(conn.idleTimer);
  conn.idleTimer = setTimeout(() => {
    console.log(`[TIMEOUT] 连接 ${conn.id} 空闲${IDLE_TIMEOUT_MS/1000}秒无数据，主动销毁`);
    if (conn.socket && !conn.socket.destroyed) {
      try { conn.socket.end(); } catch (e) {}
      setTimeout(() => {
        if (conn.socket && !conn.socket.destroyed) {
          try { conn.socket.destroy(); } catch (e) {}
        }
      }, 5000);
    }
  }, IDLE_TIMEOUT_MS);
}

function cleanupConnection(conn) {
  if (conn.idleTimer) {
    clearTimeout(conn.idleTimer);
    conn.idleTimer = null;
  }
  if (conn.socket) {
    connections.delete(conn.socket);
    try {
      if (!conn.socket.destroyed) conn.socket.destroy();
    } catch (e) {}
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
    idleTimer: null,
  };
  connections.set(socket, conn);

  console.log(`【设备已连接】${remoteAddr}:${remotePort} [${connId}] 当前在线:${connections.size}`);

  // 启动空闲超时检测
  setIdleTimeout(conn);

  // ── 错误捕获：分类处理，绝不崩溃 ──
  socket.on('error', (err) => {
    const code = err.code || 'UNKNOWN';
    const msg = err.message || '';
    switch (code) {
      case 'ECONNRESET':
        console.log(`【设备断链】${conn.id} ECONNRESET (对端强制关闭)`);
        break;
      case 'EPIPE':
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
    cleanupConnection(conn);
  });

  // ── 数据接收：粘包处理 + 动态应答 + 平台推送 ──
  socket.on('data', (data) => {
    conn.lastActivity = Date.now();
    setIdleTimeout(conn);

    // 累积到独立缓存
    conn.pkgCache = Buffer.concat([conn.pkgCache, data]);

    // 缓存上限保护：避免垃圾数据导致内存无限增长
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
        // 完全找不到帧头：全部视为垃圾，清空
        conn.pkgCache = Buffer.alloc(0);
        break;
      }
      if (headIdx > 0) {
        // 丢弃帧头前的垃圾前缀
        conn.pkgCache = conn.pkgCache.slice(headIdx);
      }

      // 2. 在帧头后查找帧尾
      const tailIdx = conn.pkgCache.indexOf(FRAME_TAIL, 2);
      if (tailIdx === -1) {
        // 只有帧头没有帧尾：保留半包，等待后续数据
        break;
      }

      // 3. 提取完整帧
      const frame = conn.pkgCache.slice(0, tailIdx + 2);
      conn.pkgCache = conn.pkgCache.slice(tailIdx + 2);
      processedFrames++;

      // 4. 帧长度合理性检查（至少：帧头2 + 命令码1 + 校验1 + 帧尾2 = 6B）
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

      // 5. 【核心改进】动态发送匹配协议会话回执（一问一答）
      const reply = buildDynamicReply(hex);
      if (reply) {
        try {
          socket.write(reply);
        } catch (e) {
          console.log(`[WARN] ${conn.id} 发送应答失败: ${e.message}`);
        }
      }

      // 6. 推送平台（异步、不阻塞、异常隔离）
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
  socket.setTimeout(0);                // 禁用socket级超时，由应用层idleTimer管理
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
  console.log('  赋安 FSCN8001 平台集成版 v2.0');
  console.log('  TCP端口 5205 ← 转发 5201');
  console.log('  推送目标 http://127.0.0.1:5003/api/fscn8001/push');
  console.log('  ✅ 动态会话回执（一问一答，无定时保活）');
  console.log('  ✅ 多设备独立管理');
  console.log('  ✅ 粘包缓存上限 + 空闲超时检测');
  console.log('  ✅ ECONNRESET/EPIPE/ETIMEDOUT 分类捕获');
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

/* ── 优雅退出（systemctl stop / SIGTERM）── */
function gracefulShutdown(signal) {
  console.log(`[${signal}] 正在优雅关闭服务...`);
  // 停止接受新连接
  server.close(() => {
    console.log('[EXIT] TCP服务已关闭');
  });
  // 断开所有现有连接
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
