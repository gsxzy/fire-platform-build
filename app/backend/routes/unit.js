/**
 * ═══════════════════════════════════════════════════════════════
 * 单位管理路由模块
 * 路径前缀: /api/* (通过 routes/index.js 挂载)
 * 功能：单位档案CRUD、人员管理、统计汇总
 *
 * 单位是消防设备的「归属主体」：设备须先建档(device_archive)，再经分配绑定 unit_id，
 * 最后经接入管理上线；禁用单位会联动接入状态与设备运行态（见本文件相关 UPDATE）。
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

/* ═══════ 单位分页列表 ═══════ */
router.get('/units/list', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword, type, status, risk_level, sortBy, sortOrder } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (name LIKE ? OR address LIKE ? OR contact_name LIKE ? OR license_no LIKE ?)';
      const kw = `%${sanitizeLike(keyword)}%`;
      params.push(kw, kw, kw, kw);
    }
    if (type) {
      where += ' AND type = ?';
      params.push(type);
    }
    if (status !== undefined && status !== '') {
      where += ' AND status = ?';
      params.push(parseInt(status, 10));
    }
    if (risk_level) {
      where += ' AND risk_level = ?';
      params.push(risk_level);
    }

    const sortCol = ['name', 'type', 'status', 'created_at', 'risk_level'].includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countSql = `SELECT COUNT(*) as total FROM units ${where}`;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `SELECT id, name, type, supervision_level as supervisionLevel, address,
      contact_name as contactName, contact_phone as contactPhone, contact_email as contactEmail,
      legal_person as legalPerson, license_no as licenseNo, area, lng, lat,
      risk_level as riskLevel, status, remark, created_at as createdAt, updated_at as updatedAt
      FROM units ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(dataSql, [...params, pageSize, offset]);

    res.json(success({
      list: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }));
  } catch (err) {
    handleError(res, err, req, 'units list error');
  }
});

/* ═══════ 单位详情（含建筑/人员/设备统计） ═══════ */
router.get('/units/:id', async (req, res) => {
  try {
    const unitId = req.params.id;

    // 单位基础信息
    const [[unit]] = await pool.query(
      `SELECT id, name, type, supervision_level, address, contact_name, contact_phone, contact_email,
        legal_person, license_no, area, lng, lat, risk_level, status, remark, created_at, updated_at
       FROM units WHERE id = ?`, [unitId]
    );
    if (!unit) return res.status(404).json(fail('单位不存在', 404));

    // 建筑列表
    const [buildings] = await pool.query(
      'SELECT id, name, type, total_floors, address FROM fire_building WHERE unit_id = ? ORDER BY created_at DESC',
      [unitId]
    );

    // 人员列表
    const [personnel] = await pool.query(
      'SELECT id, name, role, phone, email, is_primary FROM unit_personnel WHERE unit_id = ? ORDER BY is_primary DESC, id ASC',
      [unitId]
    );

    // 设备统计
    const [[deviceStats]] = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal,
        SUM(CASE WHEN status = 'fault' THEN 1 ELSE 0 END) as fault,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
       FROM device_archive WHERE unit_id = ?`, [unitId]
    );

    res.json(success({
      ...unit,
      buildings,
      personnel,
      deviceStats: deviceStats || { total: 0, normal: 0, fault: 0, offline: 0, maintenance: 0 },
    }));
  } catch (err) {
    handleError(res, err, req, 'unit detail error');
  }
});

/* ═══════ 创建单位 ═══════ */
router.post('/units', async (req, res) => {
  try {
    const {
      id, name, type, supervision_level, address,
      contact_name, contact_phone, contact_email,
      legal_person, license_no, area, lng, lat,
      risk_level, status, remark
    } = req.body;

    if (!name) return res.status(400).json(fail('单位名称不能为空', 400));

    const unitId = id || `UNIT_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const unitType = type || supervision_level || 'general';

    await pool.query(
      `INSERT INTO units (id, name, type, supervision_level, address, contact_name, contact_phone, contact_email,
        legal_person, license_no, area, lng, lat, risk_level, status, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [unitId, name, unitType, supervision_level || unitType, address || '',
       contact_name || null, contact_phone || null, contact_email || null,
       legal_person || null, license_no || null, area || null, lng || null, lat || null,
       risk_level || 'low', (status !== undefined && !isNaN(parseInt(status, 10))) ? parseInt(status, 10) : 1, remark || null]
    );

    res.json(success({ id: unitId }, '创建成功'));
  } catch (err) {
    handleError(res, err, req, 'create unit error');
  }
});

