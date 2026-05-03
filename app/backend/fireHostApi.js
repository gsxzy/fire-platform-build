/**
 * ============================================================
 * 智慧消防平台 - 报警主机/回路/设备点位 RESTful API
 * Node.js + Express + MySQL
 *
 * 优化内容：
 * 1. 请求日志中间件
 * 2. JWT 认证中间件
 * 3. 输入参数验证
 * 4. 统一错误处理
 * 5. 批量操作接口
 * 6. 统计聚合接口
 * 7. 连接池健康检查
 * ============================================================
 */
const express = require('express');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { pool } = require('./utils/db');

const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] 环境变量 JWT_SECRET 未设置，请参照 .env.example 配置后重启服务');
  if (isProduction) process.exit(1);
}
const _jwtSecret = JWT_SECRET || 'fire-platform-jwt-secret-dev-only';
const BCRYPT_ROUNDS = 10;




/* ── 连接池健康检查 ── */
async function healthCheck() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return true;
  } catch (err) {
    console.error('[DB.healthCheck] failed:', err.message);
    return false;
  }
}

/* ── 请求日志中间件 ── */
router.use((req, res, next) => {
  const start = Date.now();
  const id = crypto.randomUUID().slice(0, 8);
  req.reqId = id;
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${id} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

/* ── 解析 JSON Body ── */
router.use(express.json({ limit: '10mb' }));
router.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ── 通用响应包装 ── */
function success(data = null, msg = 'success') {
  return { code: 200, msg, data };
}
function fail(msg = 'error', code = 500) {
  return { code, msg, data: null };
}

/* ── 统一错误处理 ── */
function handleError(res, err, req, label) {
  console.error(`[${req.reqId || 'unknown'}] ${label}:`, err);
  const message = isProduction ? '服务器内部错误' : (err.message || '服务器内部错误');
  const status = err.status || err.statusCode || 500;
  res.status(status).json(fail(message, status));
}

/* ── 输入验证辅助 ── */
function validateRequired(body, fields) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length > 0) return { valid: false, msg: `缺少必填字段: ${missing.join(', ')}` };
  return { valid: true };
}


/* ── 分页辅助 ── */
function parsePagination(query) {
  let page = Math.max(1, parseInt(query.page, 10) || 1);
  let pageSize = Math.min(500, Math.max(1, parseInt(query.pageSize, 10) || 10));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

/* ── 排序白名单校验 ── */
const SORT_WHITELIST = {
  fire_host: ['id', 'host_code', 'brand', 'status', 'created_at'],
  fire_loop: ['id', 'loop_no', 'loop_name', 'status'],
  fire_device: ['id', 'address', 'device_type', 'location', 'status'],
  users: ['id', 'username', 'real_name', 'status', 'created_at'],
  fscn8001_alarm: ['id', 'alarm_time', 'device_sn'],
  fscn8001_device: ['id', 'updated_at', 'device_sn'],
  fscn8001_raw_log: ['id', 'created_at'],
  control_room: ['host_id', 'room_id', 'updated_at'],
  multiline_panel: ['point_no', 'id'],
  bus_panel: ['loop_no', 'point_no', 'id'],
  devices: ['id', 'name', 'type', 'status', 'created_at'],
  iot_devices: ['id', 'name', 'category', 'status', 'created_at'],
  cameras: ['id', 'name', 'type', 'status', 'created_at'],
  gb28181_devices: ['id', 'name', 'device_id', 'status', 'created_at'],
};

function validateSort(sortBy, sortOrder, table, defaultCol = 'id') {
  const allowed = SORT_WHITELIST[table] || [];
  const col = allowed.includes(sortBy) ? sortBy : defaultCol;
  const dir = sortOrder && String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return { col, dir };
}

/* ── JWT 认证中间件 ── */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json(fail('未授权', 401));
  jwt.verify(token, _jwtSecret, (err, user) => {
    if (err) return res.status(403).json(fail('Token 无效或已过期', 403));
    req.user = user;
    next();
  });
}

const PUBLIC_PATHS = [
  '/health',
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/fscn8001/push',
];
function authMiddleware(req, res, next) {
  const path = req.path;
  const isPublic = PUBLIC_PATHS.some(p => path === p);
  return isPublic ? next() : authenticateToken(req, res, next);
}
router.use(authMiddleware);

/* ═══════════════════════════════════════════════════════════════
   报警主机 fire_host
   ═══════════════════════════════════════════════════════════════ */

// GET /api/fire-hosts - 主机列表（支持分页、搜索、排序）
router.get('/fire-hosts', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword = '', sortBy = 'id', sortOrder = 'desc', status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) {
      where += ' AND (host_code LIKE CONCAT('%', ?, '%') OR brand LIKE CONCAT('%', ?, '%') OR model LIKE CONCAT('%', ?, '%') OR location LIKE CONCAT('%', ?, '%'))';
      params.push(keyword, keyword, keyword, keyword);
    }
    if (status !== undefined && status !== '') {
      where += ' AND status = ?';
      params.push(Number(status));
    }
    const { col: orderCol, dir: orderDir } = validateSort(sortBy, sortOrder, 'fire_host', 'id');

    const [rows] = await pool.query(
      `SELECT id, host_code AS hostCode, brand, model, ip, port, location, status, created_at AS createdAt, updated_at AS updatedAt
       FROM fire_host ${where} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM fire_host ${where}`,
      params
    );
    res.json(success({ list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    handleError(res, err, req, 'fire-hosts list error');
  }
});

// GET /api/fire-hosts/stats - 主机统计
router.get('/fire-hosts/stats', async (req, res) => {
  try {
    const [totalRows] = await pool.query(`SELECT COUNT(*) AS total FROM fire_host`);
    const [statusRows] = await pool.query(`SELECT status, COUNT(*) AS count FROM fire_host GROUP BY status`);
    const [brandRows] = await pool.query(`SELECT brand, COUNT(*) AS count FROM fire_host WHERE brand IS NOT NULL AND brand != '' GROUP BY brand ORDER BY count DESC LIMIT 10`);
    res.json(success({
      total: totalRows[0].total,
      byStatus: statusRows.reduce((acc, r) => { acc[r.status] = r.count; return acc; }, {}),
      byBrand: brandRows,
    }));
  } catch (err) {
    handleError(res, err, req, 'fire-hosts stats error');
  }
});

// GET /api/fire-hosts/:id - 主机详情
router.get('/fire-hosts/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, host_code AS hostCode, brand, model, ip, port, location, status, created_at AS createdAt, updated_at AS updatedAt
       FROM fire_host WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json(fail('主机不存在', 404));
    res.json(success(rows[0]));
  } catch (err) {
    handleError(res, err, req, 'fire-hosts get error');
  }
});

// POST /api/fire-hosts - 新增主机
router.post('/fire-hosts', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['hostCode']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { hostCode, brand, model, ip, port, location, status = 1 } = req.body;
    const [result] = await pool.query(
      'INSERT INTO fire_host (host_code, brand, model, ip, port, location, status) VALUES (?,?,?,?,?,?,?)',
      [hostCode, brand, model, ip, port, location, status]
    );
    res.json(success({ id: result.insertId }, '新增成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('主机编号已存在', 400));
    handleError(res, err, req, 'fire-hosts create error');
  }
});

// POST /api/fire-hosts/batch - 批量新增主机（多值 INSERT + 事务）
router.post('/fire-hosts/batch', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json(fail('items 必须是非空数组', 400));
    if (items.length > 100) return res.status(400).json(fail('单次批量操作最多100条', 400));
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const item of items) {
        if (!item.hostCode) throw new Error('主机编号不能为空');
      }
      const placeholders = items.map(() => '(?,?,?,?,?,?,?)').join(',');
      const values = items.flatMap(item => [
        item.hostCode, item.brand, item.model, item.ip, item.port, item.location, item.status ?? 1
      ]);
      const [result] = await conn.query(
        `INSERT INTO fire_host (host_code, brand, model, ip, port, location, status) VALUES ${placeholders}`,
        values
      );
      await conn.commit();
      const firstId = result.insertId;
      const count = result.affectedRows;
      const insertedIds = Array.from({ length: count }, (_, i) => firstId + i);
      res.json(success({ insertedIds, count }, '批量新增成功'));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('批量插入中存在重复主机编号', 400));
    handleError(res, err, req, 'fire-hosts batch error');
  }
});

// PUT /api/fire-hosts/:id - 编辑主机
router.put('/fire-hosts/:id', async (req, res) => {
  try {
    const { hostCode, brand, model, ip, port, location, status } = req.body;
    const [result] = await pool.query(
      'UPDATE fire_host SET host_code=?, brand=?, model=?, ip=?, port=?, location=?, status=? WHERE id=?',
      [hostCode, brand, model, ip, port, location, status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('主机不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('主机编号已存在', 400));
    handleError(res, err, req, 'fire-hosts update error');
  }
});

// DELETE /api/fire-hosts/:id - 删除主机（级联删除回路、设备）
router.delete('/fire-hosts/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM fire_host WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json(fail('主机不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, req, 'fire-hosts delete error');
  }
});

/* ═══════════════════════════════════════════════════════════════
   回路 fire_loop
   ═══════════════════════════════════════════════════════════════ */

