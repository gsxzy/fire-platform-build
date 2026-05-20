"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ═══════════════════════════════════════════════════════════════════
 * 新致远智慧消防云平台 - 后端服务入口
 * Node.js + Express + MySQL + WebSocket + IoT Gateway
 * ═══════════════════════════════════════════════════════════════════
 */
require("module-alias/register");
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const database_1 = __importDefault(require("@/config/database"));
const redis_1 = __importDefault(require("@/config/redis"));
const logger_1 = __importDefault(require("@/config/logger"));
const corsOptions_1 = require("@/config/corsOptions");
const response_1 = require("@/utils/response");
const httpError_1 = require("@/utils/httpError");
const refreshToken_service_1 = require("@/services/refreshToken.service");
const logger_2 = require("@/middleware/logger");
const rateLimit_1 = require("@/middleware/rateLimit");
const slowRequest_1 = require("@/middleware/slowRequest");
const requestTracer_1 = require("@/middleware/requestTracer");
const requestTimeout_1 = require("@/middleware/requestTimeout");
const routes_1 = __importDefault(require("@/routes"));
const websocket_1 = require("@/websocket");
const iot_1 = require("@/iot");
const cron_1 = require("@/cron");
const notification_service_1 = require("@/services/notification.service");
const gb26875_server_1 = require("@/protocols/gb26875.server");
const fscn8001_server_1 = require("@/protocols/fscn8001.server");
const canet_server_1 = require("@/protocols/canet.server");
const deviceHeartbeat_service_1 = require("@/services/deviceHeartbeat.service");
const websocket_service_1 = require("@/websocket/websocket.service");
const startupLog_1 = require("@/utils/startupLog");
const apiDocs_1 = require("@/utils/apiDocs");
const app = (0, express_1.default)();
// 启动配置快照
startupLog_1.startupLog.snapshotConfig();
/* Nginx 等反向代理后正确解析客户端 IP（限流、日志）；仅当 TRUST_PROXY=1 启用 */
if (process.env.TRUST_PROXY === '1') {
    const hops = parseInt(process.env.TRUST_PROXY_HOPS || '1', 10);
    app.set('trust proxy', Number.isFinite(hops) && hops > 0 ? hops : 1);
    logger_1.default.info(`[HTTP] trust proxy 已启用，hops=${Number.isFinite(hops) && hops > 0 ? hops : 1}`);
}
// 初始化通知服务
notification_service_1.NotificationService.init();
const PORT = parseInt(process.env.PORT || '3000');
/* ── 中间件 ── */
app.use((0, cors_1.default)((0, corsOptions_1.getCorsOptions)()));
app.use((0, helmet_1.default)());
app.use(express_1.default.json({ limit: '5mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '5mb' }));
app.use(requestTracer_1.requestTracer);
app.use(logger_2.requestLogger);
app.use(slowRequest_1.slowRequestWarning);
app.use((0, requestTimeout_1.requestTimeout)());
app.use(rateLimit_1.globalRateLimiter);
/* ── 静态文件 ── */
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
/* ── API路由 ── */
app.use('/api', routes_1.default);
/* ── API 概览（零依赖 Swagger 替代方案）── */
app.get('/docs', (req, res) => {
    const endpoints = (0, apiDocs_1.scanRoutes)(app);
    const accept = req.get('accept') || '';
    if (accept.includes('text/html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        const md = (0, apiDocs_1.generateApiMarkdown)(endpoints);
        // 极简 HTML 包装
        res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>API 概览</title>
<style>
body{font-family:system-ui,sans-serif;max-width:1200px;margin:0 auto;padding:24px;line-height:1.6}
table{border-collapse:collapse;width:100%;margin:16px 0}
th,td{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#f5f5f5}
code{background:#f0f0f0;padding:2px 6px;border-radius:3px}
h2{margin-top:32px;border-bottom:2px solid #eee;padding-bottom:8px}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;color:#fff}
.GET{background:#22c55e}.POST{background:#3b82f6}.PUT{background:#eab308}.DELETE{background:#ef4444}.PATCH{background:#a855f7}
</style></head>
<body><h1>🔥 新致远智慧消防平台 API 概览</h1>
<p>总接口数: <strong>${endpoints.length}</strong> | 生成时间: ${new Date().toLocaleString('zh-CN')}</p>
${md.replace(/# API 概览\n\n/, '').replace(/\| \\x1b\[\d+m(GET|POST|PUT|DELETE|PATCH)\\x1b\[0m \|/g, (m, m1) => `| <span class="badge ${m1}">${m1}</span> |`).replace(/\|------\|------\|/g, '').replace(/```/g, '')}
</body></html>`);
    }
    else {
        res.json({
            total: endpoints.length,
            endpoints: endpoints.slice(0, 200),
            generatedAt: new Date().toISOString(),
        });
    }
});
/* ── 健康检查 ── */
app.get('/health', async (req, res) => {
    const checks = {};
    let healthy = true;
    try {
        await database_1.default.authenticate();
        checks.database = 'ok';
    }
    catch {
        checks.database = 'fail';
        healthy = false;
    }
    try {
        await redis_1.default.ping();
        checks.redis = 'ok';
    }
    catch {
        checks.redis = 'fail';
        healthy = false;
    }
    const data = {
        status: healthy ? 'ok' : 'degraded',
        version: '2.0.0',
        timestamp: Date.now(),
        uptime: process.uptime(),
        checks,
    };
    res.status(healthy ? 200 : 503).json((0, response_1.success)(data, healthy ? 'ok' : 'degraded', req.reqId));
});
/* ── 错误处理 ── */
app.use(logger_2.errorLogger);
app.use((err, req, res, _next) => {
    logger_1.default.error('Unhandled error:', err);
    if (err instanceof httpError_1.HttpError) {
        return res.status(err.httpStatus).json((0, response_1.fail)(err.message, err.businessCode, req.reqId));
    }
    const e = err;
    const status = e.status ?? e.statusCode ?? 500;
    const msg = process.env.NODE_ENV === 'production' ? '服务器内部错误' : (e.message || '服务器内部错误');
    res.status(status).json((0, response_1.fail)(msg, status, req.reqId));
});
/* ── 404 ── */
app.use((req, res) => {
    res.status(404).json((0, response_1.fail)('接口不存在', 404, req.reqId));
});
/* ── 进程级异常保护 ── */
process.on('uncaughtException', (err) => {
    logger_1.default.error('[Process] uncaughtException:', err);
    // 给日志刷新时间后退出
    setTimeout(() => process.exit(1), 3000);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('[Process] unhandledRejection:', { reason, promise });
});
/* ── 启动 ── */
const server = http_1.default.createServer(app);
async function bootstrap() {
    try {
        // ═══════════════════════════════════════════════════════════════
        // 安全启动检查
        // ═══════════════════════════════════════════════════════════════
        startupLog_1.startupLog.begin('安全启动检查');
        const defaultJwtSecret = 'xzy_fire_platform_secret_key_2024';
        if (process.env.JWT_SECRET === defaultJwtSecret && process.env.NODE_ENV === 'production') {
            startupLog_1.startupLog.fail('安全启动检查', '生产环境使用默认JWT密钥');
            process.exit(1);
        }
        const defaultDbPass = 'Fire_Pass_2024!';
        if (process.env.DB_PASSWORD === defaultDbPass && process.env.NODE_ENV === 'production') {
            logger_1.default.warn('[SECURITY] ⚠️  警告：生产环境使用默认数据库密码，请立即修改！');
        }
        startupLog_1.startupLog.success('安全启动检查');
        // 连接数据库
        startupLog_1.startupLog.begin('数据库连接');
        await database_1.default.authenticate();
        startupLog_1.startupLog.success('数据库连接');
        startupLog_1.startupLog.begin('刷新令牌表初始化');
        await (0, refreshToken_service_1.ensureRefreshTokenTable)();
        startupLog_1.startupLog.success('刷新令牌表初始化');
        // 同步表结构
        startupLog_1.startupLog.begin('表结构同步');
        const isDev = process.env.NODE_ENV === 'development';
        await database_1.default.sync({ alter: isDev, force: false });
        startupLog_1.startupLog.success('表结构同步');
        // 初始化设备心跳服务
        startupLog_1.startupLog.begin('设备心跳服务');
        const deviceHeartbeatService = deviceHeartbeat_service_1.DeviceHeartbeatService.getInstance(database_1.default);
        deviceHeartbeatService.initModel();
        deviceHeartbeatService.setCallbacks({
            onDeviceOffline: (device) => {
                logger_1.default.warn(`[DeviceHeartbeat] 设备离线通知: ${device.deviceNo}`);
            },
            onDeviceOnline: (device) => {
                logger_1.default.info(`[DeviceHeartbeat] 设备恢复在线: ${device.deviceNo}`);
            },
        });
        deviceHeartbeatService.startScheduler(process.env.HEARTBEAT_CRON || '* * * * *');
        startupLog_1.startupLog.success('设备心跳服务');
        // 启动WebSocket
        startupLog_1.startupLog.begin('WebSocket 服务');
        (0, websocket_1.initWebSocket)(server);
        startupLog_1.startupLog.success('WebSocket 服务');
        // 启动IoT网关
        startupLog_1.startupLog.begin('IoT 网关');
        await iot_1.iotGateway.start();
        startupLog_1.startupLog.success('IoT 网关');
        // 启动协议服务器
        startupLog_1.startupLog.begin('GB26875 协议服务器');
        await gb26875_server_1.gb26875Server.start();
        startupLog_1.startupLog.success('GB26875 协议服务器');
        startupLog_1.startupLog.begin('FSCN8001 协议服务器');
        await fscn8001_server_1.fscn8001Server.start();
        startupLog_1.startupLog.success('FSCN8001 协议服务器');
        startupLog_1.startupLog.begin('CANET 协议服务器');
        canet_server_1.canetServer.start();
        startupLog_1.startupLog.success('CANET 协议服务器');
        // 启动定时任务
        startupLog_1.startupLog.begin('定时任务');
        (0, cron_1.initCronJobs)();
        startupLog_1.startupLog.success('定时任务');
        // 启动HTTP服务
        startupLog_1.startupLog.begin('HTTP 服务');
        server.listen(PORT, () => {
            startupLog_1.startupLog.success('HTTP 服务');
            startupLog_1.startupLog.finish();
            logger_1.default.info(`[Server] Fire Platform running on port ${PORT}`);
            if (process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY !== '1') {
                logger_1.default.warn('[HTTP] 生产环境若经 Nginx 反代，请在 .env 设置 TRUST_PROXY=1，否则限流与日志中的客户端 IP 可能均为代理地址');
            }
        });
    }
    catch (err) {
        logger_1.default.error('[Bootstrap] Failed:', err.message);
        startupLog_1.startupLog.finish();
        process.exit(1);
    }
}
bootstrap();
/* ── 优雅关闭 ── */
async function gracefulShutdown(signal) {
    logger_1.default.info(`[Server] ${signal} received, shutting down gracefully`);
    // 关闭协议服务器
    await gb26875_server_1.gb26875Server.stop();
    await fscn8001_server_1.fscn8001Server.stop();
    await canet_server_1.canetServer.stop();
    // 关闭 WebSocket 服务器（通知所有客户端）
    const wss = websocket_service_1.WebSocketService.getWss();
    if (wss) {
        wss.clients.forEach((ws) => {
            try {
                ws.close(1001, 'Server shutting down');
            }
            catch { /* ignore */ }
        });
        wss.close();
    }
    // 关闭 HTTP 服务器
    server.close(async () => {
        // 关闭数据库连接池
        await database_1.default.close();
        // 关闭 Redis 连接
        await redis_1.default.quit();
        logger_1.default.info('[Server] Graceful shutdown complete');
        process.exit(0);
    });
    // 强制退出兜底（10秒后）
    setTimeout(() => {
        logger_1.default.error('[Server] Force shutdown after timeout');
        process.exit(1);
    }, 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
exports.default = app;
//# sourceMappingURL=app.js.map