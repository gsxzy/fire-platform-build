/**
 * ============================================================
 * 赋安 FSCN8001 私有协议 - 测试客户端
 * 模拟发送：1条注册 + 2条故障上报
 * 用法: node backend/fscn8001ClientTest.js
 * ============================================================
 */
const net = require('net');

const HOST = process.env.FSCN8001_HOST || '127.0.0.1';
const PORT = process.env.FSCN8001_PORT || 5201;

/* 设备序列号（6字节） */
const DEVICE_SN = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);

function log(tag, msg) {
  console.log(`[TEST][${new Date().toISOString()}][${tag}] ${msg}`);
}

/* 计算校验和 */
function checksum(cmd, sn, data) {
  let sum = cmd;
  for (const b of sn) sum += b;
  for (const b of data) sum += b;
  return sum & 0xFF;
}

/* 构造帧 */
function buildFrame(cmd, sn, data) {
  const cs = checksum(cmd, sn, data);
  const length = 1 + 6 + data.length + 1;
  const frame = Buffer.alloc(2 + 2 + length + 2);
  let offset = 0;
  frame.writeUInt16BE(0xAA55, offset); offset += 2;
  frame.writeUInt16BE(length, offset); offset += 2;
  frame.writeUInt8(cmd, offset);     offset += 1;
  sn.copy(frame, offset);            offset += 6;
  data.copy(frame, offset);          offset += data.length;
  frame.writeUInt8(cs, offset);      offset += 1;
  frame.writeUInt16BE(0x55AA, offset); offset += 2;
  return frame;
}

/* 准备测试帧 */

// 1. 注册帧（命令字 0x01）
const regFrame = buildFrame(0x01, DEVICE_SN, Buffer.alloc(0));

// 2. 故障1：回路1 地址2 故障类型0x01（通讯故障）
const fault1Data = Buffer.from([
  0x01,        // 回路号
  0x02,        // 地址
  0x01,        // 故障类型: 0x01=通讯故障
  0x02,        // 故障等级
  0x0C,        // 位置字符串长度 = 12
  ...Buffer.from('1F大厅烟感01'), // 位置
]);
const fault1Frame = buildFrame(0x04, DEVICE_SN, fault1Data);

// 3. 故障2：回路2 地址5 故障类型0x02（传感器失效）
const fault2Data = Buffer.from([
  0x02,        // 回路号
  0x05,        // 地址
  0x02,        // 故障类型: 0x02=传感器失效
  0x03,        // 故障等级
  0x0C,        // 位置字符串长度 = 12
  ...Buffer.from('B1水泵房温感'), // 位置
]);
const fault2Frame = buildFrame(0x04, DEVICE_SN, fault2Data);

/* 连接服务器 */
const socket = new net.Socket();

socket.connect(PORT, HOST, () => {
  log('CONN', `已连接 ${HOST}:${PORT}`);

  // Step 1: 发送注册包
  log('SEND', `注册包 => ${regFrame.toString('hex').toUpperCase()}`);
  socket.write(regFrame);

  // Step 2: 等 500ms 后发两个故障（模拟粘包：把两帧合在一起发）
  setTimeout(() => {
    const combined = Buffer.concat([fault1Frame, fault2Frame]);
    log('SEND', `故障1+2（粘包）=> ${combined.toString('hex').toUpperCase()}`);
    log('SEND', `  故障1 raw => ${fault1Frame.toString('hex').toUpperCase()}`);
    log('SEND', `  故障2 raw => ${fault2Frame.toString('hex').toUpperCase()}`);
    socket.write(combined);
  }, 500);

  // Step 3: 再等 1 秒发心跳
  setTimeout(() => {
    const hbFrame = buildFrame(0x02, DEVICE_SN, Buffer.alloc(0));
    log('SEND', `心跳包 => ${hbFrame.toString('hex').toUpperCase()}`);
    socket.write(hbFrame);
  }, 1500);

  // Step 4: 2 秒后关闭
  setTimeout(() => {
    log('CONN', '主动断开连接');
    socket.end();
  }, 3000);
});

/* 接收服务器应答 */
socket.on('data', (chunk) => {
  log('RECV', `${chunk.length} bytes: ${chunk.toString('hex').toUpperCase()}`);

  // 简单解析应答帧
  let offset = 0;
  while (offset + 6 <= chunk.length) {
    const header = chunk.readUInt16BE(offset);
    if (header !== 0xAA55) { offset++; continue; }

    const length = chunk.readUInt16BE(offset + 2);
    const totalLen = 2 + 2 + length + 2;
    if (offset + totalLen > chunk.length) break;

    const cmd = chunk.readUInt8(offset + 4);
    const sn = chunk.slice(offset + 5, offset + 11).toString('hex').toUpperCase();
    const cmdName = cmd === 0x81 ? '注册应答' : cmd === 0x82 ? '心跳应答' : `未知(0x${cmd.toString(16)})`;
    log('PARSE', `收到 ${cmdName} SN=${sn}`);
    offset += totalLen;
  }
});

socket.on('close', () => {
  log('CONN', '连接已关闭');
  process.exit(0);
});

socket.on('error', (err) => {
  log('ERROR', err.message);
  process.exit(1);
});