/* ═══════ 更新单位 ═══════ */
router.put('/units/:id', async (req, res) => {
  try {
    const unitId = req.params.id;
    const fields = ['name', 'type', 'supervision_level', 'address', 'contact_name', 'contact_phone',
      'contact_email', 'legal_person', 'license_no', 'area', 'lng', 'lat', 'risk_level', 'status', 'remark'];
    const updates = [];
    const values = [];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        if (f === 'status') {
          const parsed = parseInt(req.body[f], 10);
          values.push(isNaN(parsed) ? 1 : parsed);
        } else {
          values.push(req.body[f]);
        }
      }
    }

    if (updates.length === 0) return res.status(400).json(fail('没有需要更新的字段', 400));

    values.push(unitId);
    const [result] = await pool.query(
      `UPDATE units SET ${updates.join(', ')} WHERE id = ?`, values
    );

    if (result.affectedRows === 0) return res.status(404).json(fail('单位不存在', 404));

    // 单位状态联动：禁用单位时，将该单位下所有已接入设备的接入状态置为异常
    if (req.body.status !== undefined && parseInt(req.body.status, 10) === 0) {
      await pool.query(
        "UPDATE device_access SET access_status = 'unit_disabled', fail_reason = '所属单位已被禁用' WHERE unit_id = ? AND access_status = 'connected'",
        [unitId]
      );
      // 同步更新档案运行状态
      await pool.query(
        "UPDATE device_archive SET status = 'disabled' WHERE unit_id = ? AND archive_status = 'accessed'",
        [unitId]
      );
    }

    // 单位重新启用时，恢复接入状态（但需人工重新测试接入）
    if (req.body.status !== undefined && parseInt(req.body.status, 10) === 1) {
      await pool.query(
        "UPDATE device_access SET access_status = 'disconnected', fail_reason = '单位已重新启用，需重新测试接入' WHERE unit_id = ? AND access_status = 'unit_disabled'",
        [unitId]
      );
    }

    res.json(success(null, '更新成功'));
  } catch (err) {
    handleError(res, err, req, 'update unit error');
  }
});

/* ═══════ 删除单位 ═══════ */
router.delete('/units/:id', requirePermission('system:user:delete'), async (req, res) => {
  try {
    const unitId = req.params.id;
    // 检查是否有关联建筑
    const [[{ cnt }]] = await pool.query(
      'SELECT COUNT(*) as cnt FROM fire_building WHERE unit_id = ?', [unitId]
    );
    if (cnt > 0) return res.status(400).json(fail(`该单位下存在 ${cnt} 个建筑，请先移除建筑关联`, 400));

    // 检查是否有关联设备（已分配或已接入）
    const [[{ devCnt }]] = await pool.query(
      "SELECT COUNT(*) as devCnt FROM device_archive WHERE unit_id = ? AND archive_status IN ('allocated', 'accessed')",
      [unitId]
    );
    if (devCnt > 0) return res.status(400).json(fail(`该单位下存在 ${devCnt} 台已分配/已接入设备，请先解除设备分配`, 400));

    await pool.query('DELETE FROM unit_personnel WHERE unit_id = ?', [unitId]);
    const [result] = await pool.query('DELETE FROM units WHERE id = ?', [unitId]);

    if (result.affectedRows === 0) return res.status(404).json(fail('单位不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, req, 'delete unit error');
  }
});

/* ═══════ 单位统计 ═══════ */
router.get('/units/:id/stats', async (req, res) => {
  try {
    const unitId = req.params.id;

    // 设备统计
    const [[deviceStats]] = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal,
        SUM(CASE WHEN status = 'fault' THEN 1 ELSE 0 END) as fault,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) as disabled,
        AVG(health_score) as avgHealth
       FROM device_archive WHERE unit_id = ?`, [unitId]
    );

    // 告警统计（近30天）
    const [[alarmStats]] = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN alarm_status = 1 THEN 1 ELSE 0 END) as unresolved
       FROM fire_alarm 
       WHERE unit_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, [unitId]
    );

    // 维护统计
    const [[maintStats]] = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue
       FROM device_maintenance dm
       JOIN device_archive da ON dm.device_id = da.id
       WHERE da.unit_id = ? AND dm.plan_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)`, [unitId]
    );

    // 按类别统计
    const [categoryStats] = await pool.query(
      `SELECT category, COUNT(*) as count,
        SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as online
       FROM device_archive WHERE unit_id = ? GROUP BY category`, [unitId]
    );

    res.json(success({
      device: deviceStats || { total: 0, normal: 0, fault: 0, offline: 0, maintenance: 0, disabled: 0, avgHealth: 100 },
      alarm: alarmStats || { total: 0, unresolved: 0 },
      maintenance: maintStats || { total: 0, pending: 0, overdue: 0 },
      category: categoryStats,
    }));
  } catch (err) {
    handleError(res, err, req, 'unit stats error');
  }
});

