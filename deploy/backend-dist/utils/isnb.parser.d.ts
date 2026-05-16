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
/** 判断是否为可能的 ISNB 十六进制帧 */
export declare function isIsnbHexFrame(input: string): boolean;
/** 从 CTWing 推送体中提取可能的 ISNB 原始帧 */
export declare function extractIsnbHexFromCtwing(body: Record<string, unknown>): string | null;
/** 解析 ISNB 上行帧 */
export declare function parseIsnbFrame(hexStr: string): IsnbParsedFrame | null;
/** 将 ISNB 解析结果转换为平台 data 对象（用于告警检测） */
export declare function isnbToPlatformData(frame: IsnbParsedFrame): Record<string, unknown>;
//# sourceMappingURL=isnb.parser.d.ts.map