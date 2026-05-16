import { Router } from 'express';
import { success } from '@/utils/response';
import { authMiddleware } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimit';
import { AuthController } from '@/controllers/auth.controller';
import { UserController } from '@/controllers/user.controller';
import { RoleController } from '@/controllers/role.controller';
import { UnitController } from '@/controllers/unit.controller';
import { DeviceController } from '@/controllers/device.controller';
import { DeviceAllocationController } from '@/controllers/deviceAllocation.controller';
import { DeviceMaintenanceController } from '@/controllers/deviceMaintenance.controller';
import { PatrolController } from '@/controllers/patrol.controller';
import { PlanController } from '@/controllers/plan.controller';
import { KnowledgeController } from '@/controllers/knowledge.controller';
import { IoTController } from '@/controllers/iot.controller';
import { AIController } from '@/controllers/ai.controller';
import { TrainingController } from '@/controllers/training.controller';
import { InspectionController } from '@/controllers/inspection.controller';
import { SystemController } from '@/controllers/system.controller';
import { DashboardController } from '@/controllers/dashboard.controller';
import { DutyController } from '@/controllers/duty.controller';
import { DeviceControlController } from '@/controllers/deviceControl.controller';
import { AIDecisionController } from '@/controllers/aiDecision.controller';
import { IoTProtocolController } from '@/controllers/iotProtocol.controller';
import { LinkageController } from '@/controllers/linkage.controller';
import { AILearningController } from '@/controllers/aiLearning.controller';
import { Hikvision4GController } from '@/controllers/hikvision4g.controller';
import { CTWingController } from '@/controllers/ctwing.controller';
import floorPlanAppRouter from '@/routes/floorPlanApp.routes';
import stubRouter from '@/routes/stub.routes';

/* ── 模块级子路由 ── */
import alarmRoutes from './modules/alarm.routes';
import controlRoomRoutes from './modules/controlRoom.routes';
import deviceRoutes from './modules/device.routes';
import maintenanceRoutes from './modules/maintenance.routes';
import videoRoutes from './modules/video.routes';

const router = Router();

/* ═══════════════════════════════════════════════════════════════════════════
 * 公开接口
 * ═══════════════════════════════════════════════════════════════════════════ */
router.post('/auth/login', authRateLimiter, AuthController.login);
router.post('/auth/register', authRateLimiter, AuthController.register);
router.post('/auth/refresh', AuthController.refresh);
router.post('/auth/logout', AuthController.logout);
router.get('/health', (req, res) =>
  res.json(success({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() }, 'ok', req.reqId))
);
router.get('/public/stats', SystemController.dashboard);

