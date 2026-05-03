/**
 * ═══════════════════════════════════════════════════════════════════
 * Stub Routes - 为缺失的业务模块提供基础 CRUD 支持
 * 确保前端所有页面都能正常加载（返回空数据或基础数据）
 * ═══════════════════════════════════════════════════════════════════
 */
const express = require('express');
const { pool } = require('../utils/db');

const router = express.Router();

/* ───── 通用响应辅助 ───── */
function success(data, msg = 'success') {
  return { code: 200, msg, data };
}

function paginated(rows, total, pageNum, pageSize) {
  return success({ list: rows || [], total: total || 0, pageNum: pageNum || 1, pageSize: pageSize || 20 });
}

function emptyPage(pageSize = 20) {
  return paginated([], 0, 1, pageSize);
}

/* ───── 通用列表查询 ───── */
async function queryList(req, res, tableName, columns = '*', orderBy = 'created_at DESC') {
  try {
    const pageNum = Math.max(1, parseInt(req.query.pageNum || req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || req.query.size || 20)));
    const offset = (pageNum - 1) * pageSize;
    const keyword = req.query.keyword || req.query.search || '';

    let where = '1=1';
    const params = [];
    if (keyword && keyword.trim()) {
      // 安全处理：只允许查询有 name/title 字段的表
      const textCols = ['name', 'title', 'plan_name', 'order_no', 'hazard_no', 'drill_no', 'inspect_no', 'course_name', 'exam_name'];
      const colChecks = textCols.map(c => `\`${c}\` LIKE ?`).join(' OR ');
      if (colChecks) {
        where = `(${colChecks})`;
        params.push(...textCols.map(() => `%${keyword}%`));
      }
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM \`${tableName}\` WHERE ${where}`, params);
    const total = countRows[0]?.total || 0;

    const [rows] = await pool.query(
      `SELECT ${columns} FROM \`${tableName}\` WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json(paginated(rows, total, pageNum, pageSize));
  } catch (err) {
    console.error(`[Stub] ${tableName} list error:`, err.message);
    res.json(emptyPage());
  }
}

async function queryById(req, res, tableName) {
  try {
    const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` WHERE id = ? LIMIT 1`, [req.params.id]);
    res.json(success(rows[0] || null));
  } catch (err) {
    res.json(success(null));
  }
}

async function getTableColumns(tableName) {
  try {
    const [rows] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\``);
    return rows.map(r => r.Field);
  } catch (err) {
    return null;
  }
}

async function createRow(req, res, tableName) {
  try {
    const validFields = await getTableColumns(tableName);
    let cols = Object.keys(req.body).filter(k => k !== 'id');
    if (validFields) {
      cols = cols.filter(k => validFields.includes(k));
    }
    const vals = cols.map(k => req.body[k]);
    if (!cols.length) return res.json(success(null));
    const [result] = await pool.query(
      `INSERT INTO \`${tableName}\` (\`${cols.join('`,`')}\`) VALUES (${cols.map(() => '?').join(',')})`,
      vals
    );
    res.json(success({ id: result.insertId }));
  } catch (err) {
    console.error(`[Stub] ${tableName} create error:`, err.message);
    res.json(success(null, err.message));
  }
}

