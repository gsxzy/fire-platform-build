"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("@/controllers/user.controller");
const role_controller_1 = require("@/controllers/role.controller");
const system_controller_1 = require("@/controllers/system.controller");
const auth_controller_1 = require("@/controllers/auth.controller");
const permission_1 = require("@/middleware/permission");
const handleController_1 = require("@/utils/handleController");
const metrics_1 = require("@/utils/metrics");
const response_1 = require("@/utils/response");
const database_1 = __importDefault(require("@/config/database"));
const redis_1 = __importDefault(require("@/config/redis"));
const logger_1 = __importDefault(require("@/config/logger"));
const websocket_service_1 = require("@/websocket/websocket.service");
const processMetrics_1 = require("@/utils/processMetrics");
const router = (0, express_1.Router)();
const ah = (name) => (0, handleController_1.handleController)(`Auth.${String(name)}`, auth_controller_1.AuthController[name]);
const uh = (name) => (0, handleController_1.handleController)(`User.${String(name)}`, user_controller_1.UserController[name]);
const rh = (name) => (0, handleController_1.handleController)(`Role.${String(name)}`, role_controller_1.RoleController[name]);
const sh = (name) => (0, handleController_1.handleController)(`System.${String(name)}`, system_controller_1.SystemController[name]);
// 用户管理
router.get('/users', (0, permission_1.requirePermission)('system:user:view'), uh('list'));
router.get('/users/list', (0, permission_1.requirePermission)('system:user:view'), uh('list'));
router.post('/users', (0, permission_1.requirePermission)('system:user:create'), uh('create'));
router.put('/users/:id', (0, permission_1.requirePermission)('system:user:edit'), uh('update'));
router.delete('/users/:id', (0, permission_1.requirePermission)('system:user:delete'), uh('delete'));
router.put('/users/:id/reset-password', (0, permission_1.requirePermission)('system:user:edit'), uh('resetPassword'));
// 角色权限
router.get('/roles', (0, permission_1.requirePermission)('system:role:view'), rh('list'));
router.post('/roles', (0, permission_1.requirePermission)('system:role:create'), rh('create'));
router.put('/roles/:id', (0, permission_1.requirePermission)('system:role:edit'), rh('update'));
router.delete('/roles/:id', (0, permission_1.requirePermission)('system:role:delete'), rh('delete'));
router.get('/permissions', (0, permission_1.requirePermission)('system:role:view'), sh('permList'));
// 组织架构
router.get('/departments', (0, permission_1.requirePermission)('system:view'), sh('deptList'));
router.post('/departments', (0, permission_1.requirePermission)('system:view'), sh('deptCreate'));
router.put('/departments/:id', (0, permission_1.requirePermission)('system:view'), sh('deptUpdate'));
router.delete('/departments/:id', (0, permission_1.requirePermission)('system:view'), sh('deptDelete'));
// 个人中心
router.get('/auth/profile', ah('profile'));
router.put('/auth/profile', ah('updateProfile'));
router.put('/auth/password', ah('changePassword'));
// 系统配置
router.get('/config', (0, permission_1.requirePermission)('system:view'), sh('configList'));
router.post('/config', (0, permission_1.requirePermission)('system:view'), sh('configSet'));
router.get('/logs', (0, permission_1.requirePermission)('system:view'), sh('logList'));
router.get('/notify-templates', (0, permission_1.requirePermission)('system:view'), sh('notifyTemplateList'));
router.post('/notify-templates', (0, permission_1.requirePermission)('system:view'), sh('notifyTemplateCreate'));
router.put('/notify-templates/:id', (0, permission_1.requirePermission)('system:view'), sh('notifyTemplateUpdate'));
router.delete('/notify-templates/:id', (0, permission_1.requirePermission)('system:view'), sh('notifyTemplateDelete'));
router.get('/screens', (0, permission_1.requirePermission)('system:view'), sh('screenList'));
router.post('/screens', (0, permission_1.requirePermission)('system:view'), sh('screenSave'));
router.get('/modules', sh('modules'));
router.put('/modules/toggle', (0, permission_1.requirePermission)('system:view'), sh('toggleModule'));
router.get('/dashboard', sh('dashboard'));
// 人员管理
router.get('/personnel', (0, permission_1.requirePermission)('system:admin'), sh('personnelList'));
router.post('/personnel', (0, permission_1.requirePermission)('system:admin'), sh('personnelCreate'));
router.put('/personnel/:id', (0, permission_1.requirePermission)('system:admin'), sh('personnelUpdate'));
router.delete('/personnel/:id', (0, permission_1.requirePermission)('system:admin'), sh('personnelDelete'));
// 系统监控
router.get('/monitor', (0, permission_1.requirePermission)('system:view'), sh('monitor'));
// 系统实时状态（管理员可见）
router.get('/status', (0, permission_1.requirePermission)('system:admin'), async (req, res) => {
    const mem = process.memoryUsage();
    const wsClients = websocket_service_1.WebSocketService.clients?.size || 0;
    const dbConfig = database_1.default.options?.pool || {};
    // 获取连接池实时状态
    const pool = database_1.default.connectionManager?.pool;
    const poolStats = pool ? {
        current: pool.size || 0,
        available: pool.available || 0,
        borrowed: pool.borrowed || 0,
        pending: pool.pending || 0,
        max: pool.max || dbConfig.max,
        min: pool.min || dbConfig.min,
        utilization: pool.max ? Math.round(((pool.borrowed || 0) / pool.max) * 100) : 0,
    } : null;
    // Redis 连接状态
    let redisStatus = 'unknown';
    try {
        await redis_1.default.ping();
        redisStatus = 'connected';
    }
    catch {
        redisStatus = 'disconnected';
    }
    // 进程级指标
    const procMetrics = await processMetrics_1.processMetrics.snapshot();
    res.json((0, response_1.success)({
        process: {
            uptime: Math.round(process.uptime()),
            pid: process.pid,
            nodeVersion: process.version,
            platform: process.platform,
            eventLoopLagMs: procMetrics.eventLoopLagMs,
            activeHandles: procMetrics.process.activeHandles,
            activeRequests: procMetrics.process.activeRequests,
        },
        memory: {
            rss: Math.round(mem.rss / 1024 / 1024),
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
            external: Math.round(mem.external / 1024 / 1024),
            processPercent: procMetrics.memory.processPercent,
            systemTotalMB: procMetrics.memory.systemTotalMB,
            systemFreeMB: procMetrics.memory.systemFreeMB,
        },
        cpu: procMetrics.cpuUsage,
        connections: {
            websocketClients: wsClients,
        },
        database: {
            poolMin: dbConfig.min,
            poolMax: dbConfig.max,
            poolIdle: dbConfig.idle,
            poolAcquire: dbConfig.acquire,
            poolStats,
        },
        redis: {
            status: redisStatus,
        },
    }, '查询成功', req.reqId));
});
// 进程级详细指标（管理员可见）
router.get('/process-metrics', (0, permission_1.requirePermission)('system:admin'), async (req, res) => {
    const snapshot = await processMetrics_1.processMetrics.snapshot();
    res.json((0, response_1.success)(snapshot, '查询成功', req.reqId));
});
// 日志级别动态调整（管理员可见）
router.put('/log-level', (0, permission_1.requirePermission)('system:admin'), (req, res) => {
    const { level } = req.body;
    const validLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
    if (!level || !validLevels.includes(level)) {
        return res.status(400).json({ code: 400, message: `无效日志级别，有效值: ${validLevels.join(', ')}`, reqId: req.reqId });
    }
    logger_1.default.level = level;
    logger_1.default.info(`[System] 日志级别已调整为 ${level}`);
    res.json((0, response_1.success)({ level }, '日志级别已调整', req.reqId));
});
// 请求指标（管理员可见）
router.get('/metrics', (0, permission_1.requirePermission)('system:admin'), (req, res) => {
    res.json((0, response_1.success)(metrics_1.metrics.snapshot(), '查询成功', req.reqId));
});
router.post('/metrics/reset', (0, permission_1.requirePermission)('system:admin'), (req, res) => {
    metrics_1.metrics.reset();
    res.json((0, response_1.success)(null, '指标已重置', req.reqId));
});
exports.default = router;
//# sourceMappingURL=system.routes.js.map