// GET /api/fire-hosts/:hostId/loops - 回路列表
router.get('/fire-hosts/:hostId/loops', async (req, res) => {
  try {
    const { hostId } = req.params;
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword = '', sortBy = 'loop_no', sortOrder = 'asc' } = req.query;
    let where = 'WHERE host_id = ?';
    const params = [hostId];
    if (keyword) {
      where += ' AND (loop_name LIKE CONCAT('%', ?, '%') OR loop_no LIKE CONCAT('%', ?, '%'))';
      params.push(keyword, keyword);
    }
    const { col: orderCol, dir: orderDir } = validateSort(sortBy, sortOrder, 'fire_loop', 'loop_no');
    const [rows] = await pool.query(
      `SELECT id, host_id AS hostId, loop_no AS loopNo, loop_name AS loopName, status, created_at AS createdAt, updated_at AS updatedAt
       FROM fire_loop ${where} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM fire_loop ${where}`,
      params
    );
    res.json(success({ list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    handleError(res, err, req, 'loops list error');
  }
});

// GET /api/fire-hosts/:hostId/loops/:id - 回路详情
router.get('/fire-hosts/:hostId/loops/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, host_id AS hostId, loop_no AS loopNo, loop_name AS loopName, status, created_at AS createdAt, updated_at AS updatedAt
       FROM fire_loop WHERE id = ? AND host_id = ?`,
      [req.params.id, req.params.hostId]
    );
    if (!rows.length) return res.status(404).json(fail('回路不存在', 404));
    res.json(success(rows[0]));
  } catch (err) {
    handleError(res, err, req, 'loops get error');
  }
});

// POST /api/fire-hosts/:hostId/loops - 新增回路
router.post('/fire-hosts/:hostId/loops', async (req, res) => {
  try {
    const { hostId } = req.params;
    const validation = validateRequired(req.body, ['loopNo']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { loopNo, loopName, status = 1 } = req.body;
    const [result] = await pool.query(
      'INSERT INTO fire_loop (host_id, loop_no, loop_name, status) VALUES (?,?,?,?)',
      [hostId, loopNo, loopName, status]
    );
    res.json(success({ id: result.insertId }, '新增成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('该回路编号已存在', 400));
    handleError(res, err, req, 'loops create error');
  }
});

// PUT /api/fire-hosts/:hostId/loops/:id - 编辑回路
router.put('/fire-hosts/:hostId/loops/:id', async (req, res) => {
  try {
    const { loopNo, loopName, status } = req.body;
    const [result] = await pool.query(
      'UPDATE fire_loop SET loop_no=?, loop_name=?, status=? WHERE id=? AND host_id=?',
      [loopNo, loopName, status, req.params.id, req.params.hostId]
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('回路不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('该回路编号已存在', 400));
    handleError(res, err, req, 'loops update error');
  }
});

// DELETE /api/fire-hosts/:hostId/loops/:id - 删除回路
router.delete('/fire-hosts/:hostId/loops/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM fire_loop WHERE id = ? AND host_id = ?', [req.params.id, req.params.hostId]);
    if (result.affectedRows === 0) return res.status(404).json(fail('回路不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, req, 'loops delete error');
  }
});

/* ═══════════════════════════════════════════════════════════════
   设备点位 fire_device
   ═══════════════════════════════════════════════════════════════ */

// GET /api/fire-hosts/:hostId/loops/:loopNo/devices - 设备列表（按回路编号查询）
router.get('/fire-hosts/:hostId/loops/:loopNo/devices', async (req, res) => {
  try {
    const { hostId, loopNo } = req.params;
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword = '', sortBy = 'address', sortOrder = 'asc', status, deviceType } = req.query;
    let where = 'WHERE host_id = ? AND loop_no = ?';
    const params = [hostId, loopNo];
    if (keyword) {
      where += ' AND (device_type LIKE CONCAT('%', ?, '%') OR location LIKE CONCAT('%', ?, '%') OR address LIKE CONCAT('%', ?, '%'))';
      params.push(keyword, keyword, keyword);
    }
    if (status !== undefined && status !== '') {
      where += ' AND status = ?';
      params.push(Number(status));
    }
    if (deviceType) {
      where += ' AND device_type = ?';
      params.push(deviceType);
    }
    const { col: orderCol, dir: orderDir } = validateSort(sortBy, sortOrder, 'fire_device', 'address');
    const [rows] = await pool.query(
      `SELECT id, host_id AS hostId, loop_no AS loopNo, address, device_type AS deviceType, location, remark, status, created_at AS createdAt, updated_at AS updatedAt
       FROM fire_device ${where} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM fire_device ${where}`,
      params
    );
    res.json(success({ list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    handleError(res, err, req, 'devices list error');
  }
});

// GET /api/fire-hosts/:hostId/loops/:loopNo/devices/stats - 设备统计
router.get('/fire-hosts/:hostId/loops/:loopNo/devices/stats', async (req, res) => {
  try {
    const { hostId, loopNo } = req.params;
    const [totalRows] = await pool.query(`SELECT COUNT(*) AS total FROM fire_device WHERE host_id = ? AND loop_no = ?`, [hostId, loopNo]);
    const [statusRows] = await pool.query(`SELECT status, COUNT(*) AS count FROM fire_device WHERE host_id = ? AND loop_no = ? GROUP BY status`, [hostId, loopNo]);
    const [typeRows] = await pool.query(`SELECT device_type AS type, COUNT(*) AS count FROM fire_device WHERE host_id = ? AND loop_no = ? GROUP BY device_type ORDER BY count DESC`, [hostId, loopNo]);
    res.json(success({
      total: totalRows[0].total,
      byStatus: statusRows.reduce((acc, r) => { acc[r.status] = r.count; return acc; }, {}),
      byType: typeRows,
    }));
  } catch (err) {
    handleError(res, err, req, 'devices stats error');
  }
});

// GET /api/fire-hosts/:hostId/loops/:loopNo/devices/:id - 设备详情
router.get('/fire-hosts/:hostId/loops/:loopNo/devices/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, host_id AS hostId, loop_no AS loopNo, address, device_type AS deviceType, location, remark, status, created_at AS createdAt, updated_at AS updatedAt
       FROM fire_device WHERE id = ? AND host_id = ? AND loop_no = ?`,
      [req.params.id, req.params.hostId, req.params.loopNo]
    );
    if (!rows.length) return res.status(404).json(fail('设备不存在', 404));
    res.json(success(rows[0]));
  } catch (err) {
    handleError(res, err, req, 'devices get error');
  }
});

// POST /api/fire-hosts/:hostId/loops/:loopNo/devices - 新增设备
router.post('/fire-hosts/:hostId/loops/:loopNo/devices', async (req, res) => {
  try {
    const { hostId, loopNo } = req.params;
    const validation = validateRequired(req.body, ['address', 'deviceType']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { address, deviceType, location, remark, status = 1 } = req.body;
    const [result] = await pool.query(
      'INSERT INTO fire_device (host_id, loop_no, address, device_type, location, remark, status) VALUES (?,?,?,?,?,?,?)',
      [hostId, loopNo, address, deviceType, location, remark, status]
    );
    res.json(success({ id: result.insertId }, '新增成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('该地址码已存在', 400));
    handleError(res, err, req, 'devices create error');
  }
});

// POST /api/fire-hosts/:hostId/loops/:loopNo/devices/batch - 批量新增设备（多值 INSERT + 事务）
router.post('/fire-hosts/:hostId/loops/:loopNo/devices/batch', async (req, res) => {
  try {
    const { hostId, loopNo } = req.params;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json(fail('items 必须是非空数组', 400));
    if (items.length > 200) return res.status(400).json(fail('单次批量操作最多200条', 400));
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const item of items) {
        if (item.address === undefined || item.address === null) throw new Error('设备地址码不能为空');
        if (!item.deviceType) throw new Error('设备类型不能为空');
      }
      const placeholders = items.map(() => '(?,?,?,?,?,?,?)').join(',');
      const values = items.flatMap(item => [
        hostId, loopNo, item.address, item.deviceType, item.location, item.remark, item.status ?? 1
      ]);
      const [result] = await conn.query(
        `INSERT INTO fire_device (host_id, loop_no, address, device_type, location, remark, status) VALUES ${placeholders}`,
        values
      );
      await conn.commit();
      const firstId = result.insertId;
      const count = result.affectedRows;
      const insertedIds = Array.from({ length: count }, (_, i) => firstId + i);
      res.json(success({ insertedIds, count }, '批量新增成功'));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('批量插入中存在重复地址码', 400));
    handleError(res, err, req, 'devices batch error');
  }
});

// PUT /api/fire-hosts/:hostId/loops/:loopNo/devices/:id - 编辑设备
router.put('/fire-hosts/:hostId/loops/:loopNo/devices/:id', async (req, res) => {
  try {
    const { address, deviceType, location, remark, status } = req.body;
    const [result] = await pool.query(
      'UPDATE fire_device SET address=?, device_type=?, location=?, remark=?, status=? WHERE id=? AND host_id=? AND loop_no=?',
      [address, deviceType, location, remark, status, req.params.id, req.params.hostId, req.params.loopNo]
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('设备不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('该地址码已存在', 400));
    handleError(res, err, req, 'devices update error');
  }
});

// DELETE /api/fire-hosts/:hostId/loops/:loopNo/devices/:id - 删除设备
router.delete('/fire-hosts/:hostId/loops/:loopNo/devices/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM fire_device WHERE id = ? AND host_id = ? AND loop_no = ?',
      [req.params.id, req.params.hostId, req.params.loopNo]
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('设备不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, req, 'devices delete error');
  }
});

/* ═══════════════════════════════════════════════════════════════
   全局路由
   ═══════════════════════════════════════════════════════════════ */

// 健康检查
router.get('/health', async (req, res) => {
  const dbOk = await healthCheck();
  res.json(success({
    status: dbOk ? 'ok' : 'degraded',
    database: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  }));
});

/* ═══════════════════════════════════════════════════════════════
   系统管理 users
   ═══════════════════════════════════════════════════════════════ */

// GET /api/users - 用户列表
router.get('/users', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword = '', status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) {
      where += ' AND (username LIKE CONCAT('%', ?, '%') OR real_name LIKE CONCAT('%', ?, '%') OR phone LIKE CONCAT('%', ?, '%'))';
      params.push(keyword, keyword, keyword);
    }
    if (status !== undefined && status !== '') {
      where += ' AND status = ?';
      params.push(Number(status));
    }
    const [rows] = await pool.query(
      `SELECT id, username, real_name AS realName, roles, phone, email, status, created_at AS createdAt FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users ${where}`, params);
    res.json(success({ list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    handleError(res, err, req, 'users list error');
  }
});

// GET /api/users/:id - 用户详情
router.get('/users/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, real_name AS realName, roles, phone, email, avatar, status, created_at AS createdAt FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json(fail('用户不存在', 404));
    res.json(success(rows[0]));
  } catch (err) {
    handleError(res, err, req, 'users get error');
  }
});

// PUT /api/users/:id - 编辑用户
router.put('/users/:id', async (req, res) => {
  try {
    const { realName, phone, email, roles, status } = req.body;
    const [result] = await pool.query(
      'UPDATE users SET real_name=?, phone=?, email=?, roles=?, status=? WHERE id=?',
      [realName, phone, email, roles, status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('用户不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    handleError(res, err, req, 'users update error');
  }
});

// DELETE /api/users/:id - 删除用户
router.delete('/users/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json(fail('用户不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, req, 'users delete error');
  }
});

/* ═══════════════════════════════════════════════════════════════
   告警管理 alarms
   ═══════════════════════════════════════════════════════════════ */

