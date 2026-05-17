"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectionDeleteOld = exports.inspectionUpdateOld = exports.inspectionCreateOld = exports.inspectionByIdOld = exports.inspectionListOld = exports.drillDeleteOld = exports.drillUpdateOld = exports.drillCreateOld = exports.drillByIdOld = exports.drillListOld = exports.planDeleteOld = exports.planUpdateOld = exports.planCreateOld = exports.planByIdOld = exports.planListOld = exports.hazardDeleteOld = exports.hazardUpdateOld = exports.hazardCreateOld = exports.hazardByIdOld = exports.hazardListOld = exports.patrolRecordDeleteOld = exports.patrolRecordUpdateOld = exports.patrolRecordCreateOld = exports.patrolRecordByIdOld = exports.patrolRecordListOld = exports.patrolPlanDeleteOld = exports.patrolPlanUpdateOld = exports.patrolPlanCreateOld = exports.patrolPlanByIdOld = exports.patrolPlanListOld = exports.maintContractDelete = exports.maintContractUpdate = exports.maintContractCreate = exports.maintContractById = exports.maintContractList = exports.maintRecordDelete = exports.maintRecordUpdate = exports.maintRecordCreate = exports.maintRecordById = exports.maintRecordList = exports.workOrderDelete = exports.workOrderUpdate = exports.workOrderCreate = exports.workOrderById = exports.workOrderList = exports.cameraDelete = exports.cameraUpdate = exports.cameraCreate = exports.cameraById = exports.cameraList = void 0;
exports.departmentDeleteOld = exports.departmentUpdateOld = exports.departmentCreateOld = exports.departmentByIdOld = exports.iotProtocolDeleteOld = exports.iotProtocolUpdateOld = exports.iotProtocolCreateOld = exports.iotProtocolByIdOld = exports.iotProtocolListOld = exports.todoDelete = exports.todoUpdate = exports.todoCreate = exports.todoById = exports.todoList = exports.personnelDelete = exports.personnelUpdate = exports.personnelCreate = exports.personnelById = exports.personnelList = exports.controlRoomConfigList = exports.alarmSnapshotList = exports.reportListOld = exports.floorDeviceListOld = exports.floorPlanByIdOld = exports.floorPlanListOld = exports.systemLogListOld = exports.dutyHandoverDeleteOld = exports.dutyHandoverUpdateOld = exports.dutyHandoverCreateOld = exports.dutyHandoverByIdOld = exports.dutyHandoverListOld = exports.dutyShiftDeleteOld = exports.dutyShiftUpdateOld = exports.dutyShiftCreateOld = exports.dutyShiftByIdOld = exports.dutyShiftListOld = exports.dutyScheduleDeleteOld = exports.dutyScheduleUpdateOld = exports.dutyScheduleCreateOld = exports.dutyScheduleByIdOld = exports.dutyScheduleListOld = exports.notificationDelete = exports.notificationUpdate = exports.notificationCreate = exports.notificationList = exports.documentDeleteOld = exports.documentUpdateOld = exports.documentCreateOld = exports.documentByIdOld = exports.documentListOld = void 0;
exports.gb28181DeviceList = exports.dutyLogCompat = exports.dutyScheduleCompat = exports.systemConfigDeleteOld = exports.systemConfigUpdateOld = exports.systemConfigCreateOld = exports.systemConfigListOld = exports.aiAlertDeleteOld = exports.aiAlertUpdateOld = exports.aiAlertCreateOld = exports.maintCompanyDeleteOld = exports.maintCompanyUpdateOld = exports.maintCompanyCreateOld = exports.maintCompanyByIdOld = exports.maintCompanyListOld = void 0;
exports.iotDeviceStats = iotDeviceStats;
exports.notificationUnread = notificationUnread;
exports.notificationRead = notificationRead;
exports.floorPlanDevicesOld = floorPlanDevicesOld;
exports.sipServerStatus = sipServerStatus;
exports.sipServerStart = sipServerStart;
exports.sipServerStop = sipServerStop;
exports.dbStats = dbStats;
exports.subsystems = subsystems;
exports.systemMonitorMetrics = systemMonitorMetrics;
exports.systemMonitorServices = systemMonitorServices;
exports.systemMonitorLogs = systemMonitorLogs;
exports.iotPipelines = iotPipelines;
exports.roleListOld = roleListOld;
exports.roleByIdOld = roleByIdOld;
exports.roleCreateOld = roleCreateOld;
exports.roleUpdateOld = roleUpdateOld;
exports.roleDeleteOld = roleDeleteOld;
exports.permissionListOld = permissionListOld;
exports.departmentListOld = departmentListOld;
exports.dutyCurrentCompat = dutyCurrentCompat;
exports.bigScreenOld = bigScreenOld;
exports.monitorOverviewOld = monitorOverviewOld;
exports.gisPointsRich = gisPointsRich;
exports.analysisDeviceOld = analysisDeviceOld;
exports.analysisAlarmOld = analysisAlarmOld;
exports.analysisMaintenanceOld = analysisMaintenanceOld;
exports.analysisHazardOld = analysisHazardOld;
exports.analysisPatrolOld = analysisPatrolOld;
const database_1 = __importDefault(require("@/config/database"));
const logger_1 = __importDefault(require("@/config/logger"));
const response_1 = require("@/utils/response");
const validator_1 = require("@/utils/validator");
/* ───── 通用响应辅助 ───── */
function ok(data, msg = 'success') {
    return (0, response_1.success)(data, msg);
}
function emptyPage(pageSize = 20) {
    return (0, response_1.page)([], 0, 1, pageSize);
}
/* ───── 安全：只允许合法表名 ───── */
const ALLOWED_TABLES = new Set([
    'cameras', 'work_orders', 'maint_records', 'maint_contracts',
    'patrol_plans', 'patrol_records', 'hazards', 'plans', 'drills',
    'inspections', 'documents', 'notifications', 'duty_schedules',
    'duty_shifts', 'duty_handovers', 'system_logs', 'floor_plans',
    'floor_devices', 'reports', 'alarm_snapshots', 'control_room_configs',
    'training_courses', 'training_exams', 'ai_decisions', 'smart_alerts',
    'iot_protocols', 'iot_pipelines', 'todos', 'unit_personnel',
    'departments', 'sys_role', 'sys_permission',
    'gb28181_devices', 'fscn8001_device', 'fscn8001_alarm', 'fscn8001_raw_log',
    'gb26875_device', 'gb26875_alarm', 'gb26875_raw_log',
]);
function assertTable(name) {
    if (!ALLOWED_TABLES.has(name)) {
        throw new Error(`非法表名: ${name}`);
    }
}
/* ───── 通用列表查询 ───── */
async function queryList(req, tableName, columns = '*', orderBy = 'created_at DESC') {
    assertTable(tableName);
    const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
    const offset = (pageNum - 1) * pageSize;
    const keyword = (req.query.keyword || req.query.search || '');
    let where = '1=1';
    const params = [];
    if (keyword && keyword.trim()) {
        const textCols = ['name', 'title', 'plan_name', 'order_no', 'hazard_no', 'drill_no', 'inspect_no', 'course_name', 'exam_name', 'device_name'];
        const colChecks = textCols.map(c => `\`${c}\` LIKE ?`).join(' OR ');
        if (colChecks) {
            where = `(${colChecks})`;
            params.push(...textCols.map(() => `%${keyword}%`));
        }
    }
    const [countRows] = await database_1.default.query(`SELECT COUNT(*) as total FROM \`${tableName}\` WHERE ${where}`, { replacements: params, type: 'SELECT' });
    const total = countRows?.total || 0;
    const [rows] = await database_1.default.query(`SELECT ${columns} FROM \`${tableName}\` WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, { replacements: [...params, pageSize, offset], type: 'SELECT' });
    const rowArray = Array.isArray(rows) ? rows : (rows ? [rows] : []);
    return (0, response_1.page)(rowArray, total, pageNum, pageSize);
}
/* ───── 通用单条查询 ───── */
async function queryById(tableName, id) {
    assertTable(tableName);
    const [rows] = await database_1.default.query(`SELECT * FROM \`${tableName}\` WHERE id = ? LIMIT 1`, { replacements: [id], type: 'SELECT' });
    return ok(rows[0] || null);
}
/* ───── 通用字段名映射：前端 camelCase → 数据库 snake_case ───── */
const CAMEL_TO_SNAKE = {
    unitId: 'unit_id',
    unitName: 'unit_name',
    deviceId: 'device_id',
    registerTime: 'register_time',
    lastKeepalive: 'last_keepalive',
    channelCount: 'channel_count',
    catalogSynced: 'catalog_synced',
    ptzSupport: 'ptz_support',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    alarmType: 'alarm_type',
    deviceType: 'device_type',
    protocolType: 'protocol_type',
    archiveDeviceId: 'archive_device_id',
    deviceSn: 'device_sn',
    deviceNo: 'device_no',
    deviceName: 'device_name',
    lifecycleStatus: 'lifecycle_status',
    onlineStatus: 'online_status',
    lastOnline: 'last_online',
    ipAddress: 'ip_address',
    protocolConfig: 'protocol_config',
};
function toSnakeCase(key) {
    return CAMEL_TO_SNAKE[key] || key;
}
/* ───── 获取表列（用于过滤非法字段） ───── */
async function getTableColumns(tableName) {
    assertTable(tableName);
    try {
        const [rows] = await database_1.default.query(`SHOW COLUMNS FROM \`${tableName}\``);
        return rows.map(r => r.Field);
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        return null;
    }
}
/* ───── 通用创建 ───── */
async function createRow(req, tableName) {
    assertTable(tableName);
    const validFields = await getTableColumns(tableName);
    if (!validFields) {
        throw new Error(`无法获取表 ${tableName} 的列信息，拒绝创建`);
    }
    // camelCase → snake_case 映射
    const mappedBody = {};
    Object.keys(req.body).forEach(k => {
        const sk = toSnakeCase(k);
        if (validFields.includes(sk))
            mappedBody[sk] = req.body[k];
    });
    const cols = Object.keys(mappedBody).filter(k => k !== 'id');
    const vals = cols.map(k => mappedBody[k]);
    if (!cols.length)
        return ok(null);
    const [result] = await database_1.default.query(`INSERT INTO \`${tableName}\` (\`${cols.join('`,`')}\`) VALUES (${cols.map(() => '?').join(',')})`, { replacements: vals });
    const returnId = req.body.id !== undefined ? req.body.id : result.insertId;
    return ok({ id: returnId });
}
/* ───── 通用更新 ───── */
async function updateRow(req, tableName, id) {
    assertTable(tableName);
    const validFields = await getTableColumns(tableName);
    if (!validFields) {
        throw new Error(`无法获取表 ${tableName} 的列信息，拒绝更新`);
    }
    // camelCase → snake_case 映射
    const mappedBody = {};
    Object.keys(req.body).forEach(k => {
        const sk = toSnakeCase(k);
        if (validFields.includes(sk))
            mappedBody[sk] = req.body[k];
    });
    const cols = Object.keys(mappedBody).filter(k => k !== 'id');
    const vals = cols.map(k => mappedBody[k]);
    if (!cols.length)
        return ok(null);
    await database_1.default.query(`UPDATE \`${tableName}\` SET ${cols.map(c => `\`${c}\`=?`).join(',')} WHERE id=?`, { replacements: [...vals, id] });
    return ok(null);
}
/* ───── 通用删除 ───── */
async function deleteRow(tableName, id) {
    assertTable(tableName);
    await database_1.default.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, { replacements: [id] });
    return ok(null);
}
/* ═══════════════════════════════════════════════════════════
   工厂函数：自动生成标准 CRUD handler，消除 80% 重复代码
   ═══════════════════════════════════════════════════════════ */
function makeList(table) {
    return async (req, res) => {
        try {
            res.json(await queryList(req, table));
        }
        catch (err) {
            logger_1.default.error(`[Stub] ${table}List`, err);
            res.status(500).json((0, response_1.fail)(`查询失败: ${err?.message || '未知错误'}`, 500));
        }
    };
}
function makeById(table) {
    return async (req, res) => {
        try {
            res.json(await queryById(table, req.params.id));
        }
        catch (err) {
            logger_1.default.error(`[Stub] ${table}ById`, err);
            res.status(500).json((0, response_1.fail)(`查询失败: ${err?.message || '未知错误'}`, 500));
        }
    };
}
function makeCreate(table) {
    return async (req, res) => {
        try {
            res.json(await createRow(req, table));
        }
        catch (err) {
            logger_1.default.error(`[Stub] ${table}Create`, err);
            res.status(500).json((0, response_1.fail)(`创建失败: ${err?.message || '未知错误'}`, 500));
        }
    };
}
function makeUpdate(table) {
    return async (req, res) => {
        try {
            res.json(await updateRow(req, table, req.params.id));
        }
        catch (err) {
            logger_1.default.error(`[Stub] ${table}Update`, err);
            res.status(500).json((0, response_1.fail)(`更新失败: ${err?.message || '未知错误'}`, 500));
        }
    };
}
function makeDelete(table) {
    return async (req, res) => {
        try {
            res.json(await deleteRow(table, req.params.id));
        }
        catch (err) {
            logger_1.default.error(`[Stub] ${table}Delete`, err);
            res.status(500).json((0, response_1.fail)(`删除失败: ${err?.message || '未知错误'}`, 500));
        }
    };
}
/* ═══════════════════════════════════════════════════════════
   1. 摄像头 (cameras)
   ═══════════════════════════════════════════════════════════ */
exports.cameraList = makeList('cameras');
exports.cameraById = makeById('cameras');
exports.cameraCreate = makeCreate('cameras');
exports.cameraUpdate = makeUpdate('cameras');
exports.cameraDelete = makeDelete('cameras');
/* ═══════════════════════════════════════════════════════════
   2. IoT 设备统计
   ═══════════════════════════════════════════════════════════ */
async function iotDeviceStats(req, res) {
    try {
        const [rows] = await database_1.default.query(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as online,
      SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as offline,
      SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as fault
    FROM iot_devices`);
        const r = rows[0] || { total: 0, online: 0, offline: 0, fault: 0 };
        res.json(ok(r));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok({ total: 0, online: 0, offline: 0, fault: 0 }));
    }
}
/* ═══════════════════════════════════════════════════════════
   3. 维保工单 /work-orders/*
   ═══════════════════════════════════════════════════════════ */
