/**
 * ═══════════════════════════════════════════════════════════════════
 * IndexedDB 数据库层 - 智慧消防平台本地数据库
 * 
 * 优化点：
 * 1. 全局单例连接池，避免每次事务新建/关闭连接
 * 2. 提供 cursor 分页（大数据量时避免 getAll 全量加载）
 * 3. search/paginate 优先使用内存过滤（当前数据量下足够快）
 * 4. 新增索引支持，加速查询性能
 * 5. 新增批量操作事务优化
 * 6. 新增本地缓存层
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Unit, Device, Alarm, ControlRoom, WorkOrder, MaintRecord, MaintContract, PatrolPlan, PatrolRecord, Hazard, User, Role, Plan, Drill, Inspection, Notification, DutySchedule, Document, SystemLog, IoTDevice, Personnel, Camera, FloorPlan, FloorDevice, DutyShift, DutyHandover, AlarmSnapshot, ControlRoomConfig, GB28181Device, SIPServerConfig } from '@/types/db';
import { logger } from '@/lib/logger';

const DB_NAME = 'SmartFirePlatformDB';
const DB_VERSION = 8; // 升级清空 gb28181_devices，强制重新种子

/* 所有表名 */
export const DB_STORES = [
  'units', 'devices', 'alarms', 'control_rooms', 'work_orders',
  'maint_records', 'maint_contracts', 'patrol_plans', 'patrol_records',
  'hazards', 'users', 'roles', 'plans', 'drills', 'inspections',
  'notifications', 'duty_schedules', 'documents', 'system_logs',
  'iot_devices', 'personnel', 'cameras', 'floor_plans', 'floor_devices',
  'duty_shifts', 'duty_handovers', 'alarm_snapshots', 'control_room_configs',
  'gb28181_devices', 'sip_server_configs',
];

/* 索引配置：storeName -> [{ name, keyPath, options }] */
const STORE_INDEXES: Record<string, { name: string; keyPath: string | string[]; options?: IDBIndexParameters }[]> = {
  devices: [
    { name: 'idx_unitId', keyPath: 'unitId' },
    { name: 'idx_status', keyPath: 'status' },
    { name: 'idx_type', keyPath: 'type' },
  ],
  alarms: [
    { name: 'idx_status', keyPath: 'status' },
    { name: 'idx_type', keyPath: 'alarmType' },
    { name: 'idx_createdAt', keyPath: 'createdAt' },
  ],
  units: [
    { name: 'idx_status', keyPath: 'status' },
  ],
  work_orders: [
    { name: 'idx_status', keyPath: 'status' },
  ],
  users: [
    { name: 'idx_username', keyPath: 'username', options: { unique: true } },
  ],
};

type StoreName = string;

/* ═══════ 全局单例连接池 ═══════ */
let dbInstance: IDBDatabase | null = null;
let dbOpening = false;
let dbWaiters: Array<{ resolve: (db: IDBDatabase) => void; reject: (reason?: unknown) => void }> = [];

function rejectAllDbWaiters(reason: unknown) {
  const q = dbWaiters;
  dbWaiters = [];
  q.forEach((w) => w.reject(reason));
}

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (dbOpening) {
    return new Promise((resolve, reject) => {
      dbWaiters.push({ resolve, reject });
    });
  }

  dbOpening = true;
  return getDBInternal(0);
}