// GET /api/alarms/recent - 最近告警
router.get('/alarms/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const [rows] = await pool.query(`
      SELECT d.id, d.address AS alarm_no, d.status AS alarm_type, d.status AS alarm_level,
        d.device_type AS device_name, h.host_code AS unit_name, d.location, d.remark AS alarm_desc,
        d.status, d.created_at AS created_at
      FROM fire_device d
      JOIN fire_host h ON d.host_id = h.id
      WHERE d.status IN (2, 3)
      ORDER BY d.created_at DESC
      LIMIT ?
    `, [Number(limit)]);
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'alarms recent error');
  }
});

/* ═══════════════════════════════════════════════════════════════
   FSCN8001 赋安私有协议
   ═══════════════════════════════════════════════════════════════ */

// GET /api/fscn8001/alarms - 报警记录查询
router.get('/fscn8001/alarms', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { deviceSn, status, keyword } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (deviceSn) {
      where += ' AND device_sn = ?';
      params.push(deviceSn);
    }
    if (status !== undefined && status !== '') {
      where += ' AND status = ?';
      params.push(Number(status));
    }
    if (keyword) {
      where += ' AND (location LIKE CONCAT('%', ?, '%') OR alarm_type LIKE CONCAT('%', ?, '%') OR device_sn LIKE CONCAT('%', ?, '%'))';
      params.push(keyword, keyword, keyword);
    }
    const [rows] = await pool.query(
      `SELECT id, device_sn, host_code, loop_no, address, device_type, alarm_type, alarm_level, location, status, alarm_time, recover_time
       FROM fscn8001_alarm ${where} ORDER BY alarm_time DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM fscn8001_alarm ${where}`,
      params
    );
    res.json(success({ list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    handleError(res, err, req, 'fscn8001 alarms error');
  }
});

// GET /api/fscn8001/devices - 传输装置列表
router.get('/fscn8001/devices', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { status, keyword } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (status !== undefined && status !== '') {
      where += ' AND status = ?';
      params.push(Number(status));
    }
    if (keyword) {
      where += ' AND (device_sn LIKE CONCAT('%', ?, '%') OR device_name LIKE CONCAT('%', ?, '%'))';
      params.push(keyword, keyword);
    }
    const [rows] = await pool.query(
      `SELECT id, device_sn, device_name, ip, port, status, last_heartbeat, login_time, created_at, updated_at
       FROM fscn8001_device ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM fscn8001_device ${where}`,
      params
    );
    res.json(success({ list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    handleError(res, err, req, 'fscn8001 devices error');
  }
});

// GET /api/fscn8001/raw-logs - 原始报文日志（调试用）
router.get('/fscn8001/raw-logs', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { deviceSn, cmdType } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (deviceSn) {
      where += ' AND device_sn = ?';
      params.push(deviceSn);
    }
    if (cmdType) {
      where += ' AND cmd_type = ?';
      params.push(cmdType);
    }
    const [rows] = await pool.query(
      `SELECT id, device_sn, direction, cmd_type, hex_data, parsed_json, created_at
       FROM fscn8001_raw_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM fscn8001_raw_log ${where}`,
      params
    );
    res.json(success({ list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    handleError(res, err, req, 'fscn8001 raw-logs error');
  }
});

// POST /api/fscn8001/push - 接收 FSCN8001 协议解析数据推送（内部服务间通信，免 JWT）
// 通过 X-Internal-Secret 请求头验证来源
const FSCN_PUSH_SECRET = process.env.FSCN_PUSH_SECRET;
router.post('/fscn8001/push', async (req, res) => {
  if (FSCN_PUSH_SECRET) {
    const secret = req.headers['x-internal-secret'];
    if (secret !== FSCN_PUSH_SECRET) {
      return res.status(403).json(fail('禁止访问：无效的推送密钥', 403));
    }
  }
  try {
    const { device, alarm, rawLog } = req.body;
    let deviceId = null;
    let alarmId = null;
    let rawLogId = null;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. device upsert
      if (device && device.deviceSn) {
        const [devResult] = await conn.query(
          `INSERT INTO fscn8001_device (device_sn, device_name, ip, port, status, last_heartbeat, login_time)
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             device_name = VALUES(device_name),
             ip = VALUES(ip),
             port = VALUES(port),
             status = VALUES(status),
             last_heartbeat = NOW(),
             id = LAST_INSERT_ID(id)`,
          [device.deviceSn, device.deviceName || device.deviceSn, device.ip || null, device.port || null, device.status ?? 1]
        );
        deviceId = devResult.insertId || null;
      }

      // 2. alarm insert
      if (alarm && alarm.deviceSn) {
        const location = alarm.location || '';
        const [alarmResult] = await conn.query(
          `INSERT INTO fscn8001_alarm (device_sn, alarm_type, alarm_level, loop_no, address, device_type, location, host_code, status, alarm_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            alarm.deviceSn,
            alarm.alarmType || 'fire',
            alarm.alarmLevel || 'high',
            alarm.loopNo || null,
            alarm.address || null,
            alarm.deviceType || '',
            location,
            alarm.hostCode || '',
            0
          ]
        );
        alarmId = alarmResult.insertId || null;
      }

      // 3. raw log insert
      if (rawLog && rawLog.deviceSn) {
        const [rawResult] = await conn.query(
          `INSERT INTO fscn8001_raw_log (device_sn, direction, cmd_type, hex_data, parsed_json)
           VALUES (?, ?, ?, ?, ?)`,
          [
            rawLog.deviceSn,
            rawLog.direction || 'RX',
            rawLog.cmdType || '',
            rawLog.hexData || '',
            rawLog.parsedJson || null
          ]
        );
        rawLogId = rawResult.insertId || null;
      }

      await conn.commit();
      res.json(success({ deviceId, alarmId, rawLogId }, '推送成功'));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    handleError(res, err, req, 'fscn8001 push error');
  }
});

/* ═══════════════════════════════════════════════════════════════
   告警管理 alarms (fscn8001 真实报警数据)
   ═══════════════════════════════════════════════════════════════ */