exports.workOrderList = makeList('work_orders');
exports.workOrderById = makeById('work_orders');
exports.workOrderCreate = makeCreate('work_orders');
exports.workOrderUpdate = makeUpdate('work_orders');
exports.workOrderDelete = makeDelete('work_orders');
/* ═══════════════════════════════════════════════════════════
   4. 维保记录 /maint-records/*
   ═══════════════════════════════════════════════════════════ */
exports.maintRecordList = makeList('maint_records');
exports.maintRecordById = makeById('maint_records');
exports.maintRecordCreate = makeCreate('maint_records');
exports.maintRecordUpdate = makeUpdate('maint_records');
exports.maintRecordDelete = makeDelete('maint_records');
/* ═══════════════════════════════════════════════════════════
   5. 维保合同 /maint-contracts/*
   ═══════════════════════════════════════════════════════════ */
exports.maintContractList = makeList('maint_contracts');
exports.maintContractById = makeById('maint_contracts');
exports.maintContractCreate = makeCreate('maint_contracts');
exports.maintContractUpdate = makeUpdate('maint_contracts');
exports.maintContractDelete = makeDelete('maint_contracts');
/* ═══════════════════════════════════════════════════════════
   6. 巡检旧兼容 /patrol-plans/* /patrol-records/*
   ═══════════════════════════════════════════════════════════ */
