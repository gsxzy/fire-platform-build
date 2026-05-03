/**
 * 设备数据迁移脚本
 * 将现有 fire_iot_device / devices 表数据迁移到新的 device_archive 总台账
 * 执行方式: cd /opt/my-fire-api && node migrate_devices.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fire_platform',
};

if (process.env.DB_SOCKET_PATH) {
  dbConfig.socketPath = process.env.DB_SOCKET_PATH;
} else {
  dbConfig.host = process.env.DB_HOST || 'localhost';
  dbConfig.port = parseInt(process.env.DB_PORT || '3306', 10);
}

const CATEGORY_MAP = {
  '火灾报警控制器': 'fire-controller',
  '烟感探测器': 'detector',
  '温感探测器': 'detector',
  '手动报警按钮': 'button',
  '声光报警器': 'alarm',
  '消防水泵': 'pump',
  '喷淋泵': 'pump',
  '排烟风机': 'fan',
  '正压送风机': 'fan',
  '应急照明': 'lighting',
  '防火卷帘': 'controller',
  '消防电梯': 'elevator',
  '消防广播': 'broadcast',
  '电气火灾监控器': 'elec-monitor',
  '水位传感器': 'level-sensor',
  '压力传感器': 'pressure-sensor',
};

function generateId() {
  return 'DEV_' + Date.now().toString(36).toUpperCase() + '_' + Math.floor(Math.random() * 1000);
}

function mapCategory(type) {
  if (!type) return 'sensor';
  const mapped = CATEGORY_MAP[type];
  if (mapped) return mapped;
  const lower = String(type).toLowerCase();
  if (lower.includes('detector') || lower.includes('感')) return 'detector';
  if (lower.includes('pump') || lower.includes('泵')) return 'pump';
  if (lower.includes('fan') || lower.includes('风机')) return 'fan';
  if (lower.includes('camera') || lower.includes('摄像')) return 'camera';
  if (lower.includes('host') || lower.includes('主机')) return 'host';
  if (lower.includes('button') || lower.includes('手报')) return 'button';
  return 'sensor';
}

function mapProtocol(protocol) {
  if (!protocol) return null;
  const p = String(protocol).toLowerCase();
  if (p.includes('gb26875')) return 'gb26875';
  if (p.includes('modbus') && p.includes('tcp')) return 'modbustcp';
  if (p.includes('modbus')) return 'modbus';
  if (p.includes('mqtt')) return 'mqtt';
  if (p.includes('gb28181')) return 'gb28181';
  if (p.includes('tcp')) return 'tcp';
  return null;
}

async function migrate() {
  console.log('[Migrate] Connecting to DB:', dbConfig.database);
  const pool = mysql.createPool({ ...dbConfig, waitForConnections: true, connectionLimit: 5 });

  try {
    // 1. 从 fire_iot_device 迁移
    console.log('[Migrate] Querying fire_iot_device...');
    const [iotDevices] = await pool.query(
      'SELECT device_id, device_name, protocol, unit_id, status, location, manufacturer, model, ip, port, created_at FROM fire_iot_device'
    );
    console.log(`[Migrate] Found ${iotDevices.length} devices in fire_iot_device`);

    let migrated = 0;
    let skipped = 0;

    for (const d of iotDevices) {
      try {
        const [[existing]] = await pool.query(
          'SELECT id FROM device_archive WHERE protocol_device_id = ?', [d.device_id]
        );
        if (existing) {
          skipped++;
          continue;
        }

        const id = generateId();
        const code = d.device_id;
        const name = d.device_name || d.device_id;
        const category = mapCategory(d.model || d.manufacturer);
        const protocolType = mapProtocol(d.protocol);
        const status = d.status === 'online' ? 'normal' : d.status === 'fault' ? 'fault' : 'offline';

        await pool.query(
          `INSERT INTO device_archive (id, code, name, category, protocol_type, protocol_device_id, unit_id, status, area, ip, port, manufacturer, model, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, code, name, category, protocolType, d.device_id, d.unit_id || null, status, d.location || null, d.ip || null, d.port || null, d.manufacturer || null, d.model || null, d.created_at || new Date()]
        );

        await pool.query(
          `INSERT INTO device_config (device_id, protocol_type, communication_params, alarm_thresholds)
           VALUES (?, ?, ?, ?)`,
          [id, protocolType, JSON.stringify({}), JSON.stringify({})]
        );

        migrated++;
      } catch (itemErr) {
        console.error(`[Migrate] Error processing device ${d.device_id}:`, itemErr.message);
      }
    }

    console.log(`[Migrate] fire_iot_device: ${migrated} migrated, ${skipped} skipped`);

    // 2. 从 devices 旧表迁移
    try {
      console.log('[Migrate] Querying devices(legacy)...');
      const [oldDevices] = await pool.query('SELECT id, name, type, unitId, status, ip, location, createdAt FROM devices');
      console.log(`[Migrate] Found ${oldDevices.length} devices in devices (legacy)`);

      let oldMigrated = 0;
      let oldSkipped = 0;

      for (const d of oldDevices) {
        try {
          const [[existing]] = await pool.query('SELECT id FROM device_archive WHERE code = ?', [d.id]);
          if (existing) {
            oldSkipped++;
            continue;
          }

          const id = generateId();
          const category = mapCategory(d.type);

          await pool.query(
            `INSERT INTO device_archive (id, code, name, category, unit_id, status, ip, area, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, d.id, d.name || d.id, category, d.unitId || null, d.status || 'normal', d.ip || null, d.location || null, d.createdAt || new Date()]
          );

          await pool.query(
            `INSERT INTO device_config (device_id, communication_params, alarm_thresholds)
             VALUES (?, ?, ?)`,
            [id, JSON.stringify({}), JSON.stringify({})]
          );

          oldMigrated++;
        } catch (itemErr) {
          console.error(`[Migrate] Error processing legacy device ${d.id}:`, itemErr.message);
        }
      }

      console.log(`[Migrate] devices(legacy): ${oldMigrated} migrated, ${oldSkipped} skipped`);
    } catch (e) {
      console.log('[Migrate] devices(legacy) table may not exist, skipping:', e.message);
    }

    console.log('[Migrate] Done!');
  } catch (err) {
    console.error('[Migrate] Fatal Error:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
}

migrate();
