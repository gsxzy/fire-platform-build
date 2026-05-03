/**
 * ═══════════════════════════════════════════════════════════════
 * 设备接入管理路由模块
 * 路径前缀: /api/* (通过 routes/index.js 挂载)
 * 功能：接入配置、接入测试、断开接入、批量接入、接入日志
 *
 * 流程位置：设备档案 → 设备分配(allocated) → 【本模块】→ accessed
 *
 * 约束：
 *   - 仅 allocated 状态设备可进行接入配置（未分配/报废/已接入按接口分别拦截）
 *   - 断开接入后保留单位分配关系（archive_status 回到 allocated）
 *   - 接入完成变为 accessed 后，业务上视为可上报数据/参与告警（与协议层联调一致）
 * ═══════════════════════════════════════════════════════════════
 */
const express = require('express');
const { pool } = require('../utils/db');
const { success, fail, handleError } = require('../utils/response');

const router = express.Router();

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

/* ═══════ 查询可接入设备（已分配未接入） ═══════ */
router.get('/device-accesses/allocatable', async (req, res) => {
  try {
    const { unit_id, category, keyword } = req.query;

    let where = "WHERE da.archive_status = 'allocated'";
    const params = [];

    if (unit_id) {
      where += ' AND da.unit_id = ?';
      params.push(unit_id);
    }
    if (category) {
      where += ' AND da.category = ?';
      params.push(category);
    }
    if (keyword) {
      where += ' AND (da.name LIKE ? OR da.code LIKE ?)';
      const kw = `%${sanitizeLike(keyword)}%`;
      params.push(kw, kw);
    }

    const [rows] = await pool.query(
      `SELECT da.id, da.code, da.name, da.category, da.manufacturer, da.model,
        da.unit_id, u.name as unit_name,
        da.building_id, fb.name as building_name,
        da.floor_id, ff.name as floor_name,
        da.protocol_type, da.area as location
      FROM device_archive da
      LEFT JOIN units u ON da.unit_id = u.id
      LEFT JOIN fire_building fb ON da.building_id = fb.id
      LEFT JOIN fire_floor ff ON da.floor_id = ff.id
      ${where}
      ORDER BY da.created_at DESC`,
      params
    );

    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'allocatable devices error');
  }
});