async function updateRow(req, res, tableName) {
  try {
    const validFields = await getTableColumns(tableName);
    let cols = Object.keys(req.body).filter(k => k !== 'id');
    if (validFields) {
      cols = cols.filter(k => validFields.includes(k));
    }
    const vals = cols.map(k => req.body[k]);
    if (!cols.length) return res.json(success(null));
    await pool.query(
      `UPDATE \`${tableName}\` SET ${cols.map(c => `\`${c}\`=?`).join(',')} WHERE id=?`,
      [...vals, req.params.id]
    );
    res.json(success(null));
  } catch (err) {
    res.json(success(null, err.message));
  }
}

async function deleteRow(req, res, tableName) {
  try {
    await pool.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [req.params.id]);
    res.json(success(null));
  } catch (err) {
    res.json(success(null, err.message));
  }
}

/* ═══════ 1. 角色 (roles) → sys_role ═══════ */
router.get('/roles', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, role_code as code, role_name as name, description, status, created_at FROM sys_role');
    res.json(success(rows));
  } catch (err) { res.json(success([])); }
});
router.get('/roles/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, role_code as code, role_name as name, description, status, created_at FROM sys_role WHERE id = ?', [req.params.id]);
    res.json(success(rows[0] || null));
  } catch (err) { res.json(success(null)); }
});

/* ═══════ 2. 摄像头 (cameras/list) → cameras ═══════ */
router.get('/cameras/list', async (req, res) => queryList(req, res, 'cameras'));
router.get('/cameras/:id', async (req, res) => queryById(req, res, 'cameras'));

/* ═══════ 3. IoT设备统计 ═══════ */
router.get('/iot-devices/stats', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as online,
      SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as offline,
      SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as fault
    FROM iot_devices`);
    const r = rows[0] || { total: 0, online: 0, offline: 0, fault: 0 };
    res.json(success(r));
  } catch (err) { res.json(success({ total: 0, online: 0, offline: 0, fault: 0 })); }
});