/* ═══════════════════════════════════════════════════════════════════════════
 * 海康4G IoT 设备接入（无需JWT，设备直接4G上报）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.post('/iot/hikvision/report', Hikvision4GController.report);
router.post('/iot/hikvision/heartbeat', Hikvision4GController.heartbeat);

/* ═══════════════════════════════════════════════════════════════════════════
 * CTWing（天翼物联网平台）设备接入（无需JWT，平台HTTP推送）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.post('/iot/ctwing/report', CTWingController.report);
router.post('/iot/ctwing/status', CTWingController.status);

/* ═══════════════════════════════════════════════════════════════════════════
 * 认证中间件（此后所有接口需登录）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use(authMiddleware);

/* ═══════════════════════════════════════════════════════════════════════════
 * 平面图
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use(floorPlanAppRouter);

/* ═══════════════════════════════════════════════════════════════════════════
 * 1. 工作台
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/workbench', DashboardController.workbench);

/* ═══════════════════════════════════════════════════════════════════════════
 * 2. 监控中心
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/monitor/overview', DashboardController.monitorOverview);

/* ═══════════════════════════════════════════════════════════════════════════
 * 3. 告警中心（子路由）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use('/alarms', alarmRoutes);

/* ═══════════════════════════════════════════════════════════════════════════
 * 4. 数智消控室（子路由）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use('/control-rooms', controlRoomRoutes);

/* ═══════════════════════════════════════════════════════════════════════════
 * 5. 值守中心
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/duty/schedules', DutyController.scheduleList);
router.get('/duty/schedules/:id', DutyController.scheduleById);
router.post('/duty/schedules', DutyController.scheduleCreate);
router.put('/duty/schedules/:id', DutyController.scheduleUpdate);
router.delete('/duty/schedules/:id', DutyController.scheduleDelete);
router.post('/duty/check-in', DutyController.checkIn);
router.post('/duty/check-out', DutyController.checkOut);
router.get('/duty/logs', DutyController.logList);
router.get('/duty/current', DutyController.currentDuty);
router.get('/duty/absence-alert', DutyController.absenceAlert);

/* ═══════════════════════════════════════════════════════════════════════════
 * 6. 子系统监控
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/subsystem/water', DeviceController.list);
router.get('/subsystem/elec', DeviceController.list);
router.get('/subsystem/vent', DeviceController.list);

/* ═══════════════════════════════════════════════════════════════════════════
 * 7. 单位管理
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/units/list', UnitController.list);
router.post('/units', UnitController.create);
router.put('/units/:id', UnitController.update);
router.delete('/units/:id', UnitController.delete);
router.get('/units/stats', UnitController.stats);

/* ═══════════════════════════════════════════════════════════════════════════
 * 8. 设备管理（子路由 + 独立前缀）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use('/devices', deviceRoutes);

// 设备分配（独立前缀，保留在聚合层）
router.get('/device-allocations/pending', DeviceAllocationController.listPending);
router.post('/device-allocations/allocate', DeviceAllocationController.allocate);
router.post('/device-allocations/unallocate', DeviceAllocationController.unallocate);
router.post('/device-allocations/reallocate', DeviceAllocationController.reallocate);
router.get('/device-allocations/list', DeviceAllocationController.listLogs);

// 设备维护记录（独立前缀，保留在聚合层）
router.get('/device-maintenances/stats', DeviceMaintenanceController.stats);
router.get('/device-maintenances/list', DeviceMaintenanceController.list);
router.post('/device-maintenances', DeviceMaintenanceController.create);
router.put('/device-maintenances/:id', DeviceMaintenanceController.update);
router.delete('/device-maintenances/:id', DeviceMaintenanceController.delete);

/* ═══════════════════════════════════════════════════════════════════════════
 * 9. 消防维保管理（子路由）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use('/maintenance', maintenanceRoutes);

/* ═══════════════════════════════════════════════════════════════════════════
 * 10. 巡检管理
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/patrol/plans', PatrolController.planList);
router.post('/patrol/plans', PatrolController.planCreate);
router.put('/patrol/plans/:id', PatrolController.planUpdate);
router.delete('/patrol/plans/:id', PatrolController.planDelete);
router.get('/patrol/records', PatrolController.recordList);
router.get('/patrol/records/:id', PatrolController.recordById);
router.post('/patrol/records', PatrolController.recordCreate);
router.put('/patrol/records/:id', PatrolController.recordUpdate);
router.delete('/patrol/records/:id', PatrolController.recordDelete);
router.get('/patrol/hazards', PatrolController.hazardList);
router.post('/patrol/hazards', PatrolController.hazardCreate);
router.put('/patrol/hazards/:id', PatrolController.hazardUpdate);
router.delete('/patrol/hazards/:id', PatrolController.hazardDelete);
router.put('/patrol/hazards/:id/rectify', PatrolController.hazardRectify);

/* ═══════════════════════════════════════════════════════════════════════════
 * 11. 应急预案
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/plans', PlanController.planList);
router.post('/plans', PlanController.planCreate);
router.put('/plans/:id', PlanController.planUpdate);
router.delete('/plans/:id', PlanController.planDelete);
router.get('/drills', PlanController.drillList);
router.post('/drills', PlanController.drillCreate);
router.put('/drills/:id', PlanController.drillUpdate);
router.delete('/drills/:id', PlanController.drillDelete);

/* ═══════════════════════════════════════════════════════════════════════════
 * 12. GIS 地图
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/gis/points', DashboardController.gisPoints);
router.get('/gis/situation', DashboardController.gisSituation);
router.get('/gis/alarm-points', DashboardController.gisAlarmPoints);

/* ═══════════════════════════════════════════════════════════════════════════
 * 13. 数据分析
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/analysis/device', DashboardController.deviceAnalysis);
router.get('/analysis/alarm', DashboardController.alarmAnalysis);
router.get('/analysis/maintenance', DashboardController.maintenanceAnalysis);
router.get('/analysis/hazard', DashboardController.hazardAnalysis);
router.get('/analysis/patrol', DashboardController.patrolCompletion);

/* ═══════════════════════════════════════════════════════════════════════════
 * 14. 报表管理
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/reports/daily', DashboardController.dailyReport);
router.get('/reports/weekly', DashboardController.weeklyReport);
router.get('/reports/monthly', DashboardController.monthlyReport);
router.get('/reports/device', DashboardController.deviceReport);
router.get('/reports/maintenance', DashboardController.maintenanceReport);
router.get('/reports/patrol', DashboardController.patrolReport);

/* ═══════════════════════════════════════════════════════════════════════════
 * 15. 消防知识库
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/knowledge', KnowledgeController.list);
router.post('/knowledge', KnowledgeController.create);
router.put('/knowledge/:id', KnowledgeController.update);
router.delete('/knowledge/:id', KnowledgeController.delete);
router.get('/knowledge/categories', KnowledgeController.categories);

/* ═══════════════════════════════════════════════════════════════════════════
 * 16. 大屏模式
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/bigscreen/data', DashboardController.bigScreen);

/* ═══════════════════════════════════════════════════════════════════════════
 * 17. 设备反控
 * ═══════════════════════════════════════════════════════════════════════════ */
