/**
 * ═══════════════════════════════════════════════════════════════
 * 消防设备平面图路由模块
 * 路径前缀: /api/* (通过 routes/index.js 挂载)
 * 功能：建筑/楼层/设备点位/摄像头关联/平面图上传
 * ═══════════════════════════════════════════════════════════════
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../utils/db');
const { success, fail, handleError } = require('../utils/response');

const router = express.Router();

/* ── multer 上传配置 ── */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'floor-plans');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `floor-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只允许上传图片文件'));
  },
});

/* ── 静态资源URL前缀 ── */
const STATIC_BASE = process.env.UPLOAD_BASE_URL || '';
function fileUrl(filename) {
  if (STATIC_BASE) return `${STATIC_BASE}/uploads/floor-plans/${filename}`;
  return `/uploads/floor-plans/${filename}`;
}

/* ═══════ 单位 ═══════ */

// GET /api/units - 单位列表
router.get('/units', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, type, address, contact_name AS contactName, contact_phone AS contactPhone, status FROM units WHERE status = 1 ORDER BY created_at DESC'
    );
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'units list error');
  }
});

/* ═══════ 建筑 CRUD ═══════ */

// GET /api/buildings - 建筑列表
router.get('/buildings', async (req, res) => {
  try {
    const { unit_id, pageSize = 100 } = req.query;
    let sql = 'SELECT * FROM fire_building';
    const params = [];
    if (unit_id) {
      sql += ' WHERE unit_id = ?';
      params.push(unit_id);
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(pageSize, 10));
    const [rows] = await pool.query(sql, params);
    res.json(success({ list: rows }));
  } catch (err) {
    handleError(res, err, req, 'buildings list error');
  }
});

// POST /api/buildings - 创建建筑
router.post('/buildings', async (req, res) => {
  try {
    const { name, unit_id, type, total_floors, address } = req.body;
    if (!name) return res.status(400).json(fail('建筑名称不能为空', 400));
    const [result] = await pool.query(
      'INSERT INTO fire_building (name, unit_id, type, total_floors, address) VALUES (?, ?, ?, ?, ?)',
      [name, unit_id || 'PENDING', type || '商业', total_floors || 1, address || '']
    );
    res.json(success({ id: result.insertId }, '创建成功'));
  } catch (err) {
    handleError(res, err, req, 'create building error');
  }
});

// PUT /api/buildings/:id - 修改建筑
router.put('/buildings/:id', async (req, res) => {
  try {
    const { name, type, total_floors, address } = req.body;
    const [result] = await pool.query(
      'UPDATE fire_building SET name = ?, type = ?, total_floors = ?, address = ? WHERE id = ?',
      [name, type, total_floors, address, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('建筑不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    handleError(res, err, req, 'update building error');
  }
});

// DELETE /api/buildings/:id - 删除建筑（级联删除楼层）
router.delete('/buildings/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM fire_building WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json(fail('建筑不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, req, 'delete building error');
  }
});

/* ═══════ 楼层 ═══════ */

// GET /api/buildings/:id/floors - 楼层列表
router.get('/buildings/:id/floors', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM fire_floor WHERE building_id = ? ORDER BY floor_number',
      [req.params.id]
    );
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'floors list error');
  }
});

// GET /api/floors?building_id=xxx - 楼层列表（兼容前端直接调用）
router.get('/floors', async (req, res) => {
  try {
    const { building_id } = req.query;
    if (!building_id) return res.status(400).json(fail('building_id 不能为空', 400));
    const [rows] = await pool.query(
      'SELECT * FROM fire_floor WHERE building_id = ? ORDER BY floor_number',
      [building_id]
    );
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, req, 'floors list error');
  }
});

// POST /api/buildings/:id/floors - 创建楼层（支持批量）
router.post('/buildings/:id/floors', async (req, res) => {
  try {
    const buildingId = req.params.id;
    const { name, floor_number, batch } = req.body;

    if (batch && Array.isArray(batch)) {
      // 批量创建
      const values = batch.map(b => [buildingId, b.name, b.floor_number]);
      const [result] = await pool.query(
        'INSERT INTO fire_floor (building_id, name, floor_number) VALUES ?',
        [values]
      );
      res.json(success({ insertId: result.insertId, affectedRows: result.affectedRows }, '批量创建成功'));
    } else {
      if (!name) return res.status(400).json(fail('楼层名称不能为空', 400));
      const [result] = await pool.query(
        'INSERT INTO fire_floor (building_id, name, floor_number) VALUES (?, ?, ?)',
        [buildingId, name, floor_number || 0]
      );
      res.json(success({ id: result.insertId }, '创建成功'));
    }
  } catch (err) {
    handleError(res, err, req, 'create floor error');
  }
});

// GET /api/floors/:id - 单个楼层详情
router.get('/floors/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM fire_floor WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json(fail('楼层不存在', 404));
    res.json(success(rows[0]));
  } catch (err) {
    handleError(res, err, req, 'floor detail error');
  }
});

// POST /api/floors/:id/plan - 上传平面图（图片）
router.post('/floors/:id/plan', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json(fail('请上传图片文件', 400));
    const imageUrl = fileUrl(req.file.filename);
    await pool.query(
      'UPDATE fire_floor SET plan_image_url = ?, plan_type = "image", plan_cad_url = NULL, plan_cad_data = NULL WHERE id = ?',
      [imageUrl, req.params.id]
    );
    res.json(success({ url: imageUrl }, '上传成功'));
  } catch (err) {
    handleError(res, err, req, 'upload plan error');
  }
});

// POST /api/floors/:id/plan-cad - 上传CAD图纸
router.post('/floors/:id/plan-cad', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json(fail('请上传CAD文件', 400));
    const floorId = req.params.id;
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!['.dxf', '.dwg'].includes(ext)) {
      return res.status(400).json(fail('仅支持 .dxf 或 .dwg 格式', 400));
    }

    const cadUrl = fileUrl(req.file.filename);
    const jsonPath = path.join(UPLOAD_DIR, `${req.file.filename}.json`);

    // 调用 Python 脚本解析 CAD
    const { execSync } = require('child_process');
    const scriptPath = path.join(__dirname, '..', 'scripts', 'parse_cad.py');
    try {
      const output = execSync(`python3 "${scriptPath}" "${req.file.path}" "${jsonPath}"`, { encoding: 'utf-8', timeout: 30000 });
      const parseResult = JSON.parse(output.trim().split('\n').pop() || '{}');
      if (parseResult.error) throw new Error(parseResult.error);

      const cadData = require('fs').readFileSync(jsonPath, 'utf-8');
      await pool.query(
        'UPDATE fire_floor SET plan_type = "cad", plan_cad_url = ?, plan_cad_data = ?, plan_image_url = NULL WHERE id = ?',
        [cadUrl, cadData, floorId]
      );
      res.json(success({ url: cadUrl, bounds: parseResult.bounds }, 'CAD上传并解析成功'));
    } catch (parseErr) {
      console.error('CAD parse error:', parseErr.message);
      // 回退为普通文件上传
      await pool.query(
        'UPDATE fire_floor SET plan_image_url = ? WHERE id = ?',
        [cadUrl, floorId]
      );
      res.json(success({ url: cadUrl }, '文件已上传但CAD解析失败，已作为普通文件保存'));
    }
  } catch (err) {
    handleError(res, err, req, 'upload cad error');
  }
});

/* ═══════ 设备点位 ═══════ */

// 状态映射辅助
function mapDeviceStatus(row) {
  const s = (row.status || '').toLowerCase();
  const os = (row.online_status || '').toLowerCase();
  if (s === 'disabled' || s === 'scrapped') return 4;
  if (s === 'fault' || s === 'maintenance') return 2;
  if (os === 'offline' || s === 'offline') return 3;
  if (os === 'online' || s === 'normal') return 1;
  return 3;
}

// GET /api/floors/:id/devices - 楼层已标点设备
router.get('/floors/:id/devices', async (req, res) => {
  try {
    const floorId = req.params.id;
    const [rows] = await pool.query(
      `SELECT 
        p.id AS position_id,
        p.device_id,
        p.x,
        p.y,
        p.status AS point_status,
        p.bind_camera_id,
        p.bind_camera_channel,
        d.device_name,
        d.device_id AS device_code,
        d.protocol AS device_type,
        d.status,
        d.online_status
      FROM fire_floor_device_position p
      LEFT JOIN fire_iot_device d ON p.device_id = d.device_id
      WHERE p.floor_id = ?`,
      [floorId]
    );
    const list = rows.map(r => ({
      position_id: r.position_id,
      device_id: r.device_id,
      x: r.x,
      y: r.y,
      device_name: r.device_name || r.device_id,
      device_code: r.device_code || r.device_id,
      device_type: r.device_type || '未知',
      status: mapDeviceStatus(r),
      bind_camera_id: r.bind_camera_id,
      bind_camera_channel: r.bind_camera_channel,
    }));
    res.json(success(list));
  } catch (err) {
    handleError(res, err, req, 'floor devices error');
  }
});

// GET /api/floors/:id/devices/unmarked - 未标点设备
router.get('/floors/:id/devices/unmarked', async (req, res) => {
  try {
    const floorId = req.params.id;
    // 获取楼层所属单位的 unit_id
    const [bRows] = await pool.query(
      `SELECT bu.unit_id FROM fire_floor f
       JOIN fire_building bu ON f.building_id = bu.id
       WHERE f.id = ?`,
      [floorId]
    );
    const unitId = bRows.length ? bRows[0].unit_id : 'PENDING';

    // 已标点的设备ID
    const [marked] = await pool.query(
      'SELECT device_id FROM fire_floor_device_position WHERE floor_id = ?',
      [floorId]
    );
    const markedIds = marked.map(m => m.device_id);

    let sql = `SELECT 
      id,
      device_name,
      device_id AS device_code,
      protocol AS device_type,
      status,
      online_status
    FROM fire_iot_device
    WHERE unit_id = ?`;
    const params = [unitId];

    if (markedIds.length > 0) {
      sql += ` AND device_id NOT IN (${markedIds.map(() => '?').join(',')})`;
      params.push(...markedIds);
    }
    sql += ' ORDER BY device_name LIMIT 200';

    const [rows] = await pool.query(sql, params);
    const list = rows.map(r => ({
      id: r.id,
      device_id: r.device_code, // 用 device_id（VARCHAR）作为前端 device_id
      device_name: r.device_name || r.device_code,
      device_code: r.device_code,
      device_type: r.device_type || '未知',
      status: mapDeviceStatus(r),
    }));
    res.json(success(list));
  } catch (err) {
    handleError(res, err, req, 'unmarked devices error');
  }
});

// POST /api/floors/:id/devices - 添加单个点位
router.post('/floors/:id/devices', async (req, res) => {
  try {
    const floorId = req.params.id;
    const { device_id, x, y } = req.body;
    if (!device_id || x === undefined || y === undefined) {
      return res.status(400).json(fail('device_id, x, y 不能为空', 400));
    }
    const [result] = await pool.query(
      'INSERT INTO fire_floor_device_position (floor_id, device_id, x, y) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE x = ?, y = ?',
      [floorId, device_id, x, y, x, y]
    );
    res.json(success({ id: result.insertId }, '保存成功'));
  } catch (err) {
    handleError(res, err, req, 'add device position error');
  }
});

// POST /api/floors/:id/devices/batch - 批量保存点位
router.post('/floors/:id/devices/batch', async (req, res) => {
  try {
    const floorId = req.params.id;
    const { positions } = req.body;
    if (!Array.isArray(positions) || positions.length === 0) {
      return res.status(400).json(fail('positions 不能为空数组', 400));
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const p of positions) {
        await conn.query(
          'INSERT INTO fire_floor_device_position (floor_id, device_id, x, y) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE x = ?, y = ?',
          [floorId, p.device_id, p.x, p.y, p.x, p.y]
        );
      }
      await conn.commit();
      res.json(success(null, '批量保存成功'));
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    handleError(res, err, req, 'batch save error');
  }
});

// POST /api/floors/:id/devices/import - 通过设备编码Excel批量导入点位
const xlsx = require('xlsx');
const importUpload = multer({ dest: path.join(__dirname, '..', 'uploads', 'temp') });

router.post('/floors/:id/devices/import', importUpload.single('file'), async (req, res) => {
  try {
    const floorId = req.params.id;
    if (!req.file) return res.status(400).json(fail('请上传Excel文件', 400));

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!rows.length) return res.status(400).json(fail('Excel为空', 400));

    // 查找表头行（支持 "设备编码"/"device_code"/"编号" 等）
    let headerIdx = 0;
    const headerVariants = {
      code: ['设备编码', 'device_code', '编号', '编码', '设备编号', 'device code'],
      x: ['X坐标', 'x', 'X', 'x坐标', '横坐标'],
      y: ['Y坐标', 'y', 'Y', 'y坐标', '纵坐标'],
    };
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = rows[i].map(c => String(c).trim().toLowerCase());
      if (headerVariants.code.some(h => row.includes(h.toLowerCase()))) {
        headerIdx = i; break;
      }
    }

    const headers = rows[headerIdx].map(c => String(c).trim().toLowerCase());
    const colIdx = {
      code: headers.findIndex(h => headerVariants.code.some(v => h.includes(v.toLowerCase()))),
      x: headers.findIndex(h => headerVariants.x.some(v => h.includes(v.toLowerCase()))),
      y: headers.findIndex(h => headerVariants.y.some(v => h.includes(v.toLowerCase()))),
    };
    if (colIdx.code < 0) return res.status(400).json(fail('未找到设备编码列（支持：设备编码/device_code/编号）', 400));
    if (colIdx.x < 0 || colIdx.y < 0) return res.status(400).json(fail('未找到X/Y坐标列', 400));

    // 解析数据行
    const imports = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const code = String(row[colIdx.code] || '').trim();
      const x = parseFloat(row[colIdx.x]);
      const y = parseFloat(row[colIdx.y]);
      if (code && !isNaN(x) && !isNaN(y)) {
        imports.push({ code, x, y });
      }
    }
    if (imports.length === 0) return res.status(400).json(fail('未解析到有效数据', 400));

    // 获取楼层关联的单位（用于设备查找范围）
    const [bRows] = await pool.query(
      `SELECT bu.unit_id FROM fire_floor f JOIN fire_building bu ON f.building_id = bu.id WHERE f.id = ?`,
      [floorId]
    );
    const unitId = bRows.length ? bRows[0].unit_id : null;

    // 匹配设备编码 → device_id（优先 device_archive，回退 fire_iot_device）
    const matched = [];
    const unmatched = [];
    for (const item of imports) {
      let deviceId = null;
      // 优先查 device_archive
      const [daRows] = await pool.query(
        'SELECT id FROM device_archive WHERE code = ? LIMIT 1',
        [item.code]
      );
      if (daRows.length) {
        deviceId = daRows[0].id;
      } else {
        // 回退查 fire_iot_device（兼容旧编码）
        const [fiRows] = await pool.query(
          'SELECT device_id FROM fire_iot_device WHERE device_id = ? LIMIT 1',
          [item.code]
        );
        if (fiRows.length) deviceId = fiRows[0].device_id;
      }
      if (deviceId) {
        matched.push({ device_id: deviceId, x: item.x, y: item.y });
      } else {
        unmatched.push(item.code);
      }
    }

    if (matched.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json(fail(`未匹配到任何设备编码，未匹配：${unmatched.join(', ')}`, 400));
    }

    // 批量写入点位
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const p of matched) {
        await conn.query(
          'INSERT INTO fire_floor_device_position (floor_id, device_id, x, y) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE x = ?, y = ?',
          [floorId, p.device_id, p.x, p.y, p.x, p.y]
        );
      }
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    fs.unlinkSync(req.file.path);
    res.json(success({
      total: imports.length,
      success: matched.length,
      failed: unmatched.length,
      unmatched: unmatched.slice(0, 50), // 最多返回50个
    }, `成功导入 ${matched.length}/${imports.length} 个点位`));
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    handleError(res, err, req, 'import excel error');
  }
});

// DELETE /api/floors/:floorId/devices/:id - 删除点位（兼容 position_id 或 device_id）
router.delete('/floors/:floorId/devices/:id', async (req, res) => {
  try {
    const floorId = req.params.floorId;
    const id = req.params.id;
    // 先尝试按 position_id 删除
    let [result] = await pool.query(
      'DELETE FROM fire_floor_device_position WHERE id = ? AND floor_id = ?',
      [id, floorId]
    );
    // 如果没删除到，尝试按 device_id 删除
    if (result.affectedRows === 0) {
      [result] = await pool.query(
        'DELETE FROM fire_floor_device_position WHERE device_id = ? AND floor_id = ?',
        [id, floorId]
      );
    }
    if (result.affectedRows === 0) return res.status(404).json(fail('点位不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, req, 'delete position error');
  }
});

// GET /api/devices/:id/position - 查询设备所在位置（告警跳转用）
router.get('/devices/:id/position', async (req, res) => {
  try {
    const deviceId = req.params.id;
    const [rows] = await pool.query(
      `SELECT 
        p.id AS position_id,
        p.x,
        p.y,
        f.id AS floor_id,
        f.name AS floor_name,
        f.plan_image_url,
        b.id AS building_id,
        b.name AS building_name
      FROM fire_floor_device_position p
      JOIN fire_floor f ON p.floor_id = f.id
      JOIN fire_building b ON f.building_id = b.id
      WHERE p.device_id = ?
      LIMIT 1`,
      [deviceId]
    );
    if (!rows.length) return res.status(404).json(fail('设备未在平面图上标点', 404));
    res.json(success(rows[0]));
  } catch (err) {
    handleError(res, err, req, 'device position error');
  }
});

/* ═══════ 摄像头关联 ═══════ */

// GET /api/floors/:id/cameras - 楼层摄像头关联（含视频流信息）
router.get('/floors/:id/cameras', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        b.*,
        c.name AS camera_name,
        c.stream_url
      FROM fire_floor_camera_binding b
      LEFT JOIN cameras c ON b.camera_device_id = c.id
      WHERE b.floor_id = ?`,
      [req.params.id]
    );
    const list = rows.map(r => ({
      ...r,
      bound_device_ids: r.bound_device_ids ? JSON.parse(r.bound_device_ids) : [],
    }));
    res.json(success(list));
  } catch (err) {
    handleError(res, err, req, 'floor cameras error');
  }
});

