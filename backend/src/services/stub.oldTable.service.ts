/**
 * ═══════════════════════════════════════════════════════════════════
 * Stub OldTable Service - 旧表 SQL 查询与通用 CRUD 工厂
 * 为新版 TS 后端中缺失的表提供基于原始 SQL 的 CRUD 支持
 * ═══════════════════════════════════════════════════════════════════
 */
import { Request, Response } from 'express';
import sequelize from '@/config/database';
import logger from '@/config/logger';
import { success, page as pageEnvelope, fail } from '@/utils/response';
import { sanitizePagination } from '@/utils/validator';

/* ───── 通用响应辅助 ───── */
export function ok(data: unknown, msg = 'success') {
  return success(data, msg);
}

/* ───── 安全：只允许合法表名 ───── */
export const ALLOWED_TABLES = new Set([
  'cameras', 'work_orders', 'maint_records', 'maint_contracts',
  'patrol_plans', 'patrol_records', 'hazards', 'plans', 'drills',
  'inspections', 'documents', 'notifications', 'duty_schedules',
  'duty_shifts', 'duty_handovers', 'system_logs', 'floor_plans',
  'floor_devices', 'reports', 'alarm_snapshots', 'control_room_configs',
  'ai_decisions', 'smart_alerts',
  'iot_protocols', 'iot_pipelines', 'todos',
  'departments', 'sys_role', 'sys_permission',
  'gb28181_devices', 'fscn8001_device', 'fscn8001_alarm', 'fscn8001_raw_log',
  'gb26875_device', 'gb26875_alarm', 'gb26875_raw_log',
]);

export function assertTable(name: string) {
  if (!ALLOWED_TABLES.has(name)) {
    throw new Error(`非法表名: ${name}`);
  }
}

/* ───── 通用列表查询 ───── */
export async function queryList(
  req: Request,
  tableName: string,
  columns = '*',
  orderBy = 'created_at DESC'
) {
  assertTable(tableName);
  const { pageNum, pageSize } = sanitizePagination(req);
  const offset = (pageNum - 1) * pageSize;
  const keyword = (req.query.keyword || req.query.search || '') as string;

  let where = '1=1';
  const params: unknown[] = [];
  if (keyword && keyword.trim()) {
    const textCols = ['name', 'title', 'plan_name', 'order_no', 'hazard_no', 'drill_no', 'inspect_no', 'course_name', 'exam_name', 'device_name'];
    const colChecks = textCols.map(c => `\`${c}\` LIKE ?`).join(' OR ');
    if (colChecks) {
      where = `(${colChecks})`;
      params.push(...textCols.map(() => `%${keyword}%`));
    }
  }

  const [countRows] = await sequelize.query(
    `SELECT COUNT(*) as total FROM \`${tableName}\` WHERE ${where}`,
    { replacements: params, type: 'SELECT' }
  );
  const total = (countRows as any)?.total || 0;

  const [rows] = await sequelize.query(
    `SELECT ${columns} FROM \`${tableName}\` WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    { replacements: [...params, pageSize, offset], type: 'SELECT' }
  );

  const rowArray = Array.isArray(rows) ? rows : (rows ? [rows] : []);
  return pageEnvelope(rowArray as unknown[], total as number, pageNum, pageSize);
}

/* ───── 通用单条查询 ───── */
export async function queryById(tableName: string, id: string) {
  assertTable(tableName);
  const [rows] = await sequelize.query(
    `SELECT * FROM \`${tableName}\` WHERE id = ? LIMIT 1`,
    { replacements: [id], type: 'SELECT' }
  );
  return ok((rows as any[])[0] || null);
}

