import { type IsnbParsedFrame } from '@/utils/isnb.parser';
/** 保存 CTWing 原始推送日志 */
export declare function saveRawLog(deviceId: string, msgType: string, rawBody: unknown): Promise<void>;
/** 确保原始日志表存在 */
export declare function ensureRawLogTable(): Promise<void>;
/** 确保遥测数据表存在 */
export declare function ensureTelemetryTable(): Promise<void>;
/** 保存 ISNB 解析后的遥测数据 */
export declare function saveIsnbTelemetry(iotDeviceId: number, frame: IsnbParsedFrame): Promise<void>;
//# sourceMappingURL=ctwing.db.d.ts.map