exports.patrolPlanListOld = makeList('patrol_plans');
exports.patrolPlanByIdOld = makeById('patrol_plans');
exports.patrolPlanCreateOld = makeCreate('patrol_plans');
exports.patrolPlanUpdateOld = makeUpdate('patrol_plans');
exports.patrolPlanDeleteOld = makeDelete('patrol_plans');
exports.patrolRecordListOld = makeList('patrol_records');
exports.patrolRecordByIdOld = makeById('patrol_records');
exports.patrolRecordCreateOld = makeCreate('patrol_records');
exports.patrolRecordUpdateOld = makeUpdate('patrol_records');
exports.patrolRecordDeleteOld = makeDelete('patrol_records');
/* ═══════════════════════════════════════════════════════════
   7. 隐患旧兼容 /hazards/*
   ═══════════════════════════════════════════════════════════ */
exports.hazardListOld = makeList('hazards');
exports.hazardByIdOld = makeById('hazards');
exports.hazardCreateOld = makeCreate('hazards');
exports.hazardUpdateOld = makeUpdate('hazards');
exports.hazardDeleteOld = makeDelete('hazards');
/* ═══════════════════════════════════════════════════════════
   8. 预案/演练旧兼容 /plans/* /drills/*
   ═══════════════════════════════════════════════════════════ */
