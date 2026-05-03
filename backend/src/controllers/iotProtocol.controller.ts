import type { Request, Response } from 'express';
import { success } from '@/utils/response';
import { IoTProtocolService } from '@/services/iotProtocol.service';

export const IoTProtocolController = {
  // Modbus读取
  async readModbus(req: Request, res: Response) {
    const { ip, port, slaveId, registerAddr, quantity } = req.body;
    const result = await IoTProtocolService.readModbusDevice(ip, port || 502, slaveId || 1, registerAddr || 0, quantity || 1);
    return res.json(success(result));
  },

  // SNMP读取
  async readSNMP(req: Request, res: Response) {
    const { ip, community, oid } = req.body;
    const result = await IoTProtocolService.readSNMPDevice(ip, community || 'public', oid);
    return res.json(success(result));
  },

  // 发送控制指令
  async sendControl(req: Request, res: Response) {
    const { deviceSn, command } = req.body;
    const result = await IoTProtocolService.sendControlCommand(deviceSn, command);
    return res.json(success(result));
  },

  // 批量读取
  async batchRead(req: Request, res: Response) {
    const { deviceIds } = req.body;
    const result = await IoTProtocolService.batchReadDevices(deviceIds);
    return res.json(success(result));
  },

  // MQTT数据解析（设备上报回调）
  async parseMQTT(req: Request, res: Response) {
    const { topic, payload } = req.body;
    const result = await IoTProtocolService.parseMQTTMessage(topic, Buffer.from(payload));
    return res.json(success(result));
  },
};
