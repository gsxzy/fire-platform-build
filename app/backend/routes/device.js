/**
 * ═══════════════════════════════════════════════════════════════
 * 设备管理路由模块
 * 路径前缀: /api/* (通过 routes/index.js 挂载)
 * 功能：设备档案CRUD、设备配置、设备维护、状态统计
 *
 * ── 与「单位」关系（业务顺序不可逆）────────────────────────────
 *  1. 设备档案：仅录入固有信息，archive_status 恒为 unallocated，
 *     禁止携带 unit_id / building_id / floor_id / point_id。
 *  2. 设备分配：见 routes/deviceAllocation.js，仅 unallocated → 绑定单位
 *     （及建筑/楼层/点位）→ allocated。
 *  3. 设备接入：见 routes/deviceAccess.js，仅 allocated 可建接入单，
 *     测试/上线成功 → accessed；断开接入 → 回 allocated（仍归属原单位）。
 *  单位是设备归属与权限隔离主体；档案是身份证；接入是上线可用条件。
 * ═══════════════════════════════════════════════════════════════
 */
const express = require('express');
const { pool } = require('../utils/db');
const { success, fail, handleError } = require('../utils/response');
const { requirePermission } = require('../middleware/permission');

const router = express.Router();

/* ── 分页辅助 ── */
function parsePagination(query) {
  let page = Math.max(1, parseInt(query.page, 10) || 1);
  let pageSize = Math.min(500, Math.max(1, parseInt(query.pageSize, 10) || 10));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

function sanitizeLike(keyword) {
  if (!keyword || typeof keyword !== 'string') return '';
  return keyword.replace(/[%_\\]/g, '\\$&');
}

/* ── 前端 camelCase → 后端 snake_case 字段兼容 ── */
function normalizeBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const camelToSnakeMap = {
    type: 'category',
    unitId: 'unit_id',
    serialNo: 'serial_no',
    calibrationCycle: 'calibration_cycle',
    scrapYear: 'scrap_year',
    archiveStatus: 'archive_status',
    protocolType: 'protocol_type',
    protocolDeviceId: 'protocol_device_id',
    gatewayId: 'gateway_id',
    subCategory: 'sub_category',
    productionDate: 'production_date',
    installDate: 'install_date',
    expireDate: 'expire_date',
    buildingId: 'building_id',
    floorId: 'floor_id',
    pointId: 'point_id',
    healthScore: 'health_score',
    qrCode: 'qr_code',
    createdBy: 'created_by',
    location: 'area',
  };
  const result = { ...body };
  for (const [camel, snake] of Object.entries(camelToSnakeMap)) {
    if (camel in body && !(snake in body)) {
      result[snake] = body[camel];
    }
  }
  return result;
}