/* ═══════ 创建设备接入配置 ═══════ */
router.post('/device-accesses', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      device_id, unit_id, gateway_no, protocol, access_address, port,
      heartbeat_interval, encrypt_type, config_json, created_by
    } = req.body;

    if (!device_id || !protocol) {
      return res.status(400).json(fail('device_id 和 protocol 不能为空', 400));
    }

    // 校验设备状态
    const [[device]] = await conn.query(
      'SELECT archive_status, unit_id, name, code FROM device_archive WHERE id = ?',
      [device_id]
    );
    if (!device) return res.status(404).json(fail('设备档案不存在', 404));
    if (device.archive_status === 'scrapped') {
      return res.status(400).json(fail('报废设备不可进行接入配置', 400));
    }
    if (device.archive_status === 'unallocated') {
      return res.status(400).json(fail('设备尚未分配单位，请先完成设备分配', 400));
    }
    if (device.archive_status === 'accessed') {
      return res.status(400).json(fail('设备已接入，如需修改请先断开接入', 400));
    }

    // 校验单位有效性
    const targetUnitId = unit_id || device.unit_id;
    const [[unit]] = await conn.query('SELECT status FROM units WHERE id = ?', [targetUnitId]);
    if (!unit) return res.status(404).json(fail('单位不存在', 404));
    if (parseInt(unit.status, 10) === 0) {
      return res.status(400).json(fail('该单位已被禁用，无法进行接入配置', 400));
    }

    // 检查是否已有接入记录
    const [[existing]] = await conn.query('SELECT id FROM device_access WHERE device_id = ?', [device_id]);
    if (existing) {
      return res.status(400).json(fail('该设备已存在接入记录，请使用更新接口或先删除旧记录', 400));
    }

    const accessId = `ACC_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO device_access (
        id, device_id, unit_id, gateway_no, protocol, access_address, port,
        heartbeat_interval, encrypt_type, access_status, config_json, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [accessId, device_id, targetUnitId, gateway_no || null, protocol,
       access_address || null, port || null, heartbeat_interval || 60,
       encrypt_type || null, 'disconnected',
       config_json ? JSON.stringify(config_json) : null, created_by || null]
    );

    // 记录接入日志
    await conn.query(
      `INSERT INTO device_access_log (device_id, access_id, action, access_params, operator)
       VALUES (?, ?, ?, ?, ?)`,
      [device_id, accessId, 'connect', config_json ? JSON.stringify(config_json) : null, created_by || null]
    );

    await conn.commit();
    res.json(success({ id: accessId }, '接入配置创建成功，请进行接入测试'));
  } catch (err) {
    await conn.rollback();
    handleError(res, err, req, 'create device access error');
  } finally {
    conn.release();
  }
});

/* ═══════ 更新设备接入配置 ═══════ */
router.put('/device-accesses/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const accessId = req.params.id;
    const {
      gateway_no, protocol, access_address, port,
      heartbeat_interval, encrypt_type, config_json
    } = req.body;

    const [[access]] = await conn.query('SELECT * FROM device_access WHERE id = ?', [accessId]);
    if (!access) return res.status(404).json(fail('接入记录不存在', 404));

    // 已接入的设备修改参数后需重新测试
    const needRetest = access.access_status === 'connected';

    const fields = ['gateway_no', 'protocol', 'access_address', 'port',
      'heartbeat_interval', 'encrypt_type'];
    const updates = [];
    const values = [];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f]);
      }
    }

    if (config_json !== undefined) {
      updates.push('config_json = ?');
      values.push(JSON.stringify(config_json));
    }

    if (needRetest) {
      updates.push("access_status = 'disconnected'");
      updates.push("fail_reason = '参数已修改，需重新测试接入'");
    }

    if (updates.length === 0) return res.status(400).json(fail('没有需要更新的字段', 400));

    values.push(accessId);
    await conn.query(`UPDATE device_access SET ${updates.join(', ')} WHERE id = ?`, values);

    // 记录重新配置日志
    await conn.query(
      `INSERT INTO device_access_log (device_id, access_id, action, access_params, operator)
       VALUES (?, ?, ?, ?, ?)`,
      [access.device_id, accessId, 'reconfig', config_json ? JSON.stringify(config_json) : null, req.body.operator || null]
    );

    res.json(success(null, needRetest ? '配置更新成功，参数已变更，请重新进行接入测试' : '配置更新成功'));
  } catch (err) {
    handleError(res, err, req, 'update device access error');
  } finally {
    conn.release();
  }
});

/* ═══════ 接入测试 ═══════ */
router.post('/device-accesses/:id/test', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const accessId = req.params.id;
    const { operator } = req.body || {};

    const [[access]] = await conn.query(
      `SELECT da.*, u.status as unit_status
       FROM device_access da
       LEFT JOIN units u ON da.unit_id = u.id
       WHERE da.id = ?`,
      [accessId]
    );
    if (!access) return res.status(404).json(fail('接入记录不存在', 404));

    if (access.unit_status !== undefined && parseInt(access.unit_status, 10) === 0) {
      return res.status(400).json(fail('所属单位已被禁用，无法进行接入测试', 400));
    }

    // TODO: 这里可对接真实协议测试服务（Modbus/MQTT/GB26875等）
    // 当前使用模拟测试逻辑：协议和地址有值即认为测试通过
    const testSuccess = !!(access.protocol && (access.access_address || access.gateway_no));
    const testResult = testSuccess ? 'success' : 'failed';
    const failReason = testSuccess ? null : '缺少必要的接入参数（协议或接入地址/网关编号）';

    await conn.query(
      `UPDATE device_access SET
        access_status = ?,
        last_test_time = NOW(),
        last_test_result = ?,
        fail_reason = ?
      WHERE id = ?`,
      [testSuccess ? 'connected' : 'failed', testResult, failReason, accessId]
    );

    // 如果测试成功，同步更新设备档案为已接入状态
    if (testSuccess) {
      await conn.query(
        "UPDATE device_archive SET archive_status = 'accessed', status = 'normal' WHERE id = ?",
        [access.device_id]
      );
    }

    // 记录测试日志
    await conn.query(
      `INSERT INTO device_access_log (device_id, access_id, action, result, fail_reason, operator)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [access.device_id, accessId, 'test', testResult, failReason, operator || null]
    );

    res.json(success({
      success: testSuccess,
      accessStatus: testSuccess ? 'connected' : 'failed',
      failReason,
    }, testSuccess ? '接入测试成功，设备已上线' : '接入测试失败'));
  } catch (err) {
    handleError(res, err, req, 'device access test error');
  } finally {
    conn.release();
  }
});

