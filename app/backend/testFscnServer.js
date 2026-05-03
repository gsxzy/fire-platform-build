const { startServer } = require('./fscn8001Server');
const server = startServer();
setTimeout(() => {
  console.log('[TEST] 服务器运行正常，3秒后自动关闭');
  server.close(() => process.exit(0));
}, 3000);
