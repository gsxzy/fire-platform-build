/**
 * ═══════════════════════════════════════════════════════════════
 * 设备控制服务 - 三协议统一下发
 * 支持：GB26875 / ModbusTCP / MQTT
 * ═══════════════════════════════════════════════════════════════
 */
const net = require('net');
const modbus = require('jsmodbus');
const mqtt = require('mqtt');
const { pool } = require('../utils/db');
const { sendControlCommand: sendGb26875Cmd } = require('../gb26875Server');

/* ── MQTT 单例 ── */
let mqttClient = null;
const mqttPending = new Map(); // commandId -> { resolve, reject, timeoutId }

function getMqttClient() {
  if (mqttClient && mqttClient.connected) return mqttClient;
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  mqttClient = mqtt.connect(brokerUrl, {
    clientId: `fire-platform-api-${Date.now()}`,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  });
  mqttClient.on('connect', () => {
    console.log('[DeviceControl] MQTT 已连接:', brokerUrl);
    mqttClient.subscribe('fire/ack/+', (err) => {
      if (err) console.error('[DeviceControl] MQTT 订阅失败:', err.message);
    });
  });
  mqttClient.on('message', (topic, message) => {
    // topic: fire/ack/{deviceId}
    const parts = topic.split('/');
    const deviceId = parts[parts.length - 1];
    let payload;
    try { payload = JSON.parse(message.toString()); } catch { payload = { raw: message.toString() }; }
    // 查找待处理的命令（按 deviceId 匹配最近的一个）
    for (const [cmdId, pending] of mqttPending.entries()) {
      if (pending.deviceId === deviceId) {
        clearTimeout(pending.timeoutId);
        mqttPending.delete(cmdId);
        pending.resolve({ success: true, data: payload });
        break;
      }
    }
  });
  mqttClient.on('error', (err) => console.error('[DeviceControl] MQTT 错误:', err.message));
  return mqttClient;
}

/* ── 指令入库 ── */
async function createCommandRecord(deviceId, deviceName, protocol, command, params) {
  const [result] = await pool.query(
    `INSERT INTO fire_control_command (device_id, device_name, protocol, command, params, status, sent_at)
     VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
    [deviceId, deviceName || '', protocol, command, params ? JSON.stringify(params) : null]
  );
  return result.insertId;
}

async function updateCommandStatus(commandId, status, response, errorMsg) {
  await pool.query(
    `UPDATE fire_control_command SET status = ?, response = ?, error_msg = ?, responded_at = NOW() WHERE id = ?`,
    [status, response || null, errorMsg || null, commandId]
  );
}

/* ── 查询设备信息 ── */
async function getDeviceInfo(deviceId) {
  const [rows] = await pool.query(
    'SELECT device_id, device_name, protocol, ip, port FROM fire_iot_device WHERE device_id = ? LIMIT 1',
    [deviceId]
  );
  return rows[0] || null;
}

/* ── GB26875 控制 ── */
async function executeGb26875(deviceId, commandId, command, params) {
  const result = await sendGb26875Cmd(deviceId, commandId, command, params);
  return result;
}

/* ── ModbusTCP 控制 ── */
async function executeModbus(deviceInfo, commandId, command, params) {
  const { ip, port = 502 } = deviceInfo;
  if (!ip) throw new Error('设备缺少 IP 地址，无法建立 ModbusTCP 连接');

  // 默认寄存器映射（可覆盖）
  const defaultMap = {
    mute:   { type: 'coil',   address: 1, value: true },
    reset:  { type: 'coil',   address: 2, value: true },
    manual: { type: 'register', address: 100, value: 1 },
    auto:   { type: 'register', address: 100, value: 2 },
    start:  { type: 'coil',   address: 3, value: true },
    stop:   { type: 'coil',   address: 3, value: false },
  };
  const map = defaultMap[command] || params;
  if (!map || !map.address === undefined) throw new Error(`未知 Modbus 命令: ${command}`);

  const socket = new net.Socket();
  const client = new modbus.client.TCP(socket);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('ModbusTCP 连接/写入超时'));
    }, 10000);

    socket.on('connect', async () => {
      try {
        clearTimeout(timeout);
        if (map.type === 'coil') {
          await client.writeSingleCoil(map.address, !!map.value);
        } else if (map.type === 'register') {
          await client.writeSingleRegister(map.address, map.value);
        } else if (map.type === 'multipleRegisters') {
          await client.writeMultipleRegisters(map.address, Array.isArray(map.value) ? map.value : [map.value]);
        }
        socket.end();
        resolve({ success: true, data: { address: map.address, value: map.value } });
      } catch (err) {
        socket.destroy();
        reject(err);
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.destroy();
      reject(new Error(`ModbusTCP 连接失败: ${err.message}`));
    });

    socket.connect(port, ip);
  });
}

/* ── MQTT 控制 ── */
async function executeMqtt(deviceId, commandId, command, params) {
  const client = getMqttClient();
  if (!client.connected) {
    throw new Error('MQTT 未连接');
  }
  const topic = `fire/command/${deviceId}`;
  const payload = JSON.stringify({ cmd: command, params: params || {}, ts: Date.now() });
  client.publish(topic, payload);

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      mqttPending.delete(commandId);
      reject(new Error('MQTT 控制命令超时（30秒未收到设备回执）'));
    }, 30000);
    mqttPending.set(commandId, { resolve, reject, timeoutId, deviceId });
  });
}

/* ── 统一控制入口 ── */
async function executeCommand(deviceId, command, params = {}) {
  const deviceInfo = await getDeviceInfo(deviceId);
  if (!deviceInfo) throw new Error(`设备[${deviceId}]不存在`);

  const protocol = (deviceInfo.protocol || 'gb26875').toLowerCase();
  const commandId = await createCommandRecord(deviceId, deviceInfo.device_name, protocol, command, params);

  try {
    let result;
    switch (protocol) {
      case 'gb26875':
        result = await executeGb26875(deviceId, commandId, command, params);
        break;
      case 'modbus':
      case 'modbustcp':
        result = await executeModbus(deviceInfo, commandId, command, params);
        break;
      case 'mqtt':
        result = await executeMqtt(deviceId, commandId, command, params);
        break;
      default:
        throw new Error(`不支持的协议类型: ${protocol}`);
    }

    if (result && result.success) {
      await updateCommandStatus(commandId, 'success', JSON.stringify(result.data), null);
      return { commandId, status: 'success', data: result.data };
    } else {
      const errMsg = result?.error || '设备执行失败';
      await updateCommandStatus(commandId, 'failed', JSON.stringify(result), errMsg);
      return { commandId, status: 'failed', error: errMsg };
    }
  } catch (err) {
    const isTimeout = err.message && err.message.includes('超时');
    const finalStatus = isTimeout ? 'timeout' : 'failed';
    await updateCommandStatus(commandId, finalStatus, null, err.message);
    throw err;
  }
}

/* ── 查询指令记录 ── */
async function listCommands(deviceId, limit = 50) {
  const [rows] = await pool.query(
    `SELECT * FROM fire_control_command WHERE device_id = ? ORDER BY created_at DESC LIMIT ?`,
    [deviceId, limit]
  );
  return rows;
}

module.exports = { executeCommand, listCommands };
