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
const logger_1 = __importDefault(require("@/config/logger"));
const corsOptions_1 = require("@/config/corsOptions");
const response_1 = require("@/utils/response");
const httpError_1 = require("@/utils/httpError");
const refreshToken_service_1 = require("@/services/refreshToken.service");
const logger_2 = require("@/middleware/logger");
const rateLimit_1 = require("@/middleware/rateLimit");
const slowRequest_1 = require("@/middleware/slowRequest");
const requestTracer_1 = require("@/middleware/requestTracer");
const routes_1 = __importDefault(require("@/routes"));
const websocket_1 = require("@/websocket");
const iot_1 = require("@/iot");
const cron_1 = require("@/cron");
const notification_service_1 = require("@/services/notification.service");
const gb26875_server_1 = require("@/protocols/gb26875.server");
const fscn8001_server_1 = require("@/protocols/fscn8001.server");
const deviceHeartbeat_service_1 = require("@/services/deviceHeartbeat.service");
const app = (0, express_1.default)();
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
app.use(rateLimit_1.globalRateLimiter);
/* ── 静态文件 ── */
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
/* ── API路由 ── */
app.use('/api', routes_1.default);
/* ── 健康检查 ── */
app.get('/health', (req, res) => {
    res.json((0, response_1.success)({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() }, 'ok', req.reqId));
});
/* ── 错误处理 ── */
app.use(logger_2.errorLogger);
app.use((err, req, res, next) => {
    logger_1.default.error('Unhandled error:', err);
    if (err instanceof httpError_1.HttpError) {
        return res.status(err.httpStatus).json((0, response_1.fail)(err.message, err.businessCode, req.reqId));
    }
    const e = err;
    const status = e.status ?? e.statusCode ?? 500;
    const msg = process.env.NODE_ENV === 'production'
        ? '服务器内部错误'
        : (e.message || '服务器内部错误');
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
        // 1. 检查JWT密钥是否修改（生产环境必须修改）
        const defaultJwtSecret = 'xzy_fire_platform_secret_key_2024';
        if (process.env.JWT_SECRET === defaultJwtSecret && process.env.NODE_ENV === 'production') {
            logger_1.default.error('[SECURITY] ❌ 错误：生产环境使用默认JWT密钥，请立即修改JWT_SECRET！');
            process.exit(1);
        }
        // 2. 检查数据库密码是否为默认值
        const defaultDbPass = 'Fire_Pass_2024!';
        if (process.env.DB_PASSWORD === defaultDbPass && process.env.NODE_ENV === 'production') {
            logger_1.default.warn('[SECURITY] ⚠️  警告：生产环境使用默认数据库密码，请立即修改！');
        }
        // 连接数据库
        await database_1.default.authenticate();
        logger_1.default.info('[DB] MySQL connected');
        await (0, refreshToken_service_1.ensureRefreshTokenTable)();
        logger_1.default.info('[DB] sys_refresh_tokens 就绪');
        // 同步表结构（仅开发环境允许alter，生产环境强制禁用）
        // 生产环境请使用数据库迁移工具，禁止自动ALTER表
        const isDev = process.env.NODE_ENV === 'development';
        await database_1.default.sync({ alter: isDev, force: false });
        logger_1.default.info(`[DB] Tables synchronized (alter=${isDev})`);
        // 初始化设备心跳服务
        const deviceHeartbeatService = deviceHeartbeat_service_1.DeviceHeartbeatService.getInstance(database_1.default);
        deviceHeartbeatService.initModel();
        deviceHeartbeatService.setCallbacks({
            onDeviceOffline: (device) => {
                logger_1.default.warn(`[DeviceHeartbeat] 设备离线通知: ${device.deviceNo}`);
                // 可在此处触发告警推送、短信通知等
            },
            onDeviceOnline: (device) => {
                logger_1.default.info(`[DeviceHeartbeat] 设备恢复在线: ${device.deviceNo}`);
            },
        });
        deviceHeartbeatService.startScheduler(process.env.HEARTBEAT_CRON || '* * * * *');
        logger_1.default.info('[DeviceHeartbeat] 设备心跳检测已启动');
        // 启动WebSocket
        (0, websocket_1.initWebSocket)(server);
        // 启动IoT网关
        await iot_1.iotGateway.start();
        // 启动GB26875协议服务器（默认 5200，与 app/backend 一致；可用 GB26875_PORT 覆盖）
        await gb26875_server_1.gb26875Server.start();
        logger_1.default.info(`[GB26875] TCP listening ${gb26875_server_1.gb26875Server.getStatus().host}:${gb26875_server_1.gb26875Server.getStatus().port}`);
        // 启动FSCN8001协议服务器（默认 5201，与 app/backend 一致；可用 FSCN8001_PORT 覆盖）
        await fscn8001_server_1.fscn8001Server.start();
        logger_1.default.info(`[FSCN8001] TCP listening ${fscn8001_server_1.fscn8001Server.getStatus().host}:${fscn8001_server_1.fscn8001Server.getStatus().port}`);
        // 启动定时任务
        (0, cron_1.initCronJobs)();
        // 启动HTTP服务
        server.listen(PORT, () => {
            logger_1.default.info(`[Server] Fire Platform running on port ${PORT}`);
            if (process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY !== '1') {
                logger_1.default.warn('[HTTP] 生产环境若经 Nginx 反代，请在 .env 设置 TRUST_PROXY=1，否则限流与日志中的客户端 IP 可能均为代理地址');
            }
        });
    }
    catch (err) {
        logger_1.default.error('[Bootstrap] Failed:', err.message);
        process.exit(1);
    }
}
bootstrap();
/* ── 优雅关闭 ── */
process.on('SIGTERM', async () => {
    logger_1.default.info('[Server] SIGTERM received, shutting down');
    // 关闭GB26875服务器
    await gb26875_server_1.gb26875Server.stop();
    // 关闭FSCN8001服务器
    await fscn8001_server_1.fscn8001Server.stop();
    server.close(() => {
        database_1.default.close();
        process.exit(0);
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map