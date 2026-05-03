/**
 * FSCN8001 协议客户端模拟测试
 * 验证: 帧头4040/帧尾2323识别、XOR校验、应答帧原样提取时间/设备ID/数据
 */
const net = require('net');

// BCD 时间编码
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

// 累加和校验（赋安 FSCN8001 实际使用）
function calcChecksum(buf, start, end) {
  let sum = 0;
  for (let i = start; i < end; i++) sum += buf[i];
  return sum & 0xFF;
}

// 构造上行帧
function buildUpFrame(cmd, deviceId, data) {
  const timestamp = encodeBcdTimestamp();
  const fixed = Buffer.from([0x00, 0x01, 0x05]);
  const totalLen = 2 + 1 + 3 + 6 + 12 + data.length + 1 + 2;
  const frame = Buffer.alloc(totalLen);
  let offset = 0;
  frame.writeUInt16BE(0x4040, offset); offset += 2;
  frame.writeUInt8(cmd, offset);       offset += 1;
  fixed.copy(frame, offset);           offset += 3;
  timestamp.copy(frame, offset);       offset += 6;
  deviceId.copy(frame, offset);        offset += 12;
  data.copy(frame, offset);            offset += data.length;
  const cs = calcChecksum(frame, 2, offset);
  frame.writeUInt8(cs, offset);        offset += 1;
  frame.writeUInt16BE(0x2323, offset); offset += 2;
  return frame;
}

// 解析应答帧
function parseRespFrame(buf) {
  const cmd = buf.readUInt8(2);
  const timestamp = buf.slice(6, 12);
  const deviceId = buf.slice(12, 24);
  const data = buf.slice(24, buf.length - 3);
  const cs = buf.readUInt8(buf.length - 3);
  const expectedCs = calcChecksum(buf, 2, buf.length - 3);
  return {
    cmd: `0x${cmd.toString(16).padStart(2, '0').toUpperCase()}`,
    respCmd: `0x${cmd.toString(16).padStart(2, '0').toUpperCase()}`,
    deviceId: deviceId.toString('hex').toUpperCase(),
    timestamp: timestamp.toString('hex').toUpperCase(),
    dataLen: data.length,
    data: data.toString('hex').toUpperCase() || '(empty)',
    checksum: `0x${cs.toString(16).padStart(2, '0').toUpperCase()}`,
    checksumOk: cs === expectedCs,
    raw: buf.toString('hex').toUpperCase(),
  };
}

const DEVICE_ID = Buffer.from('8C0000000000000000000000', 'hex');
const TEST_DATA = Buffer.from('030002BE0100', 'hex'); // 心跳附属数据示例

function test() {
  const client = net.createConnection({ host: '124.223.35.58', port: 5201 }, () => {
    console.log('=== FSCN8001 协议测试客户端已连接 ===\n');

    // 1. 发送注册帧 0x01
    const regFrame = buildUpFrame(0x01, DEVICE_ID, TEST_DATA);
    console.log(`[TEST] 发送注册帧(01): ${regFrame.toString('hex').toUpperCase()}`);
    client.write(regFrame);

    // 2. 1秒后发送心跳帧 0x02
    setTimeout(() => {
      const hbFrame = buildUpFrame(0x02, DEVICE_ID, TEST_DATA);
      console.log(`[TEST] 发送心跳帧(02): ${hbFrame.toString('hex').toUpperCase()}`);
      client.write(hbFrame);
    }, 1000);

    // 3. 2秒后发送报警帧 0x03
    setTimeout(() => {
      const alarmData = Buffer.concat([Buffer.from('000000000000', 'hex'), encodeBcdTimestamp(), Buffer.from('0101', 'hex')]);
      const alarmFrame = buildUpFrame(0x03, DEVICE_ID, alarmData);
      console.log(`[TEST] 发送报警帧(03): ${alarmFrame.toString('hex').toUpperCase()}`);
      client.write(alarmFrame);
    }, 2000);

    // 4. 3秒后断开
    setTimeout(() => {
      console.log('\n=== 测试完成，断开连接 ===');
      client.end();
      process.exit(0);
    }, 3500);
  });

  let recvBuffer = Buffer.alloc(0);
  client.on('data', (chunk) => {
    recvBuffer = Buffer.concat([recvBuffer, chunk]);
    // 查找帧头帧尾
    while (recvBuffer.length >= 10) {
      const start = recvBuffer.indexOf(Buffer.from([0x40, 0x40]));
      if (start === -1) { recvBuffer = recvBuffer.slice(-1); break; }
      let end = -1;
      for (let i = start + 4; i < recvBuffer.length - 1; i++) {
        if (recvBuffer[i] === 0x23 && recvBuffer[i + 1] === 0x23) { end = i + 1; break; }
      }
      if (end === -1) break;
      const frameBuf = recvBuffer.slice(start, end + 1);
      recvBuffer = recvBuffer.slice(end + 1);
      const parsed = parseRespFrame(frameBuf);
      console.log(`[TEST] 收到应答帧: ${parsed.respCmd} deviceId=${parsed.deviceId} checksumOK=${parsed.checksumOk}`);
      console.log(`[TEST]   RAW=${parsed.raw}`);
      console.log(`[TEST]   data=${parsed.data} timestamp=${parsed.timestamp}`);
    }
  });

  client.on('error', (err) => {
    console.error('[TEST] 连接错误:', err.message);
    process.exit(1);
  });
}

test();
