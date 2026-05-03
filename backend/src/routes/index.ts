import { Router } from 'express';
import { authMiddleware, requirePermission } from '@/middleware/auth';
import { AuthController } from '@/controllers/auth.controller';
import { UserController } from '@/controllers/user.controller';
import { RoleController } from '@/controllers/role.controller';
import { UnitController } from '@/controllers/unit.controller';
import { DeviceController } from '@/controllers/device.controller';
import { AlarmController } from '@/controllers/alarm.controller';
import { MaintenanceController } from '@/controllers/maintenance.controller';
import { PatrolController } from '@/controllers/patrol.controller';
import { ControlRoomController } from '@/controllers/controlRoom.controller';
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
import { VideoController } from '@/controllers/video.controller';

const router = Router();

/* ═══════ 公开接口 ═══════ */
router.post('/auth/login', AuthController.login);
router.post('/auth/register', AuthController.register);
router.get('/health', (req, res) => res.json({ code: 200, data: { status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() } }));

/* ═══════ 认证中间件（此后所有接口需登录） ═══════ */
router.use(authMiddleware);

/* ═══════════════════════════════════════════════════════════
   1. 工作台
   ═══════════════════════════════════════════════════════════ */
router.get('/workbench', DashboardController.workbench);

/* ═══════════════════════════════════════════════════════════
   2. 监控中心
   ═══════════════════════════════════════════════════════════ */
router.get('/monitor/overview', DashboardController.monitorOverview);

/* ═══════════════════════════════════════════════════════════
   3. 告警中心
   ═══════════════════════════════════════════════════════════ */
router.get('/alarms', AlarmController.list);
router.post('/alarms', AlarmController.create);
router.get('/alarms/stats', AlarmController.stats);
router.get('/alarms/recent', AlarmController.recent);
router.get('/alarms/trend', AlarmController.trend);
router.put('/alarms/:id/confirm', AlarmController.confirm);
router.put('/alarms/:id/handle', AlarmController.handle);
router.put('/alarms/:id/dismiss', AlarmController.dismiss);
router.put('/alarms/:id/silence', AlarmController.silence);

/* ═══════════════════════════════════════════════════════════
   4. 数智消控室 - 通过报警主机控制
   ═══════════════════════════════════════════════════════════ */
router.get('/control-rooms', ControlRoomController.list);
router.post('/control-rooms', ControlRoomController.create);
router.put('/control-rooms/:id', ControlRoomController.update);
router.delete('/control-rooms/:id', ControlRoomController.delete);
router.get('/control-rooms/:id', ControlRoomController.detail);
// 报警主机
router.get('/control-rooms/hosts', ControlRoomController.hostList);
router.post('/control-rooms/hosts', ControlRoomController.hostCreate);
router.put('/control-rooms/hosts/:id', ControlRoomController.hostUpdate);
router.delete('/control-rooms/hosts/:id', ControlRoomController.hostDelete);
router.get('/control-rooms/hosts/:id', ControlRoomController.hostDetail);
// 主机控制指令（消音/复位/手自动/多线盘 - 均通过报警主机下发）
router.post('/control-rooms/silence', ControlRoomController.silence);
router.post('/control-rooms/reset', ControlRoomController.reset);
router.post('/control-rooms/mode', ControlRoomController.switchMode);
router.post('/control-rooms/multiline/control', ControlRoomController.controlMultiline);
// 多线盘/总线点位
router.get('/control-rooms/multiline', ControlRoomController.multilineList);
router.post('/control-rooms/multiline', ControlRoomController.multilineCreate);
router.put('/control-rooms/multiline/:id', ControlRoomController.multilineUpdate);
router.get('/control-rooms/bus-points', ControlRoomController.busPointList);
router.post('/control-rooms/bus-points', ControlRoomController.busPointCreate);
router.put('/control-rooms/bus-points/:id', ControlRoomController.busPointUpdate);
// 控制日志
router.get('/control-rooms/command-logs', ControlRoomController.commandLogs);

/* ═══════════════════════════════════════════════════════════
   5. 值守中心
   ═══════════════════════════════════════════════════════════ */
router.get('/duty/schedules', DutyController.scheduleList);
router.post('/duty/schedules', DutyController.scheduleCreate);
router.post('/duty/check-in', DutyController.checkIn);
router.post('/duty/check-out', DutyController.checkOut);
router.get('/duty/logs', DutyController.logList);
router.get('/duty/current', DutyController.currentDuty);
router.get('/duty/absence-alert', DutyController.absenceAlert);

/* ═══════════════════════════════════════════════════════════
   5. 子系统监控
   ═══════════════════════════════════════════════════════════ */
// 消防给水/电气火灾/防排烟 - 统一走设备告警数据
router.get('/subsystem/water', DeviceController.list);
router.get('/subsystem/elec', DeviceController.list);
router.get('/subsystem/vent', DeviceController.list);

