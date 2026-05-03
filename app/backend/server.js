/**
 * ═══════════════════════════════════════════════════════════════
 * 新致远智慧消防平台 - API 服务入口 v2.1
 * Express + JWT + MySQL 连接池 + Rate Limit + Helmet
 * 优化内容：
 *   1. 请求追踪与性能监控
 *   2. 响应头增强（缓存控制、CORS）
 *   3. 结构化请求日志
 *   4. 慢请求自动告警
 *   5. 健康检查增强（含数据库状态）
 * ═══════════════════════════════════════════════════════════════
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { pool, healthCheck } = require('./utils/db');
const { responseEnhancer } = require('./utils/response');
const { requestTracer, requestLogger, slowRequestWarning } = require('./middleware/requestLog');
const apiRouter = require('./routes/index');
const { startServer: startGb26875Server } = require('./gb26875Server');
const { startServer: startFscn8001Server } = require('./fscn8001Server');
const { initDb } = require('./utils/initDb');

const app = express();
const PORT = process.env.PORT || 5003;
const isProduction = process.env.NODE_ENV === 'production';
const APP_VERSION = '2.1.0';

// ── 静态文件服务（上传的平面图等） ──
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── 安全响应头（Helmet） ──
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// ── 请求体解析 ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── 速率限制（Rate Limit） ──
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isProduction ? 120 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ code: 429, msg: '请求过于频繁，请稍后再试', data: null });
  },
});
app.use(limiter);

// 登录接口更严格的限制
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({ code: 429, msg: '登录尝试次数过多，请 15 分钟后再试', data: null });
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── CORS ──
const corsOrigins = (process.env.CORS_ORIGIN || (isProduction ? '' : '*'))
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (corsOrigins.includes('*')) {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (origin && corsOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ── 请求追踪 ──
app.use(requestTracer);

// ── 响应增强（缓存控制、请求ID注入） ──
app.use(responseEnhancer);

// ── 请求日志 ──
app.use(requestLogger);

// ── 慢请求监控（>1000ms 告警） ──
app.use(slowRequestWarning(1000));

// ── 挂载 API 路由 ──
app.use('/api', apiRouter);

// ── 健康检查（增强版，含数据库状态） ──
app.get('/health', async (req, res) => {
  const dbOk = await healthCheck();
  const memUsage = process.memoryUsage();
  res.status(dbOk ? 200 : 503).json({
    code: dbOk ? 200 : 503,
    msg: dbOk ? 'ok' : '服务降级',
    data: {
      version: APP_VERSION,
      time: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbOk ? 'connected' : 'disconnected',
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      },
    },
  });
});

// ── 根路径 ──
app.get('/', (req, res) => {
  res.json({
    code: 200,
    msg: '智慧消防平台 API 服务运行中',
    data: { version: APP_VERSION, time: new Date().toISOString() },
  });
});

// ── 404 兜底 ──
app.use((req, res) => {
  res.status(404).json({ code: 404, msg: '接口不存在', data: null });
});

// ── express-validator 错误处理 ──
app.use((err, req, res, next) => {
  if (Array.isArray(err.errors)) {
    const msgs = err.errors.map(e => e.msg).join('; ');
    return res.status(400).json({ code: 400, msg: '参数校验失败: ' + msgs, data: null });
  }
  next(err);
});

// ── 全局错误处理中间件 ──
app.use((err, req, res, next) => {
  console.error(`[${req.reqId || 'unknown'}] unhandled error:`, err);
  const status = err.status || err.statusCode || 500;
  const message = isProduction ? '服务器内部错误' : (err.message || '服务器内部错误');
  res.status(status).json({ code: status, msg: message, data: null });
});

// ── 优雅关闭 ──
process.on('SIGTERM', async () => {
  console.log('[Server] 收到 SIGTERM，开始优雅关闭...');
  await pool.end();
  console.log('[Server] 数据库连接池已关闭');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] 收到 SIGINT，开始优雅关闭...');
  await pool.end();
  console.log('[Server] 数据库连接池已关闭');
  process.exit(0);
});

// ── 启动 HTTP 服务 ──
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[Server] 智慧消防平台 API 服务已启动: http://0.0.0.0:${PORT}`);
  console.log(`[Server] 版本: ${APP_VERSION}`);
  console.log(`[Server] 环境: ${isProduction ? 'production' : 'development'}`);
  console.log(`[Server] 速率限制: ${isProduction ? '120' : '300'} 次/分钟`);
  // 启动后异步初始化数据库表结构（不阻塞服务启动）
  try {
    await initDb();
  } catch (err) {
    console.error('[Server] 数据库初始化异常:', err.message);
  }
});

// ── 启动协议 TCP 服务器 ──
try { startGb26875Server(); } catch (e) { console.warn('[Server] GB26875 协议服务器启动失败:', e.message); }
try { startFscn8001Server(); } catch (e) { console.warn('[Server] FSCN8001 协议服务器启动失败:', e.message); }
