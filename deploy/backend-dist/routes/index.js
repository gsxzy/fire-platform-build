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
const user_controller_1 = require("@/controllers/user.controller");
const role_controller_1 = require("@/controllers/role.controller");
const unit_controller_1 = require("@/controllers/unit.controller");
const device_controller_1 = require("@/controllers/device.controller");
const deviceAllocation_controller_1 = require("@/controllers/deviceAllocation.controller");
const deviceMaintenance_controller_1 = require("@/controllers/deviceMaintenance.controller");
const patrol_controller_1 = require("@/controllers/patrol.controller");
const plan_controller_1 = require("@/controllers/plan.controller");
const knowledge_controller_1 = require("@/controllers/knowledge.controller");
const iot_controller_1 = require("@/controllers/iot.controller");
const ai_controller_1 = require("@/controllers/ai.controller");
const training_controller_1 = require("@/controllers/training.controller");
const inspection_controller_1 = require("@/controllers/inspection.controller");
const system_controller_1 = require("@/controllers/system.controller");
const dashboard_controller_1 = require("@/controllers/dashboard.controller");
const duty_controller_1 = require("@/controllers/duty.controller");
const deviceControl_controller_1 = require("@/controllers/deviceControl.controller");
const aiDecision_controller_1 = require("@/controllers/aiDecision.controller");
const iotProtocol_controller_1 = require("@/controllers/iotProtocol.controller");
const linkage_controller_1 = require("@/controllers/linkage.controller");
const aiLearning_controller_1 = require("@/controllers/aiLearning.controller");
const hikvision4g_controller_1 = require("@/controllers/hikvision4g.controller");
const ctwing_controller_1 = require("@/controllers/ctwing.controller");
const floorPlanApp_routes_1 = __importDefault(require("@/routes/floorPlanApp.routes"));
const stub_routes_1 = __importDefault(require("@/routes/stub.routes"));
/* ── 模块级子路由 ── */
const alarm_routes_1 = __importDefault(require("./modules/alarm.routes"));
const controlRoom_routes_1 = __importDefault(require("./modules/controlRoom.routes"));
const device_routes_1 = __importDefault(require("./modules/device.routes"));
const maintenance_routes_1 = __importDefault(require("./modules/maintenance.routes"));
const video_routes_1 = __importDefault(require("./modules/video.routes"));
const router = (0, express_1.Router)();
/* ═══════════════════════════════════════════════════════════════════════════
 * 公开接口
 * ═══════════════════════════════════════════════════════════════════════════ */