/* ═══════ 设备档案分页列表 ═══════ */
router.get('/devices/list', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword, unit_id, building_id, floor_id, category, status, archive_status, sortBy, sortOrder } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (da.name LIKE ? OR da.code LIKE ? OR da.manufacturer LIKE ? OR da.model LIKE ?)';
      const kw = `%${sanitizeLike(keyword)}%`;
      params.push(kw, kw, kw, kw);
    }
    if (unit_id) {
      where += ' AND da.unit_id = ?';
      params.push(unit_id);
    }
    if (building_id) {
      where += ' AND da.building_id = ?';
      params.push(building_id);
    }
    if (floor_id) {
      where += ' AND da.floor_id = ?';
      params.push(floor_id);
    }
    if (category) {
      where += ' AND da.category = ?';
      params.push(category);
    }
    if (status) {
      where += ' AND da.status = ?';
      params.push(status);
    }
    if (archive_status) {
      where += ' AND da.archive_status = ?';
      params.push(archive_status);
    }

    const sortCol = ['name', 'code', 'category', 'status', 'archive_status', 'created_at', 'health_score'].includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countSql = `SELECT COUNT(*) as total FROM device_archive da ${where}`;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `
      SELECT
        da.id, da.code, da.name,
        da.category as type, da.sub_category, da.manufacturer, da.model, da.serial_no,
        da.production_date, da.install_date, da.expire_date,
        da.unit_id as unitId, u.name as unitName,
        da.building_id, fb.name as building_name,
        da.floor_id, ff.name as floor_name,
        da.point_id,
        da.area as location, da.lng, da.lat,
        da.protocol_type, da.protocol_device_id, da.gateway_id,
        da.ip, da.port,
        da.status, da.archive_status, da.calibration_cycle, da.scrap_year, da.remark,
        da.health_score, da.qr_code,
        da.created_at as createdAt, da.updated_at as updatedAt
      FROM device_archive da
      LEFT JOIN units u ON da.unit_id = u.id
      LEFT JOIN fire_building fb ON da.building_id = fb.id
      LEFT JOIN fire_floor ff ON da.floor_id = ff.id
      ${where}
      ORDER BY da.${sortCol} ${sortDir}
      LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(dataSql, [...params, pageSize, offset]);

    res.json(success({
      list: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }));
  } catch (err) {
    handleError(res, err, req, 'devices list error');
  }
});

/* ═══════ 设备详情 ═══════ */
router.get('/devices/:id', async (req, res) => {
  try {
    const deviceId = req.params.id;

    const [[device]] = await pool.query(
      `SELECT
        da.id, da.code, da.name,
        da.category as type, da.sub_category, da.manufacturer, da.model, da.serial_no,
        da.production_date, da.install_date, da.expire_date,
        da.unit_id as unitId, u.name as unitName,
        da.building_id, fb.name as building_name,
        da.floor_id, ff.name as floor_name,
        da.point_id,
        da.area as location, da.lng, da.lat,
        da.protocol_type, da.protocol_device_id, da.gateway_id,
        da.ip, da.port,
        da.status, da.archive_status, da.calibration_cycle, da.scrap_year, da.remark,
        da.health_score, da.qr_code,
        da.created_at as createdAt, da.updated_at as updatedAt
       FROM device_archive da
       LEFT JOIN units u ON da.unit_id = u.id
       LEFT JOIN fire_building fb ON da.building_id = fb.id
       LEFT JOIN fire_floor ff ON da.floor_id = ff.id
       WHERE da.id = ?`, [deviceId]
    );
    if (!device) return res.status(404).json(fail('设备不存在', 404));

    // 配置信息
    const [[config]] = await pool.query(
      'SELECT * FROM device_config WHERE device_id = ?', [deviceId]
    );

    // 最近维护记录
    const [maintenance] = await pool.query(
      'SELECT * FROM device_maintenance WHERE device_id = ? ORDER BY plan_date DESC LIMIT 5', [deviceId]
    );

    // 最近告警
    const [alarms] = await pool.query(
      'SELECT * FROM fire_alarm WHERE device_id = ? ORDER BY created_at DESC LIMIT 5', [deviceId]
    );

    res.json(success({ ...device, config, maintenance, alarms }));
  } catch (err) {
    handleError(res, err, req, 'device detail error');
  }
});

/* ═══════ 创建设备档案 ═══════ */
router.post('/devices', async (req, res) => {
  try {
    const body = normalizeBody(req.body);
    const {
      id, code, name, category, sub_category, manufacturer, model, serial_no,
      production_date, install_date, expire_date,
      area, lng, lat,
      protocol_type, calibration_cycle, scrap_year, remark, created_by
    } = body;

    if (!name || !category) {
      return res.status(400).json(fail('设备名称和类别不能为空', 400));
    }

    // code 未填写时自动生成
    const deviceCode = code || `EQ-${Date.now().toString().slice(-6)}`;

    // 核心约束：创建设备档案时禁止直接绑定单位，强制为未分配状态
    if (body.unit_id !== undefined && body.unit_id) {
      return res.status(400).json(fail('创建设备档案时不能直接绑定单位，请先录入档案再通过分配流程绑定', 400));
    }
    if (body.building_id || body.floor_id || body.point_id) {
      return res.status(400).json(fail('创建设备档案时不能挂载建筑/楼层/点位，请在分配流程中补充', 400));
    }

    const deviceId = id || `DEV_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    await pool.query(
      `INSERT INTO device_archive (
        id, code, name, category, sub_category, manufacturer, model, serial_no,
        production_date, install_date, expire_date,
        unit_id, building_id, floor_id, area, lng, lat,
        protocol_type, status, archive_status, calibration_cycle, scrap_year,
        health_score, remark, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, deviceCode, name, category, sub_category || null, manufacturer || null, model || null, serial_no || null,
       production_date || null, install_date || null, expire_date || null,
       null, null, null, area || null, lng || null, lat || null,
       protocol_type || null, 'normal', 'unallocated',
       calibration_cycle || 12, scrap_year || 10,
       100, remark || null, created_by || null]
    );

    // 自动创建默认配置（表不存在时不阻塞主流程）
    try {
      await pool.query(
        `INSERT INTO device_config (device_id, protocol_type, communication_params, alarm_thresholds)
         VALUES (?, ?, ?, ?)`,
        [deviceId, protocol_type || null, JSON.stringify({}), JSON.stringify({})]
      );
    } catch (configErr) {
      if (configErr.code === 'ER_NO_SUCH_TABLE') {
        console.warn('[device] device_config 表不存在，跳过默认配置创建');
      } else {
        console.error('[device] 创建设备配置失败:', configErr.message);
      }
    }

    res.json(success({ id: deviceId, code: deviceCode }, '创建设备档案成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json(fail('设备编号已存在', 400));
    }
    handleError(res, err, req, 'create device error');
  }
});

/* ═══════ 更新设备档案 ═══════ */
router.put('/devices/:id', async (req, res) => {
  try {
    const deviceId = req.params.id;
    const body = normalizeBody(req.body);

    // 查询当前档案状态
    const [[current]] = await pool.query(
      'SELECT archive_status, code, category, manufacturer, model, serial_no FROM device_archive WHERE id = ?',
      [deviceId]
    );
    if (!current) return res.status(404).json(fail('设备不存在', 404));

    // 未分配档案不得通过档案接口挂载建筑/楼层/点位（须走「设备分配」）
    if (current.archive_status === 'unallocated') {
      if (body.building_id !== undefined || body.floor_id !== undefined || body.point_id !== undefined) {
        return res.status(400).json(fail('未分配设备不能挂载建筑/楼层/点位，请先完成设备分配', 400));
      }
    }

    // 报废设备仅允许查询，不可编辑
    if (current.archive_status === 'scrapped') {
      return res.status(400).json(fail('报废设备不可编辑', 400));
    }

    // 固有属性不可随意修改（设备编号、类别、型号、厂家、序列号）
    const immutableFields = ['code', 'category', 'manufacturer', 'model', 'serial_no'];
    for (const f of immutableFields) {
      if (body[f] !== undefined && body[f] !== current[f]) {
        return res.status(400).json(fail(`设备固有属性【${f}】不可修改，如需变更请重新录入档案`, 400));
      }
    }

    // 禁止直接通过档案更新修改 unit_id 或 archive_status（必须通过分配/接入流程）
    if (body.unit_id !== undefined) {
      return res.status(400).json(fail('禁止直接修改所属单位，请通过设备分配流程操作', 400));
    }
    if (body.archive_status !== undefined) {
      return res.status(400).json(fail('禁止直接修改档案流程状态，状态由分配/接入流程自动维护', 400));
    }

    const fields = [
      'name', 'sub_category',
      'production_date', 'install_date', 'expire_date',
      'building_id', 'floor_id', 'point_id', 'area', 'lng', 'lat',
      'protocol_type', 'protocol_device_id', 'gateway_id', 'status', 'health_score', 'qr_code',
      'calibration_cycle', 'scrap_year', 'remark'
    ];
    const updates = [];
    const values = [];

    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(body[f]);
      }
    }

    if (updates.length === 0) return res.status(400).json(fail('没有需要更新的字段', 400));

    values.push(deviceId);
    const [result] = await pool.query(
      `UPDATE device_archive SET ${updates.join(', ')} WHERE id = ?`, values
    );

    if (result.affectedRows === 0) return res.status(404).json(fail('设备不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json(fail('设备编号已存在', 400));
    }
    handleError(res, err, req, 'update device error');
  }
});

/* ═══════ 删除设备档案 ═══════ */
router.delete('/devices/:id', requirePermission('system:user:delete'), async (req, res) => {
  try {
    const deviceId = req.params.id;

    // 查询当前档案状态
    const [[current]] = await pool.query(
      'SELECT archive_status, unit_id FROM device_archive WHERE id = ?',
      [deviceId]
    );
    if (!current) return res.status(404).json(fail('设备不存在', 404));

    // 约束校验：已分配/已接入/报废设备不可直接删除
    if (current.archive_status === 'allocated') {
      return res.status(400).json(fail('该设备已分配至单位，请先解除分配后再删除', 400));
    }
    if (current.archive_status === 'accessed') {
      return res.status(400).json(fail('该设备已完成接入，请先断开接入并解除分配后再删除', 400));
    }
    if (current.archive_status === 'scrapped') {
      return res.status(400).json(fail('报废设备不可删除，仅可查询档案信息', 400));
    }

    await pool.query('DELETE FROM device_config WHERE device_id = ?', [deviceId]);
    await pool.query('DELETE FROM device_maintenance WHERE device_id = ?', [deviceId]);
    const [result] = await pool.query('DELETE FROM device_archive WHERE id = ?', [deviceId]);

    if (result.affectedRows === 0) return res.status(404).json(fail('设备不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, req, 'delete device error');
  }
});

/* ═══════ 设备报废（解除归属与接入，档案标记报废） ═══════ */
router.post('/devices/:id/scrap', requirePermission('system:user:delete'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const deviceId = req.params.id;
    const [[row]] = await conn.query(
      'SELECT archive_status FROM device_archive WHERE id = ?',
      [deviceId]
    );
    if (!row) return res.status(404).json(fail('设备不存在', 404));
    if (row.archive_status === 'scrapped') {
      return res.status(400).json(fail('该设备已是报废状态', 400));
    }

    await conn.beginTransaction();
    const [accessRows] = await conn.query('SELECT id FROM device_access WHERE device_id = ?', [deviceId]);
    for (const ar of accessRows) {
      await conn.query('DELETE FROM device_access_log WHERE access_id = ?', [ar.id]);
    }
    await conn.query('DELETE FROM device_access WHERE device_id = ?', [deviceId]);
    await conn.query(
      `UPDATE device_archive SET
        archive_status = 'scrapped', status = 'scrapped',
        unit_id = NULL, building_id = NULL, floor_id = NULL, point_id = NULL,
        protocol_device_id = NULL
       WHERE id = ?`,
      [deviceId]
    );
    await conn.commit();
    res.json(success(null, '设备已报废：已解除接入与单位归属，档案仅可查询'));
  } catch (err) {
    await conn.rollback();
    handleError(res, err, req, 'scrap device error');
  } finally {
    conn.release();
  }
});

/* ═══════ 批量补充安装位置（仅已分配/已接入，禁止改单位） ═══════ */
router.post('/devices/batch-bind', async (req, res) => {
  try {
    const body = normalizeBody(req.body);
    const { deviceIds, building_id, floor_id, point_id } = body;
    if (body.unit_id !== undefined && body.unit_id) {
      return res.status(400).json(fail('禁止通过本接口修改所属单位，请使用「设备分配」接口', 400));
    }
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json(fail('deviceIds 不能为空数组', 400));
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const deviceId of deviceIds) {
        const [[d]] = await conn.query(
          'SELECT archive_status FROM device_archive WHERE id = ?',
          [deviceId]
        );
        if (!d) {
          await conn.rollback();
          return res.status(404).json(fail(`设备不存在: ${deviceId}`, 404));
        }
        if (!['allocated', 'accessed'].includes(d.archive_status)) {
          await conn.rollback();
          return res.status(400).json(
            fail('仅「已分配」或「已接入」设备可补充建筑/楼层/点位，未分配请先走设备分配流程', 400)
          );
        }
        await conn.query(
          'UPDATE device_archive SET building_id = ?, floor_id = ?, point_id = ? WHERE id = ?',
          [building_id || null, floor_id || null, point_id || null, deviceId]
        );
      }
      await conn.commit();
      res.json(success(null, `已更新 ${deviceIds.length} 台设备的安装位置`));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    handleError(res, err, req, 'batch bind error');
  }
});

/* ═══════════════════════════════════════════════════════════════
   设备配置
   ═══════════════════════════════════════════════════════════════ */

/* ═══════ 设备配置列表（分页） ═══════ */
router.get('/device-configs/list', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword, device_id, protocol_type } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (da.name LIKE ? OR da.code LIKE ?)';
      const kw = `%${sanitizeLike(keyword)}%`;
      params.push(kw, kw);
    }
    if (device_id) {
      where += ' AND dc.device_id = ?';
      params.push(device_id);
    }
    if (protocol_type) {
      where += ' AND dc.protocol_type = ?';
      params.push(protocol_type);
    }

    const countSql = `SELECT COUNT(*) as total FROM device_config dc JOIN device_archive da ON dc.device_id = da.id ${where}`;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `
      SELECT dc.*, da.name as device_name, da.code as device_code, da.category, da.status as device_status
      FROM device_config dc
      JOIN device_archive da ON dc.device_id = da.id
      ${where}
      ORDER BY dc.updated_at DESC
      LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(dataSql, [...params, pageSize, offset]);

    res.json(success({
      list: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }));
  } catch (err) {
    handleError(res, err, req, 'device config list error');
  }
});

