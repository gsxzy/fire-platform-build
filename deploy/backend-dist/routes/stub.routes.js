"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ═══════════════════════════════════════════════════════════════════
 * Stub Routes - 兼容旧版前端路径的兜底路由
 * 注册在 /api/stub 下，旧版路径通过此处提供兼容支持
 * ═══════════════════════════════════════════════════════════════════
 */
const express_1 = require("express");
const database_1 = __importDefault(require("@/config/database"));
const Stub = __importStar(require("@/controllers/stub.controller"));
const response_1 = require("@/utils/response");
const router = (0, express_1.Router)();
/* ───── 通用 CRUD 注册工厂（减少重复样板） ───── */
function crud(path, handlers) {
    if (handlers.list)
        router.get(`${path}/list`, handlers.list);
    if (handlers.byId)
        router.get(`${path}/:id`, handlers.byId);
    if (handlers.create)
        router.post(path, handlers.create);
    if (handlers.update)
        router.put(`${path}/:id`, handlers.update);
    if (handlers.del)
        router.delete(`${path}/:id`, handlers.del);
}
/* ═══════ 1. 摄像头 ═══════ */
crud('/cameras', {
    list: Stub.cameraList,
    byId: Stub.cameraById,
    create: Stub.cameraCreate,
    update: Stub.cameraUpdate,
    del: Stub.cameraDelete,
});
/* ═══════ 2. IoT 设备统计 ═══════ */
router.get('/iot-devices/stats', Stub.iotDeviceStats);
/* ═══════ 3. 维保工单旧兼容路径 ═══════ */
crud('/work-orders', {
    list: Stub.workOrderList, byId: Stub.workOrderById, create: Stub.workOrderCreate,
    update: Stub.workOrderUpdate, del: Stub.workOrderDelete,
});
/* ═══════ 4. 维保记录 ═══════ */
crud('/maint-records', {
    list: Stub.maintRecordList, byId: Stub.maintRecordById, create: Stub.maintRecordCreate,
    update: Stub.maintRecordUpdate, del: Stub.maintRecordDelete,
});
/* ═══════ 5. 维保合同 ═══════ */
crud('/maint-contracts', {
    list: Stub.maintContractList, byId: Stub.maintContractById, create: Stub.maintContractCreate,
    update: Stub.maintContractUpdate, del: Stub.maintContractDelete,
});
/* ═══════ 6. 巡检旧兼容路径 ═══════ */
crud('/patrol-plans', {
    list: Stub.patrolPlanListOld, byId: Stub.patrolPlanByIdOld, create: Stub.patrolPlanCreateOld,
    update: Stub.patrolPlanUpdateOld, del: Stub.patrolPlanDeleteOld,
});
crud('/patrol-records', {
    list: Stub.patrolRecordListOld, byId: Stub.patrolRecordByIdOld, create: Stub.patrolRecordCreateOld,
    update: Stub.patrolRecordUpdateOld, del: Stub.patrolRecordDeleteOld,
});
/* ═══════ 7. 隐患旧兼容路径 ═══════ */
crud('/hazards', {
    list: Stub.hazardListOld, byId: Stub.hazardByIdOld, create: Stub.hazardCreateOld,
    update: Stub.hazardUpdateOld, del: Stub.hazardDeleteOld,
});
/* ═══════ 8. 预案/演练旧兼容路径 ═══════ */
crud('/plans', {
    list: Stub.planListOld, byId: Stub.planByIdOld, create: Stub.planCreateOld,
    update: Stub.planUpdateOld, del: Stub.planDeleteOld,
});
crud('/drills', {
    list: Stub.drillListOld, byId: Stub.drillByIdOld, create: Stub.drillCreateOld,
    update: Stub.drillUpdateOld, del: Stub.drillDeleteOld,
});
/* ═══════ 9. 检查旧兼容路径 ═══════ */
crud('/inspections', {
    list: Stub.inspectionListOld, byId: Stub.inspectionByIdOld, create: Stub.inspectionCreateOld,
    update: Stub.inspectionUpdateOld, del: Stub.inspectionDeleteOld,
});
/* ═══════ 10. 知识库旧兼容路径 ═══════ */
crud('/documents', {
    list: Stub.documentListOld, byId: Stub.documentByIdOld, create: Stub.documentCreateOld,
    update: Stub.documentUpdateOld, del: Stub.documentDeleteOld,
});
/* ═══════ 11. 通知 ═══════ */
crud('/notifications', {
    list: Stub.notificationList, create: Stub.notificationCreate,
    update: Stub.notificationUpdate, del: Stub.notificationDelete,
});
router.get('/notifications/unread', Stub.notificationUnread);
router.post('/notifications/:id/read', Stub.notificationRead);
/* ═══════ 12. 值班旧兼容路径 ═══════ */
crud('/duty-schedules', {
    list: Stub.dutyScheduleListOld, byId: Stub.dutyScheduleByIdOld, create: Stub.dutyScheduleCreateOld,
    update: Stub.dutyScheduleUpdateOld, del: Stub.dutyScheduleDeleteOld,
});
crud('/duty-shifts', {
    list: Stub.dutyShiftListOld, byId: Stub.dutyShiftByIdOld, create: Stub.dutyShiftCreateOld,
    update: Stub.dutyShiftUpdateOld, del: Stub.dutyShiftDeleteOld,
});
crud('/duty-handovers', {
    list: Stub.dutyHandoverListOld, byId: Stub.dutyHandoverByIdOld, create: Stub.dutyHandoverCreateOld,
    update: Stub.dutyHandoverUpdateOld, del: Stub.dutyHandoverDeleteOld,
});
/* ═══════ 13. 系统日志旧兼容路径 ═══════ */
router.get('/system-logs/list', Stub.systemLogListOld);
/* ═══════ 14. 平面图旧兼容路径 ═══════ */
crud('/floor-plans', { list: Stub.floorPlanListOld, byId: Stub.floorPlanByIdOld });
router.get('/floor-plans/:id/devices', Stub.floorPlanDevicesOld);
router.get('/floor-devices/list', Stub.floorDeviceListOld);
/* ═══════ 15. 报表旧兼容路径 ═══════ */
router.get('/reports/list', Stub.reportListOld);
/* ═══════ 16. 报警快照 ═══════ */
router.get('/alarm-snapshots/list', Stub.alarmSnapshotList);
/* ═══════ 17. 消控室配置 ═══════ */
router.get('/control-room-configs/list', Stub.controlRoomConfigList);
/* ═══════ 18. 人员管理 ═══════ */
crud('/personnel', {
    list: Stub.personnelList, byId: Stub.personnelById, create: Stub.personnelCreate,
    update: Stub.personnelUpdate, del: Stub.personnelDelete,
});
/* ═══════ 19. SIP 服务器状态 ═══════ */
router.get('/sip-server/status', Stub.sipServerStatus);
router.post('/sip-server/start', Stub.sipServerStart);
router.post('/sip-server/stop', Stub.sipServerStop);
/* ═══════ 20. 数据库统计 ═══════ */
router.get('/db/stats', Stub.dbStats);
/* ═══════ 21. 子系统 ═══════ */
router.get('/subsystems', Stub.subsystems);
/* ═══════ 22. 系统监控 ═══════ */
router.get('/system-monitor/metrics', Stub.systemMonitorMetrics);
router.get('/system-monitor/services', Stub.systemMonitorServices);
router.get('/system-monitor/logs', Stub.systemMonitorLogs);
/* ═══════ 23. 数据流转管道 ═══════ */
router.get('/iot/pipelines', Stub.iotPipelines);
/* ═══════ 24. 待办 ═══════ */
crud('/todos', {
    list: Stub.todoList, byId: Stub.todoById, create: Stub.todoCreate,
    update: Stub.todoUpdate, del: Stub.todoDelete,
});
/* ═══════ 25. IoT 协议配置旧兼容路径 ═══════ */
crud('/iot-protocols', {
    list: Stub.iotProtocolListOld, byId: Stub.iotProtocolByIdOld, create: Stub.iotProtocolCreateOld,
    update: Stub.iotProtocolUpdateOld, del: Stub.iotProtocolDeleteOld,
});
/* ═══════ 26. 角色旧兼容路径 ═══════ */
crud('/roles', {
    list: Stub.roleListOld, byId: Stub.roleByIdOld, create: Stub.roleCreateOld,
    update: Stub.roleUpdateOld, del: Stub.roleDeleteOld,
});
/* ═══════ 27. 权限旧兼容路径 ═══════ */
router.get('/permissions', Stub.permissionListOld);
/* ═══════ 28. 组织架构旧兼容路径 ═══════ */
crud('/departments', {
    list: Stub.departmentListOld, byId: Stub.departmentByIdOld, create: Stub.departmentCreateOld,
    update: Stub.departmentUpdateOld, del: Stub.departmentDeleteOld,
});
/* ═══════ 29. GB28181 设备兼容路径 ═══════ */
crud('/gb28181-devices', {
    list: Stub.gb28181DeviceList,
});
/* ═══════ 29. 维保单位旧兼容路径 ═══════ */
crud('/maintenance/companies', {
    list: Stub.maintCompanyListOld, byId: Stub.maintCompanyByIdOld, create: Stub.maintCompanyCreateOld,
    update: Stub.maintCompanyUpdateOld, del: Stub.maintCompanyDeleteOld,
});
/* ═══════ 30. AI 预警旧兼容路径 ═══════ */
router.post('/ai/alerts', Stub.aiAlertCreateOld);
router.put('/ai/alerts/:id', Stub.aiAlertUpdateOld);
router.delete('/ai/alerts/:id', Stub.aiAlertDeleteOld);
/* ═══════ 31. 系统配置旧兼容路径 ═══════ */
crud('/system/config', {
    list: Stub.systemConfigListOld, create: Stub.systemConfigCreateOld,
    update: Stub.systemConfigUpdateOld, del: Stub.systemConfigDeleteOld,
});
router.get('/system/logs', Stub.systemLogListOld);
router.get('/system/dashboard', (_req, res) => res.json((0, response_1.success)({})));
/* ═══════ 32. 值班旧兼容路径 /duty/* ═══════ */
router.get('/duty/schedules', Stub.dutyScheduleCompat);
router.get('/duty/logs', Stub.dutyLogCompat);
router.get('/duty/current', Stub.dutyCurrentCompat);
/* ═══════ 33. 大屏数据旧兼容路径 ═══════ */
router.get('/bigscreen/data', Stub.bigScreenOld);
/* ═══════ 34. 监控中心概览旧兼容路径 ═══════ */
router.get('/monitor/overview', Stub.monitorOverviewOld);
/* ═══════ 35. GIS 富数据 ═══════ */
router.get('/gis/points-rich', Stub.gisPointsRich);
/* ═══════ 36. 数据分析旧兼容路径 ═══════ */
router.get('/analysis/device', Stub.analysisDeviceOld);
router.get('/analysis/alarm', Stub.analysisAlarmOld);
router.get('/analysis/maintenance', Stub.analysisMaintenanceOld);
router.get('/analysis/hazard', Stub.analysisHazardOld);
router.get('/analysis/patrol', Stub.analysisPatrolOld);
/* ═══════ 37. 报表静态兜底 ═══════ */
router.get('/reports/daily', (_req, res) => res.json((0, response_1.success)({})));
router.get('/reports/weekly', (_req, res) => res.json((0, response_1.success)({})));
router.get('/reports/monthly', (_req, res) => res.json((0, response_1.success)({})));
router.get('/reports/device', (_req, res) => res.json((0, response_1.success)({})));
router.get('/reports/maintenance', (_req, res) => res.json((0, response_1.success)({})));
router.get('/reports/patrol', (_req, res) => res.json((0, response_1.success)({})));
/* ═══════ 38. 知识库旧兼容路径 ═══════ */
router.get('/knowledge', Stub.documentListOld);
router.get('/knowledge/categories', (_req, res) => {
    res.json((0, response_1.success)(['操作规范', '维保手册', '法规标准', '培训资料', '应急预案']));
});
/* ═══════ 39. 维保统计旧兼容路径 ═══════ */
router.get('/maintenance/stats', async (_req, res) => {
    try {
        const [[r]] = await database_1.default.query(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status=2 THEN 1 ELSE 0 END) as done
    FROM work_orders`);
        res.json((0, response_1.success)(r || { total: 0, done: 0 }));
    }
    catch {
        res.json((0, response_1.success)({ total: 0, done: 0 }));
    }
});
/* ═══════ 40. 培训旧兼容路径 ═══════ */
router.get('/training/courses', Stub.documentListOld);
router.get('/training/exams', Stub.documentListOld);
/* ═══════ 41. AI 决策旧兼容路径 ═══════ */
router.get('/ai/decisions', Stub.documentListOld);
router.get('/ai/alerts', Stub.documentListOld);
/* ═══════ 42. 巡检旧兼容路径 ═══════ */
router.get('/patrol/plans', Stub.patrolPlanListOld);
router.get('/patrol/records', Stub.patrolRecordListOld);
router.get('/patrol/hazards', Stub.hazardListOld);
exports.default = router;
//# sourceMappingURL=stub.routes.js.map