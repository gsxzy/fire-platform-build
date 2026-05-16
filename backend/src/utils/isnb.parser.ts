/**
 * ═══════════════════════════════════════════════════════════════════
 * ISNB 协议解析器 (Intelligent Security NB)
 * 适用：海康4G/NB-IoT 消防设备通过 CTWing 平台透传的原始二进制帧
 * 协议版本：基于《ISNB协议(全)》及《一体式用水4G数据帧示例报文》
 * ═══════════════════════════════════════════════════════════════════
 *
 * CTWing 推送的海康消防设备数据通常是 ISNB 原始十六进制帧，
 * 本平台需要自行解析以提取水压/液位/温度/电量/告警等参数。
 */

/** ISNB 上行帧解析结果 */
export interface IsnbParsedFrame {
  /** 原始十六进制字符串 */
  rawHex: string;
  /** 消息类型 0x01=定时上报 0x02=告警 0x05=心跳 0x0A=参数上报 */
  messageId: number;
  messageTypeName: string;
  /** 设备类型 0x86=一体式用水 0x88=一体化用水 0x02=烟感 */
  devType: number;
  devTypeName: string;
  /** 设备时间 (UTC秒数) */
  time: number;
  /** IMEI */
  imei: string;
  /** IMSI */
  imsi: string;
  /** QCCID */
  qccid: string;
  /** 设备型号 */
  deviceModel: string;
  /** 软件版本 */
  softwareVersion: string;
  /** 硬件版本 */
  hardwareVersion: string;
  /** 协议版本 */
  protocolVersion: string;
  /** 信号强度 RSRP */
  rsrp: number;
  /** 信噪比 SNR */
  snr: number;
  /** 覆盖等级 ECL */
  ecl: number;
  /** 屏蔽状态 0=未屏蔽 1=设备故障 2=设备未配置 */
  shield: number;
  /** 通道数量 */
  channelCount: number;
  /** 通道数据列表 */
  channels: IsnbChannelData[];
  /** 是否有告警 */
  hasAlarm: boolean;
  /** 是否有故障 */
  hasFault: boolean;
}

/** 单通道解析结果 */
export interface IsnbChannelData {
  /** 通道号 */
  channelNo: number;
  /** 消息类型 */
  msgType: number;
  msgTypeName: string;
  /** 事件类型 0x62=状态变化 0x63=故障事件 0x64=告警事件 */
  eventType: number;
  eventTypeName: string;
  /** 事件值（32位） */
  eventValue: number;
  /** 参数类型 */
  paramType: number;
  paramTypeName: string;
  /** 参数单位 */
  paramUnit: string;
  /** 原始参数值（十六进制原始值） */
  rawParamValue: number;
  /** 转换后的参数值（带单位） */
  paramValue: number | null;
  /** 变长数据解析结果 */
  varData?: Record<string, unknown>;
}

/** 消息类型映射 */
const MESSAGE_ID_MAP: Record<number, string> = {
  0x01: '定时上报',
  0x02: '告警',
  0x03: '注册',
  0x04: '自检',
  0x05: '心跳',
  0x06: '信号查询',
  0x07: '注销',
  0x08: '注销',
  0x09: '升级',
  0x0a: '参数上报',
  0x0b: '复位',
  0x0c: '下载模块信息',
  0x0d: '模块信息上报',
  0x0e: '模块报警',
  0x0f: '扩展数据响应',
  0x10: '模块数据上报',
  0x11: '信息上报',
  0x12: '模块升级',
  0x13: '模块升级响应',
  0x14: '升级响应',
  0x90: '下行通用',
};

/** 设备类型映射 */
const DEV_TYPE_MAP: Record<number, string> = {
  0x02: '烟感',
  0x03: '燃气',
  0x82: '双通道烟感',
  0x83: '双通道燃气',
  0x84: '组合电气监测',
  0x85: '故障电弧监测',
  0x86: '一体式用水',
  0x87: '智慧用电640',
  0x88: '一体化用水',
  0x89: '手报',
  0x8a: '声光',
  0x8b: '工业可燃气体',
  0x8c: '一氧化碳',
  0x8d: '手拉式燃气',
  0x8e: '智慧用电641',
  0x8f: '水压阀',
  0x90: '工业燃气',
};

/** 事件类型映射 */
const EVENT_TYPE_MAP: Record<number, string> = {
  0x62: '状态变化',
  0x63: '故障事件',
  0x64: '告警事件',
};