/* ═══════ 4. GIS 地图点 ═══════ */
router.get('/gis/points-rich', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT 
      u.id, u.name, u.type, u.lng, u.lat,
      COUNT(DISTINCT da.id) as deviceCount,
      SUM(CASE WHEN da.status = 'normal' THEN 1 ELSE 0 END) as onlineCount
    FROM units u
    LEFT JOIN device_archive da ON da.unit_id = u.id
    WHERE u.lng IS NOT NULL AND u.lat IS NOT NULL
    GROUP BY u.id`);
    res.json(success(rows.map(r => ({
      id: r.id, name: r.name, type: r.type,
      lng: r.lng, lat: r.lat,
      deviceCount: r.deviceCount || 0, onlineCount: r.onlineCount || 0,
      status: 'normal'
    }))));
  } catch (err) { res.json(success([])); }
});

/* ═══════ 5. 维保工单 ═══════ */
router.get('/work-orders/list', async (req, res) => queryList(req, res, 'work_orders'));
router.get('/work-orders/:id', async (req, res) => queryById(req, res, 'work_orders'));
router.post('/work-orders', async (req, res) => createRow(req, res, 'work_orders'));
router.put('/work-orders/:id', async (req, res) => updateRow(req, res, 'work_orders'));
router.delete('/work-orders/:id', async (req, res) => deleteRow(req, res, 'work_orders'));

/* ═══════ 6. 维保记录 ═══════ */
router.get('/maint-records/list', async (req, res) => queryList(req, res, 'maint_records'));
router.get('/maint-records/:id', async (req, res) => queryById(req, res, 'maint_records'));
router.post('/maint-records', async (req, res) => createRow(req, res, 'maint_records'));
router.put('/maint-records/:id', async (req, res) => updateRow(req, res, 'maint_records'));
router.delete('/maint-records/:id', async (req, res) => deleteRow(req, res, 'maint_records'));

/* ═══════ 7. 维保合同 ═══════ */
router.get('/maint-contracts/list', async (req, res) => queryList(req, res, 'maint_contracts'));
router.get('/maint-contracts/:id', async (req, res) => queryById(req, res, 'maint_contracts'));
router.post('/maint-contracts', async (req, res) => createRow(req, res, 'maint_contracts'));
router.put('/maint-contracts/:id', async (req, res) => updateRow(req, res, 'maint_contracts'));
router.delete('/maint-contracts/:id', async (req, res) => deleteRow(req, res, 'maint_contracts'));

/* ═══════ 8. 巡检计划 ═══════ */
router.get('/patrol-plans/list', async (req, res) => queryList(req, res, 'patrol_plans'));
router.get('/patrol-plans/:id', async (req, res) => queryById(req, res, 'patrol_plans'));
router.post('/patrol-plans', async (req, res) => createRow(req, res, 'patrol_plans'));
router.put('/patrol-plans/:id', async (req, res) => updateRow(req, res, 'patrol_plans'));
router.delete('/patrol-plans/:id', async (req, res) => deleteRow(req, res, 'patrol_plans'));

/* ═══════ 9. 巡检记录 ═══════ */
router.get('/patrol-records/list', async (req, res) => queryList(req, res, 'patrol_records'));
router.get('/patrol-records/:id', async (req, res) => queryById(req, res, 'patrol_records'));
router.post('/patrol-records', async (req, res) => createRow(req, res, 'patrol_records'));
router.put('/patrol-records/:id', async (req, res) => updateRow(req, res, 'patrol_records'));
router.delete('/patrol-records/:id', async (req, res) => deleteRow(req, res, 'patrol_records'));

/* ═══════ 10. 隐患管理 ═══════ */
router.get('/hazards/list', async (req, res) => queryList(req, res, 'hazards'));
router.get('/hazards/:id', async (req, res) => queryById(req, res, 'hazards'));
router.post('/hazards', async (req, res) => createRow(req, res, 'hazards'));
router.put('/hazards/:id', async (req, res) => updateRow(req, res, 'hazards'));
router.delete('/hazards/:id', async (req, res) => deleteRow(req, res, 'hazards'));

/* ═══════ 11. 应急预案 ═══════ */
router.get('/plans/list', async (req, res) => queryList(req, res, 'plans'));
router.get('/plans/:id', async (req, res) => queryById(req, res, 'plans'));
router.post('/plans', async (req, res) => createRow(req, res, 'plans'));
router.put('/plans/:id', async (req, res) => updateRow(req, res, 'plans'));
router.delete('/plans/:id', async (req, res) => deleteRow(req, res, 'plans'));

/* ═══════ 12. 演练记录 ═══════ */
router.get('/drills/list', async (req, res) => queryList(req, res, 'drills'));
router.get('/drills/:id', async (req, res) => queryById(req, res, 'drills'));
router.post('/drills', async (req, res) => createRow(req, res, 'drills'));
router.put('/drills/:id', async (req, res) => updateRow(req, res, 'drills'));
router.delete('/drills/:id', async (req, res) => deleteRow(req, res, 'drills'));

/* ═══════ 13. 消防检查 ═══════ */
router.get('/inspections/list', async (req, res) => queryList(req, res, 'inspections'));
router.get('/inspections/:id', async (req, res) => queryById(req, res, 'inspections'));
router.post('/inspections', async (req, res) => createRow(req, res, 'inspections'));
router.put('/inspections/:id', async (req, res) => updateRow(req, res, 'inspections'));
router.delete('/inspections/:id', async (req, res) => deleteRow(req, res, 'inspections'));

/* ═══════ 14. 知识库 ═══════ */
router.get('/documents/list', async (req, res) => queryList(req, res, 'documents'));
router.get('/documents/:id', async (req, res) => queryById(req, res, 'documents'));
router.post('/documents', async (req, res) => createRow(req, res, 'documents'));
router.put('/documents/:id', async (req, res) => updateRow(req, res, 'documents'));
router.delete('/documents/:id', async (req, res) => deleteRow(req, res, 'documents'));

/* ═══════ 15. 通知 ═══════ */
router.get('/notifications/list', async (req, res) => queryList(req, res, 'notifications'));
router.get('/notifications/unread', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC LIMIT 20');
    res.json(success(rows));
  } catch (err) { res.json(success([])); }
});
router.post('/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json(success(null));
  } catch (err) { res.json(success(null)); }
});

/* ═══════ 16. 值班排班 ═══════ */
router.get('/duty-schedules/list', async (req, res) => queryList(req, res, 'duty_schedules'));
router.get('/duty-schedules/:id', async (req, res) => queryById(req, res, 'duty_schedules'));

/* ═══════ 17. 系统日志 ═══════ */
router.get('/system-logs/list', async (req, res) => queryList(req, res, 'system_logs'));

/* ═══════ 18. 建筑平面图 ═══════ */
router.get('/floor-plans/list', async (req, res) => queryList(req, res, 'floor_plans'));
router.get('/floor-plans/:id', async (req, res) => queryById(req, res, 'floor_plans'));
router.get('/floor-plans/:id/devices', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM floor_devices WHERE floor_plan_id = ?', [req.params.id]);
    res.json(success(rows));
  } catch (err) { res.json(success([])); }
});

/* ═══════ 19. 大屏数据 ═══════ */
router.get('/bigscreen/data', async (req, res) => {
  try {
    const [[units]] = await pool.query('SELECT COUNT(*) as c FROM units');
    const [[devices]] = await pool.query('SELECT COUNT(*) as c FROM device_archive');
    const [[online]] = await pool.query(`SELECT COUNT(*) as c FROM device_archive WHERE status='normal'`);
    const [[alarms]] = await pool.query(`SELECT COUNT(*) as c FROM fire_alarm WHERE DATE(start_time) = CURDATE()`);
    res.json(success({
      summary: {
        unitCount: units.c || 0,
        deviceCount: devices.c || 0,
        onlineCount: online.c || 0,
        onlineRate: devices.c ? ((online.c / devices.c) * 100).toFixed(1) : '0.0',
        alarmTotal: alarms.c || 0,
        alarmToday: alarms.c || 0
      },
      workOrder: { total: 0, done: 0 },
      patrol: { month: 0 },
      hazard: { total: 0 },
      inspection: { month: 0 },
      recentAlarms: [],
      alarmTrend: []
    }));
  } catch (err) { res.json(success({ summary: { unitCount: 0, deviceCount: 0, onlineCount: 0, onlineRate: '0.0', alarmTotal: 0, alarmToday: 0 } })); }
});

/* ═══════ 20. 监控中心概览 ═══════ */
router.get('/monitor/overview', async (req, res) => {
  try {
    const [[dev]] = await pool.query(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status='normal' THEN 1 ELSE 0 END) as online,
      SUM(CASE WHEN status='fault' THEN 1 ELSE 0 END) as fault,
      SUM(CASE WHEN status='offline' THEN 1 ELSE 0 END) as offline
    FROM device_archive`);
    const [[alm]] = await pool.query(`SELECT 
      SUM(CASE WHEN alarm_type=1 THEN 1 ELSE 0 END) as fire,
      SUM(CASE WHEN alarm_type=2 THEN 1 ELSE 0 END) as fault
    FROM fire_alarm`);
    res.json(success({
      deviceStats: [
        { status: 1, count: dev.online || 0 },
        { status: 2, count: dev.fault || 0 },
        { status: 3, count: dev.offline || 0 }
      ],
      alarmStats: [
        { alarm_type: 1, count: alm.fire || 0 },
        { alarm_type: 2, count: alm.fault || 0 }
      ],
      unitStats: [{ unit_type: 2, count: 0 }]
    }));
  } catch (err) { res.json(success({ deviceStats: [], alarmStats: [], unitStats: [] })); }
});