/* ═══════ 获取单设备配置 ═══════ */
router.get('/devices/:id/config', async (req, res) => {
  try {
    const [[config]] = await pool.query(
      `SELECT dc.*, da.name as device_name, da.code as device_code, da.category, da.protocol_type as device_protocol
       FROM device_config dc
       JOIN device_archive da ON dc.device_id = da.id
       WHERE dc.device_id = ?`, [req.params.id]
    );
    if (!config) return res.status(404).json(fail('设备配置不存在', 404));
    res.json(success(config));
  } catch (err) {
    handleError(res, err, req, 'device config error');
  }
});

/* ═══════ 更新/创建设备配置 ═══════ */
router.put('/devices/:id/config', async (req, res) => {
  try {
    const deviceId = req.params.id;
    const {
      protocol_type, communication_params, alarm_thresholds, linkage_rules,
      heartbeat_interval, data_collection_interval,
      auto_report, mute_enabled, reset_enabled, remote_control_enabled
    } = req.body;

    const [[existing]] = await pool.query('SELECT id FROM device_config WHERE device_id = ?', [deviceId]);

    if (existing) {
      const fields = [];
      const values = [];
      const updatable = [
        'protocol_type', 'communication_params', 'alarm_thresholds', 'linkage_rules',
        'heartbeat_interval', 'data_collection_interval',
        'auto_report', 'mute_enabled', 'reset_enabled', 'remote_control_enabled'
      ];
      for (const f of updatable) {
        if (req.body[f] !== undefined) {
          fields.push(`${f} = ?`);
          values.push(req.body[f]);
        }
      }
      if (fields.length > 0) {
        values.push(deviceId);
        await pool.query(`UPDATE device_config SET ${fields.join(', ')} WHERE device_id = ?`, values);
      }
    } else {
      await pool.query(
        `INSERT INTO device_config (device_id, protocol_type, communication_params, alarm_thresholds, linkage_rules,
          heartbeat_interval, data_collection_interval, auto_report, mute_enabled, reset_enabled, remote_control_enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [deviceId, protocol_type || null,
         JSON.stringify(communication_params || {}), JSON.stringify(alarm_thresholds || {}), JSON.stringify(linkage_rules || {}),
         heartbeat_interval || 60, data_collection_interval || 300,
         auto_report !== undefined ? auto_report : 1,
         mute_enabled !== undefined ? mute_enabled : 1,
         reset_enabled !== undefined ? reset_enabled : 1,
         remote_control_enabled !== undefined ? remote_control_enabled : 0]
      );
    }

    res.json(success(null, '配置保存成功'));
  } catch (err) {
    handleError(res, err, req, 'save device config error');
  }
});

/* ═══════ 创建设备配置 ═══════ */
router.post('/device-configs', async (req, res) => {
  try {
    const { device_id, protocol_type, communication_params, alarm_thresholds, linkage_rules,
      heartbeat_interval, data_collection_interval, auto_report, mute_enabled, reset_enabled, remote_control_enabled } = req.body;
    if (!device_id) return res.status(400).json(fail('device_id 不能为空', 400));

    const [[existing]] = await pool.query('SELECT id FROM device_config WHERE device_id = ?', [device_id]);
    if (existing) return res.status(400).json(fail('该设备已存在配置', 400));

    const [result] = await pool.query(
      `INSERT INTO device_config (device_id, protocol_type, communication_params, alarm_thresholds, linkage_rules,
        heartbeat_interval, data_collection_interval, auto_report, mute_enabled, reset_enabled, remote_control_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [device_id, protocol_type || null,
       JSON.stringify(communication_params || {}), JSON.stringify(alarm_thresholds || {}), JSON.stringify(linkage_rules || {}),
       heartbeat_interval || 60, data_collection_interval || 300,
       auto_report !== undefined ? auto_report : 1,
       mute_enabled !== undefined ? mute_enabled : 1,
       reset_enabled !== undefined ? reset_enabled : 1,
       remote_control_enabled !== undefined ? remote_control_enabled : 0]
    );
    res.json(success({ id: result.insertId }, '配置创建成功'));
  } catch (err) {
    handleError(res, err, req, 'create device config error');
  }
});

/* ═══════ 删除设备配置 ═══════ */
router.delete('/device-configs/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM device_config WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json(fail('配置不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, req, 'delete device config error');
  }
});

