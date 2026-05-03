/**
 * ═══════════════════════════════════════════════════════════════
 * 设备分配路由模块
 * 路径前缀: /api/* (通过 routes/index.js 挂载)
 * 功能：设备分配、解除分配、分配记录查询、未分配设备查询
 *
 * 在整体流程中的位置（不可逆顺序中的一环）：
 *   设备档案(unallocated) → 【本模块：分配单位/建筑/楼层/点位】→ allocated
 *   → 设备接入(deviceAccess) → accessed
 *
 * 约束：
 *   - 仅 unallocated 状态设备可分配；报废/已分配/已接入均不可直接分配
 *   - 仅 allocated 可解除分配；accessed 须先断开接入
 *   - 解除分配时同步删除该设备的接入草稿(device_access)及日志，避免脏数据
 *   - 禁用单位不可接收分配
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

/* ═══════ 查询未分配设备档案 ═══════ */
router.get('/devices/unallocated', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword, category } = req.query;

    let where = "WHERE da.archive_status = 'unallocated'";
    const params = [];

    if (keyword) {
      where += ' AND (da.name LIKE ? OR da.code LIKE ?)';
      const kw = `%${sanitizeLike(keyword)}%`;
      params.push(kw, kw);
    }
    if (category) {
      where += ' AND da.category = ?';
      params.push(category);
    }

    const countSql = `SELECT COUNT(*) as total FROM device_archive da ${where}`;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `
      SELECT da.id, da.code, da.name, da.category, da.manufacturer, da.model,
        da.serial_no, da.production_date, da.protocol_type, da.status,
        da.archive_status, da.calibration_cycle, da.scrap_year, da.remark,
        da.created_at
      FROM device_archive da
      ${where}
      ORDER BY da.created_at DESC
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
    handleError(res, err, req, 'unallocated devices list error');
  }
});

/* ═══════ 设备分配（单个/批量） ═══════ */
router.post('/device-allocations/allocate', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { deviceIds, unit_id, building_id, floor_id, point_id, operator, remark } = req.body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json(fail('deviceIds 不能为空数组', 400));
    }
    if (!unit_id) {
      return res.status(400).json(fail('unit_id 不能为空', 400));
    }

    // 校验单位有效性
    const [[unit]] = await conn.query('SELECT status FROM units WHERE id = ?', [unit_id]);
    if (!unit) return res.status(404).json(fail('单位不存在', 404));
    if (parseInt(unit.status, 10) === 0) {
      return res.status(400).json(fail('该单位已被禁用，无法分配设备', 400));
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

      if (device.archive_status === 'scrapped') {
        results.failed.push({ deviceId, reason: '设备已报废，不可分配' });
        continue;
      }

      if (device.archive_status !== 'unallocated') {
        results.failed.push({ deviceId, reason: `设备当前状态为【${device.archive_status}】，仅未分配设备可分配` });
        continue;
      }

      // 更新设备档案：绑定单位并变更状态
      await conn.query(
        'UPDATE device_archive SET unit_id = ?, building_id = ?, floor_id = ?, point_id = ?, archive_status = ? WHERE id = ?',
        [unit_id, building_id || null, floor_id || null, point_id || null, 'allocated', deviceId]
      );

      // 记录分配日志
      await conn.query(
        'INSERT INTO device_allocation_log (device_id, unit_id, building_id, floor_id, point_id, action, operator, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [deviceId, unit_id, building_id || null, floor_id || null, point_id || null, 'allocate', operator || null, remark || null]
      );

      results.success.push(deviceId);
    }

    await conn.commit();
    res.json(success({
      allocatedCount: results.success.length,
      failedCount: results.failed.length,
      failedDetails: results.failed,
    }, `成功分配 ${results.success.length} 台设备${results.failed.length > 0 ? `，${results.failed.length} 台失败` : ''}`));
  } catch (err) {
    await conn.rollback();
    handleError(res, err, req, 'allocate devices error');
  } finally {
    conn.release();
  }
});

/* ═══════ 解除设备分配（单个/批量） ═══════ */
router.post('/device-allocations/unallocate', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { deviceIds, operator, remark } = req.body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json(fail('deviceIds 不能为空数组', 400));
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

      if (device.archive_status === 'accessed') {
        results.failed.push({ deviceId, reason: '设备已接入，请先断开接入后再解除分配' });
        continue;
      }

      if (device.archive_status === 'unallocated') {
        results.failed.push({ deviceId, reason: '设备当前未分配' });
        continue;
      }

      if (device.archive_status === 'scrapped') {
        results.failed.push({ deviceId, reason: '报废设备不可操作' });
        continue;
      }

      const unitId = device.unit_id;

      const [accessRows] = await conn.query('SELECT id FROM device_access WHERE device_id = ?', [deviceId]);
      for (const ar of accessRows) {
        await conn.query('DELETE FROM device_access_log WHERE access_id = ?', [ar.id]);
      }
      await conn.query('DELETE FROM device_access WHERE device_id = ?', [deviceId]);

      // 清除单位绑定，恢复未分配状态
      await conn.query(
        "UPDATE device_archive SET unit_id = NULL, building_id = NULL, floor_id = NULL, point_id = NULL, archive_status = 'unallocated' WHERE id = ?",
        [deviceId]
      );

      // 记录解除分配日志
      await conn.query(
        'INSERT INTO device_allocation_log (device_id, unit_id, action, operator, remark) VALUES (?, ?, ?, ?, ?)',
        [deviceId, unitId, 'unallocate', operator || null, remark || null]
      );

      results.success.push(deviceId);
    }

    await conn.commit();
    res.json(success({
      unallocatedCount: results.success.length,
      failedCount: results.failed.length,
      failedDetails: results.failed,
    }, `成功解除 ${results.success.length} 台设备分配${results.failed.length > 0 ? `，${results.failed.length} 台失败` : ''}`));
  } catch (err) {
    await conn.rollback();
    handleError(res, err, req, 'unallocate devices error');
  } finally {
    conn.release();
  }
});

/* ═══════ 变更设备归属单位（先解除再分配） ═══════ */
router.post('/device-allocations/reallocate', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { deviceId, newUnitId, building_id, floor_id, point_id, operator, remark } = req.body;

    if (!deviceId || !newUnitId) {
      return res.status(400).json(fail('deviceId 和 newUnitId 不能为空', 400));
    }

    const [[device]] = await conn.query(
      'SELECT archive_status, unit_id FROM device_archive WHERE id = ?',
      [deviceId]
    );

    if (!device) return res.status(404).json(fail('设备不存在', 404));
    if (device.archive_status === 'accessed') {
      return res.status(400).json(fail('设备已接入，请先断开接入后再变更单位', 400));
    }
    if (device.archive_status === 'unallocated') {
      return res.status(400).json(fail('设备当前未分配，请使用分配接口', 400));
    }
    if (device.archive_status === 'scrapped') {
      return res.status(400).json(fail('报废设备不可操作', 400));
    }

    // 校验新单位有效性
    const [[unit]] = await conn.query('SELECT status FROM units WHERE id = ?', [newUnitId]);
    if (!unit) return res.status(404).json(fail('目标单位不存在', 404));
    if (parseInt(unit.status, 10) === 0) {
      return res.status(400).json(fail('目标单位已被禁用，无法分配设备', 400));
    }

    await conn.beginTransaction();

    const oldUnitId = device.unit_id;

    // 更新设备档案
    await conn.query(
      'UPDATE device_archive SET unit_id = ?, building_id = ?, floor_id = ?, point_id = ?, archive_status = ? WHERE id = ?',
      [newUnitId, building_id || null, floor_id || null, point_id || null, 'allocated', deviceId]
    );

    // 记录解除旧分配
    await conn.query(
      'INSERT INTO device_allocation_log (device_id, unit_id, action, operator, remark) VALUES (?, ?, ?, ?, ?)',
      [deviceId, oldUnitId, 'unallocate', operator || null, '变更单位：解除原分配']
    );

    // 记录新分配
    await conn.query(
      'INSERT INTO device_allocation_log (device_id, unit_id, building_id, floor_id, point_id, action, operator, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [deviceId, newUnitId, building_id || null, floor_id || null, point_id || null, 'allocate', operator || null, remark || '变更单位：重新分配']
    );

    await conn.commit();
    res.json(success(null, '设备归属单位变更成功'));
  } catch (err) {
    await conn.rollback();
    handleError(res, err, req, 'reallocate device error');
  } finally {
    conn.release();
  }
});

/* ═══════ 分配记录分页查询 ═══════ */
router.get('/device-allocations/list', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { device_id, unit_id, action, sortBy, sortOrder } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (device_id) {
      where += ' AND dal.device_id = ?';
      params.push(device_id);
    }
    if (unit_id) {
      where += ' AND dal.unit_id = ?';
      params.push(unit_id);
    }
    if (action) {
      where += ' AND dal.action = ?';
      params.push(action);
    }

    const sortCol = ['created_at'].includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countSql = `SELECT COUNT(*) as total FROM device_allocation_log dal ${where}`;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `
      SELECT dal.*, da.name as device_name, da.code as device_code, da.category,
        u.name as unit_name
      FROM device_allocation_log dal
      LEFT JOIN device_archive da ON dal.device_id = da.id
      LEFT JOIN units u ON dal.unit_id = u.id
      ${where}
      ORDER BY dal.${sortCol} ${sortDir}
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
    handleError(res, err, req, 'allocation log list error');
  }
});

/* ═══════ 查询指定单位下的已分配/已接入设备 ═══════ */
router.get('/units/:id/devices', async (req, res) => {
  try {
    const unitId = req.params.id;
    const { archive_status, category } = req.query;

    let where = 'WHERE da.unit_id = ?';
    const params = [unitId];

    if (archive_status) {
      where += ' AND da.archive_status = ?';
      params.push(archive_status);
    } else {
      where += " AND da.archive_status IN ('allocated', 'accessed')";
    }

    if (category) {
      where += ' AND da.category = ?';
      params.push(category);
    }

    const [rows] = await pool.query(
      `SELECT da.id, da.code, da.name, da.category, da.manufacturer, da.model,
        da.archive_status, da.status, da.protocol_type, da.area as location,
        da.building_id, fb.name as building_name,
        da.floor_id, ff.name as floor_name,
        da.created_at
      FROM device_archive da
      LEFT JOIN fire_building fb ON da.building_id = fb.id
      LEFT JOIN fire_floor ff ON da.floor_id = ff.id
      ${where}
      ORDER BY da.created_at DESC`,
      params
    );

    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'unit devices list error');
  }
});

module.exports = router;