exports.planListOld = makeList('plans');
exports.planByIdOld = makeById('plans');
exports.planCreateOld = makeCreate('plans');
exports.planUpdateOld = makeUpdate('plans');
exports.planDeleteOld = makeDelete('plans');
exports.drillListOld = makeList('drills');
exports.drillByIdOld = makeById('drills');
exports.drillCreateOld = makeCreate('drills');
exports.drillUpdateOld = makeUpdate('drills');
exports.drillDeleteOld = makeDelete('drills');
/* ═══════════════════════════════════════════════════════════
   9. 检查旧兼容 /inspections/*
   ═══════════════════════════════════════════════════════════ */
exports.inspectionListOld = makeList('inspections');
exports.inspectionByIdOld = makeById('inspections');
exports.inspectionCreateOld = makeCreate('inspections');
exports.inspectionUpdateOld = makeUpdate('inspections');
exports.inspectionDeleteOld = makeDelete('inspections');
/* ═══════════════════════════════════════════════════════════
   10. 知识库旧兼容 /documents/*
   ═══════════════════════════════════════════════════════════ */
exports.documentListOld = makeList('documents');
exports.documentByIdOld = makeById('documents');
exports.documentCreateOld = makeCreate('documents');
exports.documentUpdateOld = makeUpdate('documents');
exports.documentDeleteOld = makeDelete('documents');
/* ═══════════════════════════════════════════════════════════
   11. 通知 /notifications/*
   ═══════════════════════════════════════════════════════════ */
exports.notificationList = makeList('notifications');
exports.notificationCreate = makeCreate('notifications');
exports.notificationUpdate = makeUpdate('notifications');
exports.notificationDelete = makeDelete('notifications');
async function notificationUnread(req, res) {
    try {
        const [rows] = await database_1.default.query('SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC LIMIT 20');
        res.json(ok(rows));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok([]));
    }
}
async function notificationRead(req, res) {
    try {
        await database_1.default.query('UPDATE notifications SET is_read = 1 WHERE id = ?', { replacements: [req.params.id] });
        res.json(ok(null));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok(null));
    }
}
/* ═══════════════════════════════════════════════════════════
   12. 值班旧兼容 /duty-schedules/* /duty-shifts/* /duty-handovers/*
   ═══════════════════════════════════════════════════════════ */
exports.dutyScheduleListOld = makeList('duty_schedules');
exports.dutyScheduleByIdOld = makeById('duty_schedules');
exports.dutyScheduleCreateOld = makeCreate('duty_schedules');
exports.dutyScheduleUpdateOld = makeUpdate('duty_schedules');
exports.dutyScheduleDeleteOld = makeDelete('duty_schedules');
exports.dutyShiftListOld = makeList('duty_shifts');
exports.dutyShiftByIdOld = makeById('duty_shifts');
exports.dutyShiftCreateOld = makeCreate('duty_shifts');
exports.dutyShiftUpdateOld = makeUpdate('duty_shifts');
exports.dutyShiftDeleteOld = makeDelete('duty_shifts');
exports.dutyHandoverListOld = makeList('duty_handovers');
exports.dutyHandoverByIdOld = makeById('duty_handovers');
exports.dutyHandoverCreateOld = makeCreate('duty_handovers');
exports.dutyHandoverUpdateOld = makeUpdate('duty_handovers');
exports.dutyHandoverDeleteOld = makeDelete('duty_handovers');
/* ═══════════════════════════════════════════════════════════
   13. 系统日志旧兼容 /system-logs/list
   ═══════════════════════════════════════════════════════════ */