/* ───── 通用字段名映射：前端 camelCase → 数据库 snake_case ───── */
export const CAMEL_TO_SNAKE: Record<string, string> = {
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

export function toSnakeCase(key: string): string {
  return CAMEL_TO_SNAKE[key] || key;
}

/* ───── 获取表列（用于过滤非法字段） ───── */
export async function getTableColumns(tableName: string): Promise<string[] | null> {
  assertTable(tableName);
  try {
    const [rows] = await sequelize.query(`SHOW COLUMNS FROM \`${tableName}\``);
    return (rows as any[]).map(r => r.Field);
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    return null;
  }
}

/* ───── 通用创建 ───── */
export async function createRow(req: Request, tableName: string) {
  assertTable(tableName);
  const validFields = await getTableColumns(tableName);
  if (!validFields) {
    throw new Error(`无法获取表 ${tableName} 的列信息，拒绝创建`);
  }
  const mappedBody: Record<string, any> = {};
  Object.keys(req.body).forEach(k => {
    const sk = toSnakeCase(k);
    if (validFields.includes(sk)) mappedBody[sk] = req.body[k];
  });
  const cols = Object.keys(mappedBody).filter(k => k !== 'id');
  const vals = cols.map(k => mappedBody[k]);
  if (!cols.length) return ok(null);
  const [result] = await sequelize.query(
    `INSERT INTO \`${tableName}\` (\`${cols.join('`,`')}\`) VALUES (${cols.map(() => '?').join(',')})`,
    { replacements: vals }
  );
  const returnId = req.body.id !== undefined ? req.body.id : (result as any).insertId;
  return ok({ id: returnId });
}

/* ───── 通用更新 ───── */
export async function updateRow(req: Request, tableName: string, id: string) {
  assertTable(tableName);
  const validFields = await getTableColumns(tableName);
  if (!validFields) {
    throw new Error(`无法获取表 ${tableName} 的列信息，拒绝更新`);
  }
  const mappedBody: Record<string, any> = {};
  Object.keys(req.body).forEach(k => {
    const sk = toSnakeCase(k);
    if (validFields.includes(sk)) mappedBody[sk] = req.body[k];
  });
  const cols = Object.keys(mappedBody).filter(k => k !== 'id');
  const vals = cols.map(k => mappedBody[k]);
  if (!cols.length) return ok(null);
  await sequelize.query(
    `UPDATE \`${tableName}\` SET ${cols.map(c => `\`${c}\`=?`).join(',')} WHERE id=?`,
    { replacements: [...vals, id] }
  );
  return ok(null);
}

/* ───── 通用删除 ───── */
export async function deleteRow(tableName: string, id: string) {
  assertTable(tableName);
  await sequelize.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, { replacements: [id] });
  return ok(null);
}

/* ═══════════════════════════════════════════════════════════
   工厂函数：自动生成标准 CRUD handler
   ═══════════════════════════════════════════════════════════ */

export function makeList(table: string) {
  return async (req: Request, res: Response) => {
    try { res.json(await queryList(req, table)); }
    catch (err: any) { logger.error(`[Stub] ${table}List`, err); res.status(500).json(fail(`查询失败: ${err?.message || '未知错误'}`, 500)); }
  };
}

export function makeById(table: string) {
  return async (req: Request, res: Response) => {
    try { res.json(await queryById(table, req.params.id)); }
    catch (err: any) { logger.error(`[Stub] ${table}ById`, err); res.status(500).json(fail(`查询失败: ${err?.message || '未知错误'}`, 500)); }
  };
}

export function makeCreate(table: string) {
  return async (req: Request, res: Response) => {
    try { res.json(await createRow(req, table)); }
    catch (err: any) { logger.error(`[Stub] ${table}Create`, err); res.status(500).json(fail(`创建失败: ${err?.message || '未知错误'}`, 500)); }
  };
}

export function makeUpdate(table: string) {
  return async (req: Request, res: Response) => {
    try { res.json(await updateRow(req, table, req.params.id)); }
    catch (err: any) { logger.error(`[Stub] ${table}Update`, err); res.status(500).json(fail(`更新失败: ${err?.message || '未知错误'}`, 500)); }
  };
}

export function makeDelete(table: string) {
  return async (req: Request, res: Response) => {
    try { res.json(await deleteRow(table, req.params.id)); }
    catch (err: any) { logger.error(`[Stub] ${table}Delete`, err); res.status(500).json(fail(`删除失败: ${err?.message || '未知错误'}`, 500)); }
  };
}

/* ═══════════════════════════════════════════════════════════
   1. 摄像头 (cameras)
   ═══════════════════════════════════════════════════════════ */
export const cameraList = makeList('cameras');
export const cameraById = makeById('cameras');
export const cameraCreate = makeCreate('cameras');
export const cameraUpdate = makeUpdate('cameras');
export const cameraDelete = makeDelete('cameras');

/* ═══════════════════════════════════════════════════════════
   2. IoT 设备统计
   ═══════════════════════════════════════════════════════════ */
export async function iotDeviceStats(_req: Request, res: Response) {
  try {
    const [rows] = await sequelize.query(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN online_status = 1 THEN 1 ELSE 0 END) as online,
      SUM(CASE WHEN online_status = 0 THEN 1 ELSE 0 END) as offline,
      SUM(CASE WHEN online_status = 2 THEN 1 ELSE 0 END) as fault
    FROM fire_iot_device`);
    const r = (rows as any[])[0] || { total: 0, online: 0, offline: 0, fault: 0 };
    res.json(ok(r));
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    res.json(ok({ total: 0, online: 0, offline: 0, fault: 0 }));
  }
}