/** 消息类型（MsgType）映射 */
const MSG_TYPE_MAP: Record<number, string> = {
  0: '新事件',
  1: '应答',
  2: '设备复位',
  3: '布防',
  4: '撤防复位',
  5: '自检（设备远程自检上报）',
  6: '自检',
  7: '信号查询',
  8: '复位',
  9: '注销',
  11: '注销',
  12: '升级',
  13: '升级响应',
  14: '偷盗复位',
  15: '手动报警（火灾报警器手动报警）',
  16: '远程测试（火灾报警器远程测试）',
  17: '远程报警测试',
  18: '远程功能测试',
  19: '微动传感器测试',
  20: '设备重启',
  21: '指示灯开启',
  22: '指示灯关闭',
};

/** 参数类型映射 */
const PARAM_TYPE_MAP: Record<number, { name: string; unit: string; scale: number }> = {
  0x01: { name: '燃气浓度', unit: '%LEL', scale: 0.1 },
  0x02: { name: '水压', unit: 'MPa', scale: 0.1 },
  0x03: { name: '液位', unit: 'm', scale: 0.01 },
  0x04: { name: '温度', unit: '°C', scale: 0.1 },
  0x06: { name: '剩余电流', unit: 'mA', scale: 1 },
  0x14: { name: '用水参数信息', unit: '', scale: 1 },
  0x15: { name: '电量百分比', unit: '%', scale: 1 },
  0x17: { name: '烟雾浓度', unit: '%', scale: 1 },
  0x1a: { name: '湿度', unit: '%RH', scale: 0.01 },
  0x23: { name: '高级水压', unit: 'kPa', scale: 1 },
  0x26: { name: '温度阈值', unit: '°C', scale: 1 },
  0x27: { name: '剩余电流阈值', unit: 'mA', scale: 1 },
  0x28: { name: '线缆电流阈值', unit: 'A', scale: 1 },
  0x29: { name: '电压阈值', unit: 'V', scale: 1 },
  0x2a: { name: '过压阈值', unit: 'V', scale: 1 },
  0x2b: { name: '欠压阈值', unit: 'V', scale: 1 },
  0x2e: { name: '水流速', unit: '%', scale: 1 },
};

/** 告警事件位定义 (EventType=0x64) */
const ALARM_BITS: Record<number, string> = {
  0: '烟雾告警',
  1: '燃气浓度',
  2: '剩余电流',
  3: '温度告警',
  4: '水压告警',
  5: '液位告警',
  6: '通道告警',
  7: '门磁告警',
  8: '门磁恢复',
  9: '水浸告警',
  10: '手动报警',
  11: '分别报警',
  12: '碰撞',
  13: '倾斜',
  14: '偷盗',
  15: '断电',
  16: '烟雾浓度',
  17: '燃气浓度',
  18: '剩余电流',
  19: '线缆电流',
  20: 'GPS异常',
  21: '电压异常',
  22: '线缆电流异常',
  23: '线缆电流过载',
  24: '微动传感器',
  25: '温度异常/故障',
  26: '断电故障',
  27: '三相A/B/C缺相',
  28: '过压预警',
};

/** 故障事件位定义 (EventType=0x63) */
const FAULT_BITS: Record<number, string> = {
  0: '传感器故障',
  1: '传感器失效/断路',
  2: '传感器短路',
  3: '低压',
  4: '设备被拆',
  5: '污染',
  6: '通信故障',
  7: '自检故障',
  8: '过压',
  9: '欠压',
  10: '缺相',
  11: '错相',
  12: '断路',
  13: '短路',
  14: '过流',
  15: '过载',
  16: '线缆电流',
  17: '线缆电流异常',
  18: '线缆电流过载',
  19: 'GPS异常',
  20: '电压异常',
  21: '线缆电流异常',
  22: '微动传感器异常',
  23: '温度异常',
  24: '断电故障',
  25: '三相A/B/C缺相',
};

/** 解析事件值为文本描述 */
function parseEventBits(eventValue: number, bitMap: Record<number, string>): string[] {
  const results: string[] = [];
  for (let i = 0; i < 32; i++) {
    if ((eventValue >> i) & 1) {
      results.push(bitMap[i] || `未知位${i}`);
    }
  }
  return results;
}

