/**
 * ═══════════════════════════════════════════════════════════════════
 * 新致远智慧消防云平台 - 后端服务入口
 * Node.js + Express + MySQL + WebSocket + IoT Gateway
 * ═══════════════════════════════════════════════════════════════════
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import http from 'http';

import sequelize from '@/config/database';
import logger from '@/config/logger';
import { requestLogger, errorLogger } from '@/middleware/logger';
import routes from '@/routes';
import { initWebSocket } from '@/websocket';
import { iotGateway } from '@/iot';
import { initCronJobs } from '@/cron';
import { NotificationService } from '@/services/notification.service';
import { gb26875Server } from '@/protocols/gb26875.server';

const app = express();

// 初始化通知服务
NotificationService.init();
const PORT = parseInt(process.env.PORT || '3000');

/* ── 中间件 ── */
app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

/* ── 静态文件 ── */
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

/* ── API路由 ── */
app.use('/api', routes);

/* ── 健康检查 ── */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() });
});

/* ── 错误处理 ── */
app.use(errorLogger);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
    timestamp: Date.now(),
  });
});

/* ── 404 ── */
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在', timestamp: Date.now() });
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
    logger.info('[DB] MySQL connected');

    // 同步表结构（仅开发环境允许alter，生产环境强制禁用）
    // 生产环境请使用数据库迁移工具，禁止自动ALTER表
    const isDev = process.env.NODE_ENV === 'development';
    await sequelize.sync({ alter: isDev, force: false });
    logger.info(`[DB] Tables synchronized (alter=${isDev})`);

    // 启动WebSocket
    initWebSocket(server);

    // 启动IoT网关
    await iotGateway.start();

    // 启动GB26875协议服务器（默认 5200，与 app/backend 一致；可用 GB26875_PORT 覆盖）
    await gb26875Server.start();
    logger.info(`[GB26875] TCP listening ${gb26875Server.getStatus().host}:${gb26875Server.getStatus().port}`);

    // 启动定时任务
    initCronJobs();

    // 启动HTTP服务
    server.listen(PORT, () => {
      logger.info(`[Server] Fire Platform running on port ${PORT}`);
    });
  } catch (err: any) {
    logger.error('[Bootstrap] Failed:', err.message);
    process.exit(1);
  }
}

bootstrap();

/* ── 优雅关闭 ── */
process.on('SIGTERM', async () => {
  logger.info('[Server] SIGTERM received, shutting down');

  // 关闭GB26875服务器
  await gb26875Server.stop();

  server.close(() => {
    sequelize.close();
    process.exit(0);
  });
});

export default app;