function getDBInternal(retryCount: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (retryCount > 2) {
      dbOpening = false;
      const err = new Error('IndexedDB 打开失败，已重试3次仍无法创建必要的表');
      rejectAllDbWaiters(err);
      reject(err);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      dbOpening = false;
      const err = request.error ?? new Error('IndexedDB open error');
      rejectAllDbWaiters(err);
      reject(err);
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      const missingStores = DB_STORES.filter(s => !dbInstance!.objectStoreNames.contains(s));
      if (missingStores.length > 0) {
        logger.error(`[DB.integrity] missing stores=`, missingStores, 'please clear site data and refresh');
        dbOpening = false;
        const err = new Error(`IndexedDB store缺失: ${missingStores.join(', ')}，请清除站点数据后刷新页面`);
        rejectAllDbWaiters(err);
        reject(err);
        return;
      }
      dbInstance.onclose = () => { dbInstance = null; };
      dbOpening = false;
      dbWaiters.forEach((w) => w.resolve(dbInstance!));
      dbWaiters = [];
      resolve(dbInstance);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = (event.target as IDBOpenDBRequest).transaction;
      const oldVersion = event.oldVersion;
      logger.info('[DB.upgrade] oldVersion=', oldVersion, 'newVersion=', DB_VERSION, 'stores=', Array.from(db.objectStoreNames));
      if (tx) {
        tx.onerror = () => logger.error('[DB.upgrade] transaction error=', tx.error);
        tx.onabort = () => logger.error('[DB.upgrade] transaction aborted');
      }
      DB_STORES.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          try {
            logger.info('[DB.upgrade] creating store:', store);
            const objectStore = db.createObjectStore(store, { keyPath: 'id' });
            // 创建索引
            const indexes = STORE_INDEXES[store] || [];
            indexes.forEach(idx => {
              try {
                objectStore.createIndex(idx.name, idx.keyPath, idx.options);
              } catch (e) {
                logger.error('[DB.upgrade] failed to create index', store, idx.name, e);
              }
            });
          } catch (e) {
            logger.error('[DB.upgrade] failed to create store', store, e);
          }
        } else if (oldVersion < DB_VERSION) {
          // 版本升级时检查并创建缺失的索引
          try {
            const tx2 = (event.target as IDBOpenDBRequest).transaction;
            if (tx2) {
              const objectStore = tx2.objectStore(store);
              const indexes = STORE_INDEXES[store] || [];
              indexes.forEach(idx => {
                if (!objectStore.indexNames.contains(idx.name)) {
                  try {
                    objectStore.createIndex(idx.name, idx.keyPath, idx.options);
                  } catch (e) {
                    logger.error('[DB.upgrade] failed to create index on upgrade', store, idx.name, e);
                  }
                }
              });
            }
          } catch (e) {
            logger.error('[DB.upgrade] failed to upgrade indexes for', store, e);
          }
        }
      });
      // 版本6/7/8：清空 gb28181_devices 旧种子数据
      if (oldVersion < 8 && db.objectStoreNames.contains('gb28181_devices')) {
        try {
          const tx2 = (event.target as IDBOpenDBRequest).transaction;
          if (tx2) {
            const store = tx2.objectStore('gb28181_devices');
            store.clear();
            logger.info('[DB.upgrade] cleared gb28181_devices for v8');
          }
        } catch (e) {
          logger.error('[DB.upgrade] failed to clear gb28181_devices', e);
        }
      }
      logger.info('[DB.upgrade] after upgrade stores=', Array.from(db.objectStoreNames));
    };
  });
}

/** 关闭全局连接（用于测试或重置） */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/* ═══════ 分页参数 ═══════ */
export interface PaginateParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
}

export interface PaginateResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ═══════ 内存缓存层 ═══════ */
class MemoryCache<T> {
  private cache = new Map<string, { data: T; expires: number }>();
  private defaultTTL = 5000; // 5秒默认缓存

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T, ttl?: number): void {
    this.cache.set(key, { data, expires: Date.now() + (ttl ?? this.defaultTTL) });
  }

  invalidate(storeName?: string): void {
    if (!storeName) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(storeName + ':')) this.cache.delete(key);
    }
  }
}

const globalCache = new MemoryCache<any>();

/* ═══════ 通用DAO基类 ═══════ */
class BaseDAO<T extends { id: string }> {
  private storeName: string;
  constructor(storeName: string) {
    this.storeName = storeName;
  }

  private async transaction(mode: IDBTransactionMode): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> {
    const db = await getDB();
    const tx = db.transaction(this.storeName, mode);
    const store = tx.objectStore(this.storeName);
    return { store, tx };
  }