/** 判断是否为可能的 ISNB 十六进制帧 */
export function isIsnbHexFrame(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const hex = input.replace(/\s/g, '');
  // 至少包含 UP_HEADER（约 50 字节 = 100 十六进制字符）
  if (hex.length < 100) return false;
  // 必须是合法十六进制
  if (!/^[0-9a-fA-F]+$/.test(hex)) return false;
  // 校验消息类型是否在合法范围
  const msgId = parseInt(hex.slice(0, 2), 16);
  const validIds = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14];
  return validIds.includes(msgId);
}

/** 从 CTWing 推送体中提取可能的 ISNB 原始帧
 * 支持路径：
 *   - body.rawData / body.raw_data / body.rawHex / body.raw_hex
 *   - body.payload
 *   - body.data.rawData / body.data.raw_hex / body.data.payload
 *   - body.data.serviceData.rawData / body.data.serviceData.raw_hex
 *   - body.data.services[].data.rawData / body.data.services[].data.raw_hex
 *   - body.serviceData.rawData / body.service_data.raw_data
 *   - body.data (若本身就是十六进制字符串)
 */
export function extractIsnbHexFromCtwing(body: Record<string, unknown>): string | null {
  // 1. 顶层常见字段（CTWing 透传 ISNB 帧通常在 msg / rawData / payload 中）
  const topCandidates = [
    body.msg, body.rawData, body.raw_data, body.rawHex, body.raw_hex,
    body.payload, body.data, body.serviceData, body.service_data,
  ];

  for (const cand of topCandidates) {
    if (typeof cand === 'string') {
      const trimmed = cand.trim();
      if (isIsnbHexFrame(trimmed)) return trimmed.replace(/\s/g, '');
    }
    if (cand && typeof cand === 'object') {
      const sub = (cand as Record<string, unknown>).rawData
        ?? (cand as Record<string, unknown>).raw_data
        ?? (cand as Record<string, unknown>).rawHex
        ?? (cand as Record<string, unknown>).raw_hex
        ?? (cand as Record<string, unknown>).payload
        ?? (cand as Record<string, unknown>).data;
      if (typeof sub === 'string' && isIsnbHexFrame(sub)) {
        return sub.replace(/\s/g, '');
      }
      // 尝试 { serviceData: { rawData: '...' } }
      const svcData = (cand as Record<string, unknown>).serviceData
        ?? (cand as Record<string, unknown>).service_data;
      if (svcData && typeof svcData === 'object') {
        const svcRaw = (svcData as Record<string, unknown>).rawData
          ?? (svcData as Record<string, unknown>).raw_data
          ?? (svcData as Record<string, unknown>).rawHex
          ?? (svcData as Record<string, unknown>).raw_hex;
        if (typeof svcRaw === 'string' && isIsnbHexFrame(svcRaw)) {
          return svcRaw.replace(/\s/g, '');
        }
      }
      // 尝试 { services: [{ data: { rawData: '...' } }] }
      const services = (cand as Record<string, unknown>).services;
      if (Array.isArray(services)) {
        for (const svc of services) {
          if (svc && typeof svc === 'object') {
            const svcDataObj = (svc as Record<string, unknown>).data
              ?? (svc as Record<string, unknown>).serviceData;
            if (svcDataObj && typeof svcDataObj === 'object') {
              const svcRaw = (svcDataObj as Record<string, unknown>).rawData
                ?? (svcDataObj as Record<string, unknown>).raw_data
                ?? (svcDataObj as Record<string, unknown>).rawHex
                ?? (svcDataObj as Record<string, unknown>).raw_hex;
              if (typeof svcRaw === 'string' && isIsnbHexFrame(svcRaw)) {
                return svcRaw.replace(/\s/g, '');
              }
            }
            // 直接尝试 svc.rawData
            const directRaw = (svc as Record<string, unknown>).rawData
              ?? (svc as Record<string, unknown>).raw_data
              ?? (svc as Record<string, unknown>).rawHex
              ?? (svc as Record<string, unknown>).raw_hex;
            if (typeof directRaw === 'string' && isIsnbHexFrame(directRaw)) {
              return directRaw.replace(/\s/g, '');
            }
          }
        }
      }
    }
  }

  // 2. 兜底：递归搜索 body 中所有层级的字符串值
  function deepSearch(obj: unknown): string | null {
    if (typeof obj === 'string') {
      const trimmed = obj.trim();
      if (isIsnbHexFrame(trimmed)) return trimmed.replace(/\s/g, '');
      return null;
    }
    if (obj && typeof obj === 'object') {
      for (const val of Object.values(obj)) {
        const found = deepSearch(val);
        if (found) return found;
      }
    }
    return null;
  }

  return deepSearch(body);
}