router.post('/auth/login', rateLimit_1.authRateLimiter, auth_controller_1.AuthController.login);
router.post('/auth/register', rateLimit_1.authRateLimiter, auth_controller_1.AuthController.register);
router.post('/auth/refresh', auth_controller_1.AuthController.refresh);
router.post('/auth/logout', auth_controller_1.AuthController.logout);
router.get('/health', (req, res) => res.json((0, response_1.success)({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() }, 'ok', req.reqId)));
router.get('/public/stats', system_controller_1.SystemController.dashboard);
/* ═══════════════════════════════════════════════════════════════════════════
 * 海康4G IoT 设备接入（无需JWT，设备直接4G上报）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.post('/iot/hikvision/report', hikvision4g_controller_1.Hikvision4GController.report);
router.post('/iot/hikvision/heartbeat', hikvision4g_controller_1.Hikvision4GController.heartbeat);
/* ═══════════════════════════════════════════════════════════════════════════
 * CTWing（天翼物联网平台）设备接入（无需JWT，平台HTTP推送）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.post('/iot/ctwing/report', ctwing_controller_1.CTWingController.report);
router.post('/iot/ctwing/status', ctwing_controller_1.CTWingController.status);
/* ═══════════════════════════════════════════════════════════════════════════
 * 认证中间件（此后所有接口需登录）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use(auth_1.authMiddleware);
/* ═══════════════════════════════════════════════════════════════════════════
 * 平面图
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use(floorPlanApp_routes_1.default);
/* ═══════════════════════════════════════════════════════════════════════════
 * 1. 工作台
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/workbench', dashboard_controller_1.DashboardController.workbench);
/* ═══════════════════════════════════════════════════════════════════════════
 * 2. 监控中心
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/monitor/overview', dashboard_controller_1.DashboardController.monitorOverview);
/* ═══════════════════════════════════════════════════════════════════════════
 * 3. 告警中心（子路由）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use('/alarms', alarm_routes_1.default);
/* ═══════════════════════════════════════════════════════════════════════════
 * 4. 数智消控室（子路由）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use('/control-rooms', controlRoom_routes_1.default);
/* ═══════════════════════════════════════════════════════════════════════════
 * 5. 值守中心
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/duty/schedules', duty_controller_1.DutyController.scheduleList);
router.get('/duty/schedules/:id', duty_controller_1.DutyController.scheduleById);
router.post('/duty/schedules', duty_controller_1.DutyController.scheduleCreate);
router.put('/duty/schedules/:id', duty_controller_1.DutyController.scheduleUpdate);
router.delete('/duty/schedules/:id', duty_controller_1.DutyController.scheduleDelete);
router.post('/duty/check-in', duty_controller_1.DutyController.checkIn);
router.post('/duty/check-out', duty_controller_1.DutyController.checkOut);
router.get('/duty/logs', duty_controller_1.DutyController.logList);
router.get('/duty/current', duty_controller_1.DutyController.currentDuty);
router.get('/duty/absence-alert', duty_controller_1.DutyController.absenceAlert);
/* ═══════════════════════════════════════════════════════════════════════════
 * 6. 子系统监控
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/subsystem/water', device_controller_1.DeviceController.list);
router.get('/subsystem/elec', device_controller_1.DeviceController.list);
router.get('/subsystem/vent', device_controller_1.DeviceController.list);
/* ═══════════════════════════════════════════════════════════════════════════
 * 7. 单位管理
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/units/list', unit_controller_1.UnitController.list);
router.post('/units', unit_controller_1.UnitController.create);
router.put('/units/:id', unit_controller_1.UnitController.update);
router.delete('/units/:id', unit_controller_1.UnitController.delete);
router.get('/units/stats', unit_controller_1.UnitController.stats);
/* ═══════════════════════════════════════════════════════════════════════════
 * 8. 设备管理（子路由 + 独立前缀）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use('/devices', device_routes_1.default);
// 设备分配（独立前缀，保留在聚合层）
router.get('/device-allocations/pending', deviceAllocation_controller_1.DeviceAllocationController.listPending);
router.post('/device-allocations/allocate', deviceAllocation_controller_1.DeviceAllocationController.allocate);
router.post('/device-allocations/unallocate', deviceAllocation_controller_1.DeviceAllocationController.unallocate);
router.post('/device-allocations/reallocate', deviceAllocation_controller_1.DeviceAllocationController.reallocate);
router.get('/device-allocations/list', deviceAllocation_controller_1.DeviceAllocationController.listLogs);
// 设备维护记录（独立前缀，保留在聚合层）
router.get('/device-maintenances/stats', deviceMaintenance_controller_1.DeviceMaintenanceController.stats);
router.get('/device-maintenances/list', deviceMaintenance_controller_1.DeviceMaintenanceController.list);
router.post('/device-maintenances', deviceMaintenance_controller_1.DeviceMaintenanceController.create);
router.put('/device-maintenances/:id', deviceMaintenance_controller_1.DeviceMaintenanceController.update);
router.delete('/device-maintenances/:id', deviceMaintenance_controller_1.DeviceMaintenanceController.delete);
/* ═══════════════════════════════════════════════════════════════════════════
 * 9. 消防维保管理（子路由）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use('/maintenance', maintenance_routes_1.default);
/* ═══════════════════════════════════════════════════════════════════════════
 * 10. 巡检管理
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/patrol/plans', patrol_controller_1.PatrolController.planList);
router.post('/patrol/plans', patrol_controller_1.PatrolController.planCreate);
router.put('/patrol/plans/:id', patrol_controller_1.PatrolController.planUpdate);
router.delete('/patrol/plans/:id', patrol_controller_1.PatrolController.planDelete);
router.get('/patrol/records', patrol_controller_1.PatrolController.recordList);
router.get('/patrol/records/:id', patrol_controller_1.PatrolController.recordById);
router.post('/patrol/records', patrol_controller_1.PatrolController.recordCreate);
router.put('/patrol/records/:id', patrol_controller_1.PatrolController.recordUpdate);
router.delete('/patrol/records/:id', patrol_controller_1.PatrolController.recordDelete);
router.get('/patrol/hazards', patrol_controller_1.PatrolController.hazardList);
router.post('/patrol/hazards', patrol_controller_1.PatrolController.hazardCreate);
router.put('/patrol/hazards/:id', patrol_controller_1.PatrolController.hazardUpdate);
router.delete('/patrol/hazards/:id', patrol_controller_1.PatrolController.hazardDelete);
router.put('/patrol/hazards/:id/rectify', patrol_controller_1.PatrolController.hazardRectify);
/* ═══════════════════════════════════════════════════════════════════════════
 * 11. 应急预案
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/plans', plan_controller_1.PlanController.planList);
router.post('/plans', plan_controller_1.PlanController.planCreate);
router.put('/plans/:id', plan_controller_1.PlanController.planUpdate);
router.delete('/plans/:id', plan_controller_1.PlanController.planDelete);
router.get('/drills', plan_controller_1.PlanController.drillList);
router.post('/drills', plan_controller_1.PlanController.drillCreate);
router.put('/drills/:id', plan_controller_1.PlanController.drillUpdate);
router.delete('/drills/:id', plan_controller_1.PlanController.drillDelete);
/* ═══════════════════════════════════════════════════════════════════════════
 * 12. GIS 地图
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/gis/points', dashboard_controller_1.DashboardController.gisPoints);
router.get('/gis/situation', dashboard_controller_1.DashboardController.gisSituation);
router.get('/gis/alarm-points', dashboard_controller_1.DashboardController.gisAlarmPoints);
/* ═══════════════════════════════════════════════════════════════════════════
 * 13. 数据分析
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/analysis/device', dashboard_controller_1.DashboardController.deviceAnalysis);
router.get('/analysis/alarm', dashboard_controller_1.DashboardController.alarmAnalysis);
router.get('/analysis/maintenance', dashboard_controller_1.DashboardController.maintenanceAnalysis);
router.get('/analysis/hazard', dashboard_controller_1.DashboardController.hazardAnalysis);
router.get('/analysis/patrol', dashboard_controller_1.DashboardController.patrolCompletion);
/* ═══════════════════════════════════════════════════════════════════════════
 * 14. 报表管理
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/reports/daily', dashboard_controller_1.DashboardController.dailyReport);
router.get('/reports/weekly', dashboard_controller_1.DashboardController.weeklyReport);
router.get('/reports/monthly', dashboard_controller_1.DashboardController.monthlyReport);
router.get('/reports/device', dashboard_controller_1.DashboardController.deviceReport);
router.get('/reports/maintenance', dashboard_controller_1.DashboardController.maintenanceReport);
router.get('/reports/patrol', dashboard_controller_1.DashboardController.patrolReport);
/* ═══════════════════════════════════════════════════════════════════════════
 * 15. 消防知识库
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/knowledge', knowledge_controller_1.KnowledgeController.list);
router.post('/knowledge', knowledge_controller_1.KnowledgeController.create);
router.put('/knowledge/:id', knowledge_controller_1.KnowledgeController.update);
router.delete('/knowledge/:id', knowledge_controller_1.KnowledgeController.delete);
router.get('/knowledge/categories', knowledge_controller_1.KnowledgeController.categories);
/* ═══════════════════════════════════════════════════════════════════════════
 * 16. 大屏模式
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/bigscreen/data', dashboard_controller_1.DashboardController.bigScreen);
/* ═══════════════════════════════════════════════════════════════════════════
 * 17. 设备反控
 * ═══════════════════════════════════════════════════════════════════════════ */
