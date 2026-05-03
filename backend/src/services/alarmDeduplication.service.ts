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
import logger from '@/config/logger';

export interface AlarmDeduplicationConfig {
  // 告警类型对应的去重窗口（秒）
  dedupWindow: Record<number, number>;
  // 告警升级间隔（秒）
  escalationInterval: Record<number, number>;
  // 最大升级次数
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

const DEFAULT_CONFIG: AlarmDeduplicationConfig = {
  dedupWindow: {
    1: 60,      // 火警：1分钟去重
    2: 300,     // 故障：5分钟去重
    3: 600,     // 监管：10分钟去重
    4: 600,     // 屏蔽：10分钟去重
    5: 60,      // 手动报警：1分钟去重
  },
  escalationInterval: {
    1: 300,     // 火警：每5分钟升级一次
    2: 1800,    // 故障：每30分钟升级一次
    3: 3600,    // 监管：每小时升级一次
    4: 3600,    // 屏蔽：每小时升级一次
  },
  maxEscalationLevel: 3,
};

export class AlarmDeduplicationService {
  private static instance: AlarmDeduplicationService;
  private redis: Redis;
  private config: AlarmDeduplicationConfig;
  private readonly CACHE_PREFIX = 'alarm:dedup:';

  private constructor(redis: Redis, config?: Partial<AlarmDeduplicationConfig>) {
    this.redis = redis;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public static getInstance(redis: Redis): AlarmDeduplicationService {
    if (!AlarmDeduplicationService.instance) {
      AlarmDeduplicationService.instance = new AlarmDeduplicationService(redis);
    }
    return AlarmDeduplicationService.instance;
  }

  /**
   * 生成告警去重Key
   * 维度：设备ID + 告警类型 + 回路号 + 点位号
   */
  private getDeduplicationKey(
    deviceId: number,
    alarmType: number,
    loopNo: number = 0,
    pointNo: number = 0
  ): string {
    return `${this.CACHE_PREFIX}${deviceId}:${alarmType}:${loopNo}:${pointNo}`;
  }

  /**
   * 检查是否为重复告警
   * @returns 如果是重复告警，返回缓存的告警信息；如果是新告警，返回null
   */
  async checkAndUpdate(
    deviceId: number,
    alarmType: number,
    loopNo: number = 0,
    pointNo: number = 0
  ): Promise<AlarmCacheItem | null> {
    const key = this.getDeduplicationKey(deviceId, alarmType, loopNo, pointNo);
    const now = Date.now();

    // 尝试获取缓存
    const cachedStr = await this.redis.get(key);
    if (cachedStr) {
      const cached: AlarmCacheItem = JSON.parse(cachedStr);
      
      // 如果已经处理，不再去重，让它创建新告警
      if (cached.handled) {
        logger.debug(`[告警去重] 告警已处理，创建新告警: device=${deviceId}, type=${alarmType}`);
        return null;
      }

      // 检查是否在去重窗口内
      const dedupWindow = this.config.dedupWindow[alarmType] || 300;
      const isInWindow = (now - cached.lastOccurTime) < dedupWindow * 1000;

      if (isInWindow) {
        // 在去重窗口内，更新时间和次数
        cached.lastOccurTime = now;
        cached.occurrenceCount++;

        // 检查是否需要升级
        const escalationInterval = this.config.escalationInterval[alarmType] || 1800;
        const shouldEscalate = 
          !cached.handled &&
          cached.currentLevel < this.config.maxEscalationLevel &&
          (now - cached.lastEscalationTime) > escalationInterval * 1000;

        if (shouldEscalate) {
          cached.currentLevel++;
          cached.lastEscalationTime = now;
          logger.info(`[告警升级] 告警升级: alarmId=${cached.alarmId}, level=${cached.currentLevel}`);
        }

        // 更新缓存
        const ttl = Math.max(dedupWindow, escalationInterval) * 2;
        await this.redis.setex(key, ttl, JSON.stringify(cached));

        logger.debug(`[告警去重] 重复告警: device=${deviceId}, type=${alarmType}, count=${cached.occurrenceCount}`);
        return cached;
      }
    }

    // 新告警或超出去重窗口，返回null
    return null;
  }

  /**
   * 注册新告警到缓存
   */
  async registerNewAlarm(
    alarmId: number,
    alarmNo: string,
    deviceId: number,
    alarmType: number,
    alarmLevel: number,
    loopNo: number = 0,
    pointNo: number = 0
  ): Promise<void> {
    const key = this.getDeduplicationKey(deviceId, alarmType, loopNo, pointNo);
    const now = Date.now();
    const dedupWindow = this.config.dedupWindow[alarmType] || 300;
    const escalationInterval = this.config.escalationInterval[alarmType] || 1800;

    const item: AlarmCacheItem = {
      alarmId,
      alarmNo,
      deviceId,
      alarmType,
      firstOccurTime: now,
      lastOccurTime: now,
      occurrenceCount: 1,
      currentLevel: alarmLevel,
      lastEscalationTime: now,
      handled: false,
    };

    // 缓存TTL设置为去重窗口和升级间隔的最大值的2倍
    const ttl = Math.max(dedupWindow, escalationInterval) * 2;
    await this.redis.setex(key, ttl, JSON.stringify(item));

    logger.debug(`[告警去重] 注册新告警: alarmId=${alarmId}, device=${deviceId}, type=${alarmType}`);
  }

  /**
   * 标记告警为已处理
   */
  async markAsHandled(alarmId: number): Promise<void> {
    // 扫描所有缓存找到对应的告警
    // 注意：生产环境建议维护一个 alarmId -> key 的反向索引
    const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
    for (const key of keys) {
      const cachedStr = await this.redis.get(key);
      if (cachedStr) {
        const cached: AlarmCacheItem = JSON.parse(cachedStr);
        if (cached.alarmId === alarmId) {
          cached.handled = true;
          // 更新后保留1小时便于追溯
          await this.redis.setex(key, 3600, JSON.stringify(cached));
          logger.info(`[告警去重] 标记告警已处理: alarmId=${alarmId}`);
          break;
        }
      }
    }
  }

  /**
   * 获取当前活跃告警统计
   */
  async getActiveAlarmsStats(): Promise<{
    total: number;
    byType: Record<number, number>;
    byLevel: Record<number, number>;
  }> {
    const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
    const stats = {
      total: 0,
      byType: {} as Record<number, number>,
      byLevel: {} as Record<number, number>,
    };

    for (const key of keys) {
      const cachedStr = await this.redis.get(key);
      if (cachedStr) {
        const cached: AlarmCacheItem = JSON.parse(cachedStr);
        if (!cached.handled) {
          stats.total++;
          stats.byType[cached.alarmType] = (stats.byType[cached.alarmType] || 0) + 1;
          stats.byLevel[cached.currentLevel] = (stats.byLevel[cached.currentLevel] || 0) + 1;
        }
      }
    }

    return stats;
  }

  /**
   * 清除所有告警缓存（调试用）
   */
  async clearAll(): Promise<void> {
    const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    logger.info(`[告警去重] 已清除 ${keys.length} 条告警缓存`);
  }
}

export default AlarmDeduplicationService;