/* ═══════════════════════════════════════════════════════════════
   设备维护
   ═══════════════════════════════════════════════════════════════ */

/* ═══════ 维护记录分页列表 ═══════ */
router.get('/device-maintenances/list', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword, device_id, type, status, sortBy, sortOrder } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (da.name LIKE ? OR da.code LIKE ? OR dm.executor LIKE ?)';
      const kw = `%${sanitizeLike(keyword)}%`;
      params.push(kw, kw, kw);
    }
    if (device_id) {
      where += ' AND dm.device_id = ?';
      params.push(device_id);
    }
    if (type) {
      where += ' AND dm.type = ?';
      params.push(type);
    }
    if (status) {
      where += ' AND dm.status = ?';
      params.push(status);
    }

    const sortCol = ['plan_date', 'actual_date', 'status', 'created_at'].includes(sortBy) ? sortBy : 'plan_date';
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countSql = `SELECT COUNT(*) as total FROM device_maintenance dm JOIN device_archive da ON dm.device_id = da.id ${where}`;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `
      SELECT dm.*, da.name as device_name, da.code as device_code, da.category, da.unit_id, u.name as unit_name
      FROM device_maintenance dm
      JOIN device_archive da ON dm.device_id = da.id
      LEFT JOIN units u ON da.unit_id = u.id
      ${where}
      ORDER BY dm.${sortCol} ${sortDir}
      LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(dataSql, [...params, pageSize, offset]);

    res.json(success({
      list: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }));
  } catch (err) {
    handleError(res, err, req, 'device maintenance list error');
  }
});

/* ═══════ 获取单设备维护记录 ═══════ */
router.get('/devices/:id/maintenance', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM device_maintenance WHERE device_id = ? ORDER BY plan_date DESC',
      [req.params.id]
    );
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'device maintenance error');
  }
});

/* ═══════ 创建设备维护记录（独立端点） ═══════ */
router.post('/device-maintenances', async (req, res) => {
  try {
    const { device_id, type, plan_date, actual_date, executor, cost, content, result, status, next_plan_date, attachments } = req.body;
    if (!device_id || !type || !plan_date) return res.status(400).json(fail('device_id、维护类型和计划日期不能为空', 400));

    const [result2] = await pool.query(
      `INSERT INTO device_maintenance (device_id, type, plan_date, actual_date, executor, cost, content, result, status, next_plan_date, attachments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [device_id, type, plan_date, actual_date || null, executor || null, cost || null, content || null,
       result || null, status || 'pending', next_plan_date || null, JSON.stringify(attachments || [])]
    );
    res.json(success({ id: result2.insertId }, '维护记录创建成功'));
  } catch (err) {
    handleError(res, err, req, 'create maintenance error');
  }
});