router.post('/device-control/command', deviceControl_controller_1.DeviceControlController.sendCommand);
router.post('/device-control/start-stop', deviceControl_controller_1.DeviceControlController.remoteStartStop);
router.post('/device-control/reset', deviceControl_controller_1.DeviceControlController.remoteReset);
router.post('/device-control/silence', deviceControl_controller_1.DeviceControlController.silence);
router.post('/device-control/batch', deviceControl_controller_1.DeviceControlController.batchCommand);
router.get('/device-control/history', deviceControl_controller_1.DeviceControlController.commandHistory);
/* ═══════════════════════════════════════════════════════════════════════════
 * 18. AI 决策中心
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/ai/decisions', ai_controller_1.AIController.decisionList);
router.post('/ai/decisions', ai_controller_1.AIController.decisionCreate);
router.post('/ai/risk-analysis', aiDecision_controller_1.AIDecisionController.riskAnalysis);
router.get('/ai/false-alarm/:alarmId', aiDecision_controller_1.AIDecisionController.filterFalseAlarm);
router.get('/ai/situation', aiDecision_controller_1.AIDecisionController.situationAssessment);
router.post('/ai/smart-alert', aiDecision_controller_1.AIDecisionController.generateSmartAlert);
router.get('/ai/trend', aiDecision_controller_1.AIDecisionController.trendAnalysis);
router.get('/ai/alerts', ai_controller_1.AIController.alertList);
router.put('/ai/alerts/:id/confirm', ai_controller_1.AIController.alertConfirm);
router.put('/ai/alerts/:id/handle', ai_controller_1.AIController.alertHandle);
/* ═══════════════════════════════════════════════════════════════════════════
 * 19. IoT 设备接入（统一走 /iot-devices，/iot/devices 保留兼容）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/iot-devices/list', iot_controller_1.IoTController.deviceList);
router.post('/iot-devices', iot_controller_1.IoTController.deviceCreate);
router.put('/iot-devices/:id', iot_controller_1.IoTController.deviceUpdate);
router.delete('/iot-devices/:id', iot_controller_1.IoTController.deviceDelete);
/* 旧路径兼容（前端已统一使用 /iot-devices，保留 1 个版本防止外部集成断裂） */
router.get('/iot/devices', iot_controller_1.IoTController.deviceList);
router.get('/iot/protocols', iot_controller_1.IoTController.protocolList);
router.post('/iot/protocols', iot_controller_1.IoTController.protocolCreate);
router.put('/iot/protocols/:id', iot_controller_1.IoTController.protocolUpdate);
router.delete('/iot/protocols/:id', iot_controller_1.IoTController.protocolDelete);
router.get('/iot/pipelines', iot_controller_1.IoTController.pipelineList);
router.post('/iot/pipelines', iot_controller_1.IoTController.pipelineCreate);
router.post('/iot/modbus/read', iotProtocol_controller_1.IoTProtocolController.readModbus);
router.post('/iot/snmp/read', iotProtocol_controller_1.IoTProtocolController.readSNMP);
router.post('/iot/control', iotProtocol_controller_1.IoTProtocolController.sendControl);
router.post('/iot/batch-read', iotProtocol_controller_1.IoTProtocolController.batchRead);
router.post('/iot/mqtt/parse', iotProtocol_controller_1.IoTProtocolController.parseMQTT);
router.get('/iot/hikvision/devices/:sn/data', hikvision4g_controller_1.Hikvision4GController.getDeviceData);
router.post('/iot/hikvision/batch-data', hikvision4g_controller_1.Hikvision4GController.batchDeviceData);
/* ═══════════════════════════════════════════════════════════════════════════
 * 20. 智能预警
 * ═══════════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════════
 * 21. 培训考核
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/training/courses', training_controller_1.TrainingController.courseList);
router.post('/training/courses', training_controller_1.TrainingController.courseCreate);
router.put('/training/courses/:id', training_controller_1.TrainingController.courseUpdate);
router.delete('/training/courses/:id', training_controller_1.TrainingController.courseDelete);
router.get('/training/exams', training_controller_1.TrainingController.examList);
router.post('/training/exams', training_controller_1.TrainingController.examCreate);
/* ═══════════════════════════════════════════════════════════════════════════
 * 22. 消防检查
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/inspections', inspection_controller_1.InspectionController.list);
router.post('/inspections', inspection_controller_1.InspectionController.create);
router.put('/inspections/:id', inspection_controller_1.InspectionController.update);
router.delete('/inspections/:id', inspection_controller_1.InspectionController.delete);
/* ═══════════════════════════════════════════════════════════════════════════
 * 23. 系统管理
 * ═══════════════════════════════════════════════════════════════════════════ */
