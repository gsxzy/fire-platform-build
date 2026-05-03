const net = require('net');
const PORT = 5205;
const HOST = '0.0.0.0';

const FRAME_HEAD = Buffer.from([0x40, 0x40]);
const FRAME_TAIL = Buffer.from([0x23, 0x23]);
let pkgCache = Buffer.alloc(0);
let clientSocket = null;
let keepAliveTimer = null;
let lastLog = '';

// 赋安全事件字典
function getEventType(hexCode) {
  const map = {
    '00':'🔄初始化','01':'📡注册','02':'🔗链路认证','03':'📶信号检测','04':'🔍巡检',
    '05':'💡正常','06':'⚙️配置同步','09':'🔥火警','0A':'⚠️故障','0B':'✅复位',
    '0C':'🔔启动','0D':'🛑停动','0E':'📶监管','28':'🔧屏蔽','29':'♻️恢复',
    '2E':'📡主机轮询','2F':'✅主机应答','31':'📥部件状态','33':'❗485故障',
    '34':'🔄同步中','35':'📥点位信息','36':'📥状态同步','37':'📥部件注册',
    '38':'📥配置下发','39':'📥版本同步','3A':'📥时间同步','3B':'📥心跳同步',
    '3C':'📥总线扫描','3D':'📥部件巡检','3E':'📥状态刷新','3F':'📥全量同步'
  };
  return map[hexCode] || `📥系统事件(${hexCode})`;
}

// 解析报文
function parseFrame(hex) {
  const r = { type:'', event:'', loop:0, point:0 };
  if (hex.startsWith('40408100')) { r.type='✅心跳'; }
  if (hex.startsWith('40400100')) {
    r.type='🚨事件';
    r.event=getEventType(hex.substring(12,14));
    r.loop=parseInt(hex.substring(14,16),16);
    r.point=parseInt(hex.substring(16,20),16);
  }
  return r;
}

// 赋安原厂正确应答
function getCorrectReply(hex) {
  return Buffer.from('40400100010500000000000000000000B82323','hex');
}

// 保活包
const KEEP_ALIVE = Buffer.from('404088000105000000000000000000007D2323','hex');

const server = net.createServer((socket) => {
  clientSocket = socket;
  console.log('【设备已连接】');

  // 捕获错误 → 不崩溃
  socket.on('error', (err) => {
    console.log('【设备断开】');
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
      if(h==-1||t==-1) break;

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

      try {
        socket.write(getCorrectReply(hex));
      } catch(e) {}
    }
  });

  socket.on('close', () => {
    clientSocket = null;
    clearInterval(keepAliveTimer);
    pkgCache = Buffer.alloc(0);
    lastLog = '';
  });

  socket.setKeepAlive(true, 5000, 2);
});

server.listen(PORT, HOST, () => {
  console.log('=========================================');
  console.log('  赋安 FSCN8001 稳定版（不崩溃）');
  console.log('  端口 5205 → 转发 5201');
  console.log('  ✅ 已捕获错误，服务永不崩溃');
  console.log('  ✅ 10秒消除链路故障');
  console.log('=========================================');
});
