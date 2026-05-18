import re

with open('/opt/my-fire-api-new/dist/app.js', 'r') as f:
    content = f.read()

# Add console.error before each await in bootstrap
replacements = [
    (r'await database_1\.default\.authenticate\(\);', r'console.error("STEP_A"); await database_1.default.authenticate(); console.error("STEP_B");'),
    (r'await \(0, refreshToken_service_1\.ensureRefreshTokenTable\)\(\);', r'console.error("STEP_C"); await (0, refreshToken_service_1.ensureRefreshTokenTable)(); console.error("STEP_D");'),
    (r'await database_1\.default\.sync\(\{ alter: isDev, force: false \}\);', r'console.error("STEP_E"); await database_1.default.sync({ alter: isDev, force: false }); console.error("STEP_F");'),
    (r'deviceHeartbeatService\.initModel\(\);', r'console.error("STEP_G"); deviceHeartbeatService.initModel(); console.error("STEP_H");'),
    (r'deviceHeartbeatService\.startScheduler\(process\.env\.HEARTBEAT_CRON', r'console.error("STEP_I"); deviceHeartbeatService.startScheduler(process.env.HEARTBEAT_CRON'),
    (r'\(0, websocket_1\.initWebSocket\)\(server\);', r'console.error("STEP_J"); (0, websocket_1.initWebSocket)(server); console.error("STEP_K");'),
    (r'await iot_1\.iotGateway\.start\(\);', r'console.error("STEP_L"); await iot_1.iotGateway.start(); console.error("STEP_M");'),
    (r'await gb26875_server_1\.gb26875Server\.start\(\);', r'console.error("STEP_N"); await gb26875_server_1.gb26875Server.start(); console.error("STEP_O");'),
    (r'await fscn8001_server_1\.fscn8001Server\.start\(\);', r'console.error("STEP_P"); await fscn8001_server_1.fscn8001Server.start(); console.error("STEP_Q");'),
    (r'\(0, cron_1\.initCronJobs\)\(\);', r'console.error("STEP_R"); (0, cron_1.initCronJobs)(); console.error("STEP_S");'),
    (r'server\.listen\(PORT', r'console.error("STEP_T"); server.listen(PORT'),
    (r'logger_1\.default\.error\(\'\[Bootstrap\] Failed:\', err\.message\);', r'console.error("CATCH_ERR", err); logger_1.default.error("[Bootstrap] Failed:", err.message);'),
]

for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

with open('/opt/my-fire-api-new/dist/app.js', 'w') as f:
    f.write(content)

print('Patched')
