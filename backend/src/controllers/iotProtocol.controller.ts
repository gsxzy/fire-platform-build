import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/response';
import { HttpError } from '@/utils/httpError';
import { IoTProtocolService } from '@/services/iotProtocol.service';

export const IoTProtocolController = {
  async readModbus(req: Request, res: Response) {
    const { ip, port, slaveId, registerAddr, quantity } = req.body;
    const result = await IoTProtocolService.readModbusDevice(
      ip,
      port || 502,
      slaveId || 1,
      registerAddr || 0,
      quantity || 1
    );
    sendSuccess(res, req, result);
  },

  async readSNMP(req: Request, res: Response) {
    const { ip, community, oid } = req.body;
    if (!community) throw new HttpError('SNMP community 未配置', 400);
    const result = await IoTProtocolService.readSNMPDevice(ip, community, oid);
    sendSuccess(res, req, result);
  },

  async sendControl(req: Request, res: Response) {
    const { deviceSn, command } = req.body;
    const result = await IoTProtocolService.sendControlCommand(deviceSn, command);
    sendSuccess(res, req, result);
  },

  async batchRead(req: Request, res: Response) {
    const { deviceIds } = req.body;
    const result = await IoTProtocolService.batchReadDevices(deviceIds);
    sendSuccess(res, req, result);
  },

  async parseMQTT(req: Request, res: Response) {
    const { topic, payload } = req.body;
    const result = await IoTProtocolService.parseMQTTMessage(topic, Buffer.from(payload));
    sendSuccess(res, req, result);
  },
};
