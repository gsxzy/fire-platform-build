/**
 * IoT 设备管理服务
 * 统一处理 fire_iot_device 表的查询、创建、心跳、离线检测
 */
const mysql = require('mysql2/promise');

let pool = null;

/* ── 初始化 ── */
function initDeviceService(dbPool) {
  pool = dbPool;
}

function log(tag, msg) {
  console.log(`[IoTDeviceSvc][${new Date().toISOString()}][${tag}] ${msg}`);
}

/* ── 生成设备名称（默认） ── */
function defaultDeviceName(deviceId, protocol) {
  const protoMap = { gb26875: 'GB26875传输装置', fscn8001: '赋安主机', mqtt: 'NB-IoT设备' };
  return `${protoMap[protocol] || '未知设备'}_${deviceId.slice(-6)}`;
}

/* ── 按设备ID前缀匹配单位 ── */
async function matchUnitByPrefix(deviceId) {
  if (!pool) return { unitId: 'PENDING', unitName: '待分配单位' };
  try {
    // 尝试匹配前4/6/8位前缀
    const prefixes = [deviceId.slice(0, 8), deviceId.slice(0, 6), deviceId.slice(0, 4)];
    for (const prefix of prefixes) {
      const [rows] = await pool.execute(
        `SELECT id AS unitId, name AS unitName FROM units WHERE id LIKE ? LIMIT 1`,
        [`${prefix}%`]
      );
      if (rows.length > 0) {
        log('MATCH', `设备ID前缀[${prefix}]匹配到单位: ${rows[0].unitName}`);
        return { unitId: rows[0].unitId, unitName: rows[0].unitName };
      }
    }
    // 再尝试按 device_prefix 映射表匹配
    const [rows2] = await pool.execute(
      `SELECT unit_id AS unitId, unit_name AS unitName FROM device_unit_prefix WHERE ? LIKE CONCAT(prefix, '%') LIMIT 1`,
      [deviceId]
    );
    if (rows2.length > 0) {
      log('MATCH', `设备ID[${deviceId}]通过映射表匹配到单位: ${rows2[0].unitName}`);
      return { unitId: rows2[0].unitId, unitName: rows2[0].unitName };
    }
  } catch (err) {
    log('WARN', `单位匹配查询失败: ${err.message}`);
  }
  return { unitId: 'PENDING', unitName: '待分配单位' };
}

/* ── 查询或创建设备 ── */
async function findOrCreateDevice(deviceInfo) {
  if (!pool) {
    log('SKIP', '数据库未连接，跳过设备注册');
    return null;
  }
  const {
    deviceId,
    deviceName,
    protocol,
    ip,
    port,
    buildingId,
    location,
    manufacturer,
    model,
    firmware,
    heartbeatInterval = 60
  } = deviceInfo;

  if (!deviceId || !protocol) {
    log('WARN', 'deviceId 或 protocol 为空，跳过注册');
    return null;
  }

  try {
    // 1. 先查询
    const [rows] = await pool.execute(
      `SELECT id, device_id, device_name, unit_id, unit_name, online_status, register_count, last_online
       FROM fire_iot_device WHERE device_id = ? AND protocol = ? LIMIT 1`,
      [deviceId, protocol]
    );

    if (rows.length > 0) {
      const dev = rows[0];
      log('FOUND', `设备已存在: ${deviceId} [${protocol}] 当前在线状态=${dev.online_status}`);
      // 更新登录信息
      await pool.execute(
        `UPDATE fire_iot_device
         SET login_time = NOW(), last_online = NOW(), online_status = 'online',
             ip = ?, port = ?, register_count = register_count + 1,
             ${buildingId ? 'building_id = ?, ' : ''}
             updated_at = NOW()
         WHERE id = ?`,
        buildingId
          ? [ip || null, port || null, buildingId, dev.id]
          : [ip || null, port || null, dev.id]
      );
      log('UPDATE', `设备[${deviceId}]更新为在线状态，注册次数+1`);
      return { ...dev, ip, port, online_status: 'online' };
    }

    // 2. 未找到，自动创建
    const { unitId, unitName } = await matchUnitByPrefix(deviceId);
    const name = deviceName || defaultDeviceName(deviceId, protocol);

    const [result] = await pool.execute(
      `INSERT INTO fire_iot_device
       (device_id, device_name, protocol, ip, port, unit_id, unit_name, building_id, location,
        manufacturer, model, firmware, online_status, last_online, login_time, register_count, heartbeat_interval)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'online', NOW(), NOW(), 1, ?)`,
      [deviceId, name, protocol, ip || null, port || null, unitId, unitName,
       buildingId || null, location || null, manufacturer || null, model || null, firmware || null, heartbeatInterval]
    );

    log('CREATE', `新设备自动创建: id=${result.insertId}, deviceId=${deviceId}, name=${name}, protocol=${protocol}, unit=${unitName}`);
    return {
      id: result.insertId,
      deviceId,
      deviceName: name,
      protocol,
      unitId,
      unitName,
      online_status: 'online'
    };
  } catch (err) {
    log('ERROR', `设备注册失败: ${err.message}`);
    return null;
  }
}