router.post('/device-control/command', DeviceControlController.sendCommand);
router.post('/device-control/start-stop', DeviceControlController.remoteStartStop);
router.post('/device-control/reset', DeviceControlController.remoteReset);
router.post('/device-control/silence', DeviceControlController.silence);
router.post('/device-control/batch', DeviceControlController.batchCommand);
router.get('/device-control/history', DeviceControlController.commandHistory);

/* ═══════════════════════════════════════════════════════════════════════════
 * 18. AI 决策中心
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/ai/decisions', AIController.decisionList);
router.post('/ai/decisions', AIController.decisionCreate);
router.post('/ai/risk-analysis', AIDecisionController.riskAnalysis);
router.get('/ai/false-alarm/:alarmId', AIDecisionController.filterFalseAlarm);
router.get('/ai/situation', AIDecisionController.situationAssessment);
router.post('/ai/smart-alert', AIDecisionController.generateSmartAlert);
router.get('/ai/trend', AIDecisionController.trendAnalysis);
router.get('/ai/alerts', AIController.alertList);
router.put('/ai/alerts/:id/confirm', AIController.alertConfirm);
router.put('/ai/alerts/:id/handle', AIController.alertHandle);

/* ═══════════════════════════════════════════════════════════════════════════
 * 19. IoT 设备接入（统一走 /iot-devices，/iot/devices 保留兼容）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/iot-devices/list', IoTController.deviceList);
router.post('/iot-devices', IoTController.deviceCreate);
router.put('/iot-devices/:id', IoTController.deviceUpdate);
router.delete('/iot-devices/:id', IoTController.deviceDelete);
/* 旧路径兼容（前端已统一使用 /iot-devices，保留 1 个版本防止外部集成断裂） */
router.get('/iot/devices', IoTController.deviceList);
router.get('/iot/protocols', IoTController.protocolList);
router.post('/iot/protocols', IoTController.protocolCreate);
router.put('/iot/protocols/:id', IoTController.protocolUpdate);
router.delete('/iot/protocols/:id', IoTController.protocolDelete);
router.get('/iot/pipelines', IoTController.pipelineList);
router.post('/iot/pipelines', IoTController.pipelineCreate);
router.post('/iot/modbus/read', IoTProtocolController.readModbus);
router.post('/iot/snmp/read', IoTProtocolController.readSNMP);
router.post('/iot/control', IoTProtocolController.sendControl);
router.post('/iot/batch-read', IoTProtocolController.batchRead);
router.post('/iot/mqtt/parse', IoTProtocolController.parseMQTT);
router.get('/iot/hikvision/devices/:sn/data', Hikvision4GController.getDeviceData);
router.post('/iot/hikvision/batch-data', Hikvision4GController.batchDeviceData);

