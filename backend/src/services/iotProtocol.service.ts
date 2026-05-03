/**
 * ═══════════════════════════════════════════════════════════════════
 * IoT协议解析服务
 * 支持：MQTT、Modbus TCP、HTTP/HTTPS、4G设备协议
 * ═══════════════════════════════════════════════════════════════════
 */
import { IoTDevice, Device, Alarm } from '@/models';
import { iotGateway } from '@/iot';
import logger from '@/config/logger';

export class IoTProtocolService {
  // MQTT协议解析 - 4G烟感/温感/水压等设备
  static async parseMQTTMessage(topic: string, payload: Buffer) {
    try {
      const parts = topic.split('/');
      const deviceSn = parts[parts.length - 1];
      const data = JSON.parse(payload.toString());

      const device = await IoTDevice.findOne({ where: { device_sn: deviceSn } }) as any;
      if (!device) return { success: false, msg: '设备未注册' };

      // 解析4G设备数据格式
      const parsed = this.parse4GDeviceData(data, device);

      // 更新设备状态
      await IoTDevice.update({ status: 1, last_online: new Date() }, { where: { id: device.id } });
      await Device.update({ last_online: new Date(), status: parsed.alarm ? 2 : 1 }, { where: { iot_id: deviceSn } });

      // 生成告警
      if (parsed.alarm) {
        await this.createDeviceAlarm(device, parsed);
      }

      return { success: true, deviceId: device.id, parsed };
    } catch (err: any) {
      logger.error(`[IoTProtocol] MQTT parse error: ${err.message}`);
      return { success: false, msg: err.message };
    }
  }

  // 4G设备数据解析（烟感、温感、水压、液位、防火门、电气火灾等）
  private static parse4GDeviceData(raw: any, device: any) {
    const result: any = { raw, timestamp: new Date().toISOString(), alarm: false, values: {} };

    // 烟感探测器数据格式
    if (device.device_type?.includes('烟感') || raw.smoke !== undefined) {
      result.values.smoke = raw.smoke || raw.smokeDensity || 0;
      result.values.battery = raw.battery || raw.voltage;
      result.values.signal = raw.signal || raw.rssi;
      if (raw.alarm === 1 || raw.smoke > 50) {
        result.alarm = true; result.alarmType = 1; result.alarmDesc = '烟感探测器触发火警';
      }
    }

    // 温感探测器数据格式
    if (device.device_type?.includes('温感') || raw.temperature !== undefined) {
      result.values.temperature = raw.temperature || 0;
      result.values.battery = raw.battery;
      if (raw.temperature > 60 || raw.alarm === 1) {
        result.alarm = true; result.alarmType = 1; result.alarmDesc = `温度异常 ${raw.temperature}°C`;
      }
    }

    // 水压传感器数据格式
    if (device.device_type?.includes('水压') || raw.pressure !== undefined) {
      result.values.pressure = raw.pressure || 0;
      result.values.unit = raw.unit || 'MPa';
      if (raw.pressure < 0.1) { result.alarm = true; result.alarmType = 3; result.alarmDesc = `水压过低 ${raw.pressure}MPa`; }
      else if (raw.pressure > 1.2) { result.alarm = true; result.alarmType = 3; result.alarmDesc = `水压过高 ${raw.pressure}MPa`; }
    }

    // 液位传感器数据格式
    if (device.device_type?.includes('液位') || raw.level !== undefined) {
      result.values.level = raw.level || 0;
      result.values.unit = raw.unit || 'm';
      if (raw.level < 0.5) { result.alarm = true; result.alarmType = 3; result.alarmDesc = `液位过低 ${raw.level}m`; }
    }

    // 防火门数据格式
    if (device.device_type?.includes('防火门') || raw.doorStatus !== undefined) {
      result.values.doorStatus = raw.doorStatus;
      if (raw.doorStatus === 'open') { result.alarm = true; result.alarmType = 3; result.alarmDesc = '防火门未关闭'; }
    }

    // 电气火灾数据格式
    if (device.device_type?.includes('电气') || raw.leakageCurrent !== undefined) {
      result.values.leakageCurrent = raw.leakageCurrent || 0;
      result.values.cableTemp = raw.cableTemp || 0;
      if (raw.leakageCurrent > 300) { result.alarm = true; result.alarmType = 1; result.alarmDesc = `剩余电流超限 ${raw.leakageCurrent}mA`; }
      if (raw.cableTemp > 70) { result.alarm = true; result.alarmType = 3; result.alarmDesc = `线缆温度异常 ${raw.cableTemp}°C`; }
    }

    return result;
  }

  // 创建设备告警
  private static async createDeviceAlarm(device: any, parsed: any) {
    const unitDevice = await Device.findOne({ where: { iot_id: device.device_sn } }) as any;
    await Alarm.create({
      alarm_no: `ALM${Date.now()}${Math.floor(Math.random() * 1000)}`,
      alarm_type: parsed.alarmType || 1,
      alarm_level: parsed.alarmType === 1 ? 3 : 2,
      device_id: unitDevice?.id,
      device_name: device.device_name,
      unit_id: device.unit_id,
      alarm_desc: parsed.alarmDesc,
      status: 0,
    } as any);
  }

  // Modbus TCP协议读取（水压、液位等模拟量设备）
  static async readModbusDevice(ip: string, port: number, slaveId: number, registerAddr: number, quantity: number = 1) {
    return iotGateway.readModbus(ip, port, registerAddr, quantity);
  }

  // SNMP协议读取（网关设备）
  static async readSNMPDevice(ip: string, community: string, oid: string) {
    return iotGateway.readSNMP(ip, community, oid);
  }

  // 下发控制指令
  static async sendControlCommand(deviceSn: string, command: any) {
    return iotGateway.sendCommand(deviceSn, command);
  }

  // 批量读取设备数据
  static async batchReadDevices(deviceIds: number[]) {
    const results = [];
    for (const id of deviceIds) {
      const device = await IoTDevice.findByPk(id) as any;
      if (!device) continue;

      if (device.protocol_type === 'Modbus') {
        const config = JSON.parse(device.protocol_config || '{}');
        const r = await this.readModbusDevice(config.ip, config.port, config.slaveId, config.registerAddr, config.quantity);
        results.push({ deviceId: id, deviceSn: device.device_sn, protocol: 'Modbus', ...r });
      } else if (device.protocol_type === 'SNMP') {
        const config = JSON.parse(device.protocol_config || '{}');
        const r = await this.readSNMPDevice(config.ip, config.community, config.oid) as Record<string, unknown>;
        results.push({ deviceId: id, deviceSn: device.device_sn, protocol: 'SNMP', ...r });
      } else {
        results.push({ deviceId: id, deviceSn: device.device_sn, protocol: device.protocol_type, success: true, online: device.status === 1 });
      }
    }
    return results;
  }
}