/* ═══════ 21. 数据分析 ═══════ */
router.get('/analysis/device', async (req, res) => {
  try {
    const [byType] = await pool.query(`SELECT category as device_type, COUNT(*) as count FROM device_archive GROUP BY category`);
    const [byStatus] = await pool.query(`SELECT 
      CASE WHEN status='normal' THEN 1 WHEN status='fault' THEN 2 ELSE 3 END as status,
      COUNT(*) as count FROM device_archive GROUP BY status`);
    res.json(success({ byType: byType || [], byStatus: byStatus || [] }));
  } catch (err) { res.json(success({ byType: [], byStatus: [] })); }
});

router.get('/analysis/alarm', async (req, res) => {
  try {
    const [byType] = await pool.query(`SELECT alarm_type, COUNT(*) as count FROM fire_alarm GROUP BY alarm_type`);
    const [byLevel] = await pool.query(`SELECT alarm_level, COUNT(*) as count FROM fire_alarm GROUP BY alarm_level`);
    res.json(success({ byType: byType || [], byLevel: byLevel || [] }));
  } catch (err) { res.json(success({ byType: [], byLevel: [] })); }
});

router.get('/analysis/maintenance', async (req, res) => {
  try {
    const [byStatus] = await pool.query('SELECT status, COUNT(*) as count FROM work_orders GROUP BY status');
    const [byType] = await pool.query('SELECT order_type, COUNT(*) as count FROM work_orders GROUP BY order_type');
    res.json(success({ byStatus: byStatus || [], byType: byType || [] }));
  } catch (err) { res.json(success({ byStatus: [], byType: [] })); }
});

