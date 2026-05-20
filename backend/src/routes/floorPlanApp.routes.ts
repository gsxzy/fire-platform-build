/**
 * 平面图 API — 与 app/backend/routes/floorPlan.js 同路径、同库表（fire_* / units / device_archive 等），
 * 便于根目录 TypeScript 后端与现有前端、现网 MySQL 共用一套数据。
 */
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { QueryTypes } from 'sequelize';
import xlsx from 'xlsx';
import { spawnSync } from 'child_process';
import sequelize from '@/config/database';
import { success, fail } from '@/utils/response';
import logger from '@/config/logger';

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'floor-plans');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const tempDir = path.join(process.cwd(), 'uploads', 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `floor-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('只允许上传图片文件'));
  },
});

const importUpload = multer({ dest: tempDir });

const STATIC_BASE = process.env.UPLOAD_BASE_URL || '';
function fileUrl(filename: string) {
  if (STATIC_BASE) return `${STATIC_BASE}/uploads/floor-plans/${filename}`;
  return `/uploads/floor-plans/${filename}`;
}

function handleError(res: import('express').Response, err: unknown, label: string) {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error(`[floorPlanApp] ${label}:`, msg);
  res.status(500).json(fail('服务器内部错误', 500));
}

function mapDeviceStatus(row: { status?: string; online_status?: string }) {
  const s = (row.status || '').toLowerCase();
  const os = (row.online_status || '').toLowerCase();
  if (s === 'disabled' || s === 'scrapped') return 4;
  if (s === 'fault' || s === 'maintenance') return 2;
  if (os === 'offline' || s === 'offline') return 3;
  if (os === 'online' || s === 'normal') return 1;
  return 3;
}

/* ═══════ 单位（平面图下拉） ═══════ */
router.get('/units', async (_req, res) => {
  try {
    const rows = (await sequelize.query(
      'SELECT id, name, type, address, contact_name AS contactName, contact_phone AS contactPhone, status FROM units WHERE status = 1 ORDER BY created_at DESC',
      { type: QueryTypes.SELECT }
    )) as Record<string, unknown>[];
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, 'units list');
  }
});

/* ═══════ 建筑 ═══════ */
router.get('/buildings', async (req, res) => {
  try {
    const { unit_id, pageSize = '100' } = req.query;
    let sql = 'SELECT * FROM fire_building';
    const params: unknown[] = [];
    if (unit_id) {
      sql += ' WHERE unit_id = ?';
      params.push(unit_id);
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(String(pageSize), 10));
    const rows = (await sequelize.query(sql, { replacements: params, type: QueryTypes.SELECT })) as Record<
      string,
      unknown
    >[];
    res.json(success({ list: rows }));
  } catch (err) {
    handleError(res, err, 'buildings list');
  }
});

router.post('/buildings', async (req, res) => {
  try {
    const { name, unit_id, type, total_floors, address } = req.body;
    if (!name) return res.status(400).json(fail('建筑名称不能为空', 400));
    const [meta] = await sequelize.query(
      'INSERT INTO fire_building (name, unit_id, type, total_floors, address) VALUES (?, ?, ?, ?, ?)',
      { replacements: [name, unit_id || 'PENDING', type || '商业', total_floors || 1, address || ''] }
    );
    const m = meta as { insertId?: number };
    res.json(success({ id: m?.insertId }, '创建成功'));
  } catch (err) {
    handleError(res, err, 'create building');
  }
});

router.put('/buildings/:id', async (req, res) => {
  try {
    const { name, type, total_floors, address } = req.body;
    const [meta] = await sequelize.query(
      'UPDATE fire_building SET name = ?, type = ?, total_floors = ?, address = ? WHERE id = ?',
      { replacements: [name, type, total_floors, address, req.params.id] }
    );
    const m = meta as { affectedRows?: number };
    if (!m?.affectedRows) return res.status(404).json(fail('建筑不存在', 404));
    res.json(success(null, '更新成功'));
  } catch (err) {
    handleError(res, err, 'update building');
  }
});

router.delete('/buildings/:id', async (req, res) => {
  try {
    const [meta] = await sequelize.query('DELETE FROM fire_building WHERE id = ?', { replacements: [req.params.id] });
    const m = meta as { affectedRows?: number };
    if (!m?.affectedRows) return res.status(404).json(fail('建筑不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, 'delete building');
  }
});

router.get('/buildings/:id/floors', async (req, res) => {
  try {
    const rows = (await sequelize.query(
      'SELECT * FROM fire_floor WHERE building_id = ? ORDER BY floor_number',
      { replacements: [req.params.id], type: QueryTypes.SELECT }
    )) as Record<string, unknown>[];
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, 'buildings/:id/floors');
  }
});

router.get('/floors', async (req, res) => {
  try {
    const { building_id } = req.query;
    if (!building_id) return res.status(400).json(fail('building_id 不能为空', 400));
    const rows = (await sequelize.query(
      'SELECT * FROM fire_floor WHERE building_id = ? ORDER BY floor_number',
      { replacements: [building_id], type: QueryTypes.SELECT }
    )) as Record<string, unknown>[];
    res.json(success(rows));
  } catch (err) {
    handleError(res, err, 'floors list');
  }
});

router.post('/buildings/:id/floors', async (req, res) => {
  try {
    const buildingId = req.params.id;
    const { name, floor_number, batch } = req.body;

    if (batch && Array.isArray(batch)) {
      let lastId = 0;
      await sequelize.transaction(async (t) => {
        for (const b of batch as { name: string; floor_number: number }[]) {
          const [meta] = await sequelize.query(
            'INSERT INTO fire_floor (building_id, name, floor_number) VALUES (?, ?, ?)',
            { replacements: [buildingId, b.name, b.floor_number], transaction: t }
          );
          const m = meta as { insertId?: number };
          if (m?.insertId) lastId = m.insertId;
        }
      });
      res.json(success({ insertId: lastId, affectedRows: batch.length }, '批量创建成功'));
    } else {
      if (!name) return res.status(400).json(fail('楼层名称不能为空', 400));
      const [meta] = await sequelize.query(
        'INSERT INTO fire_floor (building_id, name, floor_number) VALUES (?, ?, ?)',
        { replacements: [buildingId, name, floor_number || 0] }
      );
      const m = meta as { insertId?: number };
      res.json(success({ id: m?.insertId }, '创建成功'));
    }
  } catch (err) {
    handleError(res, err, 'create floor');
  }
});

router.get('/floors/:id', async (req, res) => {
  try {
    const rows = (await sequelize.query('SELECT * FROM fire_floor WHERE id = ?', {
      replacements: [req.params.id],
      type: QueryTypes.SELECT,
    })) as Record<string, unknown>[];
    if (!rows.length) return res.status(404).json(fail('楼层不存在', 404));
    res.json(success(rows[0]));
  } catch (err) {
    handleError(res, err, 'floor get');
  }
});

router.post('/floors/:id/plan', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json(fail('请上传图片文件', 400));
    const imageUrl = fileUrl(req.file.filename);
    await sequelize.query(
      'UPDATE fire_floor SET plan_image_url = ?, plan_type = "image", plan_cad_url = NULL, plan_cad_data = NULL WHERE id = ?',
      { replacements: [imageUrl, req.params.id] }
    );
    res.json(success({ url: imageUrl }, '上传成功'));
  } catch (err) {
    handleError(res, err, 'upload plan');
  }
});

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
    const scriptPath = path.join(process.cwd(), '..', 'app', 'backend', 'scripts', 'parse_cad.py');
    try {
      const pythonProcess = spawnSync('python3', [scriptPath, req.file.path, jsonPath], {
        encoding: 'utf-8',
        timeout: 30000,
      });
      if (pythonProcess.error) throw pythonProcess.error;
      const lines = (pythonProcess.stdout || '').trim().split('\n');
      const parseResult = JSON.parse(lines[lines.length - 1] || '{}');
      if (parseResult.error) throw new Error(parseResult.error);

      const cadData = fs.readFileSync(jsonPath, 'utf-8');
      await sequelize.query(
        'UPDATE fire_floor SET plan_type = "cad", plan_cad_url = ?, plan_cad_data = ?, plan_image_url = NULL WHERE id = ?',
        { replacements: [cadUrl, cadData, floorId] }
      );
      res.json(success({ url: cadUrl, bounds: parseResult.bounds }, 'CAD上传并解析成功'));
    } catch (parseErr) {
      logger.warn('[floorPlanApp] CAD parse error:', parseErr);
      await sequelize.query('UPDATE fire_floor SET plan_image_url = ? WHERE id = ?', {
        replacements: [cadUrl, floorId],
      });
      res.json(success({ url: cadUrl }, '文件已上传但CAD解析失败，已作为普通文件保存'));
    }
  } catch (err) {
    handleError(res, err, 'upload cad');
  }
});

router.get('/floors/:id/devices', async (req, res) => {
  try {
    const floorId = req.params.id;
    const rows = (await sequelize.query(
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
      { replacements: [floorId], type: QueryTypes.SELECT }
    )) as Record<string, unknown>[];

    const list = rows.map((r) => ({
      position_id: r.position_id,
      device_id: r.device_id,
      x: r.x,
      y: r.y,
      device_name: r.device_name || r.device_id,
      device_code: r.device_code || r.device_id,
      device_type: r.device_type || '未知',
      status: mapDeviceStatus(r as { status?: string; online_status?: string }),
      bind_camera_id: r.bind_camera_id,
      bind_camera_channel: r.bind_camera_channel,
    }));
    res.json(success(list));
  } catch (err) {
    handleError(res, err, 'floor devices');
  }
});

router.get('/floors/:id/devices/unmarked', async (req, res) => {
  try {
    const floorId = req.params.id;
    const bRows = (await sequelize.query(
      `SELECT bu.unit_id FROM fire_floor f
       JOIN fire_building bu ON f.building_id = bu.id
       WHERE f.id = ?`,
      { replacements: [floorId], type: QueryTypes.SELECT }
    )) as { unit_id: string }[];
    const unitId = bRows.length ? bRows[0].unit_id : 'PENDING';

    const marked = (await sequelize.query('SELECT device_id FROM fire_floor_device_position WHERE floor_id = ?', {
      replacements: [floorId],
      type: QueryTypes.SELECT,
    })) as { device_id: string }[];
    const markedIds = marked.map((m) => m.device_id);

    let sql = `SELECT 
      id,
      device_name,
      device_id AS device_code,
      protocol AS device_type,
      status,
      online_status
    FROM fire_iot_device
    WHERE unit_id = ?`;
    const params: unknown[] = [unitId];

    if (markedIds.length > 0) {
      sql += ` AND device_id NOT IN (${markedIds.map(() => '?').join(',')})`;
      params.push(...markedIds);
    }
    sql += ' ORDER BY device_name LIMIT 200';

    const rows = (await sequelize.query(sql, { replacements: params, type: QueryTypes.SELECT })) as Record<
      string,
      unknown
    >[];
    const list = rows.map((r) => ({
      id: r.id,
      device_id: r.device_code,
      device_name: r.device_name || r.device_code,
      device_code: r.device_code,
      device_type: r.device_type || '未知',
      status: mapDeviceStatus(r as { status?: string; online_status?: string }),
    }));
    res.json(success(list));
  } catch (err) {
    handleError(res, err, 'unmarked devices');
  }
});

router.post('/floors/:id/devices', async (req, res) => {
  try {
    const floorId = req.params.id;
    const { device_id, x, y } = req.body;
    if (!device_id || x === undefined || y === undefined) {
      return res.status(400).json(fail('device_id, x, y 不能为空', 400));
    }
    const [meta] = await sequelize.query(
      'INSERT INTO fire_floor_device_position (floor_id, device_id, x, y) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE x = ?, y = ?',
      { replacements: [floorId, device_id, x, y, x, y] }
    );
    const m = meta as { insertId?: number };
    res.json(success({ id: m?.insertId }, '保存成功'));
  } catch (err) {
    handleError(res, err, 'add device position');
  }
});

router.post('/floors/:id/devices/batch', async (req, res) => {
  try {
    const floorId = req.params.id;
    const { positions } = req.body;
    if (!Array.isArray(positions) || positions.length === 0) {
      return res.status(400).json(fail('positions 不能为空数组', 400));
    }
    await sequelize.transaction(async (t) => {
      for (const p of positions as { device_id: string; x: number; y: number }[]) {
        await sequelize.query(
          'INSERT INTO fire_floor_device_position (floor_id, device_id, x, y) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE x = ?, y = ?',
          { replacements: [floorId, p.device_id, p.x, p.y, p.x, p.y], transaction: t }
        );
      }
    });
    res.json(success(null, '批量保存成功'));
  } catch (err) {
    handleError(res, err, 'batch save');
  }
});

router.post('/floors/:id/devices/import', importUpload.single('file'), async (req, res) => {
  try {
    const floorId = req.params.id;
    if (!req.file) return res.status(400).json(fail('请上传Excel文件', 400));

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

    if (!rows.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json(fail('Excel为空', 400));
    }

    let headerIdx = 0;
    const headerVariants = {
      code: ['设备编码', 'device_code', '编号', '编码', '设备编号', 'device code'],
      x: ['X坐标', 'x', 'X', 'x坐标', '横坐标'],
      y: ['Y坐标', 'y', 'Y', 'y坐标', '纵坐标'],
    };
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = (rows[i] || []).map((c) => String(c).trim().toLowerCase());
      if (headerVariants.code.some((h) => row.includes(h.toLowerCase()))) {
        headerIdx = i;
        break;
      }
    }

    const headers = (rows[headerIdx] || []).map((c) => String(c).trim().toLowerCase());
    const colIdx = {
      code: headers.findIndex((h) => headerVariants.code.some((v) => h.includes(v.toLowerCase()))),
      x: headers.findIndex((h) => headerVariants.x.some((v) => h.includes(v.toLowerCase()))),
      y: headers.findIndex((h) => headerVariants.y.some((v) => h.includes(v.toLowerCase()))),
    };
    if (colIdx.code < 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json(fail('未找到设备编码列（支持：设备编码/device_code/编号）', 400));
    }
    if (colIdx.x < 0 || colIdx.y < 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json(fail('未找到X/Y坐标列', 400));
    }

    const imports: { code: string; x: number; y: number }[] = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const code = String(row[colIdx.code] || '').trim();
      const x = parseFloat(String(row[colIdx.x]));
      const y = parseFloat(String(row[colIdx.y]));
      if (code && !isNaN(x) && !isNaN(y)) imports.push({ code, x, y });
    }
    if (imports.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json(fail('未解析到有效数据', 400));
    }

    const matched: { device_id: string; x: number; y: number }[] = [];
    const unmatched: string[] = [];
    for (const item of imports) {
      let deviceId: string | null = null;
      const daRows = (await sequelize.query('SELECT id FROM device_archive WHERE code = ? LIMIT 1', {
        replacements: [item.code],
        type: QueryTypes.SELECT,
      })) as { id: string }[];
      if (daRows.length) {
        deviceId = daRows[0].id;
      } else {
        const fiRows = (await sequelize.query('SELECT device_id FROM fire_iot_device WHERE device_id = ? LIMIT 1', {
          replacements: [item.code],
          type: QueryTypes.SELECT,
        })) as { device_id: string }[];
        if (fiRows.length) deviceId = fiRows[0].device_id;
      }
      if (deviceId) matched.push({ device_id: deviceId, x: item.x, y: item.y });
      else unmatched.push(item.code);
    }

    if (matched.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json(fail(`未匹配到任何设备编码，未匹配：${unmatched.join(', ')}`, 400));
    }

    await sequelize.transaction(async (t) => {
      for (const p of matched) {
        await sequelize.query(
          'INSERT INTO fire_floor_device_position (floor_id, device_id, x, y) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE x = ?, y = ?',
          { replacements: [floorId, p.device_id, p.x, p.y, p.x, p.y], transaction: t }
        );
      }
    });

    fs.unlinkSync(req.file.path);
    res.json(
      success(
        {
          total: imports.length,
          success: matched.length,
          failed: unmatched.length,
          unmatched: unmatched.slice(0, 50),
        },
        `成功导入 ${matched.length}/${imports.length} 个点位`
      )
    );
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    handleError(res, err, 'import excel');
  }
});

router.delete('/floors/:floorId/devices/:id', async (req, res) => {
  try {
    const floorId = req.params.floorId;
    const id = req.params.id;
    let [meta] = await sequelize.query(
      'DELETE FROM fire_floor_device_position WHERE id = ? AND floor_id = ?',
      { replacements: [id, floorId] }
    );
    let m = meta as { affectedRows?: number };
    if (!m?.affectedRows) {
      [meta] = await sequelize.query(
        'DELETE FROM fire_floor_device_position WHERE device_id = ? AND floor_id = ?',
        { replacements: [id, floorId] }
      );
      m = meta as { affectedRows?: number };
    }
    if (!m?.affectedRows) return res.status(404).json(fail('点位不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, 'delete position');
  }
});

router.get('/devices/:id/position', async (req, res) => {
  try {
    const deviceId = req.params.id;
    const rows = (await sequelize.query(
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
      { replacements: [deviceId], type: QueryTypes.SELECT }
    )) as Record<string, unknown>[];
    if (!rows.length) return res.status(404).json(fail('设备未在平面图上标点', 404));
    res.json(success(rows[0]));
  } catch (err) {
    handleError(res, err, 'device position');
  }
});

router.get('/floors/:id/cameras', async (req, res) => {
  try {
    const rows = (await sequelize.query(
      `SELECT 
        b.*,
        c.name AS camera_name,
        c.stream_url
      FROM fire_floor_camera_binding b
      LEFT JOIN cameras c ON b.camera_device_id = c.id
      WHERE b.floor_id = ?`,
      { replacements: [req.params.id], type: QueryTypes.SELECT }
    )) as Record<string, unknown>[];
    const list = rows.map((r) => ({
      ...r,
      bound_device_ids: r.bound_device_ids ? JSON.parse(String(r.bound_device_ids)) : [],
    }));
    res.json(success(list));
  } catch (err) {
    handleError(res, err, 'floor cameras');
  }
});

router.post('/floors/:id/cameras', async (req, res) => {
  try {
    const floorId = req.params.id;
    const { camera_device_id, bound_device_ids, x, y, preset_no } = req.body;
    if (!camera_device_id) return res.status(400).json(fail('camera_device_id 不能为空', 400));
    const bound = Array.isArray(bound_device_ids) ? JSON.stringify(bound_device_ids) : bound_device_ids;
    const [meta] = await sequelize.query(
      `INSERT INTO fire_floor_camera_binding (floor_id, camera_device_id, bound_device_ids, x, y, preset_no)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE bound_device_ids = ?, x = ?, y = ?, preset_no = ?`,
      {
        replacements: [
          floorId,
          camera_device_id,
          bound,
          x || 0,
          y || 0,
          preset_no || 0,
          bound,
          x || 0,
          y || 0,
          preset_no || 0,
        ],
      }
    );
    const m = meta as { insertId?: number };
    res.json(success({ id: m?.insertId }, '保存成功'));
  } catch (err) {
    handleError(res, err, 'save camera binding');
  }
});

router.delete('/floors/:floorId/cameras/:bindId', async (req, res) => {
  try {
    const [meta] = await sequelize.query('DELETE FROM fire_floor_camera_binding WHERE id = ? AND floor_id = ?', {
      replacements: [req.params.bindId, req.params.floorId],
    });
    const m = meta as { affectedRows?: number };
    if (!m?.affectedRows) return res.status(404).json(fail('关联不存在', 404));
    res.json(success(null, '删除成功'));
  } catch (err) {
    handleError(res, err, 'delete camera binding');
  }
});

export default router;