/** 解析 ISNB 上行帧 */
export function parseIsnbFrame(hexStr: string): IsnbParsedFrame | null {
  try {
    const hex = hexStr.replace(/\s/g, '');
    const buf = Buffer.from(hex, 'hex');
    if (buf.length < 50) return null;

    let offset = 0;

    // ─── UP_HEADER ───
    const messageId = buf.readUInt8(offset++);
    const fixedSign = buf.readUInt8(offset++);
    const devType = buf.readUInt8(offset++);
    const mac = buf.slice(offset, offset + 6).toString('hex');
    offset += 6;
    const time = buf.readUInt32BE(offset);
    offset += 4;
    const devTypeEx = buf.readUInt8(offset++);
    const pci = buf.readUInt16BE(offset);
    offset += 2;
    const snr = buf.readInt8(offset++);
    const ecl = buf.readUInt8(offset++);
    const rsrp = buf.readInt16BE(offset);
    offset += 2;
    const upHeaderLen = buf.readUInt32BE(offset);
    offset += 4;
    const packageNo = buf.readUInt32BE(offset);
    offset += 4;

    // QCCID (20 bytes)
    const qccid = buf.slice(offset, offset + 20).toString('ascii').replace(/\0/g, '').trim();
    offset += 20;
    // IMEI (20 bytes)
    const imei = buf.slice(offset, offset + 20).toString('ascii').replace(/\0/g, '').trim();
    offset += 20;
    // IMSI (20 bytes)
    const imsi = buf.slice(offset, offset + 20).toString('ascii').replace(/\0/g, '').trim();
    offset += 20;
    // NB模块版本 (24 bytes)
    const nbModuleVersion = buf.slice(offset, offset + 24).toString('ascii').replace(/\0/g, '').trim();
    offset += 24;

    // 扩展字段（根据 upHeaderLen 判断是否存在）
    // 基础头长度 = 112 字节（包含 upHeaderLen 自身 4B）
    // upHeaderLen >= 116: CID(4B) | >=120: LAC(4B) | >=140: swVer(20B) | >=160: hwVer(20B) | >=180: model(20B) | >=190: protoVer(10B)
    let cid: number | undefined;
    let lac: number | undefined;
    let softwareVersion = '';
    let hardwareVersion = '';
    let deviceModel = '';
    let protocolVersion = '';

    if (upHeaderLen >= 116 && buf.length >= offset + 4) {
      cid = buf.readUInt32BE(offset);
      offset += 4;
    }
    if (upHeaderLen >= 120 && buf.length >= offset + 4) {
      lac = buf.readUInt32BE(offset);
      offset += 4;
    }
    if (upHeaderLen >= 140 && buf.length >= offset + 20) {
      softwareVersion = buf.slice(offset, offset + 20).toString('ascii').replace(/\0/g, '').trim();
      offset += 20;
    }
    if (upHeaderLen >= 160 && buf.length >= offset + 20) {
      hardwareVersion = buf.slice(offset, offset + 20).toString('ascii').replace(/\0/g, '').trim();
      offset += 20;
    }
    if (upHeaderLen >= 180 && buf.length >= offset + 20) {
      deviceModel = buf.slice(offset, offset + 20).toString('ascii').replace(/\0/g, '').trim();
      offset += 20;
    }
    if (upHeaderLen >= 190 && buf.length >= offset + 10) {
      protocolVersion = buf.slice(offset, offset + 10).toString('ascii').replace(/\0/g, '').trim();
      offset += 10;
    }

    // ─── MULTI_CHAN_HEADER ───
    if (buf.length < offset + 10) {
      // 无多通道头，可能是单通道业务
      return buildResult({
        rawHex: hex, messageId, devType, time, imei, imsi, qccid,
        softwareVersion, hardwareVersion, deviceModel, protocolVersion,
        rsrp, snr, ecl, shield: 0, channelCount: 0, channels: [],
        hasAlarm: false, hasFault: false,
      });
    }

    const mchRes = buf.readUInt8(offset++);
    const msgType = buf.readUInt8(offset++);
    const shield = buf.readUInt8(offset++);
    const mchVersion = buf.readUInt8(offset++);
    const mchLen = buf.readUInt16BE(offset);
    offset += 2;
    const chanRscType = buf.readUInt16BE(offset);
    offset += 2;
    const chanRscValue = buf.readUInt16BE(offset);
    offset += 2;
    const channelCount = chanRscValue;

    // ─── MULTI_CHAN_BODYs ───
    const channels: IsnbChannelData[] = [];
    let hasAlarm = false;
    let hasFault = false;

    for (let i = 0; i < channelCount && offset < buf.length - 1; i++) {
      if (buf.length < offset + 14) break;

      const wType = buf.readUInt16BE(offset);
      offset += 2;
      const wValue = buf.readUInt16BE(offset);
      offset += 2;
      const wEventType = buf.readUInt16BE(offset);
      offset += 2;
      const wEventValueHight = buf.readUInt16BE(offset);
      offset += 2;
      const wEventValue = buf.readUInt16BE(offset);
      offset += 2;
      const wParamType = buf.readUInt16BE(offset);
      offset += 2;
      const wParamValue = buf.readUInt16BE(offset);
      offset += 2;

      const eventValue32 = (wEventValueHight << 16) | wEventValue;

      if (wEventType === 0x63) hasFault = true;
      if (wEventType === 0x64) hasAlarm = true;

      const paramInfo = PARAM_TYPE_MAP[wParamType] || { name: `未知参数(0x${wParamType.toString(16).padStart(2, '0')})`, unit: '', scale: 1 };

      const channel: IsnbChannelData = {
        channelNo: wType === 0x61 ? wValue : i + 1,
        msgType,
        msgTypeName: MSG_TYPE_MAP[msgType] || `未知(${msgType})`,
        eventType: wEventType,
        eventTypeName: EVENT_TYPE_MAP[wEventType] || `未知(0x${wEventType.toString(16)})`,
        eventValue: eventValue32,
        paramType: wParamType,
        paramTypeName: paramInfo.name,
        paramUnit: paramInfo.unit,
        rawParamValue: wParamValue,
        paramValue: wParamValue === 0xffff ? null : wParamValue * paramInfo.scale,
      };

      // 变长数据解析（wParamValue == 0xFFFF）
      if (wParamValue === 0xffff && offset + 2 <= buf.length) {
        const varLen = buf.readUInt16BE(offset);
        offset += 2;
        if (varLen > 0 && offset + varLen <= buf.length) {
          channel.varData = parseVarData(wParamType, buf.slice(offset, offset + varLen));
          offset += varLen;
        }
      }

      channels.push(channel);
    }

    return buildResult({
      rawHex: hex, messageId, devType, time, imei, imsi, qccid,
      softwareVersion, hardwareVersion, deviceModel, protocolVersion,
      rsrp, snr, ecl, shield, channelCount, channels, hasAlarm, hasFault,
    });
  } catch (err: any) {
    return null;
  }
}