/* ═══════ 新增维护记录（按设备） ═══════ */
router.post('/devices/:id/maintenance', async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { type, plan_date, actual_date, executor, cost, content, result, status, next_plan_date, attachments } = req.body;
    if (!type || !plan_date) return res.status(400).json(fail('维护类型和计划日期不能为空', 400));

    const [result2] = await pool.query(
      `INSERT INTO device_maintenance (device_id, type, plan_date, actual_date, executor, cost, content, result, status, next_plan_date, attachments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, type, plan_date, actual_date || null, executor || null, cost || null, content || null,
       result || null, status || 'pending', next_plan_date || null, JSON.stringify(attachments || [])]
    );

    res.json(success({ id: result2.insertId }, '维护记录创建成功'));
  } catch (err) {
    handleError(res, err, req, 'create maintenance error');
  }
});

/* ═══════ 更新维护记录 ═══════ */
router.put('/device-maintenances/:mid', async (req, res) => {
  try {
    const mid = req.params.mid;
    const fields = ['type', 'plan_date', 'actual_date', 'executor', 'cost', 'content', 'result', 'status', 'next_plan_date'];
    const updates = [];
    const values = [];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f]);
      }
    }
    if (req.body.attachments !== undefined) {
      updates.push('attachments = ?');
      values.push(JSON.stringify(req.body.attachments));
    }

    if (updates.length === 0) return res.status(400).json(fail('没有需要更新的字段', 400));

    values.push(mid);
    const [result] = await pool.query(
      `UPDATE device_maintenance SET ${updates.join(', ')} WHERE id = ?`, values
    );

    if (result.affectedRows === 0) return res.status(404).json(fail('记录不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    handleError(res, err, req, 'update maintenance error');
  }
});

/* ═══════ 删除维护记录 ═══════ */
router.delete('/device-maintenances/:mid', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM device_maintenance WHERE id = ?', [req.params.mid]);
    if (result.affectedRows === 0) return res.status(404).json(fail('记录不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, req, 'delete maintenance error');
  }
});

/* ═══════════════════════════════════════════════════════════════
   设备状态与统计
   ═══════════════════════════════════════════════════════════════ */

/* ═══════ 设备概览统计 ═══════ */
router.get('/devices/stats/overview', async (req, res) => {
  try {
    const [[totalStats]] = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal,
        SUM(CASE WHEN status = 'fault' THEN 1 ELSE 0 END) as fault,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) as disabled,
        AVG(health_score) as avgHealth
       FROM device_archive`
    );

    const [categoryStats] = await pool.query(
      `SELECT category, COUNT(*) as count,
        SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline
       FROM device_archive GROUP BY category`
    );

    const [protocolStats] = await pool.query(
      `SELECT protocol_type, COUNT(*) as count FROM device_archive WHERE protocol_type IS NOT NULL GROUP BY protocol_type`
    );

    // 今日告警
    const [[todayAlarm]] = await pool.query(
      `SELECT COUNT(*) as count FROM fire_alarm WHERE DATE(created_at) = CURDATE()`
    );

    // 待处理维护
    const [[pendingMaint]] = await pool.query(
      `SELECT COUNT(*) as count FROM device_maintenance WHERE status IN ('pending', 'overdue')`
    );

    res.json(success({
      total: totalStats || { total: 0, normal: 0, fault: 0, offline: 0, maintenance: 0, disabled: 0, avgHealth: 100 },
      category: categoryStats,
      protocol: protocolStats,
      todayAlarm: todayAlarm?.count || 0,
      pendingMaintenance: pendingMaint?.count || 0,
    }));
  } catch (err) {
    handleError(res, err, req, 'device overview stats error');
  }
});

/* ═══════ 设备状态实时监控列表 ═══════ */
router.get('/devices/status/realtime', async (req, res) => {
  try {
    const { pageSize = 50 } = req.query;
    const [rows] = await pool.query(
      `SELECT da.id, da.code, da.name, da.category, da.status, da.health_score, da.protocol_type,
        da.unit_id, u.name as unit_name, da.building_id, fb.name as building_name,
        da.protocol_device_id,
        fid.last_online as last_online,
        fid.online_status as real_time_status
       FROM device_archive da
       LEFT JOIN units u ON da.unit_id = u.id
       LEFT JOIN fire_building fb ON da.building_id = fb.id
       LEFT JOIN fire_iot_device fid ON da.protocol_device_id = fid.device_id
       ORDER BY da.updated_at DESC
       LIMIT ?`, [parseInt(pageSize, 10)]
    );
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'device realtime status error');
  }
});

module.exports = router;
