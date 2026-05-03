/**
 * 集成测试运行器：同时启动服务器 + 客户端，打印完整交互日志
 */
const net = require('net');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 5202; // 用不同端口避免冲突

// 启动服务器子进程
const serverProc = spawn('node', [path.join(__dirname, 'fscn8001Server.js')], {
  env: { ...process.env, FSCN8001_PORT: String(PORT) },
  stdio: 'pipe',
});

serverProc.stdout.on('data', (d) => process.stdout.write(`[SERVER] ${d}`));
serverProc.stderr.on('data', (d) => process.stderr.write(`[SERVER_ERR] ${d}`));

setTimeout(() => {
  // 内联客户端（直接连接，不走子进程，方便看到完整输出）
  const DEVICE_SN = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);

  function checksum(cmd, sn, data) {
    let sum = cmd;
    for (const b of sn) sum += b;
    for (const b of data) sum += b;
    return sum & 0xFF;
  }

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

  const regFrame    = buildFrame(0x01, DEVICE_SN, Buffer.alloc(0));
  const fault1Data  = Buffer.from([0x01, 0x02, 0x01, 0x02, 0x0C, ...Buffer.from('1F大厅烟感01')]);
  const fault1Frame = buildFrame(0x04, DEVICE_SN, fault1Data);
  const fault2Data  = Buffer.from([0x02, 0x05, 0x02, 0x03, 0x0C, ...Buffer.from('B1水泵房温感')]);
  const fault2Frame = buildFrame(0x04, DEVICE_SN, fault2Data);

  const socket = new net.Socket();

  socket.connect(PORT, '127.0.0.1', () => {
    console.log('\n========== 客户端开始发送 ==========\n');

    console.log(`[CLIENT] 注册包 => ${regFrame.toString('hex').toUpperCase()}`);
    socket.write(regFrame);

    setTimeout(() => {
      const combined = Buffer.concat([fault1Frame, fault2Frame]);
      console.log(`[CLIENT] 故障1+2（粘包）=> ${combined.toString('hex').toUpperCase()}`);
      console.log(`[CLIENT]   故障1 raw => ${fault1Frame.toString('hex').toUpperCase()}`);
      console.log(`[CLIENT]   故障2 raw => ${fault2Frame.toString('hex').toUpperCase()}`);
      socket.write(combined);
    }, 300);

    setTimeout(() => {
      const hb = buildFrame(0x02, DEVICE_SN, Buffer.alloc(0));
      console.log(`[CLIENT] 心跳包 => ${hb.toString('hex').toUpperCase()}`);
      socket.write(hb);
    }, 600);

    setTimeout(() => {
      console.log('\n========== 测试结束，关闭连接 ==========\n');
      socket.end();
      serverProc.kill();
      process.exit(0);
    }, 1200);
  });

  socket.on('data', (chunk) => {
    console.log(`[CLIENT] 收到应答 <= ${chunk.length} bytes: ${chunk.toString('hex').toUpperCase()}`);
  });

  socket.on('error', (err) => {
    console.error(`[CLIENT] 错误: ${err.message}`);
    serverProc.kill();
    process.exit(1);
  });
}, 800);