// POST /api/floors/:id/cameras - 添加/更新摄像头关联
router.post('/floors/:id/cameras', async (req, res) => {
  try {
    const floorId = req.params.id;
    const { camera_device_id, bound_device_ids, x, y, preset_no } = req.body;
    if (!camera_device_id) return res.status(400).json(fail('camera_device_id 不能为空', 400));
    const bound = Array.isArray(bound_device_ids) ? JSON.stringify(bound_device_ids) : bound_device_ids;
    const [result] = await pool.query(
      `INSERT INTO fire_floor_camera_binding (floor_id, camera_device_id, bound_device_ids, x, y, preset_no)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE bound_device_ids = ?, x = ?, y = ?, preset_no = ?`,
      [floorId, camera_device_id, bound, x || 0, y || 0, preset_no || 0,
       bound, x || 0, y || 0, preset_no || 0]
    );
    res.json(success({ id: result.insertId }, '保存成功'));
  } catch (err) {
    handleError(res, err, req, 'save camera binding error');
  }
});

// DELETE /api/floors/:floorId/cameras/:bindId - 删除摄像头关联
router.delete('/floors/:floorId/cameras/:bindId', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM fire_floor_camera_binding WHERE id = ? AND floor_id = ?',
      [req.params.bindId, req.params.floorId]
    );
    if (result.affectedRows === 0) return res.status(404).json(fail('关联不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, req, 'delete camera binding error');
  }
});

module.exports = router;
