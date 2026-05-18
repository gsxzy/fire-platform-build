import type { Request, Response } from 'express';
import { success, fail } from '@/utils/response';
import logger from '@/config/logger';
import { IoTDevice } from '@/models';
import { saveRawLog } from '@/services/ctwing/ctwing.db';
import { parseCtwingBody, processCtwingMessage, resolveDeviceId } from '@/services/ctwing/ctwing.core';
import { verifySignature, checkIotWhitelist } from '@/utils/ctwing.security';

export const CTWingController = {
  /** 接收 CTWing 设备数据推送 */
  async report(req: Request, res: Response) {
    try {
      if (!checkIotWhitelist(req, res)) return;

      if (!verifySignature(req)) {
        logger.warn('[CTWing] 签名验证失败');
        return res.status(403).json(fail('签名验证失败', 403));
      }

      const body = req.body as Record<string, unknown>;
      const parsed = parseCtwingBody(body);

      logger.info(`[CTWing] 收到推送: deviceId=${parsed.deviceId}, msgType=${parsed.msgType}`);

      saveRawLog(parsed.deviceId, parsed.msgType, body).catch(() => {});

      res.json(success({ received: true, deviceId: parsed.deviceId }));

      setImmediate(async () => {
        try {
          await processCtwingMessage(parsed);
        } catch (err: any) {
          logger.error(`[CTWing] 异步处理失败: ${err.message}`);
        }
      });
    } catch (err: any) {
      logger.error(`[CTWing] 处理推送失败: ${err.message}`);
      return res.status(500).json(fail('处理失败: ' + err.message, 500));
    }
  },

  /** 接收 CTWing 设备状态/生命周期变更 */
  async status(req: Request, res: Response) {
    try {
      if (!checkIotWhitelist(req, res)) return;

      const body = req.body as Record<string, unknown>;
      const deviceId = resolveDeviceId(body);
      const status = String(body.status ?? body.deviceStatus ?? 'online');

      logger.info(`[CTWing] 状态变更: deviceId=${deviceId}, status=${status}`);

      const iotDevice = await IoTDevice.findOne({ where: { device_sn: deviceId } }) as any;
      if (iotDevice) {
        const newStatus = status === 'online' || status === '1' ? 1 : 0;
        await IoTDevice.update(
          { status: newStatus, last_online: new Date() },
          { where: { id: iotDevice.id } }
        );
      }

      return res.json(success({ received: true, deviceId, status }));
    } catch (err: any) {
      logger.error(`[CTWing] 状态处理失败: ${err.message}`);
      return res.status(500).json(fail('处理失败: ' + err.message, 500));
    }
  },
};