/* ═══════ 断开设备接入 ═══════ */
router.post('/device-accesses/:id/disconnect', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const accessId = req.params.id;
    const { operator, reason } = req.body || {};

    const [[access]] = await conn.query('SELECT * FROM device_access WHERE id = ?', [accessId]);
    if (!access) return res.status(404).json(fail('接入记录不存在', 404));

    await conn.beginTransaction();

    // 更新接入状态为断开
    await conn.query(
      "UPDATE device_access SET access_status = 'disconnected', fail_reason = ? WHERE id = ?",
      [reason || '人工断开接入', accessId]
    );

    // 设备档案状态恢复为已分配（保留单位关系）
    await conn.query(
      "UPDATE device_archive SET archive_status = 'allocated', status = 'offline' WHERE id = ?",
      [access.device_id]
    );

    // 记录断开日志
    await conn.query(
      `INSERT INTO device_access_log (device_id, access_id, action, result, fail_reason, operator)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [access.device_id, accessId, 'disconnect', 'success', reason || '人工断开接入', operator || null]
    );

    await conn.commit();
    res.json(success(null, '设备接入已断开，档案状态恢复为【已分配】，如需重新接入可直接配置参数'));
  } catch (err) {
    await conn.rollback();
    handleError(res, err, req, 'disconnect device access error');
  } finally {
    conn.release();
  }
});

/* ═══════ 删除接入配置 ═══════ */
router.delete('/device-accesses/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const accessId = req.params.id;

    const [[access]] = await conn.query('SELECT device_id, access_status FROM device_access WHERE id = ?', [accessId]);
    if (!access) return res.status(404).json(fail('接入记录不存在', 404));

    if (access.access_status === 'connected') {
      return res.status(400).json(fail('设备当前处于已接入状态，请先断开接入后再删除配置', 400));
    }

    await conn.beginTransaction();

    await conn.query('DELETE FROM device_access_log WHERE access_id = ?', [accessId]);
    await conn.query('DELETE FROM device_access WHERE id = ?', [accessId]);

    // 如果档案状态为 accessed，恢复为 allocated（兜底）
    await conn.query(
      "UPDATE device_archive SET archive_status = 'allocated' WHERE id = ? AND archive_status = 'accessed'",
      [access.device_id]
    );

    await conn.commit();
    res.json(success(null, '接入配置删除成功'));
  } catch (err) {
    await conn.rollback();
    handleError(res, err, req, 'delete device access error');
  } finally {
    conn.release();
  }
});

/* ═══════ 接入配置分页列表 ═══════ */
router.get('/device-accesses/list', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword, unit_id, device_id, protocol, access_status } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (da.name LIKE ? OR da.code LIKE ? OR dac.access_address LIKE ?)';
      const kw = `%${sanitizeLike(keyword)}%`;
      params.push(kw, kw, kw);
    }
    if (unit_id) {
      where += ' AND dac.unit_id = ?';
      params.push(unit_id);
    }
    if (device_id) {
      where += ' AND dac.device_id = ?';
      params.push(device_id);
    }
    if (protocol) {
      where += ' AND dac.protocol = ?';
      params.push(protocol);
    }
    if (access_status) {
      where += ' AND dac.access_status = ?';
      params.push(access_status);
    }

    const countSql = `SELECT COUNT(*) as total FROM device_access dac JOIN device_archive da ON dac.device_id = da.id ${where}`;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `
      SELECT
        dac.*,
        da.name as device_name, da.code as device_code, da.category, da.archive_status as device_archive_status,
        u.name as unit_name
      FROM device_access dac
      JOIN device_archive da ON dac.device_id = da.id
      LEFT JOIN units u ON dac.unit_id = u.id
      ${where}
      ORDER BY dac.updated_at DESC
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
    handleError(res, err, req, 'device access list error');
  }
});

