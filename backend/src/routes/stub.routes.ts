/**
 * ═══════════════════════════════════════════════════════════════════
 * Stub Routes - 兼容旧版前端路径的兜底路由
 *
 * 规则：
 * 1. 与正式路由重叠的旧兼容接口，统一挂载到 /old/ 前缀下
 * 2. 错误映射直接删除
 * 3. 无真实实现的接口返回 404 Not Implemented
 * ═══════════════════════════════════════════════════════════════════
 */
import { Router, type RequestHandler } from 'express';
import * as Stub from '@/services/stub.oldTable.service';
import * as StubFake from '@/services/stub.fakeData.service';
import { fail } from '@/utils/response';

const router = Router();

/* ───── 404 工厂 ───── */
function notImplemented(_req: any, res: any) {
  res.status(404).json(fail('Not Implemented', 404));
}

/* ───── 通用 CRUD 注册工厂 ───── */
function crud(
  path: string,
  handlers: {
    list?: RequestHandler;
    byId?: RequestHandler;
    create?: RequestHandler;
    update?: RequestHandler;
    del?: RequestHandler;
  }
) {
  if (handlers.list) router.get(`${path}/list`, handlers.list);
  if (handlers.byId) router.get(`${path}/:id`, handlers.byId);
  if (handlers.create) router.post(path, handlers.create);
  if (handlers.update) router.put(`${path}/:id`, handlers.update);
  if (handlers.del) router.delete(`${path}/:id`, handlers.del);
}

/* ═══════════════════════════════════════════════════════════
   1. 摄像头（无正式路由重叠，保留原路径）
   ═══════════════════════════════════════════════════════════ */
crud('/cameras', {
  list: Stub.cameraList,
  byId: Stub.cameraById,
  create: Stub.cameraCreate,
  update: Stub.cameraUpdate,
  del: Stub.cameraDelete,
});

/* ═══════════════════════════════════════════════════════════
   2. IoT 设备统计（无正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
router.get('/iot-devices/stats', Stub.iotDeviceStats);

/* ═══════════════════════════════════════════════════════════
   3. 维保工单旧兼容（无正式路由重叠，正式路由为 /maintenance/work-orders）
   ═══════════════════════════════════════════════════════════ */
crud('/work-orders', {
  list: Stub.workOrderList, byId: Stub.workOrderById, create: Stub.workOrderCreate,
  update: Stub.workOrderUpdate, del: Stub.workOrderDelete,
});

/* ═══════════════════════════════════════════════════════════
   4. 维保记录（已迁移到 /maintenance/records，保留旧路径 1 个版本）
   ═══════════════════════════════════════════════════════════ */
crud('/old/maint-records', {
  list: Stub.maintRecordList, byId: Stub.maintRecordById, create: Stub.maintRecordCreate,
  update: Stub.maintRecordUpdate, del: Stub.maintRecordDelete,
});

/* ═══════════════════════════════════════════════════════════
   5. 维保合同（无正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
crud('/maint-contracts', {
  list: Stub.maintContractList, byId: Stub.maintContractById, create: Stub.maintContractCreate,
  update: Stub.maintContractUpdate, del: Stub.maintContractDelete,
});

/* ═══════════════════════════════════════════════════════════
   6. 巡检旧兼容（无正式路由重叠，正式路由为 /patrol/plans、/patrol/records）
   ═══════════════════════════════════════════════════════════ */
crud('/patrol-plans', {
  list: Stub.patrolPlanListOld, byId: Stub.patrolPlanByIdOld, create: Stub.patrolPlanCreateOld,
  update: Stub.patrolPlanUpdateOld, del: Stub.patrolPlanDeleteOld,
});
crud('/patrol-records', {
  list: Stub.patrolRecordListOld, byId: Stub.patrolRecordByIdOld, create: Stub.patrolRecordCreateOld,
  update: Stub.patrolRecordUpdateOld, del: Stub.patrolRecordDeleteOld,
});

/* ═══════════════════════════════════════════════════════════
   7. 隐患旧兼容（无正式路由重叠，正式路由为 /patrol/hazards）
   ═══════════════════════════════════════════════════════════ */
crud('/hazards', {
  list: Stub.hazardListOld, byId: Stub.hazardByIdOld, create: Stub.hazardCreateOld,
  update: Stub.hazardUpdateOld, del: Stub.hazardDeleteOld,
});

/* ═══════════════════════════════════════════════════════════
   8. 预案/演练旧兼容（已迁移到 /old/plans、/old/drills，保留 1 个版本）
   ═══════════════════════════════════════════════════════════ */