/* ═══════ 单位人员管理 ═══════ */

// 获取单位人员列表
router.get('/units/:id/personnel', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, role, phone, email, is_primary FROM unit_personnel WHERE unit_id = ? ORDER BY is_primary DESC, id ASC',
      [req.params.id]
    );
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'unit personnel list error');
  }
});

// 新增单位人员
router.post('/units/:id/personnel', async (req, res) => {
  try {
    const unitId = req.params.id;
    const { name, role, phone, email, is_primary } = req.body;
    if (!name || !role) return res.status(400).json(fail('姓名和角色不能为空', 400));

    const [result] = await pool.query(
      'INSERT INTO unit_personnel (unit_id, name, role, phone, email, is_primary) VALUES (?, ?, ?, ?, ?, ?)',
      [unitId, name, role, phone || null, email || null, is_primary ? 1 : 0]
    );
    res.json(success({ id: result.insertId }, '添加成功'));
  } catch (err) {
    handleError(res, err, req, 'add personnel error');
  }
});

// 删除单位人员
router.delete('/units/:id/personnel/:pid', async (req, res) => {
  try {
    await pool.query('DELETE FROM unit_personnel WHERE id = ? AND unit_id = ?', [req.params.pid, req.params.id]);
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, req, 'delete personnel error');
  }
});

/* ═══════ 全局单位统计 ═══════ */
router.get('/units/stats/overview', async (req, res) => {
  try {
    const [[unitStats]] = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN type = 'general' THEN 1 ELSE 0 END) as general,
        SUM(CASE WHEN type = 'key' THEN 1 ELSE 0 END) as keyUnit,
        SUM(CASE WHEN type = 'nine-small' THEN 1 ELSE 0 END) as nineSmall
       FROM units WHERE status = 1`
    );

    const [[deviceStats]] = await pool.query(
      `SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal,
        SUM(CASE WHEN status = 'fault' THEN 1 ELSE 0 END) as fault,
        SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline
       FROM device_archive`
    );

    const [[alarmStats]] = await pool.query(
      `SELECT COUNT(*) as total30d,
        SUM(CASE WHEN alarm_status = 1 THEN 1 ELSE 0 END) as unresolved
       FROM fire_alarm WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    res.json(success({
      unit: unitStats || { total: 0, general: 0, keyUnit: 0, nineSmall: 0 },
      device: deviceStats || { total: 0, normal: 0, fault: 0, offline: 0 },
      alarm: alarmStats || { total30d: 0, unresolved: 0 },
    }));
  } catch (err) {
    handleError(res, err, req, 'unit overview stats error');
  }
});

module.exports = router;