/** 构建解析结果 */
function buildResult(p: Omit<IsnbParsedFrame, 'messageTypeName' | 'devTypeName'>): IsnbParsedFrame {
  return {
    ...p,
    messageTypeName: MESSAGE_ID_MAP[p.messageId] || `未知(0x${p.messageId.toString(16).padStart(2, '0')})`,
    devTypeName: DEV_TYPE_MAP[p.devType] || `未知设备(0x${p.devType.toString(16)})`,
  };
}

/** 解析变长数据 */
function parseVarData(paramType: number, buf: Buffer): Record<string, unknown> | undefined {
  try {
    // 用水参数信息 (0x14)
    if (paramType === 0x14) {
      if (buf.length < 20) return undefined;
      return {
        enable: buf.readUInt16BE(0),
        sensorType: buf.readUInt8(2),
        range: buf.readUInt8(3),
        thresholdUp: buf.readUInt16BE(4),
        thresholdDown: buf.readUInt16BE(6),
        uploadStep: buf.readUInt16BE(8),
        waveAlarmEnabled: buf.readUInt8(10),
        reserve: buf.readUInt8(11),
        sampleCycle: buf.readUInt16BE(12),
        waveCycle: buf.readUInt16BE(14),
        heartbeatCycle: buf.readUInt16BE(16),
      };
    }

    // 高级水压 (0x23) - 变长数据为 N * 2byte 历史值
    if (paramType === 0x23) {
      const values: number[] = [];
      for (let i = 0; i < buf.length; i += 2) {
        if (i + 1 < buf.length) {
          values.push(buf.readUInt16BE(i));
        }
      }
      return { historyValues: values, currentKpa: values[0] ?? null };
    }

    // 水压 (0x02) 变长数据
    if (paramType === 0x02) {
      const values: number[] = [];
      for (let i = 0; i < buf.length; i += 2) {
        if (i + 1 < buf.length) {
          values.push(buf.readUInt16BE(i) * 0.1); // MPa
        }
      }
      return { historyValues: values, currentMpa: values[0] ?? null };
    }

    // 液位 (0x03) 变长数据
    if (paramType === 0x03) {
      const values: number[] = [];
      for (let i = 0; i < buf.length; i += 2) {
        if (i + 1 < buf.length) {
          values.push(buf.readUInt16BE(i) * 0.01); // m
        }
      }
      return { historyValues: values, currentM: values[0] ?? null };
    }

    return { rawHex: buf.toString('hex'), length: buf.length };
  } catch {
    return { rawHex: buf.toString('hex'), length: buf.length };
  }
}

