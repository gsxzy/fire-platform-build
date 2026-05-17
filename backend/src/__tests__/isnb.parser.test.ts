import { describe, it, expect } from '../test-utils';
import { isIsnbHexFrame, parseIsnbFrame, isnbToPlatformData, extractIsnbHexFromCtwing } from '@/utils/isnb.parser';

/* ── 构造一个符合代码解析逻辑的 ISNB 帧（大端序） ── */
const SAMPLE_ISNB_HEX =
  '01' + // messageId = 定时上报
  '01' + // fixedSign = 扩展头
  '86' + // devType = 一体式用水
  '112233445566' + // MAC
  '00000000' + // time
  '00' + // devTypeEx
  '0000' + // PCI
  '00' + // SNR
  '00' + // ECL
  '0000' + // RSRP
  '00000050' + // upHeaderLen = 80 (big endian)
  '00000001' + // packageNo = 1
  '0'.repeat(40) + // QCCID (20 bytes)
  '3535353535353535353535353535353535353535' + // IMEI (20 bytes)
  '0'.repeat(40) + // IMSI (20 bytes)
  '0'.repeat(48) + // NB模块版本 (24 bytes)
  // MultiChanHeader
  '00' + // byRes
  '00' + // byMsgType
  '00' + // byShield
  '01' + // byMultiChanBodyVerson
  '0014' + // wLen = 20 (big endian)
  '0060' + // wChanRscType
  '0001' + // wChanRscValue = 1 channel
  // MultiChanBody
  '0061' + // wType = 0x61 (通道号)
  '0001' + // wValue = 1
  '0062' + // wEventType = 0x62 (状态变化)
  '0000' + // wEventValueHight
  '0000' + // wEventValue
  '0023' + // wParamType = 0x23 (高级水压 kPa)
  '002a';  // wParamValue = 42

describe('ISNB Parser', () => {
  it('isIsnbHexFrame 应识别合法 ISNB 帧', () => {
    expect(isIsnbHexFrame(SAMPLE_ISNB_HEX)).toBeTruthy();
  });

  it('isIsnbHexFrame 应拒绝非十六进制字符串', () => {
    expect(isIsnbHexFrame('not-hex')).toBeFalsy();
    expect(isIsnbHexFrame('aabbc')).toBeFalsy();
  });

  it('parseIsnbFrame 应解析出 messageId 和 devType', () => {
    const frame = parseIsnbFrame(SAMPLE_ISNB_HEX);
    expect(frame !== null).toBeTruthy();
    if (frame) {
      expect(frame.messageId).toBe(0x01);
      expect(frame.messageTypeName).toBe('定时上报');
      expect(frame.devType).toBe(0x86);
      expect(frame.devTypeName).toBe('一体式用水');
    }
  });

  it('parseIsnbFrame 应解析出通道参数（高级水压 42kPa）', () => {
    const frame = parseIsnbFrame(SAMPLE_ISNB_HEX);
    expect(frame !== null).toBeTruthy();
    if (frame) {
      expect(frame.channelCount).toBe(1);
      expect(frame.channels.length).toBe(1);
      const ch = frame.channels[0];
      expect(ch.channelNo).toBe(1);
      expect(ch.paramType).toBe(0x23);
      expect(ch.paramValue).toBe(42);
      expect(ch.paramUnit).toBe('kPa');
    }
  });

  it('isnbToPlatformData 应转换为平台数据对象', () => {
    const frame = parseIsnbFrame(SAMPLE_ISNB_HEX);
    expect(frame !== null).toBeTruthy();
    if (frame) {
      const data = isnbToPlatformData(frame);
      expect(data._messageType).toBe('定时上报');
      expect(data._devTypeName).toBe('一体式用水');
      expect((data as any).pressureKpa).toBe(42);
    }
  });

  it('extractIsnbHexFromCtwing 应从透传体中提取 hex', () => {
    const body = { data: { rawData: SAMPLE_ISNB_HEX } };
    expect(extractIsnbHexFromCtwing(body)).toBe(SAMPLE_ISNB_HEX);
  });

  it('extractIsnbHexFromCtwing 对空体应返回 null', () => {
    expect(extractIsnbHexFromCtwing({})).toBe(null);
  });
});