/* ═══════════════════════════════════════════════════════════
   3. 维保工单 /work-orders/*
   ═══════════════════════════════════════════════════════════ */
export const workOrderList = makeList('work_orders');
export const workOrderById = makeById('work_orders');
export const workOrderCreate = makeCreate('work_orders');
export const workOrderUpdate = makeUpdate('work_orders');
export const workOrderDelete = makeDelete('work_orders');

/* ═══════════════════════════════════════════════════════════
   4. 维保记录 /maint-records/*
   ═══════════════════════════════════════════════════════════ */
export const maintRecordList = makeList('maint_records');
export const maintRecordById = makeById('maint_records');
export const maintRecordCreate = makeCreate('maint_records');
export const maintRecordUpdate = makeUpdate('maint_records');
export const maintRecordDelete = makeDelete('maint_records');

/* ═══════════════════════════════════════════════════════════
   5. 维保合同 /maint-contracts/*
   ═══════════════════════════════════════════════════════════ */
export const maintContractList = makeList('maint_contracts');
export const maintContractById = makeById('maint_contracts');
export const maintContractCreate = makeCreate('maint_contracts');
export const maintContractUpdate = makeUpdate('maint_contracts');
export const maintContractDelete = makeDelete('maint_contracts');

/* ═══════════════════════════════════════════════════════════
   6. 巡检旧兼容 /patrol-plans/* /patrol-records/*
   ═══════════════════════════════════════════════════════════ */
export const patrolPlanListOld = makeList('patrol_plans');
export const patrolPlanByIdOld = makeById('patrol_plans');
export const patrolPlanCreateOld = makeCreate('patrol_plans');
export const patrolPlanUpdateOld = makeUpdate('patrol_plans');
export const patrolPlanDeleteOld = makeDelete('patrol_plans');

export const patrolRecordListOld = makeList('patrol_records');
export const patrolRecordByIdOld = makeById('patrol_records');
export const patrolRecordCreateOld = makeCreate('patrol_records');
export const patrolRecordUpdateOld = makeUpdate('patrol_records');
export const patrolRecordDeleteOld = makeDelete('patrol_records');

/* ═══════════════════════════════════════════════════════════
   7. 隐患旧兼容 /hazards/*
   ═══════════════════════════════════════════════════════════ */
export const hazardListOld = makeList('hazards');
export const hazardByIdOld = makeById('hazards');
export const hazardCreateOld = makeCreate('hazards');
export const hazardUpdateOld = makeUpdate('hazards');
export const hazardDeleteOld = makeDelete('hazards');

/* ═══════════════════════════════════════════════════════════
   8. 预案/演练旧兼容 /plans/* /drills/*
   ═══════════════════════════════════════════════════════════ */
export const planListOld = makeList('plans');
export const planByIdOld = makeById('plans');
export const planCreateOld = makeCreate('plans');
export const planUpdateOld = makeUpdate('plans');
export const planDeleteOld = makeDelete('plans');

export const drillListOld = makeList('drills');
export const drillByIdOld = makeById('drills');
export const drillCreateOld = makeCreate('drills');
export const drillUpdateOld = makeUpdate('drills');
export const drillDeleteOld = makeDelete('drills');

/* ═══════════════════════════════════════════════════════════
   10. 知识库旧兼容 /documents/*
   ═══════════════════════════════════════════════════════════ */
export const documentListOld = makeList('documents');
export const documentByIdOld = makeById('documents');
export const documentCreateOld = makeCreate('documents');
export const documentUpdateOld = makeUpdate('documents');
export const documentDeleteOld = makeDelete('documents');

/* ═══════════════════════════════════════════════════════════
   11. 通知 /notifications/*
   ═══════════════════════════════════════════════════════════ */
