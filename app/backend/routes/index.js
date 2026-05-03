/**
 * ═══════════════════════════════════════════════════════════════
 * API 路由聚合入口 v2.2
 * 优化内容：
 *   1. 认证路由独立为 auth.js 模块
 *   2. 仪表盘路由独立为 dashboard.js 模块
 *   3. 视频路由独立为 video.js 模块（WVP-PRO 代理）
 *   4. 全局 JWT 认证中间件保护所有路由
 *   5. 遗留业务路由仍由 fireHostApi.js 提供（逐步迁移中）
 * ═══════════════════════════════════════════════════════════════
 */
const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const authRouter = require('./auth');
const dashboardRouter = require('./dashboard');
const videoRouter = require('./video');
const unitRouter = require('./unit');
const deviceRouter = require('./device');
const deviceAllocationRouter = require('./deviceAllocation');
const deviceAccessRouter = require('./deviceAccess');
const floorPlanRouter = require('./floorPlan');
const deviceControlRouter = require('./deviceControl');
const stubRouter = require('./stub');
const legacyRouter = require('../fireHostApi');

const router = express.Router();

// 公开路由（无需认证）
router.use('/auth', authRouter);

// 全局 JWT 认证中间件（此后的路由都需要认证）
router.use(authMiddleware);

// 受保护路由
router.use('/dashboard', dashboardRouter);
router.use('/video', videoRouter);
router.use(unitRouter);           // 单位管理路由
router.use(deviceRouter);         // 设备档案/配置/维护路由
router.use(deviceAllocationRouter); // 设备分配路由
router.use(deviceAccessRouter);     // 设备接入管理路由
router.use(floorPlanRouter);      // 平面图路由
router.use(deviceControlRouter);  // 设备控制路由（/devices/:id/command）
router.use(stubRouter);             // Stub 路由（为缺失模块提供基础CRUD）

// 挂载遗留业务路由（兼容旧体系）
// 注意：fireHostApi.js 内部已有自己的认证逻辑，这里叠加 authMiddleware 是安全的
router.use(legacyRouter);

module.exports = router;
