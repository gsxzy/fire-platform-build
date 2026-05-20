import { type IsnbParsedFrame } from '@/utils/isnb.parser';
/** 解析设备标识 */
export declare function resolveDeviceId(body: Record<string, unknown>): string;
/** 解析 CTWing 数据 */
export declare function parseCtwingBody(body: Record<string, unknown>): {
    deviceId: string;
    msgType: string;
    productId: string;
    tenantId: string;
    imei: string;
    deviceName: string;
    timestamp: number;
    data: Record<string, unknown>;
    raw: Record<string, unknown>;
    isnbFrame: IsnbParsedFrame | null;
};
/** 从 protocol_config 解析阈值 */
export declare function parseThresholds(configStr: string | null | undefined): Record<string, number>;
/** 根据 data 内容和设备类型判断告警 */
export declare function detectAlarm(data: Record<string, unknown>, deviceType: string, thresholds: Record<string, number>): {
    alarm: boolean;
    alarmType: number;
    alarmDesc: string;
};
/** 创建告警 */
export declare function createCtwingAlarm(parsed: ReturnType<typeof parseCtwingBody>, iotDevice: any): Promise<void>;
export declare function resolveIsnbDeviceType(devType?: number): string;
/** 异步处理 CTWing 消息（设备查找、告警检测、遥测保存） */
export declare function processCtwingMessage(parsed: ReturnType<typeof parseCtwingBody>): Promise<void>;
//# sourceMappingURL=ctwing.core.d.ts.map