  /* ── CRUD ── */
  async getAll(): Promise<T[]> {
    const cacheKey = `${this.storeName}:all`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    const { store } = await this.transaction('readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const result = req.result as T[];
        globalCache.set(cacheKey, result, 2000);
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getById(id: string): Promise<T | null> {
    const cacheKey = `${this.storeName}:id:${id}`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    const { store } = await this.transaction('readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          globalCache.set(cacheKey, req.result as T, 3000);
          resolve(req.result as T);
        } else if (!isNaN(Number(id))) {
          const req2 = store.get(Number(id));
          req2.onsuccess = () => {
            if (req2.result) globalCache.set(cacheKey, req2.result as T, 3000);
            resolve(req2.result as T || null);
          };
          req2.onerror = () => reject(req2.error);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async create(data: T): Promise<T> {
    const record = { ...(data as any), id: String((data as any).id) };
    const { store, tx } = await this.transaction('readwrite');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        globalCache.invalidate(this.storeName);
        resolve(record as T);
      };
      tx.onerror = () => reject(tx.error);
      const req = store.put(record);
      req.onerror = () => reject(req.error);
    });
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
    const { store, tx } = await this.transaction('readwrite');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        globalCache.invalidate(this.storeName);
        resolve(updated as T);
      };
      tx.onerror = () => reject(tx.error);
      const req = store.put(updated);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(id: string): Promise<boolean> {
    const { store, tx } = await this.transaction('readwrite');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        globalCache.invalidate(this.storeName);
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
      const req = store.delete(id);
      req.onsuccess = () => {
        if (!isNaN(Number(id))) store.delete(Number(id));
      };
      req.onerror = () => reject(req.error);
    });
  }

  /* ── 批量操作 ── */
  async batchCreate(items: T[]): Promise<number> {
    if (items.length === 0) return 0;
    const { store, tx } = await this.transaction('readwrite');
    let count = 0;
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        globalCache.invalidate(this.storeName);
        resolve(count);
      };
      tx.onerror = () => reject(tx.error);
      items.forEach(item => {
        const record = { ...(item as any), id: String((item as any).id) };
        const req = store.put(record);
        req.onsuccess = () => { count++; };
        req.onerror = () => reject(req.error);
      });
    });
  }

  async batchDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const { store, tx } = await this.transaction('readwrite');
    let count = 0;
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        globalCache.invalidate(this.storeName);
        resolve(count);
      };
      tx.onerror = () => reject(tx.error);
      ids.forEach(id => {
        const req = store.delete(id);
        req.onsuccess = () => { count++; };
        req.onerror = () => reject(req.error);
      });
    });
  }

  /* ── 搜索 ── */
  async search(keyword: string, fields: (keyof T)[]): Promise<T[]> {
    const all = await this.getAll();
    if (!keyword) return all;
    const q = keyword.toLowerCase();
    return all.filter(item =>
      fields.some(f => String(item[f] ?? '').toLowerCase().includes(q))
    );
  }

  /* ── 内存分页（适用于数据量 < 5000 的场景） ── */
  async paginate(params: PaginateParams): Promise<PaginateResult<T>> {
    let list = await this.getAll();
    const { page = 1, pageSize = 10, keyword, sortBy, sortOrder = 'asc', filter } = params;

    if (filter) {
      list = list.filter(item =>
        Object.entries(filter).every(([key, value]) => {
          if (value === undefined || value === null || value === '') return true;
          return (item as any)[key] === value;
        })
      );
    }

    if (keyword) {
      const q = keyword.toLowerCase();
      list = list.filter(item =>
        Object.values(item as any).some((v: any) => String(v).toLowerCase().includes(q))
      );
    }

    if (sortBy) {
      list.sort((a, b) => {
        const av = String((a as any)[sortBy] ?? '');
        const bv = String((b as any)[sortBy] ?? '');
        return sortOrder === 'asc' ? av.localeCompare(bv, 'zh') : bv.localeCompare(av, 'zh');
      });
    }

    const total = list.length;
    const start = (page - 1) * pageSize;
    return {
      list: list.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /* ── Cursor 真分页（大数据量时避免 getAll 内存爆炸） ── */
  async paginateCursor(params: PaginateParams): Promise<PaginateResult<T>> {
    const { page = 1, pageSize = 10, keyword } = params;
    const db = await getDB();
    const total = await this.count();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.openCursor();

      const list: T[] = [];
      let skipped = 0;
      const skip = (page - 1) * pageSize;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (!cursor) {
          resolve({ list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
          return;
        }

        const value = cursor.value as T;

        if (keyword) {
          const q = keyword.toLowerCase();
          const match = Object.values(value as any).some((v: any) => String(v).toLowerCase().includes(q));
          if (!match) {
            cursor.continue();
            return;
          }
        }

        if (skipped < skip) {
          skipped++;
          cursor.continue();
          return;
        }

        if (list.length < pageSize) {
          list.push(value);
          cursor.continue();
          return;
        }

        resolve({ list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
      };

      request.onerror = () => reject(request.error);
    });
  }

  /* ── 索引查询 ── */
  async findByIndex(indexName: string, value: any): Promise<T[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      if (!store.indexNames.contains(indexName)) {
        resolve([]);
        return;
      }
      const index = store.index(indexName);
      const req = index.getAll(value);
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  /* ── 计数 ── */
  async count(): Promise<number> {
    const { store } = await this.transaction('readonly');
    return new Promise((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /* ── 清空 ── */
  async clear(): Promise<void> {
    const { store, tx } = await this.transaction('readwrite');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        globalCache.invalidate(this.storeName);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      const req = store.clear();
      req.onerror = () => reject(req.error);
    });
  }
}

/* ═══════ 各表DAO实例 ═══════ */
export const UnitDAO = new BaseDAO<Unit>('units');
export const DeviceDAO = new BaseDAO<Device>('devices');
export const AlarmDAO = new BaseDAO<Alarm>('alarms');
export const ControlRoomDAO = new BaseDAO<ControlRoom>('control_rooms');
export const WorkOrderDAO = new BaseDAO<WorkOrder>('work_orders');
export const MaintRecordDAO = new BaseDAO<MaintRecord>('maint_records');
export const MaintContractDAO = new BaseDAO<MaintContract>('maint_contracts');
export const PatrolPlanDAO = new BaseDAO<PatrolPlan>('patrol_plans');
export const PatrolRecordDAO = new BaseDAO<PatrolRecord>('patrol_records');
export const HazardDAO = new BaseDAO<Hazard>('hazards');
export const UserDAO = new BaseDAO<User>('users');
export const RoleDAO = new BaseDAO<Role>('roles');
export const PlanDAO = new BaseDAO<Plan>('plans');
export const DrillDAO = new BaseDAO<Drill>('drills');
export const InspectionDAO = new BaseDAO<Inspection>('inspections');
export const NotificationDAO = new BaseDAO<Notification>('notifications');
export const DutyScheduleDAO = new BaseDAO<DutySchedule>('duty_schedules');
export const DocumentDAO = new BaseDAO<Document>('documents');
export const SystemLogDAO = new BaseDAO<SystemLog>('system_logs');
export const IoTDeviceDAO = new BaseDAO<IoTDevice>('iot_devices');
export const PersonnelDAO = new BaseDAO<Personnel>('personnel');
export const CameraDAO = new BaseDAO<Camera>('cameras');
export const FloorPlanDAO = new BaseDAO<FloorPlan>('floor_plans');
export const FloorDeviceDAO = new BaseDAO<FloorDevice>('floor_devices');
export const DutyShiftDAO = new BaseDAO<DutyShift>('duty_shifts');
export const DutyHandoverDAO = new BaseDAO<DutyHandover>('duty_handovers');
export const AlarmSnapshotDAO = new BaseDAO<AlarmSnapshot>('alarm_snapshots');
export const ControlRoomConfigDAO = new BaseDAO<ControlRoomConfig>('control_room_configs');
export const GB28181DeviceDAO = new BaseDAO<GB28181Device>('gb28181_devices');
export const SIPServerConfigDAO = new BaseDAO<SIPServerConfig>('sip_server_configs');

/* ═══════ 数据库工具 ═══════ */
export const DBUtils = {
  /* 初始化所有表数据（seed）—— 已禁用，系统不再注入任何静态数据 */
  async seedDatabase(): Promise<void> {
    // 接入测试阶段：所有数据须通过业务操作录入，不再自动注入种子数据
    logger.info('[DB.seed] seedDatabase is disabled in production/testing mode');
  },

  /* 重置数据库 */
  async resetDatabase(): Promise<void> {
    await Promise.all(DB_STORES.map(s => new BaseDAO(s as StoreName).clear()));
    globalCache.invalidate();
  },

  /* 获取数据库统计 */
  async getStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    await Promise.all(DB_STORES.map(async s => {
      const count = await new BaseDAO(s as StoreName).count();
      stats[s] = count;
    }));
    return stats;
  },

  /* 清除缓存 */
  clearCache(): void {
    globalCache.invalidate();
  },
};