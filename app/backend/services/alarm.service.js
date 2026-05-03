/**
 * 统一告警服务 (AlarmService)
 * 供 GB26875 / FSCN8001 协议服务器共用，写入 fire_alarm 表
 */
const mysql = require('mysql2/promise');

let pool = null;

/* ── 初始化 ── */
function initAlarmService(dbPool) {
  pool = dbPool;
}

function log(tag, msg) {
  console.log(`[AlarmSvc][${new Date().toISOString()}][${tag}] ${msg}`);
}

/* ── 告警类型映射 ── */
const ALARM_TYPE_MAP = {
  // GB26875 标准告警类型
  '火警': { code: 'fire', level: 4, name: '火警' },
  '故障': { code: 'fault', level: 3, name: '故障' },
  '反馈': { code: 'feedback', level: 2, name: '反馈' },
  '监管': { code: 'supervisory', level: 2, name: '监管' },
  '屏蔽': { code: 'disable', level: 1, name: '屏蔽' },
  '启动': { code: 'start', level: 2, name: '启动' },
  '延时状态': { code: 'delay', level: 1, name: '延时状态' },
  '自检': { code: 'selftest', level: 1, name: '自检' },
  '复位': { code: 'reset', level: 1, name: '复位' },
  // FSCN8001 类型
  'fire': { code: 'fire', level: 4, name: '火警' },
  'fault': { code: 'fault', level: 3, name: '故障' },
  'supervisory': { code: 'supervisory', level: 2, name: '监管' },
  // 通用
  'offline': { code: 'offline', level: 2, name: '设备离线' },
};

function resolveAlarmType(typeInput) {
  const t = String(typeInput).toLowerCase().trim();
  // 直接匹配
  if (ALARM_TYPE_MAP[t]) return ALARM_TYPE_MAP[t];
  // 中文匹配
  for (const [key, val] of Object.entries(ALARM_TYPE_MAP)) {
    if (t.includes(val.code) || val.name.includes(t) || key.includes(t)) {
      return val;
    }
  }
  // 默认
  return { code: 'unknown', level: 1, name: typeInput || '未知告警' };
}

/* ── 生成告警编号 ── */
function genAlarmNo() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `ALM-${ts}-${rand}`;
}

/* ── 创建告警 ── */
async function createAlarm(alarmInfo) {
  if (!pool) {
    log('SKIP', '数据库未连接，跳过告警入库');
    return null;
  }

  const {
    deviceId,
    deviceName,
    protocol,
    unitId,
    unitName,
    alarmType,      // 原始告警类型字符串
    alarmLevel,     // 可覆盖的等级
    location,
    description,
    rawData,
    loopNo,
    address,
    hostCode,
  } = alarmInfo;

  if (!deviceId || !protocol) {
    log('WARN', 'deviceId 或 protocol 为空，跳过告警入库');
    return null;
  }

  const typeMeta = resolveAlarmType(alarmType);
  const level = alarmLevel !== undefined ? Number(alarmLevel) : typeMeta.level;
  const alarmNo = genAlarmNo();
  const desc = description || `${typeMeta.name} - ${location || '未知位置'}`;

  try {
    const [result] = await pool.execute(
      `INSERT INTO fire_alarm
       (alarm_no, device_id, device_name, protocol, unit_id, unit_name,
        alarm_type, alarm_level, alarm_status, location, description, raw_data,
        loop_no, address, host_code, trigger_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, NOW())`,
      [alarmNo, deviceId, deviceName || null, protocol, unitId || 'PENDING', unitName || '待分配单位',
       typeMeta.code, level, location || null, desc, rawData || null,
       loopNo !== undefined ? loopNo : null,
       address !== undefined ? address : null,
       hostCode || null]
    );

    log('CREATE', `告警入库成功: alarmNo=${alarmNo}, device=${deviceId}, type=${typeMeta.code}, level=${level}, id=${result.insertId}`);
    return { alarmId: result.insertId, alarmNo, alarmType: typeMeta.code, level };
  } catch (err) {
    log('ERROR', `告警入库失败: ${err.message}`);
    return null;
  }
}

/* ── 确认告警 ── */
async function confirmAlarm(alarmId, handlerId, handlerName, remark) {
  if (!pool) return;
  try {
    await pool.execute(
      `UPDATE fire_alarm
       SET alarm_status = 3, confirm_time = NOW(), handler_id = ?, handler_name = ?, handle_remark = ?, updated_at = NOW()
       WHERE id = ?`,
      [handlerId || null, handlerName || null, remark || null, alarmId]
    );
    log('CONFIRM', `告警[${alarmId}]已确认`);
  } catch (err) {
    log('ERROR', `告警确认失败: ${err.message}`);
  }
}

/* ── 恢复告警 ── */
async function recoverAlarm(alarmId) {
  if (!pool) return;
  try {
    await pool.execute(
      `UPDATE fire_alarm
       SET alarm_status = 4, recover_time = NOW(), updated_at = NOW()
       WHERE id = ? AND alarm_status IN (1, 2, 3)`,
      [alarmId]
    );
    log('RECOVER', `告警[${alarmId}]已恢复`);
  } catch (err) {
    log('ERROR', `告警恢复失败: ${err.message}`);
  }
}

/* ── 查询设备未恢复告警 ── */
async function getUnresolvedAlarms(deviceId, protocol) {
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(
      `SELECT id, alarm_no, alarm_type, alarm_level, trigger_time, location
       FROM fire_alarm
       WHERE device_id = ? AND protocol = ? AND alarm_status IN (1, 2, 3)
       ORDER BY trigger_time DESC`,
      [deviceId, protocol]
    );
    return rows;
  } catch (err) {
    log('ERROR', `查询未恢复告警失败: ${err.message}`);
    return [];
  }
}

module.exports = {
  initAlarmService,
  createAlarm,
  confirmAlarm,
  recoverAlarm,
  getUnresolvedAlarms,
  resolveAlarmType,
  genAlarmNo,
};
