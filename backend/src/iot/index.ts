/**
 * ═══════════════════════════════════════════════════════════════════
 * IoT设备接入网关
 * 支持MQTT、Modbus TCP、HTTP/HTTPS、GB26875协议
 * ═══════════════════════════════════════════════════════════════════
 */
import mqtt from 'mqtt';
import logger from '@/config/logger';
import redis from '@/config/redis';
import { Alarm, IoTDevice } from '@/models';
import { generateAlarmNo } from '@/utils/alarmNo';

class IoTGateway {
  private mqttClient: mqtt.MqttClient | null = null;

  async start() {
    // 启动MQTT Broker连接
    const mqttPort = process.env.MQTT_PORT || 1883;
    try {
      this.mqttClient = mqtt.connect(`mqtt://localhost:${mqttPort}`);
      this.mqttClient.on('connect', () => {
        logger.info('[IoT] MQTT connected');
        this.mqttClient!.subscribe('fire/+/+', (err) => {
          if (err) logger.error('[IoT] MQTT subscribe error:', err);
          else logger.info('[IoT] Subscribed to fire/+/+');
        });
      });
      this.mqttClient.on('message', (topic, payload) => this.handleMqttMessage(topic, payload));
      this.mqttClient.on('error', (err) => logger.error('[IoT] MQTT error:', err.message));
    } catch (err: any) {
      logger.error('[IoT] MQTT connection failed:', err.message);
    }
  }

  private async handleMqttMessage(topic: string, payload: Buffer) {
    try {
      const parts = topic.split('/');
      const unitId = parts[1];
      const deviceSn = parts[2];
      const data = JSON.parse(payload.toString());
      logger.info(`[IoT] Message from ${deviceSn}:`, data);

      // 更新设备在线状态
      await IoTDevice.update(
        { status: 1, last_online: new Date() },
        { where: { device_sn: deviceSn } }
      );

      // 处理告警数据
      if (data.alarmType) {
        await this.processAlarm(data, unitId, deviceSn);
      }

      // 缓存设备数据
      await redis.setex(`device:data:${deviceSn}`, 3600, JSON.stringify(data));
    } catch (err: any) {
      logger.error('[IoT] Message processing error:', err.message);
    }
  }

  private async processAlarm(data: any, unitId: string, deviceSn: string) {
    const alarmNo = generateAlarmNo();
    const alarm = await Alarm.create({
      alarm_no: alarmNo,
      alarm_type: data.alarmType,
      alarm_level: data.alarmLevel || 1,
      device_id: data.deviceId,
      device_name: data.deviceName || deviceSn,
      unit_id: unitId,
      unit_name: data.unitName,
      location: data.location,
      alarm_desc: data.description,
      status: 0,
    } as any);

    // 广播告警
    await redis.publish('fire:alarm', JSON.stringify({
      type: 'new_alarm',
      data: { id: (alarm as any).id, alarm_no: alarmNo, ...data }
    }));
  }

  // Modbus TCP读取（slaveId 默认 1）
  async readModbus(ip: string, port: number, address: number, quantity: number, slaveId: number = 1) {
    try {
      const ModbusRTU = require('modbus-serial');
      const client = new ModbusRTU();
      await client.connectTCP(ip, { port });
      client.setID(slaveId);
      const data = await client.readHoldingRegisters(address, quantity);
      client.close();
      return { success: true, data: data.data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /** Modbus TCP 写单个保持寄存器 */
  async writeModbus(ip: string, port: number, slaveId: number, register: number, value: number) {
    try {
      const ModbusRTU = require('modbus-serial');
      const client = new ModbusRTU();
      await client.connectTCP(ip, { port });
      client.setID(slaveId);
      await client.writeRegister(register, value);
      client.close();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // SNMP读取
  async readSNMP(ip: string, community: string, oid: string) {
    try {
      const snmp = require('net-snmp');
      const session = snmp.createSession(ip, community);
      return new Promise((resolve) => {
        session.get([oid], (err: any, varbinds: any) => {
          if (err) resolve({ success: false, error: err.message });
          else resolve({ success: true, data: varbinds.map((v: any) => ({ oid: v.oid, value: v.value })) });
          session.close();
        });
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 发送控制命令
  async sendCommand(deviceSn: string, command: any) {
    if (this.mqttClient?.connected) {
      this.mqttClient.publish(`fire/cmd/${deviceSn}`, JSON.stringify(command));
      return { success: true };
    }
    return { success: false, error: 'MQTT not connected' };
  }
}

export const iotGateway = new IoTGateway();
