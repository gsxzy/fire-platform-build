/**
 * ═══════════════════════════════════════════════════════════════════
 * TDengine 时序数据库服务层
 * 负责传感器遥测数据、原始报文日志的写入与查询
 * ═══════════════════════════════════════════════════════════════════
 */
import axios from 'axios';
import logger from '@/config/logger';
import {
  TDENGINE_URL,
  TDENGINE_DB,
  TDENGINE_USER,
  TDENGINE_PASSWORD,
} from '@/config/tdengine';

const tdRest = axios.create({
  baseURL: `${TDENGINE_URL}/rest/sql/${TDENGINE_DB}`,
  auth: { username: TDENGINE_USER, password: TDENGINE_PASSWORD },
  timeout: 10000,
  headers: { 'Content-Type': 'text/plain' },
});

/** TDengine 参数化查询占位符替换 */
function escapeIdentifier(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeString(value: string | null | undefined): string {
  if (value == null) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function escapeNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'NULL';
  return String(value);
}

/** 执行 TDengine SQL */
async function execSql(sql: string): Promise<any> {
  try {
    const res = await tdRest.post('', sql);
    if (res.data.status === 'error') {
      throw new Error(res.data.desc || 'TDengine error');
    }
    return res.data;
  } catch (err: any) {
    logger.error(`[TDengine] SQL执行失败: ${err.message}, SQL: ${sql.slice(0, 200)}`);
    throw err;
  }
}

/** 初始化数据库与超级表 */
export async function initTDengine(): Promise<void> {
  try {
    // 创建数据库（如果不存在）
    await axios.post(
      `${TDENGINE_URL}/rest/sql`,
      `CREATE DATABASE IF NOT EXISTS ${TDENGINE_DB};`,
      { auth: { username: TDENGINE_USER, password: TDENGINE_PASSWORD }, timeout: 10000 }
    );

    // 超级表 1：传感器遥测数据
    await execSql(`
      CREATE STABLE IF NOT EXISTS stb_telemetry (
        ts TIMESTAMP,
        message_id INT,
        message_type NCHAR(32),
        dev_type INT,
        dev_type_name NCHAR(64),
        imei NCHAR(32),
        device_model NCHAR(64),
        rsrp INT,
        snr INT,
        shield INT,
        channel_count INT,
        pressure_kpa DOUBLE,
        level_m DOUBLE,
        temperature DOUBLE,
        battery_pct INT,
        has_alarm BOOL,
        has_fault BOOL,
        raw_hex NCHAR(4000)
      ) TAGS (
        iot_device_id BIGINT,
        device_sn NCHAR(100)
      )
    `);

    // 超级表 2：协议原始报文日志
    await execSql(`
      CREATE STABLE IF NOT EXISTS stb_raw_log (
        ts TIMESTAMP,
        direction NCHAR(8),
        cmd_type NCHAR(16),
        hex_data NCHAR(8000),
        raw_json NCHAR(4000)
      ) TAGS (
        protocol_type NCHAR(20),
        device_id NCHAR(100)
      )
    `);

    logger.info('[TDengine] 数据库与超级表初始化完成');
  } catch (err: any) {
    logger.error(`[TDengine] 初始化失败: ${err.message}`);
  }
}

/** 写入遥测数据 */
export async function insertTelemetry(
  iotDeviceId: number,
  deviceSn: string,
  data: {
    message_id?: number | null;
    message_type?: string | null;
    dev_type?: number | null;
    dev_type_name?: string | null;
    imei?: string | null;
    device_model?: string | null;
    rsrp?: number | null;
    snr?: number | null;
    shield?: number | null;
    channel_count?: number | null;
    pressure_kpa?: number | null;
    level_m?: number | null;
    temperature?: number | null;
    battery_pct?: number | null;
    has_alarm?: boolean;
    has_fault?: boolean;
    raw_hex?: string | null;
  }
): Promise<void> {
  const tbName = `ctb_telemetry_${escapeIdentifier(String(iotDeviceId))}`;
  const sql = `
    INSERT INTO ${tbName} USING stb_telemetry TAGS (${escapeNumber(iotDeviceId)}, ${escapeString(deviceSn)})
    VALUES (
      NOW(),
      ${escapeNumber(data.message_id)},
      ${escapeString(data.message_type)},
      ${escapeNumber(data.dev_type)},
      ${escapeString(data.dev_type_name)},
      ${escapeString(data.imei)},
      ${escapeString(data.device_model)},
      ${escapeNumber(data.rsrp)},
      ${escapeNumber(data.snr)},
      ${escapeNumber(data.shield)},
      ${escapeNumber(data.channel_count)},
      ${escapeNumber(data.pressure_kpa)},
      ${escapeNumber(data.level_m)},
      ${escapeNumber(data.temperature)},
      ${escapeNumber(data.battery_pct)},
      ${data.has_alarm ? 'true' : 'false'},
      ${data.has_fault ? 'true' : 'false'},
      ${escapeString(data.raw_hex ? data.raw_hex.slice(0, 4000) : null)}
    )
  `;
  await execSql(sql);
}

/** 写入原始报文日志 */
export async function insertRawLog(
  protocolType: string,
  deviceId: string,
  data: {
    direction?: string;
    cmd_type?: string;
    hex_data?: string;
    raw_json?: string;
  }
): Promise<void> {
  const safeDeviceId = escapeIdentifier(deviceId).slice(0, 80);
  const tbName = `ctb_raw_${escapeIdentifier(protocolType)}_${safeDeviceId}`;
  const sql = `
    INSERT INTO ${tbName} USING stb_raw_log TAGS (${escapeString(protocolType)}, ${escapeString(deviceId)})
    VALUES (
      NOW(),
      ${escapeString(data.direction)},
      ${escapeString(data.cmd_type)},
      ${escapeString(data.hex_data ? data.hex_data.slice(0, 8000) : null)},
      ${escapeString(data.raw_json ? data.raw_json.slice(0, 4000) : null)}
    )
  `;
  await execSql(sql);
}

/** 查询设备历史遥测（趋势数据） */
export async function queryTelemetryHistory(
  iotDeviceId: number,
  startTime: string,
  endTime: string
): Promise<any[]> {
  const tbName = `ctb_telemetry_${escapeIdentifier(String(iotDeviceId))}`;
  const sql = `
    SELECT ts, pressure_kpa, level_m, temperature, battery_pct, has_alarm, has_fault
    FROM ${tbName}
    WHERE ts >= ${escapeString(startTime)} AND ts <= ${escapeString(endTime)}
    ORDER BY ts DESC
  `;
  const res = await execSql(sql);
  // TDengine REST 返回格式: { columns: [...], data: [...] }
  return res.data || [];
}

/** 查询原始日志 */
export async function queryRawLog(
  protocolType: string,
  deviceId: string,
  startTime: string,
  endTime: string,
  limit = 100
): Promise<any[]> {
  const safeDeviceId = escapeIdentifier(deviceId).slice(0, 80);
  const tbName = `ctb_raw_${escapeIdentifier(protocolType)}_${safeDeviceId}`;
  const sql = `
    SELECT ts, direction, cmd_type, hex_data, raw_json
    FROM ${tbName}
    WHERE ts >= ${escapeString(startTime)} AND ts <= ${escapeString(endTime)}
    ORDER BY ts DESC
    LIMIT ${escapeNumber(limit)}
  `;
  const res = await execSql(sql);
  return res.data || [];
}
