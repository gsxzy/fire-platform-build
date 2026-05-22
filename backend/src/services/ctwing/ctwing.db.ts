import logger from '@/config/logger';
import { insertRawLog, insertTelemetry } from '@/services/tdengine.service';
import { type IsnbParsedFrame } from '@/utils/isnb.parser';

/** 保存 CTWing 原始推送日志 → TDengine */
export async function saveRawLog(deviceId: string, msgType: string, rawBody: unknown) {
  try {
    await insertRawLog('ctwing', deviceId, {
      direction: 'RX',
      cmd_type: msgType,
      raw_json: JSON.stringify(rawBody),
    });
  } catch (err: any) {
    logger.error(`[CTWing] 保存原始日志失败: ${err.message}`);
  }
}

/** 保存 ISNB 解析后的遥测数据 → TDengine */
export async function saveIsnbTelemetry(iotDeviceId: number, frame: IsnbParsedFrame) {
  try {
    const pressureKpa = (() => {
      const ch23 = frame.channels.find(c => c.paramType === 0x23);
      if (ch23) {
        const vk = ch23.varData?.currentKpa as number | undefined;
        if (vk != null) return vk;
        if (ch23.paramValue != null) return ch23.paramValue;
      }
      const ch02 = frame.channels.find(c => c.paramType === 0x02);
      if (ch02) {
        const vk = ch02.varData?.currentMpa as number | undefined;
        if (vk != null) return vk * 1000;
        if (ch02.paramValue != null) return (ch02.rawParamValue ?? 0) * 100;
      }
      return null;
    })();

    await insertTelemetry(iotDeviceId, frame.imei || 'unknown', {
      message_id: frame.messageId,
      message_type: frame.messageTypeName,
      dev_type: frame.devType,
      dev_type_name: frame.devTypeName,
      imei: frame.imei,
      device_model: frame.deviceModel,
      rsrp: frame.rsrp,
      snr: frame.snr,
      shield: frame.shield,
      channel_count: frame.channelCount,
      pressure_kpa: pressureKpa,
      level_m: frame.channels.find(c => c.paramType === 0x03)?.paramValue ?? null,
      temperature: frame.channels.find(c => c.paramType === 0x04)?.paramValue ?? null,
      battery_pct: frame.channels.find(c => c.paramType === 0x15)?.paramValue ?? null,
      has_alarm: frame.hasAlarm,
      has_fault: frame.hasFault,
      raw_hex: frame.rawHex.slice(0, 4000),
    });
  } catch (err: any) {
    logger.error(`[CTWing] 保存遥测数据失败: ${err.message}`);
  }
}