export const notificationList = makeList('notifications');
export const notificationCreate = makeCreate('notifications');
export const notificationUpdate = makeUpdate('notifications');
export const notificationDelete = makeDelete('notifications');

export async function notificationUnread(_req: Request, res: Response) {
  try {
    const [rows] = await sequelize.query(
      'SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC LIMIT 20'
    );
    res.json(ok(rows));
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    res.json(ok([]));
  }
}

export async function notificationRead(req: Request, res: Response) {
  try {
    await sequelize.query('UPDATE notifications SET is_read = 1 WHERE id = ?', { replacements: [req.params.id] });
    res.json(ok(null));
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    res.json(ok(null));
  }
}

/* ═══════════════════════════════════════════════════════════
   12. 值班旧兼容 /duty-schedules/* /duty-shifts/* /duty-handovers/*
   ═══════════════════════════════════════════════════════════ */
export const dutyScheduleListOld = makeList('duty_schedules');
export const dutyScheduleByIdOld = makeById('duty_schedules');
export const dutyScheduleCreateOld = makeCreate('duty_schedules');
export const dutyScheduleUpdateOld = makeUpdate('duty_schedules');
export const dutyScheduleDeleteOld = makeDelete('duty_schedules');

export const dutyShiftListOld = makeList('duty_shifts');
export const dutyShiftByIdOld = makeById('duty_shifts');
export const dutyShiftCreateOld = makeCreate('duty_shifts');
export const dutyShiftUpdateOld = makeUpdate('duty_shifts');
export const dutyShiftDeleteOld = makeDelete('duty_shifts');

export const dutyHandoverListOld = makeList('duty_handovers');
export const dutyHandoverByIdOld = makeById('duty_handovers');
export const dutyHandoverCreateOld = makeCreate('duty_handovers');
export const dutyHandoverUpdateOld = makeUpdate('duty_handovers');
export const dutyHandoverDeleteOld = makeDelete('duty_handovers');

/* ═══════════════════════════════════════════════════════════
   13. 系统日志旧兼容 /system-logs/list
   ═══════════════════════════════════════════════════════════ */
export const systemLogListOld = makeList('system_logs');

/* ═══════════════════════════════════════════════════════════
   14. 平面图旧兼容 /floor-plans/* /floor-devices/*
   ═══════════════════════════════════════════════════════════ */
export const floorPlanListOld = makeList('floor_plans');
export const floorPlanByIdOld = makeById('floor_plans');
export const floorDeviceListOld = makeList('floor_devices');

export async function floorPlanDevicesOld(req: Request, res: Response) {
  try {
    const [rows] = await sequelize.query(
      'SELECT * FROM floor_devices WHERE floor_plan_id = ?',
      { replacements: [req.params.id] }
    );
    res.json(ok(rows));
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    res.json(ok([]));
  }
}

/* ═══════════════════════════════════════════════════════════
   15. 报表旧兼容 /reports/list
   ═══════════════════════════════════════════════════════════ */
export const reportListOld = makeList('reports');

/* ═══════════════════════════════════════════════════════════
   16. 报警快照 /alarm-snapshots/*
   ═══════════════════════════════════════════════════════════ */
export const alarmSnapshotList = makeList('alarm_snapshots');

/* ═══════════════════════════════════════════════════════════
   17. 消控室配置 /control-room-configs/*
   ═══════════════════════════════════════════════════════════ */
export const controlRoomConfigList = makeList('control_room_configs');

/* ═══════════════════════════════════════════════════════════
   19. SIP 服务器状态（虚拟）
   ═══════════════════════════════════════════════════════════ */
export let sipServerVirtualRunning = false;

export function setSipServerRunning(value: boolean) {
  sipServerVirtualRunning = value;
}

export async function sipServerStatus(_req: Request, res: Response) {
  let registered = 0;
  try {
    const [rows] = await sequelize.query(
      "SELECT COUNT(*) AS c FROM gb28181_devices WHERE status = 'online'"
    );
    registered = Number((rows as any[])[0]?.c || 0);
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    registered = 0;
  }
  res.json(ok({ running: sipServerVirtualRunning, port: 5060, transport: 'UDP', registered, max: 1000 }));
}

/* ═══════════════════════════════════════════════════════════
   20. 数据库统计 /db/stats
   ═══════════════════════════════════════════════════════════ */