/* ═══════════════════════════════════════════════════════════════════════════
 * 20. 智能预警
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
 * 21. 培训考核
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/training/courses', TrainingController.courseList);
router.post('/training/courses', TrainingController.courseCreate);
router.put('/training/courses/:id', TrainingController.courseUpdate);
router.delete('/training/courses/:id', TrainingController.courseDelete);
router.get('/training/exams', TrainingController.examList);
router.post('/training/exams', TrainingController.examCreate);

/* ═══════════════════════════════════════════════════════════════════════════
 * 22. 消防检查
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/inspections', InspectionController.list);
router.post('/inspections', InspectionController.create);
router.put('/inspections/:id', InspectionController.update);
router.delete('/inspections/:id', InspectionController.delete);

/* ═══════════════════════════════════════════════════════════════════════════
 * 23. 系统管理
 * ═══════════════════════════════════════════════════════════════════════════ */
// 用户管理
router.get('/users', UserController.list);
router.get('/users/list', UserController.list);
router.post('/users', UserController.create);
router.put('/users/:id', UserController.update);
router.delete('/users/:id', UserController.delete);
router.put('/users/:id/reset-password', UserController.resetPassword);
// 角色权限
router.get('/roles', RoleController.list);
router.post('/roles', RoleController.create);
router.put('/roles/:id', RoleController.update);
router.delete('/roles/:id', RoleController.delete);
router.get('/permissions', SystemController.permList);
// 组织架构
router.get('/departments', SystemController.deptList);
router.post('/departments', SystemController.deptCreate);
router.put('/departments/:id', SystemController.deptUpdate);
router.delete('/departments/:id', SystemController.deptDelete);
// 个人中心
router.get('/auth/profile', AuthController.profile);
router.put('/auth/profile', AuthController.updateProfile);
router.put('/auth/password', AuthController.changePassword);
// 系统配置
router.get('/system/config', SystemController.configList);
router.post('/system/config', SystemController.configSet);
router.get('/system/logs', SystemController.logList);
router.get('/system/notify-templates', SystemController.notifyTemplateList);
router.post('/system/notify-templates', SystemController.notifyTemplateCreate);
router.put('/system/notify-templates/:id', SystemController.notifyTemplateUpdate);
router.delete('/system/notify-templates/:id', SystemController.notifyTemplateDelete);
router.get('/system/screens', SystemController.screenList);
router.post('/system/screens', SystemController.screenSave);
router.get('/system/modules', SystemController.modules);
router.put('/system/modules/toggle', SystemController.toggleModule);
router.get('/system/dashboard', SystemController.dashboard);

/* ═══════════════════════════════════════════════════════════════════════════
 * 24. 安消联动
 * ═══════════════════════════════════════════════════════════════════════════ */
router.get('/linkage/rules', LinkageController.list);
router.post('/linkage/rules', LinkageController.create);
router.put('/linkage/rules/:id', LinkageController.update);
router.delete('/linkage/rules/:id', LinkageController.delete);
router.post('/linkage/rules/:id/trigger', LinkageController.manualTrigger);
router.get('/linkage/status/:alarmId', LinkageController.getStatus);
router.post('/linkage/preset', LinkageController.applyPreset);
router.get('/linkage/records', LinkageController.getRecords);

/* ═══════════════════════════════════════════════════════════════════════════
 * 25. 视频监控（子路由）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use('/video', videoRoutes);

/* ═══════════════════════════════════════════════════════════════════════════
 * 26. AI 故障自学习
 * ═══════════════════════════════════════════════════════════════════════════ */
router.post('/ai/learn', AILearningController.record);
router.get('/ai/diagnose', AILearningController.diagnose);
router.get('/ai/stats/type', AILearningController.statsByType);
router.get('/ai/stats/device', AILearningController.statsByDevice);
router.get('/ai/learn/list', AILearningController.list);
router.put('/ai/learn/:id', AILearningController.update);

/* ═══════════════════════════════════════════════════════════════════════════
 * 兼容旧版前端路径：Stub 兜底路由（须挂在所有显式路由之后）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use(stubRouter);

export default router;
