/**
 * ═══════════════════════════════════════════════════════════════════
 * Redis 缓存增强服务
 * 设备在线状态、传感器最新值、告警实时窗口、大屏统计缓存
 * ═══════════════════════════════════════════════════════════════════
 */
import redis from '@/config/redis';

const TTL = {
  DEVICE_ONLINE: 300,       // 5 分钟
  SENSOR_LATEST: 3600,      // 1 小时
  ALARM_WINDOW: 86400,      // 1 天
  DASHBOARD_STATS: 60,      // 1 分钟
  TREND_DATA: 300,          // 5 分钟
};

/** 设置设备在线状态 */
export async function setDeviceOnline(deviceId: number | string, unitId: number | string | null, status: 'online' | 'offline'): Promise<void> {
  const key = `device:online:${deviceId}`;
  await redis.setex(key, TTL.DEVICE_ONLINE, status);
  if (unitId != null) {
    const setKey = `device:online:unit:${unitId}`;
    if (status === 'online') {
      await redis.sadd(setKey, String(deviceId));
    } else {
      await redis.srem(setKey, String(deviceId));
    }
  }
}

/** 获取设备在线状态 */
export async function getDeviceOnline(deviceId: number | string): Promise<'online' | 'offline' | null> {
  const val = await redis.get(`device:online:${deviceId}`);
  if (val === 'online' || val === 'offline') return val;
  return null;
}

/** 获取单位下在线设备数量 */
export async function getUnitOnlineCount(unitId: number | string): Promise<number> {
  return redis.scard(`device:online:unit:${unitId}`);
}

/** 获取单位下在线设备列表 */
export async function getUnitOnlineDevices(unitId: number | string): Promise<string[]> {
  return redis.smembers(`device:online:unit:${unitId}`);
}

/** 设置传感器最新值 */
export async function setSensorLatest(iotDeviceId: number | string, data: Record<string, unknown>): Promise<void> {
  await redis.setex(`sensor:latest:${iotDeviceId}`, TTL.SENSOR_LATEST, JSON.stringify(data));
}

/** 获取传感器最新值 */
export async function getSensorLatest(iotDeviceId: number | string): Promise<Record<string, unknown> | null> {
  const val = await redis.get(`sensor:latest:${iotDeviceId}`);
  if (!val) return null;
  try {
    return JSON.parse(val) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** 添加告警到当日实时窗口 */
export async function addAlarmWindow(alarmId: number | string, score: number = Date.now()): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  await redis.zadd(`alarm:window:${date}`, score, String(alarmId));
  await redis.expire(`alarm:window:${date}`, TTL.ALARM_WINDOW);
}

/** 获取当日告警窗口 ID 列表 */
export async function getAlarmWindow(date?: string, limit: number = 100): Promise<string[]> {
  const d = date || new Date().toISOString().slice(0, 10);
  return redis.zrevrange(`alarm:window:${d}`, 0, limit - 1);
}

/** 设置大屏统计缓存 */
export async function setDashboardStats(type: string, data: unknown): Promise<void> {
  await redis.setex(`dashboard:stats:${type}`, TTL.DASHBOARD_STATS, JSON.stringify(data));
}

/** 获取大屏统计缓存 */
export async function getDashboardStats<T>(type: string): Promise<T | null> {
  const val = await redis.get(`dashboard:stats:${type}`);
  if (!val) return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

/** 设置趋势数据缓存 */
export async function setTrendCache(metric: string, deviceId: string | number, data: unknown): Promise<void> {
  await redis.setex(`trend:${metric}:${deviceId}`, TTL.TREND_DATA, JSON.stringify(data));
}

/** 获取趋势数据缓存 */
export async function getTrendCache<T>(metric: string, deviceId: string | number): Promise<T | null> {
  const val = await redis.get(`trend:${metric}:${deviceId}`);
  if (!val) return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

/** 批量设置设备在线状态（心跳检测后批量写入） */
export async function batchSetDeviceOnline(
  entries: Array<{ deviceId: string | number; unitId?: string | number | null; status: 'online' | 'offline' }>
): Promise<void> {
  const pipeline = redis.pipeline();
  for (const e of entries) {
    const key = `device:online:${e.deviceId}`;
    pipeline.setex(key, TTL.DEVICE_ONLINE, e.status);
    if (e.unitId != null) {
      const setKey = `device:online:unit:${e.unitId}`;
      if (e.status === 'online') {
        pipeline.sadd(setKey, String(e.deviceId));
      } else {
        pipeline.srem(setKey, String(e.deviceId));
      }
    }
  }
  await pipeline.exec();
}
