/**
 * ============================================================
 * 赋安 FSCN8001 用传协议解析服务（平台集成版）
 * TCP监听: 5205  （iptables 5201→5205 转发）
 * 推送目标: http://127.0.0.1:5003/api/fscn8001/push
 * ============================================================
 * 功能:
 *   ✅ 完整粘包处理（帧头 0x4040 / 帧尾 0x2323）
 *   ✅ 原厂正确应答包（不破坏设备握手逻辑）
 *   ✅ 10秒链路保活（消除链路故障）
 *   ✅ 全错误捕获（服务永不崩溃）
 *   ✅ HTTP POST 推送平台（异步、重试、不阻塞 TCP）
 *   ✅ 原始报文入库
 * ============================================================
 */
const net = require('net');
const http = require('http');

const PORT = 5205;
const HOST = '0.0.0.0';
const PUSH_URL = 'http://127.0.0.1:5003/api/fscn8001/push';
const PUSH_MAX_RETRIES = 3;
const PUSH_RETRY_DELAY = 2000;

const FRAME_HEAD = Buffer.from([0x40, 0x40]);
const FRAME_TAIL = Buffer.from([0x23, 0x23]);
let pkgCache = Buffer.alloc(0);
let clientSocket = null;
let keepAliveTimer = null;
let lastLog = '';

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
            if (json.code === 200) {
              // 静默成功，不打印避免日志风暴
            } else {
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
   BCD 解码辅助函数
   ════════════════════════════════════════════════════════════ */

function bcdDecode(hexStr) {
  const byte = parseInt(hexStr, 16);
  return ((byte >> 4) * 10) + (byte & 0x0F);
}

/* ════════════════════════════════════════════════════════════
   帧解析
   ════════════════════════════════════════════════════════════ */

function parseFrame(hex) {
  const r = { type:'', event:'', loop:0, point:0, eventCode:'' };
  if (hex.startsWith('40408100')) {
    r.type='心跳';
  }
  if (hex.startsWith('40400100') && hex.length >= 56) {
    r.type='事件';
    // 数据区起始偏移: 帧头(2B)+命令字(1B)+固定字段(3B)+时间戳(6B)+设备ID(12B) = 24B = 48 hex chars
    r.eventCode = hex.substring(48, 50);
    r.event = getEventType(r.eventCode);
    r.loop = bcdDecode(hex.substring(50, 52));
    r.point = parseInt(hex.substring(52, 56), 16);
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

// 提取BCD时间（6字节 = 12个hex字符，位于 hex[12:24]）
// 顺序: 秒、分、时、日、月、年(后两位)
function extractTimestamp(hex) {
  if (hex.length >= 48) {
    const tsHex = hex.substring(12, 24);
    try {
      const s = bcdDecode(tsHex.substring(0, 2)).toString().padStart(2, '0');
      const m = bcdDecode(tsHex.substring(2, 4)).toString().padStart(2, '0');
      const h = bcdDecode(tsHex.substring(4, 6)).toString().padStart(2, '0');
      const d = bcdDecode(tsHex.substring(6, 8)).toString().padStart(2, '0');
      const M = bcdDecode(tsHex.substring(8, 10)).toString().padStart(2, '0');
      const y = bcdDecode(tsHex.substring(10, 12)).toString().padStart(2, '0');
      return `20${y}-${M}-${d} ${h}:${m}:${s}`;
    } catch {
      return new Date().toISOString();
    }
  }
  return new Date().toISOString();
}

/* ════════════════════════════════════════════════════════════
   赋安原厂正确应答
   ════════════════════════════════════════════════════════════ */

function getCorrectReply(hex) {
  return Buffer.from('40400100010500000000000000000000B82323','hex');
}

// 保活包
const KEEP_ALIVE = Buffer.from('404088000105000000000000000000007D2323','hex');

/* ════════════════════════════════════════════════════════════
   构建推送 Payload
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
      ? `第${parsed.loop}回路 第${parsed.point}点位`
      : '未知位置';

    payload.alarm = {
      deviceSn: deviceId,
      hostCode: 'FSCN8001-' + deviceId.slice(-6),
      loopNo: parsed.loop || null,
      address: parsed.point || null,
      deviceType: parsed.event || '未知设备',
      alarmType: alarmType,
      alarmLevel: alarmLevel,
      alarmTime: timestamp,
      location: location,
      description: `[${parsed.event}] 第${parsed.loop}回路 第${parsed.point}点位 时间:${timestamp}`,
      rawData: hex,
    };
  }

  return payload;
}

/* ════════════════════════════════════════════════════════════
   TCP Server
   ════════════════════════════════════════════════════════════ */

const server = net.createServer((socket) => {
  clientSocket = socket;
  const remoteAddr = socket.remoteAddress;
  const remotePort = socket.remotePort;
  console.log(`【设备已连接】${remoteAddr}:${remotePort}`);

  // 捕获错误 → 不崩溃
  socket.on('error', (err) => {
    console.log(`【设备断开】${err.message}`);
  });

  // 10秒保活
  clearInterval(keepAliveTimer);
  keepAliveTimer = setInterval(()=>{
    if(clientSocket && !clientSocket.destroyed) {
      try { clientSocket.write(KEEP_ALIVE); } catch(e) {}
    }
  },10000);

  socket.on('data', (data) => {
    pkgCache = Buffer.concat([pkgCache, data]);
    while(1){
      const h = pkgCache.indexOf(FRAME_HEAD);
      const t = pkgCache.indexOf(FRAME_TAIL, h+2);
      if(h===-1||t===-1) break;

      const frame = pkgCache.slice(h,t+2);
      pkgCache = pkgCache.slice(t+2);
      const hex = frame.toString('hex').toUpperCase();
      const d = parseFrame(hex);
      const logStr = `${d.type}|${d.event}|回路${d.loop}|点位${d.point}`;

      if(logStr!==lastLog){
        console.log('----------------------------------------');
        console.log(logStr);
        lastLog=logStr;
      }

      // 发送原厂应答
      try {
        socket.write(getCorrectReply(hex));
      } catch(e) {}

      // 推送平台（异步、不阻塞、异常隔离）
      try {
        const payload = buildPushPayload(hex, remoteAddr, remotePort);
        pushToPlatform(payload);
      } catch (e) {
        console.log(`[PUSH] 构建Payload异常: ${e.message}`);
      }
    }
  });

  socket.on('close', () => {
    clientSocket = null;
    clearInterval(keepAliveTimer);
    pkgCache = Buffer.alloc(0);
    lastLog = '';
    console.log('【设备连接关闭】');
  });

  socket.setKeepAlive(true, 5000, 2);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[SERVER] 端口 ${PORT} 已被占用`);
  } else {
    console.log(`[SERVER] 错误: ${err.message}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log('=========================================');
  console.log('  赋安 FSCN8001 平台集成版');
  console.log('  TCP端口 5205 ← 转发 5201');
  console.log('  推送目标 http://127.0.0.1:5003/api/fscn8001/push');
  console.log('  ✅ 已捕获错误，服务永不崩溃');
  console.log('  ✅ 10秒消除链路故障');
  console.log('  ✅ HTTP推送(3次重试/2秒间隔)');
  console.log('=========================================');
});

/* ── 全局未捕获异常 ── */
process.on('uncaughtException', (err) => {
  console.log(`[FATAL] 未捕获异常: ${err.message}`);
});
process.on('unhandledRejection', (reason) => {
  console.log(`[FATAL] 未处理Promise拒绝: ${reason}`);
});