exports.systemLogListOld = makeList('system_logs');
/* ═══════════════════════════════════════════════════════════
   14. 平面图旧兼容 /floor-plans/* /floor-devices/*
   ═══════════════════════════════════════════════════════════ */
exports.floorPlanListOld = makeList('floor_plans');
exports.floorPlanByIdOld = makeById('floor_plans');
exports.floorDeviceListOld = makeList('floor_devices');
async function floorPlanDevicesOld(req, res) {
    try {
        const [rows] = await database_1.default.query('SELECT * FROM floor_devices WHERE floor_plan_id = ?', { replacements: [req.params.id] });
        res.json(ok(rows));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok([]));
    }
}
/* ═══════════════════════════════════════════════════════════
   15. 报表旧兼容 /reports/list
   ═══════════════════════════════════════════════════════════ */
exports.reportListOld = makeList('reports');
/* ═══════════════════════════════════════════════════════════
   16. 报警快照 /alarm-snapshots/*
   ═══════════════════════════════════════════════════════════ */
exports.alarmSnapshotList = makeList('alarm_snapshots');
/* ═══════════════════════════════════════════════════════════
   17. 消控室配置 /control-room-configs/*
   ═══════════════════════════════════════════════════════════ */
exports.controlRoomConfigList = makeList('control_room_configs');
/* ═══════════════════════════════════════════════════════════
   18. 人员管理 /personnel/*
   ═══════════════════════════════════════════════════════════ */
exports.personnelList = makeList('unit_personnel');
exports.personnelById = makeById('unit_personnel');
exports.personnelCreate = makeCreate('unit_personnel');
exports.personnelUpdate = makeUpdate('unit_personnel');
exports.personnelDelete = makeDelete('unit_personnel');
/* ═══════════════════════════════════════════════════════════
   19. SIP 服务器状态（虚拟）
   ═══════════════════════════════════════════════════════════ */
let sipServerVirtualRunning = false;
async function sipServerStatus(req, res) {
    let registered = 0;
    try {
        const [rows] = await database_1.default.query("SELECT COUNT(*) AS c FROM gb28181_devices WHERE status = 'online'");
        registered = Number(rows[0]?.c || 0);
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        registered = 0;
    }
    res.json(ok({ running: sipServerVirtualRunning, port: 5060, transport: 'UDP', registered, max: 1000 }));
}
async function sipServerStart(req, res) {
    sipServerVirtualRunning = true;
    res.json(ok({ running: true }, 'SIP服务已标记为运行'));
}
async function sipServerStop(req, res) {
    sipServerVirtualRunning = false;
    res.json(ok({ running: false }, 'SIP服务已标记为停止'));
}
/* ═══════════════════════════════════════════════════════════
   20. 数据库统计 /db/stats
   ═══════════════════════════════════════════════════════════ */
async function dbStats(req, res) {
    try {
        const [rows] = await database_1.default.query(`SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema='fire_platform'`);
        const stats = {};
        rows.forEach(r => { stats[r.TABLE_NAME] = r.TABLE_ROWS || 0; });
        res.json(ok(stats));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok({}));
    }
}
/* ═══════════════════════════════════════════════════════════
   21. 子系统 /subsystems
   只返回三大核心消防子系统：消防给水、电气火灾、防排烟
   ═══════════════════════════════════════════════════════════ */
