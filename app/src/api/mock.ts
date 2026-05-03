/**
 * ═══════════════════════════════════════════════════════════════════
 * API Mock 服务 - 拦截所有API请求，返回IndexedDB数据
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  UnitDAO, DeviceDAO, AlarmDAO, ControlRoomDAO, WorkOrderDAO,
  NotificationDAO, IoTDeviceDAO, UserDAO, RoleDAO, PlanDAO, DrillDAO,
  InspectionDAO, DutyScheduleDAO, DocumentDAO, SystemLogDAO,
  MaintRecordDAO, MaintContractDAO, PatrolPlanDAO, PatrolRecordDAO, HazardDAO,
  PersonnelDAO, CameraDAO, FloorPlanDAO, FloorDeviceDAO, DutyShiftDAO,
  DutyHandoverDAO, AlarmSnapshotDAO, ControlRoomConfigDAO,
  GB28181DeviceDAO, SIPServerConfigDAO,
} from '@/db/Database';
import type { Unit, Device, Alarm, ControlRoom, WorkOrder, IoTDevice, User } from '@/types/db';
import type { FireHost, FireLoop, FireDevice } from '@/types/fireHost';
import { seedAll, seedControlRooms } from '@/db/seeds';
import type { QueryParams, ApiResponse } from '@/types/db';

/* ═══════ 报警主机内存存储 ═══════ */
const fireHostStore = {
  hosts: [] as FireHost[],
  loops: [] as FireLoop[],
  devices: [] as FireDevice[],
};

function initFireHostStore() {
  if (fireHostStore.hosts.length > 0) return;
  fireHostStore.hosts = [
    { id: 1, deviceId: 'HOST-001', hostCode: 'FAS-001', brand: '海湾', model: 'GST5000H', ip: '192.168.1.101', port: 502, location: 'B1消防控制室', status: 1, createdAt: '2026-01-15T08:00:00Z', updatedAt: '2026-04-20T10:30:00Z' },
    { id: 2, deviceId: 'HOST-002', hostCode: 'FAS-002', brand: '北大青鸟', model: 'JBF-11S', ip: '192.168.1.102', port: 502, location: '1F大厅', status: 1, createdAt: '2026-02-10T09:00:00Z', updatedAt: '2026-04-22T14:00:00Z' },
  ];
  fireHostStore.loops = [
    { id: 1, hostId: 1, loopNo: 1, loopName: '1层大厅回路', status: 1, createdAt: '2026-01-15T08:00:00Z' },
    { id: 2, hostId: 1, loopNo: 2, loopName: '2层办公区回路', status: 1, createdAt: '2026-01-15T08:00:00Z' },
    { id: 3, hostId: 2, loopNo: 1, loopName: '主楼回路', status: 1, createdAt: '2026-02-10T09:00:00Z' },
  ];
  fireHostStore.devices = [
    { id: 1, hostId: 1, loopNo: 1, address: 1, deviceType: '烟感探测器', location: '1F大厅东侧', remark: '', status: 1, createdAt: '2026-01-15T08:00:00Z' },
    { id: 2, hostId: 1, loopNo: 1, address: 2, deviceType: '手动报警按钮', location: '1F大厅西侧', remark: '', status: 1, createdAt: '2026-01-15T08:00:00Z' },
    { id: 3, hostId: 1, loopNo: 2, address: 1, deviceType: '温感探测器', location: '2F办公区走廊', remark: '', status: 1, createdAt: '2026-01-15T08:00:00Z' },
    { id: 4, hostId: 2, loopNo: 1, address: 1, deviceType: '声光报警器', location: '主楼入口', remark: '', status: 1, createdAt: '2026-02-10T09:00:00Z' },
  ];
}
initFireHostStore();

let seeded = false;

async function ensureSeeded() {
  if (!seeded) {
    const count = await UnitDAO.count();
    console.log('[mock.ensureSeeded] UnitDAO.count=', count, 'seeded=', seeded);
    if (count === 0) {
      console.log('[mock.ensureSeeded] seedAll() starting...');
      await seedAll();
      console.log('[mock.ensureSeeded] seedAll() done');
    } else {
      // 如果单位已存在但消控室为空，补种消控室数据
      const crCount = await ControlRoomDAO.count();
      if (crCount === 0) {
        console.log('[mock.ensureSeeded] seeding control rooms...');
        const units = await UnitDAO.getAll();
        await seedControlRooms(units);
        console.log('[mock.ensureSeeded] control rooms seeded');
      }
    }
    seeded = true;
  }
}

function ok<T>(data: T): ApiResponse<T> {
  return { code: 200, message: 'success', data, timestamp: Date.now() };
}

function err(message: string, code = 500): ApiResponse<never> {
  return { code, message, data: null as never, timestamp: Date.now() };
}