export async function dbStats(_req: Request, res: Response) {
  try {
    const [rows] = await sequelize.query(
      `SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema='fire_platform'`
    );
    const stats: Record<string, number> = {};
    (rows as any[]).forEach(r => { stats[r.TABLE_NAME] = r.TABLE_ROWS || 0; });
    res.json(ok(stats));
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    res.json(ok({}));
  }
}

/* ═══════════════════════════════════════════════════════════
   24. 待办 /todos/*
   ═══════════════════════════════════════════════════════════ */
export const todoList = makeList('todos');
export const todoById = makeById('todos');
export const todoCreate = makeCreate('todos');
export const todoUpdate = makeUpdate('todos');
export const todoDelete = makeDelete('todos');

/* ═══════════════════════════════════════════════════════════
   25. IoT 协议配置旧兼容 /iot-protocols/*
   ═══════════════════════════════════════════════════════════ */
export const iotProtocolListOld = makeList('iot_protocols');
export const iotProtocolByIdOld = makeById('iot_protocols');
export const iotProtocolCreateOld = makeCreate('iot_protocols');
export const iotProtocolUpdateOld = makeUpdate('iot_protocols');
export const iotProtocolDeleteOld = makeDelete('iot_protocols');

/* ═══════════════════════════════════════════════════════════
   29. 维保单位旧兼容 /maintenance/companies → departments
   ═══════════════════════════════════════════════════════════ */
export async function maintenanceStatsOld(_req: Request, res: Response) {
  try {
    const [[r]] = await sequelize.query(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status=2 THEN 1 ELSE 0 END) as done
    FROM work_orders`) as any;
    res.json(ok(r || { total: 0, done: 0 }));
  } catch { res.json(ok({ total: 0, done: 0 })); }
}

/* ═══════════════════════════════════════════════════════════
   30. 维保单位旧兼容 /maintenance/companies → departments
   ═══════════════════════════════════════════════════════════ */
export const maintCompanyListOld = makeList('departments');
export const maintCompanyByIdOld = makeById('departments');
export const maintCompanyCreateOld = makeCreate('departments');
export const maintCompanyUpdateOld = makeUpdate('departments');
export const maintCompanyDeleteOld = makeDelete('departments');

/* ═══════════════════════════════════════════════════════════
   30. AI 预警旧兼容 /ai/alerts (CRUD)
   ═══════════════════════════════════════════════════════════ */
export const aiAlertCreateOld = makeCreate('smart_alerts');
export const aiAlertUpdateOld = makeUpdate('smart_alerts');
export const aiAlertDeleteOld = makeDelete('smart_alerts');

/* ═══════════════════════════════════════════════════════════
   31. 系统配置旧兼容 /system/config (实际查询 system_logs)
   ═══════════════════════════════════════════════════════════ */
export const systemConfigListOld = makeList('system_logs');
export const systemConfigCreateOld = makeCreate('system_logs');
export const systemConfigUpdateOld = makeUpdate('system_logs');
export const systemConfigDeleteOld = makeDelete('system_logs');

/* ═══════════════════════════════════════════════════════════
   32. 值班旧兼容 /duty/*
   ═══════════════════════════════════════════════════════════ */
export const dutyScheduleCompat = makeList('duty_schedules');
export const dutyLogCompat = makeList('duty_logs');

/* ═══════════════════════════════════════════════════════════
   33. 大屏数据 /bigscreen/data
   ═══════════════════════════════════════════════════════════ */
export async function bigScreenOld(_req: Request, res: Response) {
  try {
    const [[units]] = await sequelize.query('SELECT COUNT(*) as c FROM units') as any;
    const [[devices]] = await sequelize.query('SELECT COUNT(*) as c FROM device_archive') as any;
    const [[online]] = await sequelize.query(`SELECT COUNT(*) as c FROM device_archive WHERE status='normal'`) as any;
    const [[alarms]] = await sequelize.query(`SELECT COUNT(*) as c FROM fire_alarm WHERE DATE(trigger_time) = CURDATE()`) as any;
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
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    res.json(ok({ summary: { unitCount: 0, deviceCount: 0, onlineCount: 0, onlineRate: '0.0', alarmTotal: 0, alarmToday: 0 } }));
  }
}

/* ═══════════════════════════════════════════════════════════
   34. 监控中心概览旧兼容 /monitor/overview
   ═══════════════════════════════════════════════════════════ */
export async function monitorOverviewOld(_req: Request, res: Response) {
  try {
    const [[dev]] = await sequelize.query(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status='normal' THEN 1 ELSE 0 END) as online,
      SUM(CASE WHEN status='fault' THEN 1 ELSE 0 END) as fault,
      SUM(CASE WHEN status='offline' THEN 1 ELSE 0 END) as offline
    FROM device_archive`) as any;
    const [[alm]] = await sequelize.query(`SELECT 
      SUM(CASE WHEN alarm_type=1 THEN 1 ELSE 0 END) as fire,
      SUM(CASE WHEN alarm_type=2 THEN 1 ELSE 0 END) as fault
    FROM fire_alarm`) as any;
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
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    res.json(ok({ deviceStats: [], alarmStats: [], unitStats: [] }));
  }
}