async function subsystems(req, res) {
    try {
        // 查询全局设备统计用于填充子系统数据
        const [[stats]] = await database_1.default.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 1 THEN 1 END) AS online,
        COUNT(CASE WHEN status = 3 THEN 1 END) AS alarm
      FROM fire_device
      WHERE device_type IS NOT NULL AND device_type != ''
    `);
        const total = Number(stats?.total) || 0;
        const online = Number(stats?.online) || 0;
        const alarm = Number(stats?.alarm) || 0;
        const now = new Date().toLocaleString('zh-CN', { hour12: false });
        // 固定三大子系统，将全局设备数均分展示（后续可按真实子系统设备表细化）
        const baseDevices = Math.max(1, Math.floor(total / 3));
        const baseOnline = Math.max(0, Math.floor(online / 3));
        const baseAlarm = Math.max(0, Math.floor(alarm / 3));
        const list = [
            {
                id: 'sub-water',
                name: '消防给水系统',
                type: 'water',
                unit: '1号楼',
                devices: baseDevices + (total % 3),
                online: baseOnline + (online % 3),
                status: (baseAlarm + (alarm % 3) > 0) ? 'fault' : (baseOnline + (online % 3) < baseDevices + (total % 3)) ? 'warning' : 'normal',
                lastUpdate: now,
            },
            {
                id: 'sub-elec',
                name: '电气火灾监控',
                type: 'elec',
                unit: '2号楼',
                devices: baseDevices,
                online: baseOnline,
                status: baseAlarm > 0 ? 'fault' : (baseOnline < baseDevices) ? 'warning' : 'normal',
                lastUpdate: now,
            },
            {
                id: 'sub-vent',
                name: '防排烟系统',
                type: 'vent',
                unit: '地下车库',
                devices: baseDevices,
                online: baseOnline,
                status: baseAlarm > 0 ? 'fault' : (baseOnline < baseDevices) ? 'warning' : 'normal',
                lastUpdate: now,
            },
        ];
        res.json(ok(list));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok([]));
    }
}
/* ═══════════════════════════════════════════════════════════
   22. 系统监控 /system-monitor/*
   ═══════════════════════════════════════════════════════════ */
async function systemMonitorMetrics(req, res) {
    try {
        const [[dev]] = await database_1.default.query(`SELECT COUNT(*) as c FROM device_archive`);
        const [[online]] = await database_1.default.query(`SELECT COUNT(*) as c FROM device_archive WHERE status='normal'`);
        const [[alarm]] = await database_1.default.query(`SELECT COUNT(*) as c FROM fire_alarm WHERE DATE(trigger_time) = CURDATE()`);
        res.json(ok({
            cpu: Math.floor(Math.random() * 30) + 20,
            memory: Math.floor(Math.random() * 20) + 40,
            disk: Math.floor(Math.random() * 10) + 50,
            network: Math.floor(Math.random() * 100),
            deviceTotal: dev?.c || 0,
            deviceOnline: online?.c || 0,
            alarmToday: alarm?.c || 0,
        }));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok({ cpu: 30, memory: 50, disk: 60, network: 0, deviceTotal: 0, deviceOnline: 0, alarmToday: 0 }));
    }
}
async function systemMonitorServices(req, res) {
    res.json(ok([
        { name: 'fire-api', status: 'running', uptime: '99.9%' },
        { name: 'mysql', status: 'running', uptime: '99.9%' },
        { name: 'redis', status: 'running', uptime: '99.9%' },
        { name: 'nginx', status: 'running', uptime: '99.9%' },
    ]));
}
async function systemMonitorLogs(req, res) {
    res.json(ok([]));
}
/* ═══════════════════════════════════════════════════════════
   23. 数据流转管道 /iot/pipelines
   ═══════════════════════════════════════════════════════════ */
async function iotPipelines(req, res) {
    try {
        const [rows] = await database_1.default.query(`SELECT * FROM iot_pipelines ORDER BY created_at DESC`);
        const kafkaTopics = [];
        const influxMetrics = [];
        for (const r of rows) {
            const name = r.name || r.pipeline_name || '未命名';
            const target = (r.target || '').toLowerCase();
            const cfg = typeof r.config === 'string' ? JSON.parse(r.config) : (r.config || {});
            const base = {
                name, partitions: cfg.partitions || 1,
                messagesPerSec: r.rate || Math.floor(Math.random() * 200),
                lag: r.lag || Math.floor(Math.random() * 10),
                consumers: r.consumers || Math.floor(Math.random() * 3) + 1,
                status: r.status === 1 ? 'healthy' : 'warning'
            };
            if (target.includes('kafka') || name.toLowerCase().includes('kafka')) {
                kafkaTopics.push(base);
            }
            else if (target.includes('influx') || name.toLowerCase().includes('influx')) {
                influxMetrics.push({
                    measurement: name, points: r.points || Math.floor(Math.random() * 1000000),
                    retention: cfg.retention || '30d',
                    lastWrite: r.last_write || new Date().toISOString(),
                    writeRate: r.rate || Math.floor(Math.random() * 500)
                });
            }
            else {
                kafkaTopics.push({ ...base, messagesPerSec: r.rate || 0, lag: r.lag || 0, consumers: r.consumers || 1, status: 'healthy' });
            }
        }
        res.json(ok({ kafkaTopics, influxMetrics }));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok({ kafkaTopics: [], influxMetrics: [] }));
    }
}
/* ═══════════════════════════════════════════════════════════
   24. 待办 /todos/*
   ═══════════════════════════════════════════════════════════ */
exports.todoList = makeList('todos');
exports.todoById = makeById('todos');
exports.todoCreate = makeCreate('todos');
exports.todoUpdate = makeUpdate('todos');
exports.todoDelete = makeDelete('todos');
/* ═══════════════════════════════════════════════════════════
   25. IoT 协议配置旧兼容 /iot-protocols/*
   ═══════════════════════════════════════════════════════════ */
exports.iotProtocolListOld = makeList('iot_protocols');
exports.iotProtocolByIdOld = makeById('iot_protocols');
exports.iotProtocolCreateOld = makeCreate('iot_protocols');
exports.iotProtocolUpdateOld = makeUpdate('iot_protocols');
exports.iotProtocolDeleteOld = makeDelete('iot_protocols');
/* ═══════════════════════════════════════════════════════════
   26. 角色旧兼容 /roles/* (字段映射)
   ═══════════════════════════════════════════════════════════ */
async function roleListOld(req, res) {
    try {
        const [rows] = await database_1.default.query('SELECT id, role_code as code, role_name as name, description, status, created_at FROM sys_role');
        res.json(ok(rows));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok([]));
    }
}
async function roleByIdOld(req, res) {
    try {
        const [rows] = await database_1.default.query('SELECT id, role_code as code, role_name as name, description, status, created_at FROM sys_role WHERE id = ?', { replacements: [req.params.id] });
        res.json(ok(rows[0] || null));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok(null));
    }
}
async function roleCreateOld(req, res) {
    try {
        const { name, code, description, status } = req.body;
        const [result] = await database_1.default.query(`INSERT INTO sys_role (role_name, role_code, description, status) VALUES (?, ?, ?, ?)`, { replacements: [name, code, description, status === undefined ? 1 : status] });
        res.json(ok({ id: result.insertId }));
    }
    catch (err) {
        res.json(ok(null, err.message));
    }
}
async function roleUpdateOld(req, res) {
    try {
        const { name, code, description, status } = req.body;
        await database_1.default.query(`UPDATE sys_role SET role_name=?, role_code=?, description=?, status=? WHERE id=?`, { replacements: [name, code, description, status, req.params.id] });
        res.json(ok(null));
    }
    catch (err) {
        res.json(ok(null, err.message));
    }
}
async function roleDeleteOld(req, res) {
    try {
        await database_1.default.query(`DELETE FROM sys_role WHERE id = ?`, { replacements: [req.params.id] });
        res.json(ok(null));
    }
    catch (err) {
        res.json(ok(null, err.message));
    }
}
/* ═══════════════════════════════════════════════════════════
   27. 权限旧兼容 /permissions (字段映射)
   ═══════════════════════════════════════════════════════════ */
async function permissionListOld(req, res) {
    try {
        const [rows] = await database_1.default.query('SELECT id, permission_code as code, permission_name as name, description, status FROM sys_permission');
        res.json(ok(rows));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok([]));
    }
}
/* ═══════════════════════════════════════════════════════════
   28. 组织架构旧兼容 /departments/*
   ═══════════════════════════════════════════════════════════ */
async function departmentListOld(req, res) {
    try {
        const [rows] = await database_1.default.query('SELECT * FROM departments');
        res.json(ok(rows));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok([]));
    }
}
exports.departmentByIdOld = makeById('departments');
exports.departmentCreateOld = makeCreate('departments');
exports.departmentUpdateOld = makeUpdate('departments');
exports.departmentDeleteOld = makeDelete('departments');
/* ═══════════════════════════════════════════════════════════
   29. 维保单位旧兼容 /maintenance/companies → departments
   ═══════════════════════════════════════════════════════════ */
exports.maintCompanyListOld = makeList('departments');
exports.maintCompanyByIdOld = makeById('departments');
exports.maintCompanyCreateOld = makeCreate('departments');
exports.maintCompanyUpdateOld = makeUpdate('departments');
exports.maintCompanyDeleteOld = makeDelete('departments');
/* ═══════════════════════════════════════════════════════════
   30. AI 预警旧兼容 /ai/alerts (CRUD)
   ═══════════════════════════════════════════════════════════ */
exports.aiAlertCreateOld = makeCreate('smart_alerts');
exports.aiAlertUpdateOld = makeUpdate('smart_alerts');
exports.aiAlertDeleteOld = makeDelete('smart_alerts');
/* ═══════════════════════════════════════════════════════════
   31. 系统配置旧兼容 /system/config (实际查询 system_logs)
   ═══════════════════════════════════════════════════════════ */
exports.systemConfigListOld = makeList('system_logs');
exports.systemConfigCreateOld = makeCreate('system_logs');
exports.systemConfigUpdateOld = makeUpdate('system_logs');
exports.systemConfigDeleteOld = makeDelete('system_logs');
/* ═══════════════════════════════════════════════════════════
   32. 值班旧兼容 /duty/*
   ═══════════════════════════════════════════════════════════ */
exports.dutyScheduleCompat = makeList('duty_schedules');
exports.dutyLogCompat = makeList('duty_logs');
async function dutyCurrentCompat(req, res) {
    res.json(ok(null));
}
/* ═══════════════════════════════════════════════════════════
   33. 大屏数据 /bigscreen/data
   ═══════════════════════════════════════════════════════════ */
async function bigScreenOld(req, res) {
    try {
        const [[units]] = await database_1.default.query('SELECT COUNT(*) as c FROM units');
        const [[devices]] = await database_1.default.query('SELECT COUNT(*) as c FROM device_archive');
        const [[online]] = await database_1.default.query(`SELECT COUNT(*) as c FROM device_archive WHERE status='normal'`);
        const [[alarms]] = await database_1.default.query(`SELECT COUNT(*) as c FROM fire_alarm WHERE DATE(trigger_time) = CURDATE()`);
        res.json(ok({
            summary: {
                unitCount: units?.c || 0,
                deviceCount: devices?.c || 0,
                onlineCount: online?.c || 0,
                onlineRate: devices?.c ? ((online?.c / devices?.c) * 100).toFixed(1) : '0.0',
                alarmTotal: alarms?.c || 0,
                alarmToday: alarms?.c || 0
            },
            workOrder: { total: 0, done: 0 },
            patrol: { month: 0 },
            hazard: { total: 0 },
            inspection: { month: 0 },
            recentAlarms: [],
            alarmTrend: []
        }));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok({ summary: { unitCount: 0, deviceCount: 0, onlineCount: 0, onlineRate: '0.0', alarmTotal: 0, alarmToday: 0 } }));
    }
}
/* ═══════════════════════════════════════════════════════════
   34. 监控中心概览旧兼容 /monitor/overview
   ═══════════════════════════════════════════════════════════ */
async function monitorOverviewOld(req, res) {
    try {
        const [[dev]] = await database_1.default.query(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status='normal' THEN 1 ELSE 0 END) as online,
      SUM(CASE WHEN status='fault' THEN 1 ELSE 0 END) as fault,
      SUM(CASE WHEN status='offline' THEN 1 ELSE 0 END) as offline
    FROM device_archive`);
        const [[alm]] = await database_1.default.query(`SELECT 
      SUM(CASE WHEN alarm_type=1 THEN 1 ELSE 0 END) as fire,
      SUM(CASE WHEN alarm_type=2 THEN 1 ELSE 0 END) as fault
    FROM fire_alarm`);
        res.json(ok({
            deviceStats: [
                { status: 1, count: dev?.online || 0 },
                { status: 2, count: dev?.fault || 0 },
                { status: 3, count: dev?.offline || 0 }
            ],
            alarmStats: [
                { alarm_type: 1, count: alm?.fire || 0 },
                { alarm_type: 2, count: alm?.fault || 0 }
            ],
            unitStats: [{ unit_type: 2, count: 0 }]
        }));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok({ deviceStats: [], alarmStats: [], unitStats: [] }));
    }
}
/* ═══════════════════════════════════════════════════════════
   35. GIS 富数据 /gis/points-rich
   ═══════════════════════════════════════════════════════════ */
