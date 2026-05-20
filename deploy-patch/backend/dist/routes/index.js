"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const response_1 = require("@/utils/response");
const auth_1 = require("@/middleware/auth");
const rateLimit_1 = require("@/middleware/rateLimit");
const auth_controller_1 = require("@/controllers/auth.controller");
const handleController_1 = require("@/utils/handleController");
const system_controller_1 = require("@/controllers/system.controller");
const hikvision4g_controller_1 = require("@/controllers/hikvision4g.controller");
const ctwing_controller_1 = require("@/controllers/ctwing.controller");
const iot_controller_1 = require("@/controllers/iot.controller");
const database_1 = __importDefault(require("@/config/database"));
const redis_1 = __importDefault(require("@/config/redis"));
/* ── 模块级子路由 ── */
const alarm_routes_1 = __importDefault(require("./modules/alarm.routes"));
const controlRoom_routes_1 = __importDefault(require("./modules/controlRoom.routes"));
const device_routes_1 = __importDefault(require("./modules/device.routes"));
const deviceAllocation_routes_1 = __importDefault(require("./modules/deviceAllocation.routes"));
const deviceMaintenance_routes_1 = __importDefault(require("./modules/deviceMaintenance.routes"));
const maintenance_routes_1 = __importDefault(require("./modules/maintenance.routes"));
const video_routes_1 = __importDefault(require("./modules/video.routes"));
const duty_routes_1 = __importDefault(require("./modules/duty.routes"));
const dispatch_routes_1 = __importDefault(require("./modules/dispatch.routes"));
const subsystem_routes_1 = __importDefault(require("./modules/subsystem.routes"));
const patrol_routes_1 = __importDefault(require("./modules/patrol.routes"));
const plan_routes_1 = __importDefault(require("./modules/plan.routes"));
const knowledge_routes_1 = __importDefault(require("./modules/knowledge.routes"));
const iot_routes_1 = __importDefault(require("./modules/iot.routes"));
const training_routes_1 = __importDefault(require("./modules/training.routes"));
const inspection_routes_1 = __importDefault(require("./modules/inspection.routes"));
const system_routes_1 = __importDefault(require("./modules/system.routes"));
const linkage_routes_1 = __importDefault(require("./modules/linkage.routes"));
const ai_routes_1 = __importDefault(require("./modules/ai.routes"));
const smart_routes_1 = __importDefault(require("./modules/smart.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/dashboard.routes"));
const workbench_routes_1 = __importDefault(require("./modules/workbench.routes"));
const deviceControl_routes_1 = __importDefault(require("./modules/deviceControl.routes"));
const unit_routes_1 = __importDefault(require("./modules/unit.routes"));
const floorPlanApp_routes_1 = __importDefault(require("@/routes/floorPlanApp.routes"));
const stub_routes_1 = __importDefault(require("@/routes/stub.routes"));
const router = (0, express_1.Router)();
/* ═══════════════════════════════════════════════════════════════════════════
 * 公开接口
 * ═══════════════════════════════════════════════════════════════════════════ */
const authHandler = (name) => (0, handleController_1.handleController)(`Auth.${String(name)}`, auth_controller_1.AuthController[name]);
router.post('/auth/login', rateLimit_1.authRateLimiter, authHandler('login'));
router.post('/auth/register', rateLimit_1.authRateLimiter, authHandler('register'));
router.post('/auth/refresh', authHandler('refresh'));
router.post('/auth/logout', authHandler('logout'));
router.get('/health', async (req, res) => {
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
router.get('/public/stats', system_controller_1.SystemController.dashboard);
/* ═══════════════════════════════════════════════════════════════════════════
 * 海康4G / CTWing 设备接入（无需JWT，设备/平台直接上报）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.post('/iot/hikvision/report', rateLimit_1.iotRateLimiter, hikvision4g_controller_1.Hikvision4GController.report);
router.post('/iot/hikvision/heartbeat', rateLimit_1.iotHeartbeatLimiter, hikvision4g_controller_1.Hikvision4GController.heartbeat);
router.post('/iot/ctwing/report', rateLimit_1.iotRateLimiter, ctwing_controller_1.CTWingController.report);
router.post('/iot/ctwing/status', rateLimit_1.iotRateLimiter, ctwing_controller_1.CTWingController.status);
/* ═══════════════════════════════════════════════════════════════════════════
 * 认证中间件（此后所有接口需登录）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use(auth_1.authMiddleware);
/* ═══════════════════════════════════════════════════════════════════════════
 * 模块子路由
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use(floorPlanApp_routes_1.default);
router.use(dashboard_routes_1.default);
router.use('/workbench', workbench_routes_1.default);
router.use('/alarms', alarm_routes_1.default);
router.use('/control-rooms', controlRoom_routes_1.default);
router.use('/units', unit_routes_1.default);
router.use('/devices', device_routes_1.default);
router.use('/device-allocations', deviceAllocation_routes_1.default);
router.use('/device-maintenances', deviceMaintenance_routes_1.default);
router.use('/maintenance', maintenance_routes_1.default);
router.use('/patrol', patrol_routes_1.default);
router.use('/plans', plan_routes_1.default);
router.use('/knowledge', knowledge_routes_1.default);
router.use('/iot', iot_routes_1.default);
/* 旧路径兼容：/iot-devices 重定向到 /iot（保留1个版本） */
router.get('/iot-devices/list', iot_controller_1.IoTController.deviceList);
router.post('/iot-devices', iot_controller_1.IoTController.deviceCreate);
router.put('/iot-devices/:id', iot_controller_1.IoTController.deviceUpdate);
router.delete('/iot-devices/:id', iot_controller_1.IoTController.deviceDelete);
router.use('/training', training_routes_1.default);
router.use('/inspections', inspection_routes_1.default);
router.use('/system', system_routes_1.default);
router.use('/linkage', linkage_routes_1.default);
router.use('/ai', ai_routes_1.default);
router.use('/smart', smart_routes_1.default);
router.use('/video', video_routes_1.default);
router.use('/device-control', deviceControl_routes_1.default);
router.use('/duty', duty_routes_1.default);
router.use('/dispatches', dispatch_routes_1.default);
router.use('/subsystems', subsystem_routes_1.default);
/* ═══════════════════════════════════════════════════════════════════════════
 * 兼容旧版路径：Stub 兜底路由（须挂在所有显式路由之后）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use(stub_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map