// 用户管理
router.get('/users', user_controller_1.UserController.list);
router.get('/users/list', user_controller_1.UserController.list);
router.post('/users', user_controller_1.UserController.create);
router.put('/users/:id', user_controller_1.UserController.update);
router.delete('/users/:id', user_controller_1.UserController.delete);
router.put('/users/:id/reset-password', user_controller_1.UserController.resetPassword);
// 角色权限
router.get('/roles', role_controller_1.RoleController.list);
router.post('/roles', role_controller_1.RoleController.create);
router.put('/roles/:id', role_controller_1.RoleController.update);
router.delete('/roles/:id', role_controller_1.RoleController.delete);
router.get('/permissions', system_controller_1.SystemController.permList);
// 组织架构
router.get('/departments', system_controller_1.SystemController.deptList);
router.post('/departments', system_controller_1.SystemController.deptCreate);
router.put('/departments/:id', system_controller_1.SystemController.deptUpdate);
router.delete('/departments/:id', system_controller_1.SystemController.deptDelete);
// 个人中心
router.get('/auth/profile', auth_controller_1.AuthController.profile);
router.put('/auth/profile', auth_controller_1.AuthController.updateProfile);
router.put('/auth/password', auth_controller_1.AuthController.changePassword);
// 系统配置
router.get('/system/config', system_controller_1.SystemController.configList);
router.post('/system/config', system_controller_1.SystemController.configSet);
router.get('/system/logs', system_controller_1.SystemController.logList);
router.get('/system/notify-templates', system_controller_1.SystemController.notifyTemplateList);
router.post('/system/notify-templates', system_controller_1.SystemController.notifyTemplateCreate);
router.put('/system/notify-templates/:id', system_controller_1.SystemController.notifyTemplateUpdate);
router.delete('/system/notify-templates/:id', system_controller_1.SystemController.notifyTemplateDelete);
router.get('/system/screens', system_controller_1.SystemController.screenList);
router.post('/system/screens', system_controller_1.SystemController.screenSave);
router.get('/system/modules', system_controller_1.SystemController.modules);
router.put('/system/modules/toggle', system_controller_1.SystemController.toggleModule);
router.get('/system/dashboard', system_controller_1.SystemController.dashboard);
/* ═══════════════════════════════════════════════════════════════════════════
 * 24. 安消联动
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/linkage/rules', linkage_controller_1.LinkageController.list);
router.post('/linkage/rules', linkage_controller_1.LinkageController.create);
router.put('/linkage/rules/:id', linkage_controller_1.LinkageController.update);
router.delete('/linkage/rules/:id', linkage_controller_1.LinkageController.delete);
router.post('/linkage/rules/:id/trigger', linkage_controller_1.LinkageController.manualTrigger);
router.get('/linkage/status/:alarmId', linkage_controller_1.LinkageController.getStatus);
router.post('/linkage/preset', linkage_controller_1.LinkageController.applyPreset);
router.get('/linkage/records', linkage_controller_1.LinkageController.getRecords);
/* ═══════════════════════════════════════════════════════════════════════════
 * 25. 视频监控（子路由）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use('/video', video_routes_1.default);
/* ═══════════════════════════════════════════════════════════════════════════
 * 26. AI 故障自学习
 * ═══════════════════════════════════════════════════════════════════════════ */
router.post('/ai/learn', aiLearning_controller_1.AILearningController.record);
router.get('/ai/diagnose', aiLearning_controller_1.AILearningController.diagnose);
router.get('/ai/stats/type', aiLearning_controller_1.AILearningController.statsByType);
router.get('/ai/stats/device', aiLearning_controller_1.AILearningController.statsByDevice);
router.get('/ai/learn/list', aiLearning_controller_1.AILearningController.list);
router.put('/ai/learn/:id', aiLearning_controller_1.AILearningController.update);
/* ═══════════════════════════════════════════════════════════════════════════
 * 兼容旧版前端路径：Stub 兜底路由（须挂在所有显式路由之后）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use(stub_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map