async function gisPointsRich(req, res) {
    try {
        const [rows] = await database_1.default.query(`SELECT 
      u.id, u.name, u.type, u.address, u.lng, u.lat,
      COUNT(DISTINCT da.id) as deviceCount,
      SUM(CASE WHEN da.status = 'normal' THEN 1 ELSE 0 END) as onlineCount
    FROM units u
    LEFT JOIN device_archive da ON da.unit_id = u.id
    WHERE u.lng IS NOT NULL AND u.lat IS NOT NULL
    GROUP BY u.id, u.name, u.type, u.address, u.lng, u.lat`);
        res.json(ok(rows.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type === 'key' || r.type === 'general' || r.type === 'nine-small' ? r.type : 'general',
            lng: r.lng,
            lat: r.lat,
            address: r.address || '',
            unitType: r.type === 'key' ? '重点单位' : r.type === 'nine-small' ? '九小场所' : '一般单位',
            devices: r.deviceCount || 0,
            deviceCount: r.deviceCount || 0,
            onlineCount: r.onlineCount || 0,
            online: (r.onlineCount || 0) > 0,
            alarm: 0,
            fault: 0,
            controlRoom: false,
        }))));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok([]));
    }
}
/* ═══════════════════════════════════════════════════════════
   36. 数据分析旧兼容路径
   ═══════════════════════════════════════════════════════════ */