function paginated<T>(list: T[], params: QueryParams): { list: T[]; total: number; page: number; pageSize: number; totalPages: number } {
  let filtered = [...list];
  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const keyword = params.keyword;
  const sortBy = params.sortBy;
  const sortOrder = params.sortOrder || 'asc';

  if (keyword) {
    const q = keyword.toLowerCase();
    filtered = filtered.filter(item =>
      Object.values(item as Record<string, unknown>).some(v => String(v).toLowerCase().includes(q))
    );
  }

  if (sortBy) {
    filtered.sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortBy] ?? '');
      const bv = String((b as Record<string, unknown>)[sortBy] ?? '');
      return sortOrder === 'asc' ? av.localeCompare(bv, 'zh') : bv.localeCompare(av, 'zh');
    });
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return { list: filtered.slice(start, start + pageSize), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/* ───── 消控室关联数据内存缓存 ───── */
export const crHostsCache = new Map<string, any[]>();
export const crMultilineCache = new Map<string, any[]>();
export const crBusPointsCache = new Map<string, any[]>();

export function generateRoomData(roomId: string, roomData: Record<string, unknown>) {
  // unitName可用于生成个性化数据，当前作为seed保留
  void String(roomData.unitName || roomData.unit_name || roomData.name || '未知单位');
  const hostNo = String(roomData.hostNo || roomData.hostCode || '主机1');
  const controllerModel = String(roomData.controllerModel || roomData.hostModel || 'GST5000H');
  const busDevices = Number(roomData.busDevices || roomData.deviceCount || 32);

  const hostId = Date.now();
  const host = {
    id: hostId,
    room_id: roomId,
    host_name: hostNo,
    host_model: controllerModel,
    host_no: `FAS-${roomId}`,
    host_ip: '192.168.1.100',
    host_port: 502,
    protocol_type: 'ModbusTCP',
    slave_id: 1,
    loop_count: 12,
    device_count: busDevices,
    manual_mode: 0,
    silenced: 0,
    status: 1,
    duty_person: '值班员',
    duty_phone: '13911110001',
  };
  crHostsCache.set(roomId, [host]);

  const multiline = [
    { id: hostId * 10 + 1, host_id: hostId, panel_name: '多线盘', point_no: 1, point_name: '喷淋泵启动', device_type: '喷淋泵', status: 0, feedback_status: 0, fault_status: 0 },
    { id: hostId * 10 + 2, host_id: hostId, panel_name: '多线盘', point_no: 2, point_name: '消防泵启动', device_type: '消防泵', status: 0, feedback_status: 0, fault_status: 0 },
    { id: hostId * 10 + 3, host_id: hostId, panel_name: '多线盘', point_no: 3, point_name: '排烟风机启动', device_type: '排烟风机', status: 0, feedback_status: 0, fault_status: 0 },
    { id: hostId * 10 + 4, host_id: hostId, panel_name: '多线盘', point_no: 4, point_name: '正压送风机启动', device_type: '正压送风机', status: 0, feedback_status: 0, fault_status: 0 },
    { id: hostId * 10 + 5, host_id: hostId, panel_name: '多线盘', point_no: 5, point_name: '消防广播', device_type: '广播设备', status: 0, feedback_status: 0, fault_status: 0 },
  ];
  crMultilineCache.set(String(hostId), multiline);

  const locations = ['1F大厅', '2F走廊', 'B1停车场', '天台', '配电室'];
  const deviceTypes = ['烟感探测器', '温感探测器', '手动报警按钮', '输入输出模块'];
  const busPoints = Array.from({ length: Math.max(8, Math.min(64, busDevices)) }, (_, i) => ({
    id: hostId * 100 + i + 1,
    host_id: hostId,
    loop_no: Math.floor(i / 8) + 1,
    point_no: (i % 8) + 1,
    point_name: `回路${Math.floor(i / 8) + 1}_点位${(i % 8) + 1}`,
    device_type: deviceTypes[i % 4],
    install_location: locations[i % 5],
    status: i < 2 ? 1 : i < 4 ? 2 : 0,
  }));
  crBusPointsCache.set(String(hostId), busPoints);
}

/* ───── 路由映射 ───── */
export async function mockHandler(method: string, url: string, body?: unknown): Promise<ApiResponse<unknown>> {
  await ensureSeeded();

  const [path, queryStr] = url.split('?');
  const query = new URLSearchParams(queryStr || '');
  const params: QueryParams = {
    page: Number(query.get('page')) || 1,
    pageSize: Number(query.get('pageSize')) || 10,
    keyword: query.get('keyword') || undefined,
    sortBy: query.get('sortBy') || undefined,
    sortOrder: (query.get('sortOrder') as 'asc' | 'desc') || 'asc',
  };

  try {
    /* ═══════ 单位管理 ═══════ */
    if (path === '/units' || path === '/units/list') {
      if (method === 'GET') return ok(paginated(await UnitDAO.getAll(), params));
      if (method === 'POST') {
        const b = (body || {}) as Record<string, unknown>;
        const id =
          (typeof b.id === 'string' && b.id) ||
          `UNIT_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const now = new Date().toISOString();
        const rawType = b.type ?? b.supervision_level ?? 'general';
        const type: Unit['type'] =
          rawType === 'key' || rawType === 'nine-small' || rawType === 'general' ? rawType : 'general';
        const rl = (b.risk_level || 'low') as string;
        const unit: Unit = {
          id,
          name: String(b.name || '未命名单位'),
          type,
          address: String(b.address || ''),
          contact: String(b.contact_name ?? b.contact ?? ''),
          phone: String(b.contact_phone ?? b.phone ?? ''),
          riskLevel: (['extreme', 'high', 'medium', 'low'].includes(rl) ? rl : 'low') as Unit['riskLevel'],
          deviceCount: 0,
          status: 'normal',
          lat: b.lat != null && b.lat !== '' ? Number(b.lat) : undefined,
          lng: b.lng != null && b.lng !== '' ? Number(b.lng) : undefined,
          createdAt: now,
          updatedAt: now,
        };
        const created = await UnitDAO.create(unit);
        return ok({ id: created.id });
      }
    }
    if (path.startsWith('/units/')) {
      const id = path.replace('/units/', '');
      if (method === 'GET') return ok(await UnitDAO.getById(id));
      if (method === 'PUT' || method === 'PATCH') { await UnitDAO.update(id, body as Record<string, unknown>); return ok(null); }
      if (method === 'DELETE') { await UnitDAO.delete(id); return ok(null); }
    }

    /* ═══════ 设备管理 ═══════ */
    if (path === '/devices' || path === '/devices/list') {
      if (method === 'GET') return ok(paginated(await DeviceDAO.getAll(), params));
      if (method === 'POST') { await DeviceDAO.create(body as unknown as Device); return ok(null); }
    }
    if (path.startsWith('/devices/')) {
      const id = path.replace('/devices/', '');
      if (method === 'GET') return ok(await DeviceDAO.getById(id));
      if (method === 'PUT' || method === 'PATCH') { await DeviceDAO.update(id, body as Record<string, unknown>); return ok(null); }
      if (method === 'DELETE') { await DeviceDAO.delete(id); return ok(null); }
    }

    /* ═══════ 告警管理 ═══════ */
    if (path === '/alarms' || path === '/alarms/list') {
      if (method === 'GET') {
        const all = await AlarmDAO.getAll();
        const mapped = all.map(a => ({
          ...a,
          alarm_no: a.id,
          alarm_type: a.type === 'fire' ? 1 : a.type === 'fault' ? 2 : a.type === 'supervisory' ? 3 : 4,
          alarm_level: a.level === 'urgent' ? 1 : a.level === 'high' ? 2 : a.level === 'normal' ? 3 : 4,
          device_name: a.deviceName,
          unit_name: a.unitName,
          alarm_desc: a.message,
          status: a.status === 'new' ? 0 : a.status === 'confirmed' ? 1 : a.status === 'handled' ? 2 : 3,
          created_at: a.createdAt,
        }));
        return ok(paginated(mapped, params));
      }
      if (method === 'POST') { await AlarmDAO.create(body as unknown as Alarm); return ok(null); }
    }
    if (path === '/alarms/stats') {
      const all = await AlarmDAO.getAll();
      return ok({
        total: all.length,
        byType: { fire: all.filter(a => a.type === 'fire').length, fault: all.filter(a => a.type === 'fault').length, warning: all.filter(a => a.type === 'warning').length, supervisory: all.filter(a => a.type === 'supervisory').length },
        byStatus: { new: all.filter(a => a.status === 'new').length, confirmed: all.filter(a => a.status === 'confirmed').length, handled: all.filter(a => a.status === 'handled').length },
      });
    }
    if (path === '/alarms/recent') {
      const all = await AlarmDAO.getAll();
      const mapped = all.slice(0, 8).map(a => ({
        id: a.id,
        alarm_no: a.id,
        alarm_type: a.type === 'fire' ? 1 : a.type === 'fault' ? 2 : a.type === 'supervisory' ? 3 : 4,
        alarm_level: a.level === 'urgent' ? 1 : a.level === 'high' ? 2 : a.level === 'normal' ? 3 : 4,
        device_name: a.deviceName,
        unit_name: a.unitName,
        location: a.location,
        alarm_desc: a.message,
        status: a.status === 'new' ? 0 : a.status === 'confirmed' ? 1 : a.status === 'handled' ? 2 : 3,
        created_at: a.createdAt,
      }));
      return ok(mapped);
    }
    if (path === '/alarms/trend') {
      const all = await AlarmDAO.getAll();
      const hours = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      const trend = hours.map((hour, i) => {
        const count = all.filter((_, idx) => idx % hours.length === i).length;
        return { hour, alarm: Math.max(0, count) };
      });
      return ok(trend);
    }
    // 单条记录CRUD
    const alarmId = path.replace('/alarms/', '');
    if (path.startsWith('/alarms/') && alarmId && !alarmId.includes('/')) {
      if (method === 'GET') return ok(await AlarmDAO.getById(alarmId));
      if (method === 'PUT' || method === 'PATCH') { await AlarmDAO.update(alarmId, body as Record<string, unknown>); return ok(null); }
      if (method === 'DELETE') { await AlarmDAO.delete(alarmId); return ok(null); }
    }

    /* ═══════ 消控室 ═══════ */
    if (path === '/control-rooms' || path === '/control-rooms/list') {
      if (method === 'GET') return ok(paginated(await ControlRoomDAO.getAll(), params));
      if (method === 'POST') {
        const bodyData = body as Record<string, unknown>;
        await ControlRoomDAO.create(bodyData as unknown as ControlRoom);
        generateRoomData(String(bodyData.id || bodyData.unitName), bodyData);
        return ok(null);
      }
    }
    // 消控室子路由 - 优先从缓存读取，否则动态生成，最后fallback到旧体系
    if (path === '/control-rooms/hosts') {
      const roomId = query.get('roomId');
      if (roomId && crHostsCache.has(roomId)) {
        return ok(crHostsCache.get(roomId));
      }
      // 缓存未命中：从DAO获取房间并生成关联数据
      if (roomId) {
        const room = await ControlRoomDAO.getById(roomId);
        if (room) {
          generateRoomData(roomId, room as unknown as Record<string, unknown>);
          return ok(crHostsCache.get(roomId));
        }
      }
      return ok([]);
    }
    if (path === '/control-rooms/multiline') {
      const hostId = query.get('hostId');
      if (hostId && crMultilineCache.has(hostId)) {
        return ok(crMultilineCache.get(hostId));
      }
      // 缓存未命中：基于hostId生成确定性数据
      if (hostId) {
        const hid = Number(hostId) || 1;
        const multiline = [
          { id: hid * 10 + 1, host_id: hid, panel_name: '多线盘', point_no: 1, point_name: '喷淋泵启动', device_type: '喷淋泵', status: 0, feedback_status: 0, fault_status: 0 },
          { id: hid * 10 + 2, host_id: hid, panel_name: '多线盘', point_no: 2, point_name: '消防泵启动', device_type: '消防泵', status: 0, feedback_status: 0, fault_status: 0 },
          { id: hid * 10 + 3, host_id: hid, panel_name: '多线盘', point_no: 3, point_name: '排烟风机启动', device_type: '排烟风机', status: 0, feedback_status: 0, fault_status: 0 },
          { id: hid * 10 + 4, host_id: hid, panel_name: '多线盘', point_no: 4, point_name: '正压送风机启动', device_type: '正压送风机', status: 0, feedback_status: 0, fault_status: 0 },
          { id: hid * 10 + 5, host_id: hid, panel_name: '多线盘', point_no: 5, point_name: '消防广播', device_type: '广播设备', status: 0, feedback_status: 0, fault_status: 0 },
        ];
        return ok(multiline);
      }
      return ok([]);
    }
    if (path === '/control-rooms/bus-points') {
      const hostId = query.get('hostId');
      if (hostId && crBusPointsCache.has(hostId)) {
        return ok(crBusPointsCache.get(hostId));
      }
      // 缓存未命中：基于hostId生成确定性数据
      if (hostId) {
        const hid = Number(hostId) || 1;
        const locations = ['1F大厅', '2F走廊', 'B1停车场', '天台', '配电室'];
        const deviceTypes = ['烟感探测器', '温感探测器', '手动报警按钮', '输入输出模块'];
        const busPoints = Array.from({ length: 32 }, (_, i) => ({
          id: hid * 100 + i + 1,
          host_id: hid,
          loop_no: Math.floor(i / 8) + 1,
          point_no: (i % 8) + 1,
          point_name: `回路${Math.floor(i / 8) + 1}_点位${(i % 8) + 1}`,
          device_type: deviceTypes[i % 4],
          install_location: locations[i % 5],
          status: i < 2 ? 1 : i < 4 ? 2 : 0,
        }));
        return ok(busPoints);
      }
      return ok([]);
    }
    const crSubPaths = [
      '/control-rooms/silence', '/control-rooms/reset', '/control-rooms/mode',
      '/control-rooms/command-logs', '/control-rooms/shield',
      '/control-rooms/realtime', '/control-rooms/shields', '/control-rooms/videos',
      '/control-rooms/bus/control',
    ];
    const isCrSubPath = crSubPaths.includes(path) ||
      path.match(/^\/control-rooms\/hosts\/[^/]+$/) ||
      path.match(/^\/control-rooms\/multiline\/[^/]+$/) ||
      path.match(/^\/control-rooms\/bus-points\/[^/]+$/) ||
      path === '/control-rooms/multiline/control';
    if (isCrSubPath) {
      const { legacyMockData } = await import('./legacyMockData');
      const data = legacyMockData(path, method, body);
      if (data !== undefined) return ok(data);
    }
    if (path.startsWith('/control-rooms/')) {
      const id = path.replace('/control-rooms/', '');
      if (method === 'GET') {
        const room = await ControlRoomDAO.getById(id);
        if (room) return ok(room);
        // 兼容旧数据或外部传入的任意ID：生成默认房间数据
        return ok({
          id,
          unitName: id,
          unitId: id,
          hostModel: 'GST5000H',
          hostCode: '主机1',
          systemCount: 1,
          deviceCount: 32,
          status: 'normal',
          contactName: '值班员',
          contactPhone: '13911110001',
          dutyCount: 2,
          address: '消防控制室',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      if (method === 'PUT' || method === 'PATCH') { await ControlRoomDAO.update(id, body as Record<string, unknown>); return ok(null); }
      if (method === 'DELETE') {
        await ControlRoomDAO.delete(id);
        crHostsCache.delete(id);
        return ok(null);
      }
    }

    /* ═══════ 维保工单 ═══════ */
    if (path === '/work-orders' || path === '/work-orders/list') {
      if (method === 'GET') return ok(paginated(await WorkOrderDAO.getAll(), params));
      if (method === 'POST') { await WorkOrderDAO.create(body as unknown as WorkOrder); return ok(null); }
    }
    if (path.startsWith('/work-orders/')) {
      const id = path.replace('/work-orders/', '');
      if (method === 'GET') return ok(await WorkOrderDAO.getById(id));
      if (method === 'PUT' || method === 'PATCH') { await WorkOrderDAO.update(id, body as Record<string, unknown>); return ok(null); }
      if (method === 'DELETE') { await WorkOrderDAO.delete(id); return ok(null); }
    }

    /* ═══════ 通知 ═══════ */
    if (path === '/notifications' || path === '/notifications/list') {
      if (method === 'GET') return ok(paginated(await NotificationDAO.getAll(), params));
    }
    if (path === '/notifications/unread') {
      const all = await NotificationDAO.getAll();
      return ok(all.filter(n => !n.isRead));
    }
    if (path.startsWith('/notifications/') && path.endsWith('/read')) {
      const id = path.replace('/notifications/', '').replace('/read', '');
      await NotificationDAO.update(id, { isRead: true, readTime: new Date().toISOString() });
      return ok(null);
    }

    /* ═══════ IoT设备 ═══════ */
    if (path === '/iot-devices' || path === '/iot-devices/list') {
      if (method === 'GET') return ok(paginated(await IoTDeviceDAO.getAll(), params));
      if (method === 'POST') { await IoTDeviceDAO.create(body as unknown as IoTDevice); return ok(null); }
    }
    if (path.startsWith('/iot-devices/')) {
      const id = path.replace('/iot-devices/', '');
      if (method === 'GET') return ok(await IoTDeviceDAO.getById(id));
      if (method === 'PUT' || method === 'PATCH') { await IoTDeviceDAO.update(id, body as Record<string, unknown>); return ok(null); }
      if (method === 'DELETE') { await IoTDeviceDAO.delete(id); return ok(null); }
    }

    /* ═══════ IoT数据流转管道 ═══════ */
    if (path === '/iot/pipelines') {
      if (method === 'GET') {
        return ok({
          kafkaTopics: [
            { name: 'fire-alarm-event', partitions: 6, messagesPerSec: 45, lag: 0, consumers: 3, status: 'healthy' },
            { name: 'fault-event', partitions: 4, messagesPerSec: 23, lag: 2, consumers: 2, status: 'healthy' },
            { name: 'device-heartbeat', partitions: 8, messagesPerSec: 156, lag: 12, consumers: 4, status: 'healthy' },
            { name: 'device-status-change', partitions: 4, messagesPerSec: 8, lag: 0, consumers: 2, status: 'healthy' },
            { name: 'protocol-parse-log', partitions: 3, messagesPerSec: 234, lag: 156, consumers: 1, status: 'warning' },
            { name: 'control-command', partitions: 2, messagesPerSec: 3, lag: 0, consumers: 2, status: 'healthy' },
          ],
          influxMetrics: [
            { measurement: 'fire_pressure', points: 45678901, retention: '90天', lastWrite: '10:05:32', writeRate: 1560 },
            { measurement: 'water_level', points: 23456789, retention: '180天', lastWrite: '10:05:30', writeRate: 890 },
            { measurement: 'temperature', points: 34567890, retention: '90天', lastWrite: '10:05:28', writeRate: 1200 },
            { measurement: 'smoke_density', points: 12345678, retention: '30天', lastWrite: '10:05:25', writeRate: 450 },
            { measurement: 'device_status', points: 67890123, retention: '365天', lastWrite: '10:05:33', writeRate: 2340 },
          ],
        });
      }
    }

    /* ═══════ 用户 ═══════ */
    if (path === '/users' || path === '/users/list') {
      if (method === 'GET') return ok(paginated(await UserDAO.getAll(), params));
      if (method === 'POST') { await UserDAO.create(body as unknown as User); return ok(null); }
    }
    if (path.startsWith('/users/')) {
      const id = path.replace('/users/', '');
      if (method === 'GET') return ok(await UserDAO.getById(id));
      if (method === 'PUT' || method === 'PATCH') { await UserDAO.update(id, body as Record<string, unknown>); return ok(null); }
      if (method === 'DELETE') { await UserDAO.delete(id); return ok(null); }
    }

    /* ═══════ 报警详情（ enriched ） ═══════ */
    if (path.startsWith('/alarms/') && path.endsWith('/detail')) {
      const alarmId = path.replace('/alarms/', '').replace('/detail', '');
      const alarm = await AlarmDAO.getById(alarmId);
      if (!alarm) return err('报警不存在', 404);
      const unit = await UnitDAO.getById(alarm.unitId);
      const config = (await ControlRoomConfigDAO.getAll()).find(c => c.unitId === alarm.unitId);
      const snapshots = (await AlarmSnapshotDAO.getAll()).filter(s => s.alarmId === alarmId);
      const cameras = await CameraDAO.getAll();
      return ok({
        ...alarm,
        unitName: unit?.name || alarm.unitName,
        unitAddress: unit?.address,
        controlRoom: config || null,
        snapshots: snapshots.slice(0, 3),
        relatedCameras: cameras.filter(c => c.unitId === alarm.unitId).slice(0, 2),
      });
    }

    /* ═══════ 摄像头流地址 ═══════ */
    if (path.startsWith('/cameras/') && path.endsWith('/stream')) {
      const cameraId = path.replace('/cameras/', '').replace('/stream', '');
      const camera = await CameraDAO.getById(cameraId);
      if (!camera) return err('摄像头不存在', 404);
      return ok({
        cameraId,
        streamUrl: camera.streamUrl || `http://124.223.35.58:8080/live/${cameraId}.m3u8`,
        rtspUrl: camera.rtspUrl,
        wsFlvUrl: `ws://124.223.35.58:8080/live/${cameraId}.flv`,
        snapshotUrl: `https://picsum.photos/640/360?random=${cameraId}`,
      });
    }

    /* ═══════ 消控室配置 ═══════ */
    if (path === '/control-rooms/config') {
      if (method === 'GET') {
        const configs = await ControlRoomConfigDAO.getAll();
        return ok(configs);
      }
    }
    if (path.startsWith('/control-rooms/config/')) {
      const unitId = path.replace('/control-rooms/config/', '');
      if (method === 'GET') {
        const config = (await ControlRoomConfigDAO.getAll()).find(c => c.unitId === unitId);
        return ok(config || null);
      }
    }

    /* ═══════ 平面图设备点位 ═══════ */
    if (path.startsWith('/floor-plans/') && path.endsWith('/devices')) {
      const floorPlanId = path.replace('/floor-plans/', '').replace('/devices', '');
      const devices = (await FloorDeviceDAO.getAll()).filter(fd => fd.floorPlanId === floorPlanId);
      return ok(devices);
    }

    /* ═══════ GB28181 设备同步目录 ═══════ */
    if (path.startsWith('/gb28181-devices/') && path.endsWith('/sync-catalog')) {
      const deviceId = path.replace('/gb28181-devices/', '').replace('/sync-catalog', '');
      const device = await GB28181DeviceDAO.getById(deviceId);
      if (!device) return err('GB28181设备不存在', 404);
      // 生成1-4个通道
      const channelCount = 1 + Math.floor(Math.random() * 4);
      const channels = Array.from({ length: channelCount }, (_, ci) => ({
        channelId: `${device.deviceId || deviceId}${String(ci + 1).padStart(2, '0')}`,
        name: `${device.location || '未知位置'}通道${ci + 1}`,
        status: (device.status === 'online' ? 'on' : 'off') as 'on' | 'off',
        streamUrl: device.status === 'online' ? `http://124.223.35.58:8080/live/${deviceId}_${ci + 1}.m3u8` : undefined,
        snapUrl: `https://picsum.photos/640/360?random=${deviceId}_${ci + 1}`,
      }));
      await GB28181DeviceDAO.update(deviceId, {
        catalogSynced: true,
        channelCount: channels.length,
        channels,
        updatedAt: new Date().toISOString(),
      });
      const updated = await GB28181DeviceDAO.getById(deviceId);
      return ok(updated);
    }

    /* ═══════ GB28181 通道流地址 ═══════ */
    if (path.includes('/channels/') && path.endsWith('/stream')) {
      const parts = path.split('/');
      const deviceId = parts[2];
      const channelId = parts[4];
      return ok({
        deviceId,
        channelId,
        streamUrl: `http://124.223.35.58:8080/live/${deviceId}_${channelId}.m3u8`,
        snapUrl: `https://picsum.photos/640/360?random=${deviceId}_${channelId}`,
      });
    }

    /* ═══════ GB28181 PTZ 控制 ═══════ */
    if (path.includes('/channels/') && path.endsWith('/ptz')) {
      const parts = path.split('/');
      const deviceId = parts[2];
      const channelId = parts[4];
      const { cmd, speed } = body as any;
      console.log(`[GB28181 PTZ] device=${deviceId} channel=${channelId} cmd=${cmd} speed=${speed}`);
      return ok({ success: true, message: `PTZ ${cmd} 指令已发送` });
    }

    /* ═══════ GB28181 录像查询 ═══════ */
    if (path.includes('/channels/') && path.endsWith('/playback')) {
      const parts = path.split('/');
      const deviceId = parts[2];
      const channelId = parts[4];
      const recordings = Array.from({ length: 8 }, (_, i) => ({
        id: `REC-${deviceId}-${channelId}-${i + 1}`,
        startTime: `2026-04-19 ${String(8 + i).padStart(2, '0')}:00:00`,
        endTime: `2026-04-19 ${String(9 + i).padStart(2, '0')}:00:00`,
        size: `${(Math.random() * 500 + 100).toFixed(0)}MB`,
        type: i % 3 === 0 ? 'alarm' : 'normal',
      }));
      return ok(recordings);
    }

    /* ═══════ SIP 服务器状态 ═══════ */
    if (path === '/sip-server/status') {
      const gbDevices = await GB28181DeviceDAO.getAll();
      return ok({
        running: true,
        port: 5060,
        transport: 'UDP',
        registered: gbDevices.filter(d => d.status === 'online').length,
        max: 1000,
      });
    }
    if (path === '/sip-server/start') {
      return ok({ success: true });
    }
    if (path === '/sip-server/stop') {
      return ok({ success: true });
    }

    /* ═══════ 报警主机 / 回路 / 设备点位 ═══════ */
    // GET /fire-hosts?deviceId=xxx 优先匹配
    if (path === '/fire-hosts' && method === 'GET' && query.get('deviceId')) {
      const found = fireHostStore.hosts.find(h => h.deviceId === query.get('deviceId'));
      return ok(found || null);
    }
    if (path === '/fire-hosts' || path === '/fire-hosts/list') {
      if (method === 'GET') {
        const list = fireHostStore.hosts.filter(h => {
          if (!params.keyword) return true;
          const q = params.keyword.toLowerCase();
          return h.hostCode?.toLowerCase().includes(q) || h.brand?.toLowerCase().includes(q) || h.model?.toLowerCase().includes(q) || h.location?.toLowerCase().includes(q);
        });
        return ok(paginated(list, params));
      }
      if (method === 'POST') {
        const data = body as Record<string, unknown>;
        const newHost: FireHost = {
          id: Date.now(),
          deviceId: data.deviceId as string || undefined,
          hostCode: String(data.hostCode || ''),
          brand: String(data.brand || ''),
          model: String(data.model || ''),
          ip: String(data.ip || ''),
          port: Number(data.port || 502),
          location: String(data.location || ''),
          status: Number(data.status ?? 1),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        fireHostStore.hosts.unshift(newHost);
        return ok(newHost);
      }
    }
    const fireHostMatch = path.match(/^\/fire-hosts\/([^\/]+)$/);
    if (fireHostMatch) {
      const hostId = Number(fireHostMatch[1]);
      const host = fireHostStore.hosts.find(h => h.id === hostId);
      if (method === 'GET') return ok(host || null);
      if (method === 'PUT' || method === 'PATCH') {
        if (!host) return err('主机不存在', 404);
        Object.assign(host, body, { updatedAt: new Date().toISOString() });
        return ok(host);
      }
      if (method === 'DELETE') {
        fireHostStore.hosts = fireHostStore.hosts.filter(h => h.id !== hostId);
        fireHostStore.loops = fireHostStore.loops.filter(l => l.hostId !== hostId);
        fireHostStore.devices = fireHostStore.devices.filter(d => d.hostId !== hostId);
        return ok(null);
      }
    }
    // 回路
    const loopMatch = path.match(/^\/fire-hosts\/([^\/]+)\/loops$/);
    if (loopMatch) {
      const hostId = Number(loopMatch[1]);
      if (method === 'GET') {
        const list = fireHostStore.loops.filter(l => l.hostId === hostId && (!params.keyword || String(l.loopNo).includes(params.keyword) || l.loopName?.toLowerCase().includes(params.keyword.toLowerCase())));
        return ok(paginated(list, params));
      }
      if (method === 'POST') {
        const data = body as Record<string, unknown>;
        const newLoop: FireLoop = {
          id: Date.now(),
          hostId,
          loopNo: Number(data.loopNo || 1),
          loopName: String(data.loopName || ''),
          status: Number(data.status ?? 1),
          createdAt: new Date().toISOString(),
        };
        fireHostStore.loops.push(newLoop);
        return ok(newLoop);
      }
    }
    const loopItemMatch = path.match(/^\/fire-hosts\/([^\/]+)\/loops\/([^\/]+)$/);
    if (loopItemMatch) {
      const hostId = Number(loopItemMatch[1]);
      const loopId = Number(loopItemMatch[2]);
      const loop = fireHostStore.loops.find(l => l.id === loopId && l.hostId === hostId);
      if (method === 'GET') return ok(loop || null);
      if (method === 'PUT' || method === 'PATCH') {
        if (!loop) return err('回路不存在', 404);
        Object.assign(loop, body);
        return ok(loop);
      }
      if (method === 'DELETE') {
        fireHostStore.loops = fireHostStore.loops.filter(l => !(l.id === loopId && l.hostId === hostId));
        fireHostStore.devices = fireHostStore.devices.filter(d => !(d.hostId === hostId && d.loopNo === loop?.loopNo));
        return ok(null);
      }
    }
    // 设备点位
    const devMatch = path.match(/^\/fire-hosts\/([^\/]+)\/loops\/([^\/]+)\/devices$/);
    if (devMatch) {
      const hostId = Number(devMatch[1]);
      const loopNo = Number(devMatch[2]);
      if (method === 'GET') {
        const list = fireHostStore.devices.filter(d => d.hostId === hostId && d.loopNo === loopNo && (!params.keyword || String(d.address).includes(params.keyword) || d.deviceType?.toLowerCase().includes(params.keyword.toLowerCase()) || d.location?.toLowerCase().includes(params.keyword.toLowerCase())));
        return ok(paginated(list, params));
      }
      if (method === 'POST') {
        const data = body as Record<string, unknown>;
        const newDev: FireDevice = {
          id: Date.now(),
          hostId,
          loopNo,
          address: Number(data.address || 1),
          deviceType: String(data.deviceType || ''),
          location: String(data.location || ''),
          remark: String(data.remark || ''),
          status: Number(data.status ?? 1),
          createdAt: new Date().toISOString(),
        };
        fireHostStore.devices.push(newDev);
        return ok(newDev);
      }
    }
    const devItemMatch = path.match(/^\/fire-hosts\/([^\/]+)\/loops\/([^\/]+)\/devices\/([^\/]+)$/);
    if (devItemMatch) {
      const hostId = Number(devItemMatch[1]);
      const loopNo = Number(devItemMatch[2]);
      const devId = Number(devItemMatch[3]);
      const dev = fireHostStore.devices.find(d => d.id === devId && d.hostId === hostId && d.loopNo === loopNo);
      if (method === 'GET') return ok(dev || null);
      if (method === 'PUT' || method === 'PATCH') {
        if (!dev) return err('设备不存在', 404);
        Object.assign(dev, body);
        return ok(dev);
      }
      if (method === 'DELETE') {
        fireHostStore.devices = fireHostStore.devices.filter(d => !(d.id === devId && d.hostId === hostId && d.loopNo === loopNo));
        return ok(null);
      }
    }

    /* ═══════ 通用CRUD（自动匹配剩余DAO） ═══════ */
    const GENERIC_DAO_MAP: Record<string, any> = {
      '/roles': RoleDAO,
      '/plans': PlanDAO,
      '/drills': DrillDAO,
      '/inspections': InspectionDAO,
      '/duty-schedules': DutyScheduleDAO,
      '/documents': DocumentDAO,
      '/system-logs': SystemLogDAO,
      '/maint-records': MaintRecordDAO,
      '/maint-contracts': MaintContractDAO,
      '/patrol-plans': PatrolPlanDAO,
      '/patrol-records': PatrolRecordDAO,
      '/hazards': HazardDAO,
      '/personnel': PersonnelDAO,
      '/cameras': CameraDAO,
      '/floor-plans': FloorPlanDAO,
      '/floor-devices': FloorDeviceDAO,
      '/duty-shifts': DutyShiftDAO,
      '/duty-handovers': DutyHandoverDAO,
      '/alarm-snapshots': AlarmSnapshotDAO,
      '/control-room-configs': ControlRoomConfigDAO,
      '/gb28181-devices': GB28181DeviceDAO,
      '/sip-server-configs': SIPServerConfigDAO,
      '/notifications': NotificationDAO,
    };
    for (const [prefix, dao] of Object.entries(GENERIC_DAO_MAP)) {
      if (path === prefix || path === `${prefix}/list`) {
        if (method === 'GET') return ok(paginated(await dao.getAll(), params));
        if (method === 'POST') { console.log('[mock.POST] prefix=', prefix, 'body.id=', (body as any)?.id); await dao.create(body as Record<string, unknown>); console.log('[mock.POST] create done prefix=', prefix); return ok(null); }
      }
      if (path.startsWith(`${prefix}/`)) {
        const id = path.replace(`${prefix}/`, '');
        if (method === 'GET') return ok(await dao.getById(id));
        if (method === 'PUT' || method === 'PATCH') { await dao.update(id, body as Record<string, unknown>); return ok(null); }
        if (method === 'DELETE') { await dao.delete(id); return ok(null); }
      }
    }

    /* ═══════ 仪表盘统计 ═══════ */
    if (path === '/dashboard/stats') {
      const [units, devices, alarms, rooms, orders] = await Promise.all([
        UnitDAO.getAll(), DeviceDAO.getAll(), AlarmDAO.getAll(),
        ControlRoomDAO.getAll(), WorkOrderDAO.getAll(),
      ]);
      return ok({
        unitCount: units.length,
        deviceCount: devices.length,
        onlineDeviceCount: devices.filter(d => d.onlineStatus === 'online').length,
        alarmCount24h: alarms.length,
        unhandledAlarmCount: alarms.filter(a => a.status === 'new').length,
        controlRoomCount: rooms.length,
        pendingWorkOrderCount: orders.filter(o => o.status === 'pending').length,
        deviceOnlineRate: devices.length > 0 ? (devices.filter(d => d.onlineStatus === 'online').length / devices.length * 100).toFixed(1) : '0',
      });
    }
    if (path === '/dashboard/unit-rank') {
      const [units, devices, alarms] = await Promise.all([UnitDAO.getAll(), DeviceDAO.getAll(), AlarmDAO.getAll()]);
      const rank = units.map(u => {
        const unitDevices = devices.filter(d => d.unitId === u.id);
        const unitAlarms = alarms.filter(a => a.unitId === u.id);
        const onlineRate = unitDevices.length > 0
          ? (unitDevices.filter(d => d.onlineStatus === 'online').length / unitDevices.length * 100)
          : 100;
        return {
          name: u.name,
          online: Number(onlineRate.toFixed(1)),
          alarm: unitAlarms.filter(a => a.type === 'fire').length,
          fault: unitAlarms.filter(a => a.type === 'fault').length,
          status: unitDevices.some(d => d.onlineStatus === 'offline') ? 'warning' : 'normal',
        };
      }).sort((a, b) => b.online - a.online);
      return ok(rank);
    }
    if (path === '/dashboard/subsystems') {
      const [devices, alarms] = await Promise.all([DeviceDAO.getAll(), AlarmDAO.getAll()]);
      const subsystems = [
        { name: '消防给水', total: devices.filter(d => d.type === 'pump' || d.type === 'sensor').length, online: devices.filter(d => (d.type === 'pump' || d.type === 'sensor') && d.onlineStatus === 'online').length, alarm: alarms.filter(a => a.type === 'fire' && (a.deviceName?.includes('泵') || a.deviceName?.includes('液位') || a.deviceName?.includes('水'))).length },
        { name: '电气火灾', total: devices.filter(d => d.type === 'monitor').length, online: devices.filter(d => d.type === 'monitor' && d.onlineStatus === 'online').length, alarm: alarms.filter(a => a.type === 'fire' && (a.deviceName?.includes('电气') || a.deviceName?.includes('电'))).length },
        { name: '防排烟', total: devices.filter(d => d.type === 'fan').length, online: devices.filter(d => d.type === 'fan' && d.onlineStatus === 'online').length, alarm: alarms.filter(a => a.type === 'fire' && a.deviceName?.includes('风机')).length },
      ];
      return ok(subsystems);
    }
    if (path === '/gis/points-rich') {
      const [units, devices, alarms] = await Promise.all([UnitDAO.getAll(), DeviceDAO.getAll(), AlarmDAO.getAll()]);
      const points = units.filter(u => u.lat && u.lng).map(u => {
        const unitDevices = devices.filter(d => d.unitId === u.id);
        const unitAlarms = alarms.filter(a => a.unitId === u.id);
        return {
          id: u.id,
          name: u.name,
          lat: u.lat,
          lng: u.lng,
          type: u.type,
          unitType: u.type === 'key' ? '重点单位' : u.type === 'general' ? '一般单位' : '九小场所',
          address: u.address,
          online: unitDevices.length > 0 ? unitDevices.some(d => d.onlineStatus === 'online') : true,
          alarm: unitAlarms.filter(a => a.type === 'fire').length,
          fault: unitAlarms.filter(a => a.type === 'fault').length,
          devices: unitDevices.length,
          controlRoom: true,
          manager: u.contact,
          managerPhone: u.phone,
          maintenanceStatus: '正常',
          lastAlarm: unitAlarms.length > 0 ? unitAlarms[0].createdAt : '-',
        };
      });
      return ok(points);
    }
    // 消控室数字ID走旧体系兼容
    if (path.match(/^\/control-rooms\/\d+$/)) {
      const { legacyMockData } = await import('./legacyMockData');
      const data = legacyMockData(path, method, body);
      if (data !== undefined) return ok(data);
    }

    /* ═══════ 数据库管理 ═══════ */
    if (path === '/db/stats') {
      const { DBUtils } = await import('@/db/Database');
      return ok(await DBUtils.getStats());
    }
    if (path === '/db/reset') {
      const { DBUtils } = await import('@/db/Database');
      await DBUtils.resetDatabase();
      seeded = false;
      return ok(null);
    }
    if (path === '/db/seed') {
      await seedAll();
      return ok(null);
    }

    /* ─── 尝试旧体系兼容路由 ─── */
    const { legacyMockData } = await import('./legacyMockData');
    const legacyData = legacyMockData(path, method, body);
    if (legacyData !== undefined) return ok(legacyData);

    return err(`未找到接口: ${method} ${path}`, 404);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    return err(msg, 500);
  }
}