/* ═══════════════════════════════════════════════════════════
   6. 单位管理
   ═══════════════════════════════════════════════════════════ */
router.get('/units/list', UnitController.list);
router.get('/units', UnitController.list);
router.post('/units', UnitController.create);
router.put('/units/:id', UnitController.update);
router.delete('/units/:id', UnitController.delete);
router.get('/units/stats', UnitController.stats);

/* ═══════════════════════════════════════════════════════════
   7. 设备管理
   ═══════════════════════════════════════════════════════════ */
router.get('/devices', DeviceController.list);
router.post('/devices', DeviceController.create);
router.put('/devices/:id', DeviceController.update);
router.delete('/devices/:id', DeviceController.delete);
router.get('/devices/stats', DeviceController.stats);
router.get('/devices/types', DeviceController.types);

/* ═══════════════════════════════════════════════════════════
   8. 消防维保管理
   ═══════════════════════════════════════════════════════════ */
router.get('/maintenance/companies', MaintenanceController.companyList);
router.post('/maintenance/companies', MaintenanceController.companyCreate);
router.put('/maintenance/companies/:id', MaintenanceController.companyUpdate);
router.delete('/maintenance/companies/:id', MaintenanceController.companyDelete);
router.get('/maintenance/contracts', MaintenanceController.contractList);
router.post('/maintenance/contracts', MaintenanceController.contractCreate);
router.put('/maintenance/contracts/:id', MaintenanceController.contractUpdate);
router.delete('/maintenance/contracts/:id', MaintenanceController.contractDelete);
router.get('/maintenance/work-orders', MaintenanceController.workOrderList);
router.post('/maintenance/work-orders', MaintenanceController.workOrderCreate);
router.put('/maintenance/work-orders/:id', MaintenanceController.workOrderUpdate);
router.delete('/maintenance/work-orders/:id', MaintenanceController.workOrderDelete);
router.put('/maintenance/work-orders/:id/assign', MaintenanceController.workOrderAssign);
router.put('/maintenance/work-orders/:id/complete', MaintenanceController.workOrderComplete);
router.get('/maintenance/stats', MaintenanceController.stats);

/* ═══════════════════════════════════════════════════════════
   9. 巡检管理
   ═══════════════════════════════════════════════════════════ */
router.get('/patrol/plans', PatrolController.planList);
router.post('/patrol/plans', PatrolController.planCreate);
router.put('/patrol/plans/:id', PatrolController.planUpdate);
router.delete('/patrol/plans/:id', PatrolController.planDelete);
router.get('/patrol/records', PatrolController.recordList);
router.post('/patrol/records', PatrolController.recordCreate);
router.get('/patrol/hazards', PatrolController.hazardList);
router.post('/patrol/hazards', PatrolController.hazardCreate);
router.put('/patrol/hazards/:id', PatrolController.hazardUpdate);
router.put('/patrol/hazards/:id/rectify', PatrolController.hazardRectify);

/* ═══════════════════════════════════════════════════════════
   10. 应急预案
   ═══════════════════════════════════════════════════════════ */
router.get('/plans', PlanController.planList);
router.post('/plans', PlanController.planCreate);
router.put('/plans/:id', PlanController.planUpdate);
router.delete('/plans/:id', PlanController.planDelete);
router.get('/drills', PlanController.drillList);
router.post('/drills', PlanController.drillCreate);
router.put('/drills/:id', PlanController.drillUpdate);
router.delete('/drills/:id', PlanController.drillDelete);

/* ═══════════════════════════════════════════════════════════
   11. GIS地图
   ═══════════════════════════════════════════════════════════ */
router.get('/gis/points', DashboardController.gisPoints);
router.get('/gis/situation', DashboardController.gisSituation);
router.get('/gis/alarm-points', DashboardController.gisAlarmPoints);

/* ═══════════════════════════════════════════════════════════
   12. 数据分析
   ═══════════════════════════════════════════════════════════ */
router.get('/analysis/device', DashboardController.deviceAnalysis);
router.get('/analysis/alarm', DashboardController.alarmAnalysis);
router.get('/analysis/maintenance', DashboardController.maintenanceAnalysis);
router.get('/analysis/hazard', DashboardController.hazardAnalysis);
router.get('/analysis/patrol', DashboardController.patrolCompletion);

/* ═══════════════════════════════════════════════════════════
   13. 报表管理
   ═══════════════════════════════════════════════════════════ */
router.get('/reports/daily', DashboardController.dailyReport);
router.get('/reports/weekly', DashboardController.weeklyReport);
router.get('/reports/monthly', DashboardController.monthlyReport);
router.get('/reports/device', DashboardController.deviceReport);
router.get('/reports/maintenance', DashboardController.maintenanceReport);
router.get('/reports/patrol', DashboardController.patrolReport);

