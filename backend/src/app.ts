/**
 * ═══════════════════════════════════════════════════════════════════
 * 新致远智慧消防云平台 - 后端服务入口
 * Node.js + Express + PostgreSQL + Redis + TDengine + WebSocket + IoT Gateway
 * ═══════════════════════════════════════════════════════════════════
 */
import 'module-alias/register';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import http from 'http';

import sequelize from '@/config/database';
import logger from '@/config/logger';
import { getCorsOptions } from '@/config/corsOptions';
import { fail, success } from '@/utils/response';
import { HttpError } from '@/utils/httpError';
import { ensureRefreshTokenTable } from '@/services/refreshToken.service';
import { requestLogger, errorLogger } from '@/middleware/logger';
import { globalRateLimiter } from '@/middleware/rateLimit';
import { slowRequestWarning } from '@/middleware/slowRequest';
import { requestTracer } from '@/middleware/requestTracer';
import { sqlInjectionDetector, securityHeaders } from '@/middleware/security';
import routes from '@/routes';
import { initWebSocket } from '@/websocket';
import { iotGateway } from '@/iot';
import { initCronJobs } from '@/cron';
import { NotificationService } from '@/services/notification.service';
import { gb26875Server } from '@/protocols/gb26875.server';
import { fscn8001Server } from '@/protocols/fscn8001.server';
import { DeviceHeartbeatService } from '@/services/deviceHeartbeat.service';
import { initTDengine } from '@/services/tdengine.service';

const app = express();

/* Nginx 等反向代理后正确解析客户端 IP（限流、日志）；仅当 TRUST_PROXY=1 启用 */
if (process.env.TRUST_PROXY === '1') {
  const hops = parseInt(process.env.TRUST_PROXY_HOPS || '1', 10);
  app.set('trust proxy', Number.isFinite(hops) && hops > 0 ? hops : 1);
  logger.info(`[HTTP] trust proxy 已启用，hops=${Number.isFinite(hops) && hops > 0 ? hops : 1}`);
}

// 初始化通知服务
NotificationService.init();
const PORT = parseInt(process.env.PORT || '3000');

/* ── 中间件 ── */
app.use(cors(getCorsOptions()));
app.use(helmet());
app.use(securityHeaders);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(sqlInjectionDetector);
app.use(requestTracer);
app.use(requestLogger);
app.use(slowRequestWarning);
app.use(globalRateLimiter);

/* ── 静态文件 ── */
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

/* ── API路由 ── */
app.use('/api', routes);

/* ── 健康检查 ── */
app.get('/health', (req, res) => {
  res.json(
    success(
      { status: 'ok', version: '2.0.0', timestamp: Date.now() },
      'ok',
      req.reqId
    )
  );
});

/* ── 错误处理 ── */
app.use(errorLogger);
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  if (err instanceof HttpError) {
    return res.status(err.httpStatus).json(fail(err.message, err.businessCode, req.reqId));
  }
  const e = err as { status?: number; statusCode?: number; message?: string };
  const status = e.status ?? e.statusCode ?? 500;
  const msg = process.env.NODE_ENV === 'production' ? '服务器内部错误' : (e.message || '服务器内部错误');
  res.status(status).json(fail(msg, status, req.reqId));
});

/* ── 404 ── */
app.use((req, res) => {
  res.status(404).json(fail('接口不存在', 404, req.reqId));
});