crud('/old/plans', {
  list: Stub.planListOld, byId: Stub.planByIdOld, create: Stub.planCreateOld,
  update: Stub.planUpdateOld, del: Stub.planDeleteOld,
});
crud('/old/drills', {
  list: Stub.drillListOld, byId: Stub.drillByIdOld, create: Stub.drillCreateOld,
  update: Stub.drillUpdateOld, del: Stub.drillDeleteOld,
});

/* ═══════════════════════════════════════════════════════════
   10. 知识库旧兼容（已迁移到 /old/documents，保留 1 个版本）
   ═══════════════════════════════════════════════════════════ */
crud('/old/documents', {
  list: Stub.documentListOld, byId: Stub.documentByIdOld, create: Stub.documentCreateOld,
  update: Stub.documentUpdateOld, del: Stub.documentDeleteOld,
});

/* ═══════════════════════════════════════════════════════════
   11. 通知（已迁移到 /workbench/notices，保留旧路径 1 个版本）
   ═══════════════════════════════════════════════════════════ */
crud('/old/notifications', {
  list: Stub.notificationList, create: Stub.notificationCreate,
  update: Stub.notificationUpdate, del: Stub.notificationDelete,
});
router.get('/old/notifications/unread', Stub.notificationUnread);
router.post('/old/notifications/:id/read', Stub.notificationRead);

/* ═══════════════════════════════════════════════════════════
   12. 值班旧兼容（已迁移到 /duty/*，保留旧路径 1 个版本）
   ═══════════════════════════════════════════════════════════ */
crud('/old/duty-schedules', {
  list: Stub.dutyScheduleListOld, byId: Stub.dutyScheduleByIdOld, create: Stub.dutyScheduleCreateOld,
  update: Stub.dutyScheduleUpdateOld, del: Stub.dutyScheduleDeleteOld,
});
crud('/old/duty-shifts', {
  list: Stub.dutyShiftListOld, byId: Stub.dutyShiftByIdOld, create: Stub.dutyShiftCreateOld,
  update: Stub.dutyShiftUpdateOld, del: Stub.dutyShiftDeleteOld,
});
crud('/old/duty-handovers', {
  list: Stub.dutyHandoverListOld, byId: Stub.dutyHandoverByIdOld, create: Stub.dutyHandoverCreateOld,
  update: Stub.dutyHandoverUpdateOld, del: Stub.dutyHandoverDeleteOld,
});

/* ═══════════════════════════════════════════════════════════
   13. 系统日志旧兼容（无正式路由重叠，正式路由为 /system/logs）
   ═══════════════════════════════════════════════════════════ */
router.get('/system-logs/list', Stub.systemLogListOld);

/* ═══════════════════════════════════════════════════════════
   14. 平面图旧兼容（无正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
crud('/floor-plans', { list: Stub.floorPlanListOld, byId: Stub.floorPlanByIdOld });
router.get('/floor-plans/:id/devices', Stub.floorPlanDevicesOld);
router.get('/floor-devices/list', Stub.floorDeviceListOld);

/* ═══════════════════════════════════════════════════════════
   15. 报表旧兼容（已迁移到 /old/reports/list，保留 1 个版本）
   ═══════════════════════════════════════════════════════════ */
router.get('/old/reports/list', Stub.reportListOld);

/* ═══════════════════════════════════════════════════════════
   16. 报警快照（无正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
router.get('/alarm-snapshots/list', Stub.alarmSnapshotList);

/* ═══════════════════════════════════════════════════════════
   17. 消控室配置（无正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
router.get('/control-room-configs/list', Stub.controlRoomConfigList);

/* ═══════════════════════════════════════════════════════════
   19. SIP 服务器状态（无正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
router.get('/sip-server/status', Stub.sipServerStatus);
router.post('/sip-server/start', StubFake.sipServerStart);
router.post('/sip-server/stop', StubFake.sipServerStop);

/* ═══════════════════════════════════════════════════════════
   20. 数据库统计（无正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
router.get('/db/stats', Stub.dbStats);

/* ═══════════════════════════════════════════════════════════
   21. 子系统（已迁移到 /subsystems，保留旧路径 1 个版本）
   ═══════════════════════════════════════════════════════════ */
router.get('/old/subsystems', StubFake.subsystems);

/* ═══════════════════════════════════════════════════════════
   24. 待办（已迁移到 /workbench/todos，保留旧路径 1 个版本）
   ═══════════════════════════════════════════════════════════ */
crud('/old/todos', {
  list: Stub.todoList, byId: Stub.todoById, create: Stub.todoCreate,
  update: Stub.todoUpdate, del: Stub.todoDelete,
});