/* ── 更新心跳 ── */
async function updateHeartbeat(deviceId, protocol, ip) {
  if (!pool || !deviceId || !protocol) return;
  try {
    const [result] = await pool.execute(
      `UPDATE fire_iot_device
       SET last_online = NOW(), online_status = 'online', offline_time = NULL,
           ip = COALESCE(?, ip), updated_at = NOW()
       WHERE device_id = ? AND protocol = ?`,
      [ip || null, deviceId, protocol]
    );
    if (result.affectedRows > 0) {
      log('HEARTBEAT', `设备[${deviceId}][${protocol}]心跳更新，状态=online`);
    } else {
      log('WARN', `心跳更新未找到设备: ${deviceId}[${protocol}]，可能尚未注册`);
    }
  } catch (err) {
    log('ERROR', `心跳更新失败: ${err.message}`);
  }
}

/* ── 标记设备离线 ── */
async function markOffline(deviceId, protocol) {
  if (!pool || !deviceId || !protocol) return;
  try {
    const [result] = await pool.execute(
      `UPDATE fire_iot_device
       SET online_status = 'offline', offline_time = NOW(), status = 'offline', updated_at = NOW()
       WHERE device_id = ? AND protocol = ?`,
      [deviceId, protocol]
    );
    if (result.affectedRows > 0) {
      log('OFFLINE', `设备[${deviceId}][${protocol}]标记为离线`);
    }
  } catch (err) {
    log('ERROR', `标记离线失败: ${err.message}`);
  }
}

/* ── 检查超时设备（心跳超过3分钟） ── */
async function checkOfflineDevices(offlineThresholdMinutes = 3) {
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(
      `SELECT id, device_id, protocol, device_name, unit_name, last_online
       FROM fire_iot_device
       WHERE online_status = 'online'
         AND last_online < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [offlineThresholdMinutes]
    );
    for (const dev of rows) {
      await pool.execute(
        `UPDATE fire_iot_device
         SET online_status = 'offline', offline_time = NOW(), status = 'offline', updated_at = NOW()
         WHERE id = ?`,
        [dev.id]
      );
      log('TIMEOUT', `设备[${dev.device_id}][${dev.protocol}]心跳超时(${offlineThresholdMinutes}分钟)，自动标记离线`);
    }
    return rows;
  } catch (err) {
    log('ERROR', `超时检测失败: ${err.message}`);
    return [];
  }
}

/* ── 获取设备详情 ── */
async function getDevice(deviceId, protocol) {
  if (!pool || !deviceId || !protocol) return null;
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM fire_iot_device WHERE device_id = ? AND protocol = ? LIMIT 1`,
      [deviceId, protocol]
    );
    return rows[0] || null;
  } catch (err) {
    log('ERROR', `查询设备失败: ${err.message}`);
    return null;
  }
}

/* ── 增加告警计数 ── */
async function incrementAlarmCount(deviceId, protocol) {
  if (!pool || !deviceId || !protocol) return;
  try {
    await pool.execute(
      `UPDATE fire_iot_device SET alarm_count = alarm_count + 1, updated_at = NOW()
       WHERE device_id = ? AND protocol = ?`,
      [deviceId, protocol]
    );
  } catch (err) {
    log('ERROR', `告警计数更新失败: ${err.message}`);
  }
}

module.exports = {
  initDeviceService,
  findOrCreateDevice,
  updateHeartbeat,
  markOffline,
  checkOfflineDevices,
  getDevice,
  incrementAlarmCount,
  matchUnitByPrefix,
};