/* ═══════════════════════════════════════════════════════════
   14. 消防知识库
   ═══════════════════════════════════════════════════════════ */
router.get('/knowledge', KnowledgeController.list);
router.post('/knowledge', KnowledgeController.create);
router.put('/knowledge/:id', KnowledgeController.update);
router.delete('/knowledge/:id', KnowledgeController.delete);
router.get('/knowledge/categories', KnowledgeController.categories);

/* ═══════════════════════════════════════════════════════════
   15. 大屏模式
   ═══════════════════════════════════════════════════════════ */
router.get('/bigscreen/data', DashboardController.bigScreen);

/* ═══════════════════════════════════════════════════════════
   16. 设备反控
   ═══════════════════════════════════════════════════════════ */
router.post('/device-control/command', DeviceControlController.sendCommand);
router.post('/device-control/start-stop', DeviceControlController.remoteStartStop);
router.post('/device-control/reset', DeviceControlController.remoteReset);
router.post('/device-control/silence', DeviceControlController.silence);
router.post('/device-control/batch', DeviceControlController.batchCommand);
router.get('/device-control/history', DeviceControlController.commandHistory);

/* ═══════════════════════════════════════════════════════════
   17. AI决策中心
   ═══════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════
   18. IoT设备接入
   ═══════════════════════════════════════════════════════════ */
router.get('/iot/devices', IoTController.deviceList);
router.post('/iot/devices', IoTController.deviceCreate);
router.put('/iot/devices/:id', IoTController.deviceUpdate);
router.delete('/iot/devices/:id', IoTController.deviceDelete);
router.get('/iot/protocols', IoTController.protocolList);
router.post('/iot/protocols', IoTController.protocolCreate);
router.put('/iot/protocols/:id', IoTController.protocolUpdate);
router.delete('/iot/protocols/:id', IoTController.protocolDelete);
router.get('/iot/pipelines', IoTController.pipelineList);
router.post('/iot/pipelines', IoTController.pipelineCreate);
// IoT协议接口
router.post('/iot/modbus/read', IoTProtocolController.readModbus);
router.post('/iot/snmp/read', IoTProtocolController.readSNMP);
router.post('/iot/control', IoTProtocolController.sendControl);
router.post('/iot/batch-read', IoTProtocolController.batchRead);
router.post('/iot/mqtt/parse', IoTProtocolController.parseMQTT);

/* ═══════════════════════════════════════════════════════════
   19. 智能预警
   ═══════════════════════════════════════════════════════════ */
// 复用AI预警接口

/* ═══════════════════════════════════════════════════════════
   20. 培训考核
   ═══════════════════════════════════════════════════════════ */
router.get('/training/courses', TrainingController.courseList);
router.post('/training/courses', TrainingController.courseCreate);
router.put('/training/courses/:id', TrainingController.courseUpdate);
router.delete('/training/courses/:id', TrainingController.courseDelete);
router.get('/training/exams', TrainingController.examList);
router.post('/training/exams', TrainingController.examCreate);

/* ═══════════════════════════════════════════════════════════
   21. 消防检查
   ═══════════════════════════════════════════════════════════ */
router.get('/inspections', InspectionController.list);
router.post('/inspections', InspectionController.create);
router.put('/inspections/:id', InspectionController.update);
router.delete('/inspections/:id', InspectionController.delete);

/* ═════════════════════════════════════════════════════════════
   23. 系统管理
   ══════════════════════════════════════════════════════════════ */
// 用户管理
router.get('/users', UserController.list);
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

export default router;

/* ═════════════════════════════════════════════════════════════
   23. 安消联动（新增）
   ══════════════════════════════════════════════════════════════ */
router.get('/linkage/rules', LinkageController.list);
router.post('/linkage/rules', LinkageController.create);
router.put('/linkage/rules/:id', LinkageController.update);
router.delete('/linkage/rules/:id', LinkageController.delete);
router.post('/linkage/rules/:id/trigger', LinkageController.manualTrigger);
router.get('/linkage/status/:alarmId', LinkageController.getStatus);
router.post('/linkage/preset', LinkageController.applyPreset);
router.get('/linkage/records', LinkageController.getRecords);

/* ═════════════════════════════════════════════════════════════
   24. 视频监控（新增）
   ══════════════════════════════════════════════════════════════ */
router.get('/video/devices', VideoController.list);
router.get('/video/stream/:deviceId', VideoController.getStream);
router.post('/video/ptz/:deviceId', VideoController.ptzControl);
router.post('/video/preset/:deviceId', VideoController.presetControl);
router.get('/video/playback/:deviceId', VideoController.getPlayback);
router.get('/video/snapshot/:deviceId', VideoController.snapshot);
router.get('/video/live/:deviceId', VideoController.livePreview);
