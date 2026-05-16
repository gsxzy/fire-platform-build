import type { Request, Response } from 'express';
import { success, fail } from '@/utils/response';
import logger from '@/config/logger';
import { IoTProtocolService } from '@/services/iotProtocol.service';

export const IoTProtocolController = {
  // Modbus读取
  async readModbus(req: Request, res: Response) {
    try {
      const { ip, port, slaveId, registerAddr, quantity } = req.body;
      const result = await IoTProtocolService.readModbusDevice(ip, port || 502, slaveId || 1, registerAddr || 0, quantity || 1);
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[IoTProtocol] readModbus 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // SNMP读取
  async readSNMP(req: Request, res: Response) {
    try {
      const { ip, community, oid } = req.body;
      if (!community) {
        return res.status(400).json(fail('SNMP community 未配置'));
      }
      const result = await IoTProtocolService.readSNMPDevice(ip, community, oid);
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[IoTProtocol] readSNMP 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 发送控制指令
  async sendControl(req: Request, res: Response) {
    try {
      const { deviceSn, command } = req.body;
      const result = await IoTProtocolService.sendControlCommand(deviceSn, command);
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[IoTProtocol] sendControl 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // 批量读取
  async batchRead(req: Request, res: Response) {
    try {
      const { deviceIds } = req.body;
      const result = await IoTProtocolService.batchReadDevices(deviceIds);
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[IoTProtocol] batchRead 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  // MQTT数据解析（设备上报回调）
  async parseMQTT(req: Request, res: Response) {
    try {
      const { topic, payload } = req.body;
      const result = await IoTProtocolService.parseMQTTMessage(topic, Buffer.from(payload));
      return res.json(success(result));
    } catch (err: any) {
      logger.error(`[IoTProtocol] parseMQTT 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
