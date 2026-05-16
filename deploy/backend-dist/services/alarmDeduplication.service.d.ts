/**
 * ═══════════════════════════════════════════════════════════════════
 * 告警去重与升级服务
 *
 * 功能：
 * - 同设备同类型告警在时间窗口内只创建一次，避免告警风暴
 * - 告警持续未处理时自动升级级别（普通→严重→紧急）
 * - 统计告警发生次数，帮助分析高频故障点
 *
 * 设计原则：
 * - 火警：1分钟内去重，每5分钟升级一次
 * - 故障：5分钟内去重，每30分钟升级一次
 * - 其他：10分钟内去重，每小时升级一次
 * ═══════════════════════════════════════════════════════════════════
 */
import { Redis } from 'ioredis';
export interface AlarmDeduplicationConfig {
    dedupWindow: Record<number, number>;
    escalationInterval: Record<number, number>;
    maxEscalationLevel: number;
}
export interface AlarmCacheItem {
    alarmId: number;
    alarmNo: string;
    deviceId: number;
    alarmType: number;
    firstOccurTime: number;
    lastOccurTime: number;
    occurrenceCount: number;
    currentLevel: number;
    lastEscalationTime: number;
    handled: boolean;
}
export declare class AlarmDeduplicationService {
    private static instance;
    private redis;
    private config;
    private readonly CACHE_PREFIX;
    private constructor();
    static getInstance(redis: Redis): AlarmDeduplicationService;
    /**
     * 生成告警去重Key
     * 维度：设备ID + 告警类型 + 回路号 + 点位号
     */
    private getDeduplicationKey;
    /**
     * 检查是否为重复告警
     * @returns 如果是重复告警，返回缓存的告警信息；如果是新告警，返回null
     */
    checkAndUpdate(deviceId: number, alarmType: number, loopNo?: number, pointNo?: number): Promise<AlarmCacheItem | null>;
    /**
     * 注册新告警到缓存
     */
    registerNewAlarm(alarmId: number, alarmNo: string, deviceId: number, alarmType: number, alarmLevel: number, loopNo?: number, pointNo?: number): Promise<void>;
    /**
     * 标记告警为已处理
     */
    markAsHandled(alarmId: number): Promise<void>;
    /**
     * 获取当前活跃告警统计
     */
    getActiveAlarmsStats(): Promise<{
        total: number;
        byType: Record<number, number>;
        byLevel: Record<number, number>;
    }>;
    /**
     * 清除所有告警缓存（调试用）
     */
    clearAll(): Promise<void>;
}
export default AlarmDeduplicationService;
//# sourceMappingURL=alarmDeduplication.service.d.ts.map