/* ── 进程级异常保护 ── */
process.on('uncaughtException', (err) => {
  logger.error('[Process] uncaughtException:', err);
  // 给日志刷新时间后退出
  setTimeout(() => process.exit(1), 3000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[Process] unhandledRejection:', { reason, promise });
});

/* ── 启动 ── */
const server = http.createServer(app);

async function bootstrap() {
  try {
    // ═══════════════════════════════════════════════════════════════
    // 安全启动检查
    // ═══════════════════════════════════════════════════════════════
    // 1. 检查JWT密钥是否修改（生产环境必须修改）
    const defaultJwtSecret = 'xzy_fire_platform_secret_key_2024';
    if (process.env.JWT_SECRET === defaultJwtSecret && process.env.NODE_ENV === 'production') {
      logger.error('[SECURITY] ❌ 错误：生产环境使用默认JWT密钥，请立即修改JWT_SECRET！');
      process.exit(1);
    }

    // 2. 检查数据库密码是否为默认值
    const defaultDbPass = 'Fire_Pass_2024!';
    if (process.env.DB_PASSWORD === defaultDbPass && process.env.NODE_ENV === 'production') {
      logger.warn('[SECURITY] ⚠️  警告：生产环境使用默认数据库密码，请立即修改！');
    }

    // 连接数据库
    await sequelize.authenticate();
    logger.info('[DB] PostgreSQL connected');

    await ensureRefreshTokenTable();
    logger.info('[DB] sys_refresh_tokens 就绪');

    // 同步表结构（仅开发环境允许alter，生产环境强制禁用）
    // 生产环境请使用数据库迁移工具，禁止自动ALTER表
    const isDev = process.env.NODE_ENV === 'development';
    await sequelize.sync({ alter: isDev, force: false });
    logger.info(`[DB] Tables synchronized (alter=${isDev})`);

    // 初始化 TDengine 时序数据库
    await initTDengine();
    logger.info('[TDengine] 时序数据库已就绪');

    // 初始化设备心跳服务
    const deviceHeartbeatService = DeviceHeartbeatService.getInstance(sequelize);
    deviceHeartbeatService.initModel();
    deviceHeartbeatService.setCallbacks({
      onDeviceOffline: (device) => {
        logger.warn(`[DeviceHeartbeat] 设备离线通知: ${device.deviceNo}`);
        // 可在此处触发告警推送、短信通知等
      },
      onDeviceOnline: (device) => {
        logger.info(`[DeviceHeartbeat] 设备恢复在线: ${device.deviceNo}`);
      },
    });
    deviceHeartbeatService.startScheduler(process.env.HEARTBEAT_CRON || '* * * * *');
    logger.info('[DeviceHeartbeat] 设备心跳检测已启动');

    // 启动WebSocket
    initWebSocket(server);

    // 启动IoT网关
    await iotGateway.start();

    // 启动GB26875协议服务器（默认 5200，与 app/backend 一致；可用 GB26875_PORT 覆盖）
    await gb26875Server.start();
    logger.info(`[GB26875] TCP listening ${gb26875Server.getStatus().host}:${gb26875Server.getStatus().port}`);

    // 启动FSCN8001协议服务器（默认 5201，与 app/backend 一致；可用 FSCN8001_PORT 覆盖）
    await fscn8001Server.start();
    logger.info(`[FSCN8001] TCP listening ${fscn8001Server.getStatus().host}:${fscn8001Server.getStatus().port}`);

    // 启动定时任务
    initCronJobs();

    // 启动HTTP服务
    server.listen(PORT, () => {
      logger.info(`[Server] Fire Platform running on port ${PORT}`);
      if (process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY !== '1') {
        logger.warn(
          '[HTTP] 生产环境若经 Nginx 反代，请在 .env 设置 TRUST_PROXY=1，否则限流与日志中的客户端 IP 可能均为代理地址'
        );
      }
    });
  } catch (err: any) {
    logger.error('[Bootstrap] Failed:', err.message || err);
    console.error('[Bootstrap] RAW ERROR:', err);
    process.exit(1);
  }
}

bootstrap();

/* ── 优雅关闭 ── */
process.on('SIGTERM', async () => {
  logger.info('[Server] SIGTERM received, shutting down');

  // 关闭GB26875服务器
  await gb26875Server.stop();

  // 关闭FSCN8001服务器
  await fscn8001Server.stop();

  server.close(() => {
    sequelize.close();
    process.exit(0);
  });
});

export default app;
