interface CacheOptions {
    ttl?: number;
    key?: string;
    tag?: string;
    skipCache?: boolean;
}
/** 读取缓存 */
export declare function cacheGet<T>(tag: string, key: string): Promise<T | null>;
/** 写入缓存 */
export declare function cacheSet<T>(tag: string, key: string, value: T, ttl?: number): Promise<void>;
/** 删除缓存 */
export declare function cacheDel(tag: string, key: string): Promise<void>;
/** 按标签批量删除缓存 */
export declare function cacheDelByPattern(pattern: string): Promise<void>;
/** 缓存包装器 — 自动读写缓存 */
export declare function withCache<T>(tag: string, key: string, fn: () => Promise<T>, options?: CacheOptions): Promise<T>;
/** 仪表盘统计专用缓存标签 */
export declare const CacheTags: {
    readonly DASHBOARD: "dashboard";
    readonly UNIT_STATS: "unit_stats";
    readonly DEVICE_STATS: "device_stats";
    readonly ALARM_STATS: "alarm_stats";
    readonly SYSTEM_CONFIG: "system_config";
    readonly IOT_PROTOCOL: "iot_protocol";
};
export {};
//# sourceMappingURL=cache.d.ts.map