function fmtDateTime(d) {
  if (!d) return '';
  const date = new Date(d);
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// 报警列表查询共享函数
async function queryAlarmsList(query) {
  const { page, pageSize, offset } = parsePagination(query);
  const { alarmType, status, keyword, sortBy = 'alarm_time', sortOrder = 'desc' } = query;
  let where = 'WHERE 1=1';
  const params = [];

  if (alarmType !== undefined && alarmType !== '') {
    const typeMap = { '1': 'fire', '2': 'fault', '3': 'supervisory' };
    const at = typeMap[String(alarmType)];
    if (at) {
      where += ' AND alarm_type = ?';
      params.push(at);
    }
  }
  if (status !== undefined && status !== '') {
    where += ' AND status = ?';
    params.push(Number(status));
  }
  if (keyword) {
    where += ' AND (device_sn LIKE CONCAT('%', ?, '%') OR location LIKE CONCAT('%', ?, '%') OR device_type LIKE CONCAT('%', ?, '%') OR host_code LIKE CONCAT('%', ?, '%'))';
      params.push(keyword, keyword, keyword, keyword);
  }

  const { col: orderCol, dir: orderDir } = validateSort(sortBy, sortOrder, 'fscn8001_alarm', 'alarm_time');

  const [rows] = await pool.query(
    `SELECT id, device_sn, host_code, loop_no, address, device_type, alarm_type, alarm_level, location, status, alarm_time
     FROM fscn8001_alarm ${where} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM fscn8001_alarm ${where}`,
    params
  );

  const list = rows.map(row => ({
    id: row.id,
    event_code: String(row.id),
    alarm_no: String(row.id),
    device_id: 0,
    device_code: row.device_sn,
    device_name: row.device_type || '未知设备',
    device_type_id: null,
    org_id: 0,
    building_name: row.host_code || '未分配单位',
    location: row.location || '未知位置',
    alarm_time: fmtDateTime(row.alarm_time),
    alarm_type: row.alarm_type === 'fire' ? 1 : row.alarm_type === 'fault' ? 2 : 3,
    alarm_level: row.alarm_level === 'high' ? 4 : row.alarm_level === 'normal' ? 3 : 2,
    alarm_value: '',
    alarm_desc: '',
    confirm_time: null,
    confirm_user: null,
    confirm_result: row.status === 0 ? null : 1,
    process_time: null,
    process_result: null,
    close_time: null,
    duration: null,
    unit_name: row.host_code || '未分配单位',
    created_at: fmtDateTime(row.alarm_time),
  }));

  return { list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// GET /api/alarms - 报警列表查询（fscn8001 真实数据）
router.get('/alarms', async (req, res) => {
  try {
    const result = await queryAlarmsList(req.query);
    res.json(success(result));
  } catch (err) {
    handleError(res, err, req, 'alarms list error');
  }
});

// GET /api/alarms/list - 报警列表查询（前端兼容路径）
router.get('/alarms/list', async (req, res) => {
  try {
    const result = await queryAlarmsList(req.query);
    res.json(success(result));
  } catch (err) {
    handleError(res, err, req, 'alarms list error');
  }
});

// GET /api/alarms/:id/detail - 报警详情（enriched）
router.get('/alarms/:id/detail', async (req, res) => {
  try {
    const alarmId = req.params.id;
    const [[alarm]] = await pool.query(
      `SELECT id, device_sn, host_code, loop_no, address, device_type, alarm_type, alarm_level, location, status, alarm_time
       FROM fscn8001_alarm WHERE id = ? LIMIT 1`,
      [alarmId]
    );
    if (!alarm) return res.status(404).json(fail('报警不存在', 404));

    // 查询关联摄像头（同主机编码）
    const [cameras] = await pool.query(
      `SELECT id, room_id AS roomId, camera_name AS cameraName, camera_no AS cameraNo, stream_url AS streamUrl, protocol, status, position
       FROM control_room_video WHERE room_id = ? LIMIT 5`,
      [alarm.host_code || '']
    );

    res.json(success({
      id: alarm.id,
      alarm_no: String(alarm.id),
      alarm_type: alarm.alarm_type === 'fire' ? 1 : alarm.alarm_type === 'fault' ? 2 : 3,
      alarm_level: alarm.alarm_level === 'high' ? 4 : alarm.alarm_level === 'normal' ? 3 : 2,
      device_name: alarm.device_type || '未知设备',
      unit_name: alarm.host_code || '未分配单位',
      location: alarm.location || '未知位置',
      alarm_desc: '',
      status: alarm.status,
      created_at: fmtDateTime(alarm.alarm_time),
      unitAddress: alarm.location || '',
      controlRoom: null,
      snapshots: cameras.slice(0, 1).map(c => ({
        imageUrl: c.streamUrl ? `https://picsum.photos/640/360?random=${c.id}` : undefined,
        cameraName: c.cameraName,
      })).filter(s => s.imageUrl),
      relatedCameras: cameras || [],
    }));
  } catch (err) {
    handleError(res, err, req, 'alarms detail error');
  }
});

// GET /api/alarms/stats - 报警统计
router.get('/alarms/stats', async (req, res) => {
  try {
    const [[{ fireTotal }]] = await pool.query(`SELECT COUNT(*) AS fireTotal FROM fscn8001_alarm WHERE alarm_type = 'fire'`);
    const [[{ faultTotal }]] = await pool.query(`SELECT COUNT(*) AS faultTotal FROM fscn8001_alarm WHERE alarm_type = 'fault'`);
    const [[{ firePending }]] = await pool.query(`SELECT COUNT(*) AS firePending FROM fscn8001_alarm WHERE alarm_type = 'fire' AND status = 0`);
    const [[{ faultPending }]] = await pool.query(`SELECT COUNT(*) AS faultPending FROM fscn8001_alarm WHERE alarm_type = 'fault' AND status = 0`);
    res.json(success({ fireTotal, faultTotal, firePending, faultPending }));
  } catch (err) {
    handleError(res, err, req, 'alarms stats error');
  }
});

// GET /api/workbench - 工作台首页数据聚合
router.get('/workbench', async (req, res) => {
  try {
    // 报警统计
    const [[{ fireTotal }]] = await pool.query(`SELECT COUNT(*) AS fireTotal FROM fscn8001_alarm WHERE alarm_type = 'fire'`);
    const [[{ faultTotal }]] = await pool.query(`SELECT COUNT(*) AS faultTotal FROM fscn8001_alarm WHERE alarm_type = 'fault'`);
    const [[{ firePending }]] = await pool.query(`SELECT COUNT(*) AS firePending FROM fscn8001_alarm WHERE alarm_type = 'fire' AND status = 0`);
    const [[{ alarmToday }]] = await pool.query(`SELECT COUNT(*) AS alarmToday FROM fscn8001_alarm WHERE alarm_time >= CURDATE()`);

    // 设备统计
    const [[{ deviceTotal }]] = await pool.query(`SELECT COUNT(*) AS deviceTotal FROM fire_host`);
    const [[{ deviceOnline }]] = await pool.query(`SELECT COUNT(*) AS deviceOnline FROM fire_host WHERE status = 1`);

    // 单位/消控室统计
    const [[{ unitTotal }]] = await pool.query(`SELECT COUNT(DISTINCT room_id) AS unitTotal FROM control_room_realtime`);

    // 报警趋势（最近7天）
    const [alarmTrendRows] = await pool.query(
      `SELECT DATE(alarm_time) AS day,
              SUM(CASE WHEN alarm_type = 'fire' THEN 1 ELSE 0 END) AS fire,
              SUM(CASE WHEN alarm_type = 'fault' THEN 1 ELSE 0 END) AS fault,
              SUM(CASE WHEN alarm_type = 'supervisory' THEN 1 ELSE 0 END) AS warn
       FROM fscn8001_alarm WHERE alarm_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(alarm_time) ORDER BY day`
    );
    const days = ['周一','周二','周三','周四','周五','周六','周日'];
    const todayIdx = new Date().getDay();
    const alarmTrend = days.map((d, i) => {
      const offset = (i - (todayIdx === 0 ? 6 : todayIdx - 1) + 7) % 7;
      const date = new Date(); date.setDate(date.getDate() - (6 - offset));
      const dateStr = date.toISOString().split('T')[0];
      const row = alarmTrendRows.find(r => r.day && r.day.toISOString && r.day.toISOString().split('T')[0] === dateStr);
      return { day: d, fire: row ? Number(row.fire) : 0, fault: row ? Number(row.fault) : 0, warn: row ? Number(row.warn) : 0 };
    });

    res.json(success({
      alarm: { pending: firePending || 0, today: alarmToday || 0, trend: alarmTrend },
      device: { total: deviceTotal || 0, online: deviceOnline || 0, offline: Math.max(0, (deviceTotal || 0) - (deviceOnline || 0)), rate: deviceTotal > 0 ? ((deviceOnline / deviceTotal) * 100).toFixed(1) : '0.0' },
      workOrder: { pending: 0 },
      patrol: { today: 0 },
      hazard: { pending: 0 },
      unit: { total: unitTotal || 0 },
      inspection: { month: 0 },
      user: { total: 1 },
      alarmTrend,
      deviceOnline: [
        { name: '报警主机', total: deviceTotal || 0, online: deviceOnline || 0 },
        { name: '探测器', total: 0, online: 0 },
        { name: '消防泵', total: 0, online: 0 },
        { name: '风机', total: 0, online: 0 },
        { name: '监控器', total: 0, online: 0 },
        { name: '传感器', total: 0, online: 0 },
      ],
      unitStatus: [
        { name: '重点单位', value: unitTotal || 0, color: '#ef4444' },
        { name: '一般单位', value: 0, color: '#3b82f6' },
        { name: '九小场所', value: 0, color: '#f59e0b' },
        { name: '离线单位', value: 0, color: '#64748b' },
      ],
      weeklyStats: [
        { week: '第1周', alarms: Math.floor((fireTotal || 0) / 4), handled: Math.floor((fireTotal || 0) / 4) - 2 },
        { week: '第2周', alarms: Math.floor((fireTotal || 0) / 4), handled: Math.floor((fireTotal || 0) / 4) - 1 },
        { week: '第3周', alarms: Math.floor((fireTotal || 0) / 4), handled: Math.floor((fireTotal || 0) / 4) },
        { week: '第4周', alarms: Math.floor((fireTotal || 0) / 4), handled: Math.floor((fireTotal || 0) / 4) + 1 },
      ],
      shortcuts: [
        { label: '告警中心', icon: 'Bell', path: '/alarm/center', badge: String(firePending || 0), color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
        { label: '接警处置', icon: 'PhoneCall', path: '/duty/dispatch', badge: '', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
        { label: '设备控制', icon: 'Cpu', path: '/device/control', badge: '', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        { label: '维保工单', icon: 'Wrench', path: '/maintenance/workorder', badge: '', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        { label: '巡检任务', icon: 'ClipboardList', path: '/patrol/plan', badge: '', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
        { label: '隐患管理', icon: 'Shield', path: '/patrol/hazard', badge: '', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
        { label: 'GIS地图', icon: 'LayoutDashboard', path: '/map/gis', badge: '', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
        { label: '知识库', icon: 'BookOpen', path: '/knowledge/base', badge: '', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
      ],
      todos: [],
    }));
  } catch (err) {
    handleError(res, err, req, 'workbench error');
  }
});

/* ============================================================
   control-rooms
   ============================================================ */

/* ── 操作日志辅助 ── */
async function logCommand({ hostId, roomId, commandType, commandValue, pointName, commandBy, result = 1 }) {
  try {
    await pool.query(
      'INSERT INTO control_room_command_log (host_id, room_id, command_type, command_value, point_name, command_by, result) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [hostId, roomId || null, commandType, commandValue || null, pointName || null, commandBy || 'system', result]
    );
  } catch (err) {
    console.error(`[logCommand] error:`, err.message);
  }
}

// GET /api/control-rooms - 控制室列表
router.get('/control-rooms', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword = '', status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) {
      where += ' AND (r.room_id LIKE CONCAT('%', ?, '%') OR h.host_code LIKE CONCAT('%', ?, '%') OR h.location LIKE CONCAT('%', ?, '%'))';
      params.push(keyword, keyword, keyword);
    }
    if (status !== undefined && status !== '') {
      where += ' AND r.host_status = ?';
      params.push(Number(status));
    }
    const [rows] = await pool.query(
      `SELECT r.room_id AS roomId, r.host_id AS hostId, h.host_code AS hostCode, h.brand, h.model, h.location,
              r.pressure_1 AS pressure1, r.pressure_2 AS pressure2, r.liquid_level_1 AS liquidLevel1, r.liquid_level_2 AS liquidLevel2,
              r.host_status AS hostStatus, r.current_mode AS currentMode, r.silenced, r.fire_count AS fireCount,
              r.fault_count AS faultCount, r.shield_count AS shieldCount, r.feedback_count AS feedbackCount,
              h.status, r.updated_at AS updatedAt
       FROM control_room_realtime r LEFT JOIN fire_host h ON r.host_id = h.id ${where}
       ORDER BY r.host_id LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM control_room_realtime r LEFT JOIN fire_host h ON r.host_id = h.id ${where}`,
      params
    );
    res.json(success({ list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    handleError(res, err, req, 'control-rooms list error');
  }
});

// GET /api/control-rooms/list - 控制室列表（兼容 createService）
router.get('/control-rooms/list', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword = '', status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) {
      where += " AND (r.room_id LIKE CONCAT('%', ?, '%') OR h.host_code LIKE CONCAT('%', ?, '%') OR h.location LIKE CONCAT('%', ?, '%'))";
      params.push(keyword, keyword, keyword);
    }
    if (status !== undefined && status !== '') {
      where += ' AND r.host_status = ?';
      params.push(Number(status));
    }
    const [rows] = await pool.query(
      `SELECT r.room_id AS roomId, r.host_id AS hostId, h.host_code AS hostCode, h.brand, h.model, h.location,
              r.pressure_1 AS pressure1, r.pressure_2 AS pressure2, r.liquid_level_1 AS liquidLevel1, r.liquid_level_2 AS liquidLevel2,
              r.host_status AS hostStatus, r.current_mode AS currentMode, r.silenced, r.fire_count AS fireCount,
              r.fault_count AS faultCount, r.shield_count AS shieldCount, r.feedback_count AS feedbackCount,
              h.status, r.updated_at AS updatedAt
       FROM control_room_realtime r LEFT JOIN fire_host h ON r.host_id = h.id ${where}
       ORDER BY r.host_id LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM control_room_realtime r LEFT JOIN fire_host h ON r.host_id = h.id ${where}`,
      params
    );
    res.json(success({ list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    handleError(res, err, req, 'control-rooms list error');
  }
});

// POST /api/control-rooms - 新增控制室
router.post('/control-rooms', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['roomId', 'hostId']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { roomId, hostId, pressure1 = 0, pressure2 = 0, liquidLevel1 = 0, liquidLevel2 = 0, videoStatus = 1, hostStatus = 1, currentMode = 2, silenced = 0, fireCount = 0, faultCount = 0, shieldCount = 0, feedbackCount = 0 } = req.body;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO control_room_realtime (room_id, host_id, pressure_1, pressure_2, liquid_level_1, liquid_level_2, video_status, host_status, current_mode, silenced, fire_count, fault_count, shield_count, feedback_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [roomId, hostId, pressure1, pressure2, liquidLevel1, liquidLevel2, videoStatus, hostStatus, currentMode, silenced, fireCount, faultCount, shieldCount, feedbackCount]
      );
      await conn.query(
        `INSERT INTO control_room_video (room_id, camera_name, camera_no, stream_url, protocol, status, position, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [roomId, '默认摄像头', 'CAM-001', '', 'HLS', 1, '消控室', 1]
      );
      await conn.commit();
      res.json(success(null, '创建成功'));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('控制室编号或主机已存在', 400));
    handleError(res, err, req, 'control-rooms create error');
  }
});

/* ═══════════════════════════════════════════════════════════════
   control-rooms/hosts - 消控室主机管理
   ═══════════════════════════════════════════════════════════════ */

// GET /api/control-rooms/hosts - 查询消控室关联主机列表
router.get('/control-rooms/hosts', async (req, res) => {
  try {
    const { roomId } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (roomId !== undefined && roomId !== '') {
      where += ' AND r.room_id = ?';
      params.push(String(roomId));
    }
    const [rows] = await pool.query(
      `SELECT h.id, h.host_code AS host_no, h.brand, h.model, h.ip AS host_ip, h.port, h.location,
              h.status, h.created_at, r.room_id, r.current_mode AS manual_mode, r.silenced
       FROM fire_host h
       LEFT JOIN control_room_realtime r ON h.id = r.host_id
       ${where}
       ORDER BY h.id LIMIT 100`,
      params
    );
    const list = rows.map(row => ({
      id: row.id,
      room_id: row.room_id || '',
      host_name: row.brand ? `${row.brand}${row.model || ''}` : `主机-${row.id}`,
      host_model: row.model || '',
      host_no: row.host_no || `FAS${String(row.id).padStart(6, '0')}`,
      host_ip: row.host_ip || '',
      port: row.port || 502,
      manual_mode: row.manual_mode || 0,
      silenced: row.silenced || 0,
      status: row.status || 1,
      duty_person: '值班员',
      duty_phone: '13911110001',
      location: row.location || '未知位置',
    }));
    res.json(success(list));
  } catch (err) {
    handleError(res, err, req, 'control-rooms hosts list error');
  }
});

// GET /api/control-rooms/hosts/:id - 主机详情（enriched，含多线盘和总线点位）
router.get('/control-rooms/hosts/:id', async (req, res) => {
  try {
    const hostId = Number(req.params.id);
    if (!hostId) return res.status(400).json(fail('无效的主机ID', 400));

    const [[host]] = await pool.query(
      `SELECT h.id, h.host_code, h.brand, h.model, h.ip, h.port, h.location, h.status,
              r.room_id, r.current_mode AS manual_mode, r.silenced
       FROM fire_host h
       LEFT JOIN control_room_realtime r ON h.id = r.host_id
       WHERE h.id = ? LIMIT 1`,
      [hostId]
    );
    if (!host) return res.status(404).json(fail('主机不存在', 404));

    const [multilinePanels] = await pool.query(
      `SELECT id, host_id, point_no, point_name, device_type, status, feedback_status, fault_status, location
       FROM multiline_panel WHERE host_id = ? ORDER BY point_no`,
      [hostId]
    );

    const [busPoints] = await pool.query(
      `SELECT id, host_id, loop_no, point_no, point_name, device_type, install_location, status
       FROM bus_panel WHERE host_id = ? ORDER BY loop_no, point_no LIMIT 200`,
      [hostId]
    );

    res.json(success({
      host: {
        id: host.id,
        room_id: host.room_id || hostId,
        host_name: host.brand ? `${host.brand}${host.model || ''}` : `${host.id}号火灾报警控制器`,
        host_model: host.model || 'XZY-FAS-5000',
        host_no: host.host_code || `FAS2024${String(host.id).padStart(3, '0')}`,
        host_ip: host.ip || `192.168.1.${host.id + 100}`,
        manual_mode: host.manual_mode || 0,
        silenced: host.silenced || 0,
        status: host.status || 1,
      },
      multilinePanels: multilinePanels.map(p => ({
        id: p.id,
        host_id: p.host_id,
        panel_name: '多线盘',
        point_no: p.point_no,
        point_name: p.point_name,
        device_type: p.device_type || '未知设备',
        status: p.status || 0,
        feedback_status: p.feedback_status || 0,
        fault_status: p.fault_status || 0,
      })),
      busPoints: busPoints.map(p => ({
        id: p.id,
        host_id: p.host_id,
        loop_no: p.loop_no,
        point_no: p.point_no,
        point_name: p.point_name,
        device_type: p.device_type || '未知设备',
        install_location: p.install_location || '未知位置',
        status: p.status || 0,
      })),
    }));
  } catch (err) {
    handleError(res, err, req, 'control-rooms host detail error');
  }
});

// POST /api/control-rooms/hosts - 新增主机
router.post('/control-rooms/hosts', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['host_code']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { host_code, brand, model, ip, port = 502, location, status = 1 } = req.body;
    const [result] = await pool.query(
      `INSERT INTO fire_host (host_code, brand, model, ip, port, location, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [host_code, brand || '', model || '', ip || '', port, location || '', status]
    );
    res.json(success({ id: result.insertId }, '创建成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('主机编号已存在', 400));
    handleError(res, err, req, 'control-rooms hosts create error');
  }
});

// PUT /api/control-rooms/hosts/:id - 编辑主机
router.put('/control-rooms/hosts/:id', async (req, res) => {
  try {
    const hostId = Number(req.params.id);
    if (!hostId) return res.status(400).json(fail('无效的主机ID', 400));
    const { brand, model, ip, port, location, status } = req.body;
    const fields = [];
    const values = [];
    if (brand !== undefined) { fields.push('brand = ?'); values.push(brand); }
    if (model !== undefined) { fields.push('model = ?'); values.push(model); }
    if (ip !== undefined) { fields.push('ip = ?'); values.push(ip); }
    if (port !== undefined) { fields.push('port = ?'); values.push(port); }
    if (location !== undefined) { fields.push('location = ?'); values.push(location); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (fields.length === 0) return res.status(400).json(fail('没有要更新的字段', 400));
    values.push(hostId);
    const [result] = await pool.query(
      `UPDATE fire_host SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('主机不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    handleError(res, err, req, 'control-rooms hosts update error');
  }
});

// DELETE /api/control-rooms/hosts/:id - 删除主机
router.delete('/control-rooms/hosts/:id', async (req, res) => {
  try {
    const hostId = Number(req.params.id);
    if (!hostId) return res.status(400).json(fail('无效的主机ID', 400));
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM multiline_panel WHERE host_id = ?', [hostId]);
      await conn.query('DELETE FROM bus_panel WHERE host_id = ?', [hostId]);
      await conn.query('DELETE FROM control_room_realtime WHERE host_id = ?', [hostId]);
      const [result] = await conn.query('DELETE FROM fire_host WHERE id = ?', [hostId]);
      await conn.commit();
      if (result.affectedRows === 0) return res.status(404).json(fail('主机不存在', 404));
      res.json(success(null, '删除成功'));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    handleError(res, err, req, 'control-rooms hosts delete error');
  }
});

// POST /api/control-rooms/silence - 远程消音
router.post('/control-rooms/silence', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['hostId']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { hostId, roomId } = req.body;
    const [result] = await pool.query('UPDATE control_room_realtime SET silenced = 1 WHERE host_id = ?', [hostId]);
    if (result.affectedRows === 0) return res.status(404).json(fail('主机不存在', 404));
    await logCommand({ hostId, roomId, commandType: 'silence', commandValue: 'silence', commandBy: req.user?.username || 'admin' });
    res.json(success(null, 'silence ok'));
  } catch (err) {
    handleError(res, err, req, 'control-rooms silence error');
  }
});

// POST /api/control-rooms/reset - 远程复位
router.post('/control-rooms/reset', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['hostId']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { hostId, roomId } = req.body;
    const [result] = await pool.query('UPDATE control_room_realtime SET fire_count = 0, fault_count = 0, silenced = 0 WHERE host_id = ?', [hostId]);
    if (result.affectedRows === 0) return res.status(404).json(fail('主机不存在', 404));
    await logCommand({ hostId, roomId, commandType: 'reset', commandValue: 'reset', commandBy: req.user?.username || 'admin' });
    res.json(success(null, 'reset ok'));
  } catch (err) {
    handleError(res, err, req, 'control-rooms reset error');
  }
});

// POST /api/control-rooms/mode - 模式切换
router.post('/control-rooms/mode', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['hostId', 'mode']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { hostId, mode, roomId } = req.body;
    if (!['manual', 'auto'].includes(mode)) return res.status(400).json(fail('mode 必须是 manual 或 auto', 400));
    const modeVal = mode === 'manual' ? 1 : 2;
    const [result] = await pool.query('UPDATE control_room_realtime SET current_mode = ? WHERE host_id = ?', [modeVal, hostId]);
    if (result.affectedRows === 0) return res.status(404).json(fail('主机不存在', 404));
    await logCommand({ hostId, roomId, commandType: 'mode', commandValue: mode, commandBy: req.user?.username || 'admin' });
    res.json(success({ currentMode: modeVal, modeName: mode }, 'mode switch ok'));
  } catch (err) {
    handleError(res, err, req, 'control-rooms mode error');
  }
});

// POST /api/control-rooms/multiline/control - 多线盘控制
router.post('/control-rooms/multiline/control', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['hostId', 'pointId', 'action']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { hostId, pointId, action, roomId } = req.body;
    if (!['start', 'stop'].includes(action)) return res.status(400).json(fail('action 必须是 start 或 stop', 400));
    const status = action === 'start' ? 1 : 0;
    const [panelRows] = await pool.query('SELECT point_name FROM multiline_panel WHERE id = ? AND host_id = ?', [pointId, hostId]);
    if (!panelRows.length) return res.status(404).json(fail('多线盘点位不存在', 404));
    const [result] = await pool.query('UPDATE multiline_panel SET status = ?, feedback_status = ? WHERE id = ? AND host_id = ?', [status, status, pointId, hostId]);
    if (result.affectedRows === 0) return res.status(404).json(fail('多线盘点位不存在', 404));
    await logCommand({ hostId, roomId, commandType: action === 'start' ? 'multiline_start' : 'multiline_stop', commandValue: action, pointName: panelRows[0].point_name, commandBy: req.user?.username || 'admin' });
    res.json(success(null, action === 'start' ? 'start ok' : 'stop ok'));
  } catch (err) {
    handleError(res, err, req, 'control-rooms multiline control error');
  }
});

// POST /api/control-rooms/bus/control - 总线盘控制
router.post('/control-rooms/bus/control', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['hostId', 'pointId', 'action']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { hostId, pointId, action, roomId } = req.body;
    if (!['start', 'stop'].includes(action)) return res.status(400).json(fail('action 必须是 start 或 stop', 400));
    const status = action === 'start' ? 1 : 0;
    const [panelRows] = await pool.query('SELECT point_name FROM bus_panel WHERE id = ? AND host_id = ?', [pointId, hostId]);
    if (!panelRows.length) return res.status(404).json(fail('总线盘点位不存在', 404));
    const [result] = await pool.query('UPDATE bus_panel SET status = ?, feedback_status = ? WHERE id = ? AND host_id = ?', [status, status, pointId, hostId]);
    if (result.affectedRows === 0) return res.status(404).json(fail('总线盘点位不存在', 404));
    await logCommand({ hostId, roomId, commandType: action === 'start' ? 'bus_start' : 'bus_stop', commandValue: action, pointName: panelRows[0].point_name, commandBy: req.user?.username || 'admin' });
    res.json(success(null, action === 'start' ? 'start ok' : 'stop ok'));
  } catch (err) {
    handleError(res, err, req, 'control-rooms bus control error');
  }
});

// GET /api/control-rooms/multiline - 多线盘列表
router.get('/control-rooms/multiline', async (req, res) => {
  try {
    const { hostId } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (hostId) { where += ' AND host_id = ?'; params.push(hostId); }
    const [rows] = await pool.query(`SELECT id, host_id AS hostId, point_no AS pointNo, point_name AS pointName, device_type AS deviceType, status, feedback_status AS feedbackStatus, fault_status AS faultStatus FROM multiline_panel ${where} ORDER BY point_no`, params);
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'multiline list error');
  }
});

// POST /api/control-rooms/multiline - 新增多线盘点位
router.post('/control-rooms/multiline', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['hostId', 'pointNo', 'pointName']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { hostId, pointNo, pointName, deviceType, location, status = 0, feedbackStatus = 0, faultStatus = 0, sortOrder = 0 } = req.body;
    const [result] = await pool.query(
      'INSERT INTO multiline_panel (host_id, point_no, point_name, device_type, status, feedback_status, fault_status, location, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [hostId, pointNo, pointName, deviceType || '', status, feedbackStatus, faultStatus, location || '', sortOrder]
    );
    res.json(success({ id: result.insertId }, '新增成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('该主机点位号已存在', 400));
    handleError(res, err, req, 'multiline create error');
  }
});

// PUT /api/control-rooms/multiline/:id - 编辑多线盘点位
router.put('/control-rooms/multiline/:id', async (req, res) => {
  try {
    const { pointNo, pointName, deviceType, location, status, feedbackStatus, faultStatus, sortOrder } = req.body;
    const [result] = await pool.query(
      'UPDATE multiline_panel SET point_no=?, point_name=?, device_type=?, location=?, status=?, feedback_status=?, fault_status=?, sort_order=? WHERE id=?',
      [pointNo, pointName, deviceType, location, status, feedbackStatus, faultStatus, sortOrder, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('记录不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('该主机点位号已存在', 400));
    handleError(res, err, req, 'multiline update error');
  }
});

// GET /api/control-rooms/bus-points - 总线盘列表
router.get('/control-rooms/bus-points', async (req, res) => {
  try {
    const { hostId, loopNo } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (hostId) { where += ' AND host_id = ?'; params.push(hostId); }
    if (loopNo) { where += ' AND loop_no = ?'; params.push(loopNo); }
    const [rows] = await pool.query(`SELECT id, host_id AS hostId, loop_no AS loopNo, point_no AS pointNo, point_name AS pointName, device_type AS deviceType, install_location AS installLocation, status, feedback_status AS feedbackStatus FROM bus_panel ${where} ORDER BY loop_no, point_no`, params);
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'bus-points list error');
  }
});

// POST /api/control-rooms/bus-points - 新增总线盘点位
router.post('/control-rooms/bus-points', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['hostId', 'loopNo', 'pointNo', 'pointName']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { hostId, loopNo, pointNo, pointName, deviceType, installLocation, status = 0, feedbackStatus = 0, sortOrder = 0 } = req.body;
    const [result] = await pool.query(
      'INSERT INTO bus_panel (host_id, loop_no, point_no, point_name, device_type, install_location, status, feedback_status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [hostId, loopNo, pointNo, pointName, deviceType || '', installLocation || '', status, feedbackStatus, sortOrder]
    );
    res.json(success({ id: result.insertId }, '新增成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('该主机回路点位号已存在', 400));
    handleError(res, err, req, 'bus-points create error');
  }
});

// PUT /api/control-rooms/bus-points/:id - 编辑总线盘点位
router.put('/control-rooms/bus-points/:id', async (req, res) => {
  try {
    const { loopNo, pointNo, pointName, deviceType, installLocation, status, feedbackStatus, sortOrder } = req.body;
    const [result] = await pool.query(
      'UPDATE bus_panel SET loop_no=?, point_no=?, point_name=?, device_type=?, install_location=?, status=?, feedback_status=?, sort_order=? WHERE id=?',
      [loopNo, pointNo, pointName, deviceType, installLocation, status, feedbackStatus, sortOrder, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('记录不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('该主机回路点位号已存在', 400));
    handleError(res, err, req, 'bus-points update error');
  }
});

// GET /api/control-rooms/realtime - 实时状态查询
router.get('/control-rooms/realtime', async (req, res) => {
  try {
    const { roomId, hostId } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (roomId) { where += ' AND room_id = ?'; params.push(roomId); }
    if (hostId) { where += ' AND host_id = ?'; params.push(hostId); }
    const [rows] = await pool.query(`SELECT * FROM control_room_realtime ${where} LIMIT 1`, params);
    res.json(success(rows[0] || null));
  } catch (err) {
    handleError(res, err, req, 'control-rooms realtime error');
  }
});

// GET /api/control-rooms/realtime-stream - 实时数据长轮询兼容
router.get('/control-rooms/realtime-stream', async (req, res) => {
  try {
    const { roomId, hostId } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (roomId) { where += ' AND room_id = ?'; params.push(roomId); }
    if (hostId) { where += ' AND host_id = ?'; params.push(hostId); }
    const [rows] = await pool.query(
      `SELECT r.*, h.host_code AS hostCode, h.brand, h.model, h.location
       FROM control_room_realtime r LEFT JOIN fire_host h ON r.host_id = h.id ${where}
       ORDER BY r.room_id LIMIT 100`,
      params
    );
    res.set('Cache-Control', 'public, max-age=5');
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'control-rooms realtime-stream error');
  }
});

// GET /api/control-rooms/shields - 屏蔽记录列表
router.get('/control-rooms/shields', async (req, res) => {
  try {
    const { roomId, hostId, status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (roomId) { where += ' AND room_id = ?'; params.push(roomId); }
    if (hostId) { where += ' AND host_id = ?'; params.push(hostId); }
    if (status !== undefined && status !== '') { where += ' AND status = ?'; params.push(Number(status)); }
    const [rows] = await pool.query(`SELECT * FROM control_room_shield ${where} ORDER BY created_at DESC`, params);
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'control-rooms shields error');
  }
});

// POST /api/control-rooms/shield - 新增屏蔽
router.post('/control-rooms/shield', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['roomId', 'hostId', 'pointName', 'shieldReason']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { roomId, hostId, pointName, deviceType, location, loopNo, pointNo, shieldReason } = req.body;
    const shieldBy = req.user?.username || 'admin';
    const [result] = await pool.query(
      'INSERT INTO control_room_shield (room_id, host_id, point_name, device_type, location, loop_no, point_no, shield_reason, shield_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [roomId, hostId, pointName, deviceType || '', location || '', loopNo || null, pointNo || null, shieldReason, shieldBy]
    );
    await logCommand({ hostId, roomId, commandType: 'shield', commandValue: 'shield', pointName, commandBy: shieldBy });
    res.json(success({ id: result.insertId }, 'shield added'));
  } catch (err) {
    handleError(res, err, req, 'control-rooms shield error');
  }
});

// DELETE /api/control-rooms/shield/:id - 解除屏蔽
router.delete('/control-rooms/shield/:id', async (req, res) => {
  try {
    const { unshieldBy } = req.body || {};
    const operator = unshieldBy || req.user?.username || 'admin';
    const [shieldRows] = await pool.query('SELECT host_id, room_id, point_name FROM control_room_shield WHERE id = ?', [req.params.id]);
    if (!shieldRows.length) return res.status(404).json(fail('屏蔽记录不存在', 404));
    const [result] = await pool.query('UPDATE control_room_shield SET status = 0, unshield_time = NOW(), unshield_by = ? WHERE id = ?', [operator, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json(fail('屏蔽记录不存在', 404));
    await logCommand({ hostId: shieldRows[0].host_id, roomId: shieldRows[0].room_id, commandType: 'unshield', commandValue: 'unshield', pointName: shieldRows[0].point_name, commandBy: operator });
    res.json(success(null, 'shield removed'));
  } catch (err) {
    handleError(res, err, req, 'control-rooms unshield error');
  }
});

// GET /api/control-rooms/command-logs - 命令日志
router.get('/control-rooms/command-logs', async (req, res) => {
  try {
    const { roomId, hostId, limit = 50 } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (roomId) { where += ' AND room_id = ?'; params.push(roomId); }
    if (hostId) { where += ' AND host_id = ?'; params.push(hostId); }
    const [rows] = await pool.query(`SELECT * FROM control_room_command_log ${where} ORDER BY command_time DESC LIMIT ?`, [...params, Number(limit)]);
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'control-rooms command-logs error');
  }
});

// GET /api/control-rooms/videos - 视频监控列表
router.get('/control-rooms/videos', async (req, res) => {
  try {
    const { roomId } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (roomId) { where += ' AND room_id = ?'; params.push(roomId); }
    const [rows] = await pool.query(`SELECT id, room_id AS roomId, camera_name AS cameraName, camera_no AS cameraNo, stream_url AS streamUrl, protocol, status, position FROM control_room_video ${where}`, params);
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'control-rooms videos error');
  }
});

// GET /api/control-rooms/:roomId - 控制室详情（必须放在子路由之后，避免通配覆盖）
router.get('/control-rooms/:roomId', async (req, res) => {
  try {
    const [[room]] = await pool.query(
      `SELECT r.room_id AS roomId, r.host_id AS hostId, h.host_code AS hostCode, h.brand, h.model, h.location, h.ip, h.port,
              r.pressure_1 AS pressure1, r.pressure_2 AS pressure2, r.liquid_level_1 AS liquidLevel1, r.liquid_level_2 AS liquidLevel2,
              r.video_status AS videoStatus, r.host_status AS hostStatus, r.current_mode AS currentMode, r.silenced,
              r.fire_count AS fireCount, r.fault_count AS faultCount, r.shield_count AS shieldCount, r.feedback_count AS feedbackCount,
              r.updated_at AS updatedAt
       FROM control_room_realtime r LEFT JOIN fire_host h ON r.host_id = h.id WHERE r.room_id = ? LIMIT 1`,
      [req.params.roomId]
    );
    if (!room) return res.status(404).json(fail('控制室不存在', 404));
    res.json(success(room));
  } catch (err) {
    handleError(res, err, req, 'control-rooms detail error');
  }
});

// PUT /api/control-rooms/:roomId - 编辑控制室
router.put('/control-rooms/:roomId', async (req, res) => {
  try {
    const { hostId, pressure1, pressure2, liquidLevel1, liquidLevel2, videoStatus, hostStatus, currentMode, silenced, fireCount, faultCount, shieldCount, feedbackCount } = req.body;
    const fields = [];
    const values = [];
    if (hostId !== undefined) { fields.push('host_id = ?'); values.push(hostId); }
    if (pressure1 !== undefined) { fields.push('pressure_1 = ?'); values.push(pressure1); }
    if (pressure2 !== undefined) { fields.push('pressure_2 = ?'); values.push(pressure2); }
    if (liquidLevel1 !== undefined) { fields.push('liquid_level_1 = ?'); values.push(liquidLevel1); }
    if (liquidLevel2 !== undefined) { fields.push('liquid_level_2 = ?'); values.push(liquidLevel2); }
    if (videoStatus !== undefined) { fields.push('video_status = ?'); values.push(videoStatus); }
    if (hostStatus !== undefined) { fields.push('host_status = ?'); values.push(hostStatus); }
    if (currentMode !== undefined) { fields.push('current_mode = ?'); values.push(currentMode); }
    if (silenced !== undefined) { fields.push('silenced = ?'); values.push(silenced); }
    if (fireCount !== undefined) { fields.push('fire_count = ?'); values.push(fireCount); }
    if (faultCount !== undefined) { fields.push('fault_count = ?'); values.push(faultCount); }
    if (shieldCount !== undefined) { fields.push('shield_count = ?'); values.push(shieldCount); }
    if (feedbackCount !== undefined) { fields.push('feedback_count = ?'); values.push(feedbackCount); }
    if (fields.length === 0) return res.status(400).json(fail('无更新字段', 400));
    values.push(req.params.roomId);
    const [result] = await pool.query(
      `UPDATE control_room_realtime SET ${fields.join(', ')} WHERE room_id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('控制室不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    handleError(res, err, req, 'control-rooms update error');
  }
});

// DELETE /api/control-rooms/:roomId - 删除控制室及关联记录
router.delete('/control-rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM control_room_shield WHERE room_id = ?', [roomId]);
      await conn.query('DELETE FROM control_room_video WHERE room_id = ?', [roomId]);
      await conn.query('DELETE FROM control_room_command_log WHERE room_id = ?', [roomId]);
      const [result] = await conn.query('DELETE FROM control_room_realtime WHERE room_id = ?', [roomId]);
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json(fail('控制室不存在', 404));
      }
      await conn.commit();
      res.json(success(null, '删除成功'));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    handleError(res, err, req, 'control-rooms delete error');
  }
});

/* ═══════════════════════════════════════════════════════════════
   通用设备管理 devices
   ═══════════════════════════════════════════════════════════════ */

// GET /api/devices - 通用设备列表
router.get('/devices', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword = '', sortBy = 'id', sortOrder = 'desc', status, type } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) {
      where += ' AND (name LIKE CONCAT('%', ?, '%') OR type LIKE CONCAT('%', ?, '%') OR status LIKE CONCAT('%', ?, '%') OR unit_name LIKE CONCAT('%', ?, '%'))';
      params.push(keyword, keyword, keyword, keyword);
    }
    if (status !== undefined && status !== '') {
      where += ' AND status = ?';
      params.push(status);
    }
    if (type !== undefined && type !== '') {
      where += ' AND type = ?';
      params.push(type);
    }
    const { col: orderCol, dir: orderDir } = validateSort(sortBy, sortOrder, 'devices', 'id');
    const [rows] = await pool.query(
      `SELECT id, name, type, unit_id AS unitId, unit_name AS unitName, location, status, online_status AS onlineStatus, manufacturer, model, firmware, ip, install_date AS installDate, last_maint_date AS lastMaintDate, next_maint_date AS nextMaintDate, heartbeat_interval AS heartbeatInterval, created_at AS createdAt, updated_at AS updatedAt
       FROM devices ${where} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM devices ${where}`,
      params
    );
    res.json(success({ list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    handleError(res, err, req, 'devices list error');
  }
});

// [MIGRATED] // GET /api/devices/:id - 通用设备详情
// [MIGRATED] router.get('/devices/:id', async (req, res) => {
// [MIGRATED]   try {
// [MIGRATED]     const [rows] = await pool.query(
// [MIGRATED]       `SELECT id, name, type, unit_id AS unitId, unit_name AS unitName, location, status, online_status AS onlineStatus, manufacturer, model, firmware, ip, install_date AS installDate, last_maint_date AS lastMaintDate, next_maint_date AS nextMaintDate, heartbeat_interval AS heartbeatInterval, created_at AS createdAt, updated_at AS updatedAt
// [MIGRATED]        FROM devices WHERE id = ?`,
// [MIGRATED]       [req.params.id]
// [MIGRATED]     );
// [MIGRATED]     if (!rows.length) return res.status(404).json(fail('设备不存在', 404));
// [MIGRATED]     res.json(success(rows[0]));
// [MIGRATED]   } catch (err) {
// [MIGRATED]     handleError(res, err, req, 'devices get error');
// [MIGRATED]   }
// [MIGRATED] });

// [MIGRATED] // POST /api/devices - 新增通用设备
// [MIGRATED] router.post('/devices', async (req, res) => {
// [MIGRATED]   try {
// [MIGRATED]     const validation = validateRequired(req.body, ['name']);
// [MIGRATED]     if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
// [MIGRATED]     const {
// [MIGRATED]       id: bodyId, name, type, unitId, unitName, location, status = 'normal',
// [MIGRATED]       onlineStatus, manufacturer, model, firmware, ip,
// [MIGRATED]       installDate, lastMaintDate, nextMaintDate, heartbeatInterval = 30
// [MIGRATED]     } = req.body;
// [MIGRATED]     const deviceId = bodyId || crypto.randomUUID();
// [MIGRATED]     const [result] = await pool.query(
// [MIGRATED]       `INSERT INTO devices (id, name, type, unit_id, unit_name, location, status, online_status, manufacturer, model, firmware, ip, install_date, last_maint_date, next_maint_date, heartbeat_interval)
// [MIGRATED]        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
// [MIGRATED]       [deviceId, name, type, unitId, unitName, location, status, onlineStatus || 'offline', manufacturer, model, firmware, ip, installDate || null, lastMaintDate || null, nextMaintDate || null, heartbeatInterval]
// [MIGRATED]     );
// [MIGRATED]     res.json(success({ id: deviceId }, '新增成功'));
// [MIGRATED]   } catch (err) {
// [MIGRATED]     if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('设备编号已存在', 400));
// [MIGRATED]     handleError(res, err, req, 'devices create error');
// [MIGRATED]   }
// [MIGRATED] });

// [MIGRATED] // PUT /api/devices/:id - 编辑通用设备
// [MIGRATED] router.put('/devices/:id', async (req, res) => {
// [MIGRATED]   try {
// [MIGRATED]     const {
// [MIGRATED]       name, type, unitId, unitName, location, status,
// [MIGRATED]       onlineStatus, manufacturer, model, firmware, ip,
// [MIGRATED]       installDate, lastMaintDate, nextMaintDate, heartbeatInterval
// [MIGRATED]     } = req.body;
// [MIGRATED]     const fields = [];
// [MIGRATED]     const values = [];
// [MIGRATED]     if (name !== undefined) { fields.push('name = ?'); values.push(name); }
// [MIGRATED]     if (type !== undefined) { fields.push('type = ?'); values.push(type); }
// [MIGRATED]     if (unitId !== undefined) { fields.push('unit_id = ?'); values.push(unitId); }
// [MIGRATED]     if (unitName !== undefined) { fields.push('unit_name = ?'); values.push(unitName); }
// [MIGRATED]     if (location !== undefined) { fields.push('location = ?'); values.push(location); }
// [MIGRATED]     if (status !== undefined) { fields.push('status = ?'); values.push(status); }
// [MIGRATED]     if (onlineStatus !== undefined) { fields.push('online_status = ?'); values.push(onlineStatus); }
// [MIGRATED]     if (manufacturer !== undefined) { fields.push('manufacturer = ?'); values.push(manufacturer); }
// [MIGRATED]     if (model !== undefined) { fields.push('model = ?'); values.push(model); }
// [MIGRATED]     if (firmware !== undefined) { fields.push('firmware = ?'); values.push(firmware); }
// [MIGRATED]     if (ip !== undefined) { fields.push('ip = ?'); values.push(ip); }
// [MIGRATED]     if (installDate !== undefined) { fields.push('install_date = ?'); values.push(installDate || null); }
// [MIGRATED]     if (lastMaintDate !== undefined) { fields.push('last_maint_date = ?'); values.push(lastMaintDate || null); }
// [MIGRATED]     if (nextMaintDate !== undefined) { fields.push('next_maint_date = ?'); values.push(nextMaintDate || null); }
// [MIGRATED]     if (heartbeatInterval !== undefined) { fields.push('heartbeat_interval = ?'); values.push(heartbeatInterval); }
// [MIGRATED]     if (fields.length === 0) return res.status(400).json(fail('无更新字段', 400));
// [MIGRATED]     values.push(req.params.id);
// [MIGRATED]     const [result] = await pool.query(
// [MIGRATED]       `UPDATE devices SET ${fields.join(', ')} WHERE id = ?`,
// [MIGRATED]       values
// [MIGRATED]     );
// [MIGRATED]     if (result.affectedRows === 0) return res.status(404).json(fail('设备不存在', 404));
// [MIGRATED]     res.json(success(null, '更新成功'));
// [MIGRATED]   } catch (err) {
// [MIGRATED]     if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('设备编号已存在', 400));
// [MIGRATED]     handleError(res, err, req, 'devices update error');
// [MIGRATED]   }
// [MIGRATED] });

// [MIGRATED] // DELETE /api/devices/:id - 删除通用设备
// [MIGRATED] router.delete('/devices/:id', async (req, res) => {
// [MIGRATED]   try {
// [MIGRATED]     const conn = await pool.getConnection();
// [MIGRATED]     try {
// [MIGRATED]       await conn.beginTransaction();
// [MIGRATED]       const [result] = await conn.query('DELETE FROM devices WHERE id = ?', [req.params.id]);
// [MIGRATED]       if (result.affectedRows === 0) {
// [MIGRATED]         await conn.rollback();
// [MIGRATED]         return res.status(404).json(fail('设备不存在', 404));
// [MIGRATED]       }
// [MIGRATED]       await conn.commit();
// [MIGRATED]       res.json(success(null, '删除成功'));
// [MIGRATED]     } catch (err) {
// [MIGRATED]       await conn.rollback();
// [MIGRATED]       throw err;
// [MIGRATED]     } finally {
// [MIGRATED]       conn.release();
// [MIGRATED]     }
// [MIGRATED]   } catch (err) {
// [MIGRATED]     handleError(res, err, req, 'devices delete error');
// [MIGRATED]   }
// [MIGRATED] });

/* ═══════════════════════════════════════════════════════════════
   IoT 设备管理 iot_devices
   ═══════════════════════════════════════════════════════════════ */

// GET /api/iot-devices - IoT设备列表
router.get('/iot-devices', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword = '', sortBy = 'id', sortOrder = 'desc', status, category } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) {
      where += ' AND (name LIKE CONCAT('%', ?, '%') OR category LIKE CONCAT('%', ?, '%') OR status LIKE CONCAT('%', ?, '%') OR unit_name LIKE CONCAT('%', ?, '%'))';
      params.push(keyword, keyword, keyword, keyword);
    }
    if (status !== undefined && status !== '') {
      where += ' AND status = ?';
      params.push(status);
    }
    if (category !== undefined && category !== '') {
      where += ' AND category = ?';
      params.push(category);
    }
    const { col: orderCol, dir: orderDir } = validateSort(sortBy, sortOrder, 'iot_devices', 'id');
    const [rows] = await pool.query(
      `SELECT id, name, category, protocol, ip, port, imei, unit_id AS unitId, unit_name AS unitName, floor, room, online_status AS onlineStatus, last_heartbeat AS lastHeartbeat, heartbeat_interval AS heartbeatInterval, register_count AS registerCount, manufacturer, model, firmware, status, created_at AS createdAt, updated_at AS updatedAt
       FROM iot_devices ${where} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM iot_devices ${where}`,
      params
    );
    res.json(success({ list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    handleError(res, err, req, 'iot-devices list error');
  }
});

// GET /api/iot-devices/:id - IoT设备详情
router.get('/iot-devices/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, category, protocol, ip, port, imei, unit_id AS unitId, unit_name AS unitName, floor, room, online_status AS onlineStatus, last_heartbeat AS lastHeartbeat, heartbeat_interval AS heartbeatInterval, register_count AS registerCount, manufacturer, model, firmware, status, created_at AS createdAt, updated_at AS updatedAt
       FROM iot_devices WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json(fail('IoT设备不存在', 404));
    res.json(success(rows[0]));
  } catch (err) {
    handleError(res, err, req, 'iot-devices get error');
  }
});

// POST /api/iot-devices - 新增IoT设备
router.post('/iot-devices', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['name']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const {
      id: bodyId, name, category, protocol, ip, port, imei, unitId, unitName, floor, room,
      onlineStatus, lastHeartbeat, heartbeatInterval = 30, registerCount = 0,
      manufacturer, model, firmware, status = 'normal'
    } = req.body;
    const deviceId = bodyId || crypto.randomUUID();
    const [result] = await pool.query(
      `INSERT INTO iot_devices (id, name, category, protocol, ip, port, imei, unit_id, unit_name, floor, room, online_status, last_heartbeat, heartbeat_interval, register_count, manufacturer, model, firmware, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, name, category, protocol, ip, port, imei, unitId, unitName, floor, room, onlineStatus || 'offline', lastHeartbeat || null, heartbeatInterval, registerCount, manufacturer, model, firmware, status]
    );
    res.json(success({ id: deviceId }, '新增成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('设备编号已存在', 400));
    handleError(res, err, req, 'iot-devices create error');
  }
});

// PUT /api/iot-devices/:id - 编辑IoT设备
router.put('/iot-devices/:id', async (req, res) => {
  try {
    const {
      name, category, protocol, ip, port, imei, unitId, unitName, floor, room,
      onlineStatus, lastHeartbeat, heartbeatInterval, registerCount,
      manufacturer, model, firmware, status
    } = req.body;
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (category !== undefined) { fields.push('category = ?'); values.push(category); }
    if (protocol !== undefined) { fields.push('protocol = ?'); values.push(protocol); }
    if (ip !== undefined) { fields.push('ip = ?'); values.push(ip); }
    if (port !== undefined) { fields.push('port = ?'); values.push(port); }
    if (imei !== undefined) { fields.push('imei = ?'); values.push(imei); }
    if (unitId !== undefined) { fields.push('unit_id = ?'); values.push(unitId); }
    if (unitName !== undefined) { fields.push('unit_name = ?'); values.push(unitName); }
    if (floor !== undefined) { fields.push('floor = ?'); values.push(floor); }
    if (room !== undefined) { fields.push('room = ?'); values.push(room); }
    if (onlineStatus !== undefined) { fields.push('online_status = ?'); values.push(onlineStatus); }
    if (lastHeartbeat !== undefined) { fields.push('last_heartbeat = ?'); values.push(lastHeartbeat || null); }
    if (heartbeatInterval !== undefined) { fields.push('heartbeat_interval = ?'); values.push(heartbeatInterval); }
    if (registerCount !== undefined) { fields.push('register_count = ?'); values.push(registerCount); }
    if (manufacturer !== undefined) { fields.push('manufacturer = ?'); values.push(manufacturer); }
    if (model !== undefined) { fields.push('model = ?'); values.push(model); }
    if (firmware !== undefined) { fields.push('firmware = ?'); values.push(firmware); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (fields.length === 0) return res.status(400).json(fail('无更新字段', 400));
    values.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE iot_devices SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('IoT设备不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('设备编号已存在', 400));
    handleError(res, err, req, 'iot-devices update error');
  }
});

// DELETE /api/iot-devices/:id - 删除IoT设备
router.delete('/iot-devices/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query('DELETE FROM iot_devices WHERE id = ?', [req.params.id]);
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json(fail('IoT设备不存在', 404));
      }
      await conn.commit();
      res.json(success(null, '删除成功'));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    handleError(res, err, req, 'iot-devices delete error');
  }
});

/* ═══════════════════════════════════════════════════════════════
   摄像头管理 cameras
   ═══════════════════════════════════════════════════════════════ */

// GET /api/cameras - 摄像头列表
router.get('/cameras', async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword = '', sortBy = 'id', sortOrder = 'desc', status, type } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) {
      where += ' AND (name LIKE CONCAT('%', ?, '%') OR type LIKE CONCAT('%', ?, '%') OR status LIKE CONCAT('%', ?, '%') OR unit_name LIKE CONCAT('%', ?, '%'))';
      params.push(keyword, keyword, keyword, keyword);
    }
    if (status !== undefined && status !== '') {
      where += ' AND status = ?';
      params.push(status);
    }
    if (type !== undefined && type !== '') {
      where += ' AND type = ?';
      params.push(type);
    }
    const { col: orderCol, dir: orderDir } = validateSort(sortBy, sortOrder, 'cameras', 'id');
    const [rows] = await pool.query(
      `SELECT id, name, unit_id AS unitId, unit_name AS unitName, location, rtsp_url AS rtspUrl, stream_url AS streamUrl, type, status, online_status AS onlineStatus, device_id AS deviceId, channel_id AS channelId, created_at AS createdAt, updated_at AS updatedAt
       FROM cameras ${where} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM cameras ${where}`,
      params
    );
    res.json(success({ list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    handleError(res, err, req, 'cameras list error');
  }
});

// GET /api/cameras/:id - 摄像头详情
router.get('/cameras/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, unit_id AS unitId, unit_name AS unitName, location, rtsp_url AS rtspUrl, stream_url AS streamUrl, type, status, online_status AS onlineStatus, device_id AS deviceId, channel_id AS channelId, created_at AS createdAt, updated_at AS updatedAt
       FROM cameras WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json(fail('摄像头不存在', 404));
    res.json(success(rows[0]));
  } catch (err) {
    handleError(res, err, req, 'cameras get error');
  }
});

// POST /api/cameras - 新增摄像头
router.post('/cameras', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['name']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const {
      id: bodyId, name, unitId, unitName, location, rtspUrl, streamUrl,
      type = 'indoor', status = 'normal', onlineStatus, deviceId, channelId
    } = req.body;
    const cameraId = bodyId || crypto.randomUUID();
    const [result] = await pool.query(
      `INSERT INTO cameras (id, name, unit_id, unit_name, location, rtsp_url, stream_url, type, status, online_status, device_id, channel_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cameraId, name, unitId, unitName, location, rtspUrl, streamUrl, type, status, onlineStatus || 'offline', deviceId, channelId]
    );
    res.json(success({ id: cameraId }, '新增成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('摄像头编号已存在', 400));
    handleError(res, err, req, 'cameras create error');
  }
});

// PUT /api/cameras/:id - 编辑摄像头
router.put('/cameras/:id', async (req, res) => {
  try {
    const {
      name, unitId, unitName, location, rtspUrl, streamUrl,
      type, status, onlineStatus, deviceId, channelId
    } = req.body;
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (unitId !== undefined) { fields.push('unit_id = ?'); values.push(unitId); }
    if (unitName !== undefined) { fields.push('unit_name = ?'); values.push(unitName); }
    if (location !== undefined) { fields.push('location = ?'); values.push(location); }
    if (rtspUrl !== undefined) { fields.push('rtsp_url = ?'); values.push(rtspUrl); }
    if (streamUrl !== undefined) { fields.push('stream_url = ?'); values.push(streamUrl); }
    if (type !== undefined) { fields.push('type = ?'); values.push(type); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (onlineStatus !== undefined) { fields.push('online_status = ?'); values.push(onlineStatus); }
    if (deviceId !== undefined) { fields.push('device_id = ?'); values.push(deviceId); }
    if (channelId !== undefined) { fields.push('channel_id = ?'); values.push(channelId); }
    if (fields.length === 0) return res.status(400).json(fail('无更新字段', 400));
    values.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE cameras SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('摄像头不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('摄像头编号已存在', 400));
    handleError(res, err, req, 'cameras update error');
  }
});

// DELETE /api/cameras/:id - 删除摄像头（级联删除消控室视频关联）
router.delete('/cameras/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query('DELETE FROM cameras WHERE id = ?', [req.params.id]);
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json(fail('摄像头不存在', 404));
      }
      // 级联删除消控室视频关联（同一摄像头可能关联多个消控室）
      await conn.query('DELETE FROM control_room_video WHERE camera_no = ?', [req.params.id]);
      await conn.commit();
      res.json(success(null, '删除成功'));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    handleError(res, err, req, 'cameras delete error');
  }
});

/* ═══════════════════════════════════════════════════════════════
   GB28181 国标设备管理 gb28181_devices
   ═══════════════════════════════════════════════════════════════ */

// GET /api/gb28181-devices 与 /gb28181-devices/list — 国标设备列表（前端 paginatedQuery 使用 /list）
async function handleGb28181DeviceList(req, res) {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { keyword = '', sortBy = 'id', sortOrder = 'desc', status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (keyword) {
      where += ' AND (name LIKE CONCAT('%', ?, '%') OR device_id LIKE CONCAT('%', ?, '%') OR status LIKE CONCAT('%', ?, '%') OR unit_name LIKE CONCAT('%', ?, '%'))';
      params.push(keyword, keyword, keyword, keyword);
    }
    if (status !== undefined && status !== '') {
      where += ' AND status = ?';
      params.push(status);
    }
    const { col: orderCol, dir: orderDir } = validateSort(sortBy, sortOrder, 'gb28181_devices', 'id');
    const [rows] = await pool.query(
      `SELECT id, device_id AS deviceId, name, manufacturer, model, firmware, ip, port, transport, username, password, status, register_time AS registerTime, last_keepalive AS lastKeepalive, channel_count AS channelCount, catalog_synced AS catalogSynced, ptz_support AS ptzSupport, unit_id AS unitId, unit_name AS unitName, location, created_at AS createdAt, updated_at AS updatedAt
       FROM gb28181_devices ${where} ORDER BY ${orderCol} ${orderDir} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM gb28181_devices ${where}`,
      params
    );
    res.json(success({ list: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }));
  } catch (err) {
    handleError(res, err, req, 'gb28181-devices list error');
  }
}
router.get('/gb28181-devices/list', handleGb28181DeviceList);
router.get('/gb28181-devices', handleGb28181DeviceList);

// GET /api/gb28181-devices/:id - 国标设备详情
router.get('/gb28181-devices/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, device_id AS deviceId, name, manufacturer, model, firmware, ip, port, transport, username, password, status, register_time AS registerTime, last_keepalive AS lastKeepalive, channel_count AS channelCount, catalog_synced AS catalogSynced, ptz_support AS ptzSupport, unit_id AS unitId, unit_name AS unitName, location, created_at AS createdAt, updated_at AS updatedAt
       FROM gb28181_devices WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json(fail('国标设备不存在', 404));
    res.json(success(rows[0]));
  } catch (err) {
    handleError(res, err, req, 'gb28181-devices get error');
  }
});

// POST /api/gb28181-devices - 新增国标设备
router.post('/gb28181-devices', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['name', 'deviceId']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const {
      id: bodyId, deviceId: bodyDeviceId, name, manufacturer, model, firmware, ip, port = 5060,
      transport = 'UDP', username, password, status = 'offline',
      registerTime, lastKeepalive, channelCount = 0, catalogSynced = 0, ptzSupport = 1,
      unitId, unitName, location
    } = req.body;
    const safeTs = (v) => (v === undefined || v === null || v === '' || v === '-' || v === '—') ? null : v;
    const id = bodyId || crypto.randomUUID();
    const [result] = await pool.query(
      `INSERT INTO gb28181_devices (id, device_id, name, manufacturer, model, firmware, ip, port, transport, username, password, status, register_time, last_keepalive, channel_count, catalog_synced, ptz_support, unit_id, unit_name, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, bodyDeviceId || null, name, manufacturer, model, firmware, ip, port, transport, username, password, status, safeTs(registerTime), safeTs(lastKeepalive), channelCount, catalogSynced, ptzSupport, unitId, unitName, location]
    );
    res.json(success({ id }, '新增成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('设备编号或国标设备ID已存在', 400));
    handleError(res, err, req, 'gb28181-devices create error');
  }
});

// PUT /api/gb28181-devices/:id - 编辑国标设备
router.put('/gb28181-devices/:id', async (req, res) => {
  try {
    const {
      deviceId, name, manufacturer, model, firmware, ip, port,
      transport, username, password, status,
      registerTime, lastKeepalive, channelCount, catalogSynced, ptzSupport,
      unitId, unitName, location
    } = req.body;
    const fields = [];
    const values = [];
    if (deviceId !== undefined) { fields.push('device_id = ?'); values.push(deviceId); }
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (manufacturer !== undefined) { fields.push('manufacturer = ?'); values.push(manufacturer); }
    if (model !== undefined) { fields.push('model = ?'); values.push(model); }
    if (firmware !== undefined) { fields.push('firmware = ?'); values.push(firmware); }
    if (ip !== undefined) { fields.push('ip = ?'); values.push(ip); }
    if (port !== undefined) { fields.push('port = ?'); values.push(port); }
    if (transport !== undefined) { fields.push('transport = ?'); values.push(transport); }
    if (username !== undefined) { fields.push('username = ?'); values.push(username); }
    if (password !== undefined) { fields.push('password = ?'); values.push(password); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (registerTime !== undefined) { fields.push('register_time = ?'); values.push(registerTime || null); }
    if (lastKeepalive !== undefined) { fields.push('last_keepalive = ?'); values.push(lastKeepalive || null); }
    if (channelCount !== undefined) { fields.push('channel_count = ?'); values.push(channelCount); }
    if (catalogSynced !== undefined) { fields.push('catalog_synced = ?'); values.push(catalogSynced); }
    if (ptzSupport !== undefined) { fields.push('ptz_support = ?'); values.push(ptzSupport); }
    if (unitId !== undefined) { fields.push('unit_id = ?'); values.push(unitId); }
    if (unitName !== undefined) { fields.push('unit_name = ?'); values.push(unitName); }
    if (location !== undefined) { fields.push('location = ?'); values.push(location); }
    if (fields.length === 0) return res.status(400).json(fail('无更新字段', 400));
    values.push(req.params.id);
    const [result] = await pool.query(
      `UPDATE gb28181_devices SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('国标设备不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('设备编号或国标设备ID已存在', 400));
    handleError(res, err, req, 'gb28181-devices update error');
  }
});

// DELETE /api/gb28181-devices/:id - 删除国标设备
router.delete('/gb28181-devices/:id', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query('DELETE FROM gb28181_devices WHERE id = ?', [req.params.id]);
      if (result.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json(fail('国标设备不存在', 404));
      }
      await conn.commit();
      res.json(success(null, '删除成功'));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    handleError(res, err, req, 'gb28181-devices delete error');
  }
});

// 404 处理
router.use((req, res) => {
  res.status(404).json(fail('接口不存在', 404));
});

// 路由级全局错误处理（兜底，不暴露堆栈）
router.use((err, req, res, next) => {
  console.error(`[${req.reqId || 'unknown'}] unhandled error:`, err);
  const status = err.status || err.statusCode || 500;
  const message = isProduction ? '服务器内部错误' : (err.message || '服务器内部错误');
  res.status(status).json(fail(message, status));
});

module.exports = router;