router.get('/analysis/hazard', async (req, res) => {
  try {
    const [byType] = await pool.query('SELECT level as hazard_type, COUNT(*) as count FROM hazards GROUP BY level');
    const [byLevel] = await pool.query('SELECT level, COUNT(*) as count FROM hazards GROUP BY level');
    res.json(success({ byType: byType || [], byLevel: byLevel || [] }));
  } catch (err) { res.json(success({ byType: [], byLevel: [] })); }
});

router.get('/analysis/patrol', async (req, res) => {
  try {
    const [[r]] = await pool.query('SELECT COUNT(*) as total FROM patrol_records');
    res.json(success({ total: r.total || 0, normal: 0, abnormal: 0, rate: '0.0' }));
  } catch (err) { res.json(success({ total: 0, normal: 0, abnormal: 0, rate: '0.0' })); }
});

/* ═══════ 22. 人员管理 → unit_personnel ═══════ */
router.get('/personnel/list', async (req, res) => queryList(req, res, 'unit_personnel'));
router.get('/personnel/:id', async (req, res) => queryById(req, res, 'unit_personnel'));

/* ═══════ 23. SIP服务器状态 ═══════ */
router.get('/sip-server/status', async (req, res) => {
  res.json(success({ running: false, port: 5060, transport: 'UDP', registered: 0, max: 100 }));
});

/* ═══════ 24. 数据库统计 ═══════ */
router.get('/db/stats', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema='fire_platform'`);
    const stats = {};
    rows.forEach(r => { stats[r.TABLE_NAME] = r.TABLE_ROWS || 0; });
    res.json(success(stats));
  } catch (err) { res.json(success({})); }
});

/* ═══════ 25. 组织架构 ═══════ */
router.get('/departments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments');
    res.json(success(rows));
  } catch (err) { res.json(success([])); }
});

/* ═══════ 26. 权限 ═══════ */
router.get('/permissions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, permission_code as code, permission_name as name, description, status FROM sys_permission');
    res.json(success(rows));
  } catch (err) { res.json(success([])); }
});

/* ═══════ 27. 报表 ═══════ */
router.get('/reports/list', async (req, res) => queryList(req, res, 'reports'));

/* ═══════ 28. 班次 / 交接班 ═══════ */
router.get('/duty-shifts/list', async (req, res) => queryList(req, res, 'duty_shifts'));
router.get('/duty-handovers/list', async (req, res) => queryList(req, res, 'duty_handovers'));

/* ═══════ 29. 报警快照 ═══════ */
router.get('/alarm-snapshots/list', async (req, res) => queryList(req, res, 'alarm_snapshots'));

/* ═══════ 30. 消控室配置 ═══════ */
router.get('/control-room-configs/list', async (req, res) => queryList(req, res, 'control_room_configs'));

/* ═══════ 31. 楼层设备 ═══════ */
router.get('/floor-devices/list', async (req, res) => queryList(req, res, 'floor_devices'));

/* GB28181 设备 CRUD 由 fireHostApi.js 实现（含 camelCase 字段与正确 INSERT），勿在此用 createRow 抢占路由 */

/* ═══════ 33. 培训 ═══════ */
router.get('/training/courses', async (req, res) => queryList(req, res, 'training_courses'));
router.get('/training/exams', async (req, res) => queryList(req, res, 'training_exams'));

/* ═══════ 34. AI决策 ═══════ */
router.get('/ai/decisions', async (req, res) => queryList(req, res, 'ai_decisions'));
router.get('/ai/alerts', async (req, res) => queryList(req, res, 'smart_alerts'));

/* ═══════ 34. 维保旧兼容路径 ═══════ */
router.get('/maintenance/work-orders', async (req, res) => queryList(req, res, 'work_orders'));
router.get('/maintenance/stats', async (req, res) => {
  try {
    const [[r]] = await pool.query(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status=2 THEN 1 ELSE 0 END) as done
    FROM work_orders`);
    res.json(success(r));
  } catch (err) { res.json(success({ total: 0, done: 0 })); }
});