/* ═══════════════════════════════════════════════════════════
   35. GIS 富数据 /gis/points-rich
   ═══════════════════════════════════════════════════════════ */
export async function gisPointsRich(_req: Request, res: Response) {
  try {
    const [rows] = await sequelize.query(`SELECT 
      u.id, u.name, u.type, u.address, u.lng, u.lat,
      COUNT(DISTINCT da.id) as deviceCount,
      SUM(CASE WHEN da.status = 'normal' THEN 1 ELSE 0 END) as onlineCount
    FROM units u
    LEFT JOIN device_archive da ON da.unit_id = u.id
    WHERE u.lng IS NOT NULL AND u.lat IS NOT NULL
    GROUP BY u.id, u.name, u.type, u.address, u.lng, u.lat`);
    res.json(ok((rows as any[]).map(r => ({
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
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    res.json(ok([]));
  }
}

/* ═══════════════════════════════════════════════════════════
   36. 数据分析旧兼容路径
   ═══════════════════════════════════════════════════════════ */
export async function analysisDeviceOld(_req: Request, res: Response) {
  try {
    const [byType] = await sequelize.query(`SELECT category as device_type, COUNT(*) as count FROM device_archive GROUP BY category`);
    const [byStatus] = await sequelize.query(`SELECT 
      CASE WHEN status='normal' THEN 1 WHEN status='fault' THEN 2 ELSE 3 END as status,
      COUNT(*) as count FROM device_archive GROUP BY status`);
    res.json(ok({ byType: byType || [], byStatus: byStatus || [] }));
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    res.json(ok({ byType: [], byStatus: [] }));
  }
}

export async function analysisAlarmOld(_req: Request, res: Response) {
  try {
    const [byType] = await sequelize.query(`SELECT alarm_type, COUNT(*) as count FROM fire_alarm GROUP BY alarm_type`);
    const [byLevel] = await sequelize.query(`SELECT alarm_level, COUNT(*) as count FROM fire_alarm GROUP BY alarm_level`);
    res.json(ok({ byType: byType || [], byLevel: byLevel || [] }));
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    res.json(ok({ byType: [], byLevel: [] }));
  }
}

export async function analysisMaintenanceOld(_req: Request, res: Response) {
  try {
    const [byStatus] = await sequelize.query('SELECT status, COUNT(*) as count FROM work_orders GROUP BY status');
    const [byType] = await sequelize.query('SELECT order_type, COUNT(*) as count FROM work_orders GROUP BY order_type');
    res.json(ok({ byStatus: byStatus || [], byType: byType || [] }));
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    res.json(ok({ byStatus: [], byType: [] }));
  }
}

export async function analysisHazardOld(_req: Request, res: Response) {
  try {
    const [byType] = await sequelize.query('SELECT level as hazard_type, COUNT(*) as count FROM hazards GROUP BY level');
    const [byLevel] = await sequelize.query('SELECT level, COUNT(*) as count FROM hazards GROUP BY level');
    res.json(ok({ byType: byType || [], byLevel: byLevel || [] }));
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    res.json(ok({ byType: [], byLevel: [] }));
  }
}

export async function analysisPatrolOld(_req: Request, res: Response) {
  try {
    const [[r]] = await sequelize.query('SELECT COUNT(*) as total FROM patrol_records') as any;
    res.json(ok({ total: r?.total || 0, normal: 0, abnormal: 0, rate: '0.0' }));
  } catch (err: any) {
    logger.warn('[Stub] catch error:', err?.message || err);
    res.json(ok({ total: 0, normal: 0, abnormal: 0, rate: '0.0' }));
  }
}