/* ═══════ 接入日志查询 ═══════ */
router.get('/device-accesses/:id/logs', async (req, res) => {
  try {
    const accessId = req.params.id;
    const { page, pageSize, offset } = parsePagination(req.query);

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM device_access_log WHERE access_id = ?',
      [accessId]
    );

    const [rows] = await pool.query(
      `SELECT dal.*, da.name as device_name, da.code as device_code
       FROM device_access_log dal
       LEFT JOIN device_archive da ON dal.device_id = da.id
       WHERE dal.access_id = ?
       ORDER BY dal.created_at DESC
       LIMIT ? OFFSET ?`,
      [accessId, pageSize, offset]
    );

    res.json(success({
      list: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }));
  } catch (err) {
    handleError(res, err, req, 'device access logs error');
  }
});

/* ═══════ 批量接入配置（同一单位、同一类型、同一网关） ═══════ */
router.post('/device-accesses/batch', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      deviceIds, unit_id, gateway_no, protocol, access_address, port,
      heartbeat_interval, encrypt_type, config_json, created_by
    } = req.body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json(fail('deviceIds 不能为空数组', 400));
    }
    if (!protocol) {
      return res.status(400).json(fail('protocol 不能为空', 400));
    }

    // 校验单位有效性
    const [[unit]] = await conn.query('SELECT status FROM units WHERE id = ?', [unit_id]);
    if (!unit) return res.status(404).json(fail('单位不存在', 404));
    if (parseInt(unit.status, 10) === 0) {
      return res.status(400).json(fail('该单位已被禁用，无法进行接入配置', 400));
    }

    await conn.beginTransaction();

    const results = { success: [], failed: [] };

    for (const deviceId of deviceIds) {
      const [[device]] = await conn.query(
        'SELECT archive_status, unit_id FROM device_archive WHERE id = ?',
        [deviceId]
      );

      if (!device) {
        results.failed.push({ deviceId, reason: '设备不存在' });
        continue;
      }

      if (device.archive_status !== 'allocated') {
        results.failed.push({ deviceId, reason: `设备状态为【${device.archive_status}】，仅已分配设备可接入` });
        continue;
      }

      if (device.unit_id !== unit_id) {
        results.failed.push({ deviceId, reason: '设备不属于指定单位' });
        continue;
      }

      const [[existing]] = await conn.query('SELECT id FROM device_access WHERE device_id = ?', [deviceId]);
      if (existing) {
        results.failed.push({ deviceId, reason: '该设备已存在接入记录' });
        continue;
      }

      const accessId = `ACC_${Date.now()}_${Math.floor(Math.random() * 1000)}_${deviceId.slice(-4)}`;

      await conn.query(
        `INSERT INTO device_access (
          id, device_id, unit_id, gateway_no, protocol, access_address, port,
          heartbeat_interval, encrypt_type, access_status, config_json, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [accessId, deviceId, unit_id, gateway_no || null, protocol,
         access_address || null, port || null, heartbeat_interval || 60,
         encrypt_type || null, 'disconnected',
         config_json ? JSON.stringify(config_json) : null, created_by || null]
      );

      await conn.query(
        `INSERT INTO device_access_log (device_id, access_id, action, access_params, operator)
         VALUES (?, ?, ?, ?, ?)`,
        [deviceId, accessId, 'connect', config_json ? JSON.stringify(config_json) : null, created_by || null]
      );

      results.success.push({ deviceId, accessId });
    }

    await conn.commit();
    res.json(success({
      successCount: results.success.length,
      failedCount: results.failed.length,
      failedDetails: results.failed,
    }, `批量接入配置完成：成功 ${results.success.length} 台，失败 ${results.failed.length} 台`));
  } catch (err) {
    await conn.rollback();
    handleError(res, err, req, 'batch create device access error');
  } finally {
    conn.release();
  }
});

module.exports = router;