/* ═══════ 35. 巡检旧兼容路径 ═══════ */
router.get('/patrol/plans', async (req, res) => queryList(req, res, 'patrol_plans'));
router.get('/patrol/records', async (req, res) => queryList(req, res, 'patrol_records'));
router.get('/patrol/hazards', async (req, res) => queryList(req, res, 'hazards'));

/* ═══════ 36. 知识库旧兼容路径 ═══════ */
router.get('/knowledge', async (req, res) => queryList(req, res, 'documents'));
router.get('/knowledge/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT category as name FROM documents WHERE category IS NOT NULL');
    res.json(success(rows.map(r => r.name)));
  } catch (err) { res.json(success(['操作规范', '维保手册', '法规标准', '培训资料', '应急预案'])); }
});

/* ═══════ 22b. 人员管理 CRUD ═══════ */
router.post('/personnel', async (req, res) => createRow(req, res, 'unit_personnel'));
router.put('/personnel/:id', async (req, res) => updateRow(req, res, 'unit_personnel'));
router.delete('/personnel/:id', async (req, res) => deleteRow(req, res, 'unit_personnel'));

/* ═══════ 28b. 班次 CRUD ═══════ */
router.get('/duty-shifts/:id', async (req, res) => queryById(req, res, 'duty_shifts'));
router.post('/duty-shifts', async (req, res) => createRow(req, res, 'duty_shifts'));
router.put('/duty-shifts/:id', async (req, res) => updateRow(req, res, 'duty_shifts'));
router.delete('/duty-shifts/:id', async (req, res) => deleteRow(req, res, 'duty_shifts'));

/* ═══════ 28c. 交接班 CRUD ═══════ */
router.get('/duty-handovers/:id', async (req, res) => queryById(req, res, 'duty_handovers'));
router.post('/duty-handovers', async (req, res) => createRow(req, res, 'duty_handovers'));
router.put('/duty-handovers/:id', async (req, res) => updateRow(req, res, 'duty_handovers'));
router.delete('/duty-handovers/:id', async (req, res) => deleteRow(req, res, 'duty_handovers'));

/* ═══════ 25b. 组织架构 CRUD ═══════ */
router.get('/departments/:id', async (req, res) => queryById(req, res, 'departments'));
router.post('/departments', async (req, res) => createRow(req, res, 'departments'));
router.put('/departments/:id', async (req, res) => updateRow(req, res, 'departments'));
router.delete('/departments/:id', async (req, res) => deleteRow(req, res, 'departments'));