/** 将 ISNB 解析结果转换为平台 data 对象（用于告警检测） */
export function isnbToPlatformData(frame: IsnbParsedFrame): Record<string, unknown> {
  const data: Record<string, unknown> = {
    _isnbParsed: true,
    _messageId: frame.messageId,
    _messageType: frame.messageTypeName,
    _devType: frame.devType,
    _devTypeName: frame.devTypeName,
    _imei: frame.imei,
    _time: frame.time,
    _rsrp: frame.rsrp,
    _snr: frame.snr,
    alarm: frame.hasAlarm ? 1 : 0,
    fault: frame.hasFault ? 1 : 0,
    shield: frame.shield,
  };

  for (const ch of frame.channels) {
    const prefix = ch.channelNo > 1 ? `ch${ch.channelNo}_` : '';

    // 参数值
    if (ch.paramValue !== null) {
      if (ch.paramType === 0x02) {
        data[`${prefix}pressure`] = ch.paramValue; // MPa (0.1)
        data[`${prefix}pressureKpa`] = (ch.rawParamValue ?? 0) * 100; // kPa
      } else if (ch.paramType === 0x23) {
        data[`${prefix}pressure`] = (ch.rawParamValue ?? 0) * 0.001; // MPa
        data[`${prefix}pressureKpa`] = ch.paramValue; // kPa
      } else if (ch.paramType === 0x03) {
        data[`${prefix}level`] = ch.paramValue; // m (0.01)
      } else if (ch.paramType === 0x04) {
        data[`${prefix}temperature`] = ch.paramValue; // °C (0.1)
      } else if (ch.paramType === 0x15) {
        data[`${prefix}battery`] = ch.paramValue; // %
      } else if (ch.paramType === 0x01) {
        data[`${prefix}gasDensity`] = ch.paramValue; // %LEL
      } else if (ch.paramType === 0x17) {
        data[`${prefix}smokeDensity`] = ch.paramValue; // %
      } else {
        data[`${prefix}param_${ch.paramType.toString(16)}`] = ch.paramValue;
      }
    }

    // 变长数据中的当前值
    if (ch.varData) {
      if (ch.paramType === 0x23 && 'currentKpa' in ch.varData) {
        data[`${prefix}pressureKpa`] = ch.varData.currentKpa;
        data[`${prefix}pressure`] = (ch.varData.currentKpa as number) * 0.001;
        data[`${prefix}history`] = ch.varData.historyValues;
      }
      if (ch.paramType === 0x02 && 'currentMpa' in ch.varData) {
        data[`${prefix}pressure`] = ch.varData.currentMpa;
        data[`${prefix}history`] = ch.varData.historyValues;
      }
      if (ch.paramType === 0x03 && 'currentM' in ch.varData) {
        data[`${prefix}level`] = ch.varData.currentM;
        data[`${prefix}history`] = ch.varData.historyValues;
      }
      if (ch.paramType === 0x14) {
        data[`${prefix}waterConfig`] = ch.varData;
      }
    }

    // 事件位解析
    if (ch.eventType === 0x64 && ch.eventValue > 0) {
      const alarms = parseEventBits(ch.eventValue, ALARM_BITS);
      data[`${prefix}alarmBits`] = alarms;
      if (alarms.length > 0) {
        data[`${prefix}alarmDesc`] = alarms.join(', ');
      }
    }
    if (ch.eventType === 0x63 && ch.eventValue > 0) {
      const faults = parseEventBits(ch.eventValue, FAULT_BITS);
      data[`${prefix}faultBits`] = faults;
      if (faults.length > 0) {
        data[`${prefix}faultDesc`] = faults.join(', ');
      }
    }
  }

  return data;
}