/* ═══════════════════════════════════════════════════════════
   25. IoT 协议配置旧兼容（无正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
crud('/iot-protocols', {
  list: Stub.iotProtocolListOld, byId: Stub.iotProtocolByIdOld, create: Stub.iotProtocolCreateOld,
  update: Stub.iotProtocolUpdateOld, del: Stub.iotProtocolDeleteOld,
});

/* ═══════════════════════════════════════════════════════════
   26-28. 角色/权限/组织架构旧兼容已删除
   正式路由：/system/roles、/system/permissions、/system/departments
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   30. 维保单位旧兼容（/maintenance/companies 与正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
crud('/old/maintenance/companies', {
  list: Stub.maintCompanyListOld, byId: Stub.maintCompanyByIdOld, create: Stub.maintCompanyCreateOld,
  update: Stub.maintCompanyUpdateOld, del: Stub.maintCompanyDeleteOld,
});

/* ═══════════════════════════════════════════════════════════
   31. AI 预警旧兼容（无正式路由重叠，正式路由为 /ai/alerts）
   ═══════════════════════════════════════════════════════════ */
router.post('/ai/alerts', Stub.aiAlertCreateOld);
router.put('/ai/alerts/:id', Stub.aiAlertUpdateOld);
router.delete('/ai/alerts/:id', Stub.aiAlertDeleteOld);

/* ═══════════════════════════════════════════════════════════
   32. 系统配置旧兼容（/system/config 与正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
crud('/old/system/config', {
  list: Stub.systemConfigListOld, create: Stub.systemConfigCreateOld,
  update: Stub.systemConfigUpdateOld, del: Stub.systemConfigDeleteOld,
});

/* ═══════════════════════════════════════════════════════════
   33. 值班旧兼容（/duty/* 与正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
router.get('/old/duty/schedules', Stub.dutyScheduleCompat);
router.get('/old/duty/logs', Stub.dutyLogCompat);
router.get('/old/duty/current', StubFake.dutyCurrentCompat);

/* ═══════════════════════════════════════════════════════════
   34. 大屏数据（/bigscreen/data 与正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
router.get('/old/bigscreen/data', Stub.bigScreenOld);

/* ═══════════════════════════════════════════════════════════
   35. 监控中心概览（/monitor/overview 与正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
router.get('/old/monitor/overview', Stub.monitorOverviewOld);

/* ═══════════════════════════════════════════════════════════
   36. GIS 富数据（/gis/points-rich 与 /gis/* 正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
router.get('/old/gis/points-rich', Stub.gisPointsRich);

/* ═══════════════════════════════════════════════════════════
   37. 数据分析旧兼容（/analysis/* 与正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
router.get('/old/analysis/device', Stub.analysisDeviceOld);
router.get('/old/analysis/alarm', Stub.analysisAlarmOld);
router.get('/old/analysis/maintenance', Stub.analysisMaintenanceOld);
router.get('/old/analysis/hazard', Stub.analysisHazardOld);
router.get('/old/analysis/patrol', Stub.analysisPatrolOld);

/* ═══════════════════════════════════════════════════════════
   38. 报表静态兜底（/reports/* 已由 dashboard 正式路由接管，删除空实现）
   ═══════════════════════════════════════════════════════════ */
// 正式路由：/reports/daily|weekly|monthly|device|maintenance|patrol|export
// 旧兼容：/old/reports/list（上方第 15 节）

/* ═══════════════════════════════════════════════════════════
   39. 知识库旧兼容（/knowledge 与正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
/* 知识库 /old/knowledge 已由 /knowledge 正式路由接管，删除空实现 */

/* ═══════════════════════════════════════════════════════════
   40. 维保统计旧兼容（/maintenance/stats 与正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
router.get('/old/maintenance/stats', Stub.maintenanceStatsOld);

/* ═══════════════════════════════════════════════════════════
   41. 培训旧兼容（错误映射已删除，保留 exams 的独立旧兼容）
   ═══════════════════════════════════════════════════════════ */
// ❌ 已删除错误映射：/training/courses → documentListOld
// ❌ 已删除错误映射：/training/exams → documentListOld

/* ═══════════════════════════════════════════════════════════
   42. AI 决策旧兼容（错误映射已删除）
   ═══════════════════════════════════════════════════════════ */
// ❌ 已删除错误映射：/ai/decisions → documentListOld
// ❌ 已删除错误映射：/ai/alerts → documentListOld
//   注：/ai/alerts 的 CRUD 保留在上方第 31 节

/* ═══════════════════════════════════════════════════════════
   43. 巡检旧兼容（/patrol/* 与正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
router.get('/old/patrol/plans', Stub.patrolPlanListOld);
router.get('/old/patrol/records', Stub.patrolRecordListOld);
router.get('/old/patrol/hazards', Stub.hazardListOld);

/* ═══════════════════════════════════════════════════════════
   44. 系统日志与仪表盘（/system/logs、/system/dashboard 与正式路由重叠）
   ═══════════════════════════════════════════════════════════ */
router.get('/old/system/logs', Stub.systemLogListOld);
router.get('/old/system/dashboard', notImplemented);

export default router;