async function analysisDeviceOld(req, res) {
    try {
        const [byType] = await database_1.default.query(`SELECT category as device_type, COUNT(*) as count FROM device_archive GROUP BY category`);
        const [byStatus] = await database_1.default.query(`SELECT 
      CASE WHEN status='normal' THEN 1 WHEN status='fault' THEN 2 ELSE 3 END as status,
      COUNT(*) as count FROM device_archive GROUP BY status`);
        res.json(ok({ byType: byType || [], byStatus: byStatus || [] }));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok({ byType: [], byStatus: [] }));
    }
}
async function analysisAlarmOld(req, res) {
    try {
        const [byType] = await database_1.default.query(`SELECT alarm_type, COUNT(*) as count FROM fire_alarm GROUP BY alarm_type`);
        const [byLevel] = await database_1.default.query(`SELECT alarm_level, COUNT(*) as count FROM fire_alarm GROUP BY alarm_level`);
        res.json(ok({ byType: byType || [], byLevel: byLevel || [] }));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok({ byType: [], byLevel: [] }));
    }
}
async function analysisMaintenanceOld(req, res) {
    try {
        const [byStatus] = await database_1.default.query('SELECT status, COUNT(*) as count FROM work_orders GROUP BY status');
        const [byType] = await database_1.default.query('SELECT order_type, COUNT(*) as count FROM work_orders GROUP BY order_type');
        res.json(ok({ byStatus: byStatus || [], byType: byType || [] }));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok({ byStatus: [], byType: [] }));
    }
}
async function analysisHazardOld(req, res) {
    try {
        const [byType] = await database_1.default.query('SELECT level as hazard_type, COUNT(*) as count FROM hazards GROUP BY level');
        const [byLevel] = await database_1.default.query('SELECT level, COUNT(*) as count FROM hazards GROUP BY level');
        res.json(ok({ byType: byType || [], byLevel: byLevel || [] }));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok({ byType: [], byLevel: [] }));
    }
}
async function analysisPatrolOld(req, res) {
    try {
        const [[r]] = await database_1.default.query('SELECT COUNT(*) as total FROM patrol_records');
        res.json(ok({ total: r?.total || 0, normal: 0, abnormal: 0, rate: '0.0' }));
    }
    catch (err) {
        logger_1.default.warn('[Stub] catch error:', err?.message || err);
        res.json(ok({ total: 0, normal: 0, abnormal: 0, rate: '0.0' }));
    }
}
/* ═══════════════════════════════════════════════════════════
   28. GB28181 设备兼容 /gb28181-devices/*
   ═══════════════════════════════════════════════════════════ */
exports.gb28181DeviceList = makeList('gb28181_devices');
//# sourceMappingURL=stub.controller.js.map