/* ═══════ 25c. 维保单位 ═══════ */
router.get('/maintenance/companies', async (req, res) => queryList(req, res, 'departments'));
router.get('/maintenance/companies/:id', async (req, res) => queryById(req, res, 'departments'));
router.post('/maintenance/companies', async (req, res) => createRow(req, res, 'departments'));
router.put('/maintenance/companies/:id', async (req, res) => updateRow(req, res, 'departments'));
router.delete('/maintenance/companies/:id', async (req, res) => deleteRow(req, res, 'departments'));

/* ═══════ 34b. AI 预警 CRUD ═══════ */
router.post('/ai/alerts', async (req, res) => createRow(req, res, 'smart_alerts'));
router.put('/ai/alerts/:id', async (req, res) => updateRow(req, res, 'smart_alerts'));
router.delete('/ai/alerts/:id', async (req, res) => deleteRow(req, res, 'smart_alerts'));

/* ═══════ 37. 系统配置旧兼容路径 ═══════ */
router.get('/system/config', async (req, res) => queryList(req, res, 'system_logs'));
router.post('/system/config', async (req, res) => createRow(req, res, 'system_logs'));
router.put('/system/config/:id', async (req, res) => updateRow(req, res, 'system_logs'));
router.delete('/system/config/:id', async (req, res) => deleteRow(req, res, 'system_logs'));
router.get('/system/logs', async (req, res) => queryList(req, res, 'system_logs'));
router.get('/system/dashboard', async (req, res) => res.json(success({})));

/* ═══════ 38. 其他聚合接口 ═══════ */
router.get('/reports/daily', async (req, res) => res.json(success({})));
router.get('/reports/weekly', async (req, res) => res.json(success({})));
router.get('/reports/monthly', async (req, res) => res.json(success({})));
router.get('/reports/device', async (req, res) => res.json(success({})));
router.get('/reports/maintenance', async (req, res) => res.json(success({})));
router.get('/reports/patrol', async (req, res) => res.json(success({})));

/* ═══════ 39. 通知 CRUD ═══════ */
router.post('/notifications', async (req, res) => createRow(req, res, 'notifications'));
router.put('/notifications/:id', async (req, res) => updateRow(req, res, 'notifications'));
router.delete('/notifications/:id', async (req, res) => deleteRow(req, res, 'notifications'));

/* ═══════ 40. 排班 CRUD ═══════ */
router.post('/duty-schedules', async (req, res) => createRow(req, res, 'duty_schedules'));
router.put('/duty-schedules/:id', async (req, res) => updateRow(req, res, 'duty_schedules'));
router.delete('/duty-schedules/:id', async (req, res) => deleteRow(req, res, 'duty_schedules'));

/* ═══════ 41. 角色 CRUD（字段映射） ═══════ */
router.post('/roles', async (req, res) => {
  try {
    const { name, code, description, status } = req.body;
    const [result] = await pool.query(
      `INSERT INTO sys_role (role_name, role_code, description, status) VALUES (?, ?, ?, ?)`,
      [name, code, description, status === undefined ? 1 : status]
    );
    res.json(success({ id: result.insertId }));
  } catch (err) {
    console.error('[Stub] roles create error:', err.message);
    res.json(success(null, err.message));
  }
});
router.put('/roles/:id', async (req, res) => {
  try {
    const { name, code, description, status } = req.body;
    await pool.query(
      `UPDATE sys_role SET role_name=?, role_code=?, description=?, status=? WHERE id=?`,
      [name, code, description, status, req.params.id]
    );
    res.json(success(null));
  } catch (err) {
    res.json(success(null, err.message));
  }
});
router.delete('/roles/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM sys_role WHERE id = ?`, [req.params.id]);
    res.json(success(null));
  } catch (err) {
    res.json(success(null, err.message));
  }
});

router.get('/duty/schedules', async (req, res) => queryList(req, res, 'duty_schedules'));
router.get('/duty/logs', async (req, res) => queryList(req, res, 'duty_logs'));
router.get('/duty/current', async (req, res) => res.json(success(null)));

module.exports = router;
