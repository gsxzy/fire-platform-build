/**
 * ═══════════════════════════════════════════════════════════════════
 * 数据库种子数据 - 初始化所有表的示例数据
 * 数据之间建立关联，并引入随机性
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  UnitDAO, DeviceDAO, AlarmDAO, ControlRoomDAO, WorkOrderDAO,
  UserDAO, NotificationDAO, IoTDeviceDAO, MaintRecordDAO, MaintContractDAO,
  PatrolPlanDAO, PatrolRecordDAO, HazardDAO, RoleDAO, PlanDAO, DrillDAO,
  InspectionDAO, DutyScheduleDAO, DocumentDAO, SystemLogDAO,
  PersonnelDAO, CameraDAO, FloorPlanDAO, FloorDeviceDAO, DutyShiftDAO,
  DutyHandoverDAO, AlarmSnapshotDAO, ControlRoomConfigDAO,
  GB28181DeviceDAO, SIPServerConfigDAO,
} from './Database';
import type {
  Unit, Device, Alarm, ControlRoom, WorkOrder, User, Notification, IoTDevice,
  MaintRecord, MaintContract, PatrolPlan, PatrolRecord, Hazard, Role, Plan, Drill,
  Inspection, DutySchedule, Document, SystemLog,
  Personnel, Camera, FloorPlan, FloorDevice, DutyShift, DutyHandover,
  AlarmSnapshot, ControlRoomConfig, GB28181Device, SIPServerConfig,
} from '@/types/db';

const now = () => new Date().toISOString();

/* ───── 随机工具 ───── */
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randPick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randBool = (prob: number) => Math.random() < prob;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.random() * daysBack);
  d.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59));
  return d.toISOString();
}

function fmtId(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

/* ───── 常量池 ───── */
const UNIT_POOL = [
  { name: '万达广场', type: 'key' as const, address: '兰州市城关区天水北路68号', contact: '王经理', phone: '0931-8888888', riskLevel: 'high' as const, lat: 36.0611, lng: 103.8343 },
  { name: '兰州中心', type: 'key' as const, address: '兰州市七里河区西津西路16号', contact: '张主管', phone: '0931-2666666', riskLevel: 'medium' as const, lat: 36.0681, lng: 103.7745 },
  { name: '兰大二院', type: 'key' as const, address: '兰州市城关区萃英门82号', contact: '李主任', phone: '0931-8942222', riskLevel: 'high' as const, lat: 36.0533, lng: 103.8195 },
  { name: '西北师范大学', type: 'general' as const, address: '兰州市安宁区安宁东路967号', contact: '吴主任', phone: '0931-7971111', riskLevel: 'low' as const, lat: 36.1056, lng: 103.7417 },
  { name: '兰州石化', type: 'key' as const, address: '兰州市西固区玉门街', contact: '孙主任', phone: '0931-7999999', riskLevel: 'extreme' as const, lat: 36.0989, lng: 103.6283 },
  { name: '红星美凯龙', type: 'key' as const, address: '兰州市城关区北滨河东路', contact: '郑经理', phone: '0931-6666888', riskLevel: 'high' as const, lat: 36.0750, lng: 103.8500 },
  { name: '靖煤酒店', type: 'general' as const, address: '兰州市红古区平安路', contact: '刘经理', phone: '0931-6666666', riskLevel: 'medium' as const, lat: 36.3417, lng: 102.8736 },
  { name: '新区专精特新', type: 'general' as const, address: '兰州新区湘江街', contact: '周经理', phone: '0931-8881234', riskLevel: 'medium' as const, lat: 36.4667, lng: 103.6333 },
  { name: '国芳百货', type: 'key' as const, address: '兰州市城关区广场南路', contact: '马经理', phone: '0931-7777777', riskLevel: 'high' as const, lat: 36.0640, lng: 103.8340 },
  { name: '亚欧商厦', type: 'key' as const, address: '兰州市城关区张掖路', contact: '杨经理', phone: '0931-5555555', riskLevel: 'high' as const, lat: 36.0580, lng: 103.8300 },
];

const DEVICE_TYPES = [
  { type: 'detector', typeName: '烟感探测器', manufacturer: '海湾安全', model: 'JTY-GD-G3' },
  { type: 'detector', typeName: '温感探测器', manufacturer: '海湾安全', model: 'JTW-ZD-G3N' },
  { type: 'button', typeName: '手动报警按钮', manufacturer: '海湾安全', model: 'J-SAM-GST9122' },
  { type: 'pump', typeName: '消防泵', manufacturer: '南方泵业', model: 'XBD8.0/30-S' },
  { type: 'fan', typeName: '排烟风机', manufacturer: '上风高科', model: 'HTF-II-8' },
  { type: 'pump', typeName: '喷淋泵', manufacturer: '南方泵业', model: 'XBD7.0/20-S' },
  { type: 'sensor', typeName: '液位传感器', manufacturer: '西门子', model: 'SITRANS P' },
  { type: 'monitor', typeName: '电气火灾监控器', manufacturer: '安科瑞', model: 'ARCM300' },
  { type: 'controller', typeName: '应急照明控制器', manufacturer: '诺蒂菲尔', model: 'RP-1002PLUS' },
];

const LOCATIONS = ['B1消防控制室', '1F大厅', 'B2水泵房', '屋顶机房', 'B1配电室', '1F出入口', 'B2消防水池', '2F走廊', '1F门诊大厅', '药房区域', '3F办公区', '地下车库', '天台', '消防泵房', '会议室', '仓库'];

const ALARM_MESSAGES: Record<string, string[]> = {
  fire: ['烟雾浓度超过阈值', '手动报警按钮被触发', '火警联动触发', '温度异常升高', '火焰探测器报警'],
  fault: ['设备通讯中断，无法获取状态', '剩余电流超过300mA', '设备运行异常', '回路故障', '传感器失效'],
  warning: ['水池液位低于安全线(3.2m)', '水压低于0.15MPa', '电池电量低', '温度接近阈值', '信号强度弱'],
  supervisory: ['防火门未关闭', '阀门未开启', '挡烟垂壁未复位', '排烟窗未关闭'],
};

const WORK_ORDER_TITLES: Record<string, string[]> = {
  inspection: ['月度设备巡检', '季度全面检查', '年度消防设施检测', '日常巡查'],
  repair: ['设备维修', '线路故障排查', '控制器复位', '传感器更换'],
  maintenance: ['消防泵保养', '风机润滑保养', '探测器清洁校准', '系统联动测试'],
  replacement: ['电池更换', '老化线路更换', '到期设备更换'],
};

/* ───── 1. 单位种子 ───── */
function generateUnits(): Unit[] {
  const count = randInt(8, 12);
  const selected = shuffle(UNIT_POOL).slice(0, count);
  const t = now();
  return selected.map((u, i) => ({
    id: fmtId('UN', i + 1),
    name: u.name,
    type: u.type,
    address: u.address,
    contact: u.contact,
    phone: u.phone,
    riskLevel: u.riskLevel,
    deviceCount: 0,
    status: 'normal' as const,
    lat: u.lat,
    lng: u.lng,
    createdAt: t,
    updatedAt: t,
  }));
}

export async function seedUnits(units?: Unit[]) {
  const data = units ?? generateUnits();
  await UnitDAO.batchCreate(data);
}

/* ───── 2. 设备种子 ───── */
function generateDevices(units: Unit[]): Device[] {
  const devices: Device[] = [];
  let devIndex = 1;
  const t = now();

  units.forEach(unit => {
    const devCount = randInt(3, 8);
    for (let i = 0; i < devCount; i++) {
      const tmpl = randPick(DEVICE_TYPES);
      const onlineR = Math.random();
      const onlineStatus = onlineR < 0.85 ? 'online' : onlineR < 0.95 ? 'offline' : 'unknown';
      const statusR = Math.random();
      const status: Device['status'] = statusR < 0.80 ? 'normal' : 'fault';

      devices.push({
        id: fmtId('DEV', devIndex++),
        name: `${tmpl.typeName}#${String(i + 1).padStart(3, '0')}`,
        type: tmpl.type,
        typeName: tmpl.typeName,
        unitId: unit.id,
        unitName: unit.name,
        location: randPick(LOCATIONS),
        status,
        onlineStatus,
        manufacturer: tmpl.manufacturer,
        model: tmpl.model,
        installDate: `2024-${String(randInt(1, 12)).padStart(2, '0')}-15`,
        lastMaintDate: `2026-${String(randInt(1, 3)).padStart(2, '0')}-15`,
        nextMaintDate: `2026-${String(randInt(5, 8)).padStart(2, '0')}-15`,
        createdAt: t,
        updatedAt: t,
      });
    }
  });
  return devices;
}

export async function seedDevices(units: Unit[]) {
  const devices = generateDevices(units);
  await DeviceDAO.batchCreate(devices);
  // 同步单位设备数
  for (const u of units) {
    const count = devices.filter(d => d.unitId === u.id).length;
    if (count > 0) await UnitDAO.update(u.id, { deviceCount: count });
  }
  return devices;
}

/* ───── 3. 告警种子 ───── */
function generateAlarms(units: Unit[], devices: Device[]): Alarm[] {
  const alarms: Alarm[] = [];
  let idx = 1;
  const today = new Date();

  for (let i = 0; i < randInt(15, 25); i++) {
    const dev = randPick(devices);
    const unit = units.find(u => u.id === dev.unitId)!;
    const typeR = Math.random();
    const type = typeR < 0.40 ? 'fire' : typeR < 0.80 ? 'fault' : typeR < 0.95 ? 'warning' : 'supervisory';

    let level: Alarm['level'];
    if (type === 'fire') level = randBool(0.7) ? 'urgent' : 'high';
    else if (type === 'fault') level = randBool(0.6) ? 'high' : 'normal';
    else if (type === 'warning') level = 'normal';
    else level = 'low';

    const statusR = Math.random();
    const status = statusR < 0.30 ? 'new' : statusR < 0.60 ? 'confirmed' : statusR < 0.90 ? 'handled' : 'ignored';

    const createdAt = randomDate(30);
    const alarmId = `ALM-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${String(idx).padStart(3, '0')}`;

    alarms.push({
      id: alarmId,
      type,
      level,
      deviceId: dev.id,
      deviceName: dev.name,
      unitId: unit.id,
      unitName: unit.name,
      location: dev.location,
      message: randPick(ALARM_MESSAGES[type]),
      status,
      handler: status !== 'new' ? randPick(['张三', '李四', '王五', '赵六', '钱七', '孙八']) : undefined,
      handleTime: status !== 'new' ? randomDate(7) : undefined,
      handleNote: status !== 'new' ? randPick(['已处理', '确认为误报', '已安排维修', '已通知相关人员']) : undefined,
      createdAt,
      updatedAt: now(),
    });
    idx++;
  }
  return alarms;
}

export async function seedAlarms(units: Unit[], devices: Device[]) {
  const alarms = generateAlarms(units, devices);
  await AlarmDAO.batchCreate(alarms);
  return alarms;
}

/* ───── 4. 消控室种子 ───── */
function generateControlRooms(units: Unit[]): ControlRoom[] {
  const t = now();
  return units.map((u, i) => ({
    id: fmtId('CR', i + 1),
    unitId: u.id,
    unitName: u.name,
    hostModel: randPick(['GST5000H', '诺蒂菲尔NFS2-3030', '西门子FC722', '霍尼韦尔XLS3000', '海湾GST9000']),
    hostCode: `H-2024-${String(i + 1).padStart(3, '0')}`,
    systemCount: randInt(2, 6),
    deviceCount: u.deviceCount || randInt(50, 300),
    status: 'normal' as const,
    contactName: randPick(['张明', '李华', '王刚', '孙涛', '赵磊', '周洋']),
    contactPhone: `13800138${String(i + 1).padStart(3, '0')}`,
    dutyCount: randInt(2, 5),
    staffList: randPick(['张明、李强', '李华、赵磊、陈静', '王刚、刘洋', '孙涛、吴刚、郑伟、钱明', '周洋、冯强']),
    address: randPick(['B1层消防控制室', '1层消防值班室', 'B1层消控中心', '消防控制中心']),
    remark: randPick(['24小时值班', '三班倒', '', '重点监控']),
    createdAt: t,
    updatedAt: t,
  }));
}

export async function seedControlRooms(units: Unit[]) {
  const rooms = generateControlRooms(units);
  await ControlRoomDAO.batchCreate(rooms);
  return rooms;
}

/* ───── 5. 工单种子 ───── */
function generateWorkOrders(units: Unit[], devices: Device[]): WorkOrder[] {
  const orders: WorkOrder[] = [];
  const t = now();
  for (let i = 0; i < randInt(8, 15); i++) {
    const unit = randPick(units);
    const dev = randPick(devices.filter(d => d.unitId === unit.id) || devices);
    const type = randPick<WorkOrder['type']>(['inspection', 'repair', 'maintenance', 'replacement']);
    const statusR = Math.random();
    const status = statusR < 0.35 ? 'pending' : statusR < 0.65 ? 'processing' : statusR < 0.95 ? 'completed' : 'cancelled';

    orders.push({
      id: `WO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
      type,
      unitId: unit.id,
      unitName: unit.name,
      deviceId: dev?.id,
      deviceName: dev?.name,
      title: randPick(WORK_ORDER_TITLES[type]),
      content: randPick(['需尽快处理', '按计划执行', '紧急维修', '常规保养']),
      staff: randPick(['维修组A', '巡检组B', '维保组C', '工程部']),
      planDate: `2026-${String(randInt(4, 6)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
      completeDate: status === 'completed' ? `2026-${String(randInt(1, 4)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}` : undefined,
      status,
      result: status === 'completed' ? randPick(['全部正常', '已修复', '更换完成']) : undefined,
      createdAt: t,
      updatedAt: t,
    });
  }
  return orders;
}

export async function seedWorkOrders(units: Unit[], devices: Device[]) {
  const orders = generateWorkOrders(units, devices);
  await WorkOrderDAO.batchCreate(orders);
  return orders;
}

/* ───── 6. 维保记录种子 ───── */
export async function seedMaintRecords(units: Unit[], devices: Device[]) {
  const records: MaintRecord[] = [];
  const contentPool = [
    '清洁探测器、测试灵敏度',
    '检查轴承、更换润滑油',
    '气瓶称重、管路气密性测试',
    '更换剩余电流互感器',
    '线路检查、紧固接线端子',
    '消防泵启停测试、记录运行参数',
    '排烟风机联动测试',
    '防火卷帘升降测试',
    '应急照明切换测试',
    '消防广播分区测试',
    '消防电梯迫降测试',
    '喷淋系统末端放水试验',
  ];
  for (let i = 0; i < 30; i++) {
    const unit = randPick(units);
    const dev = randPick(devices.filter(d => d.unitId === unit.id) || devices);
    const type = randPick<MaintRecord['type']>(['maintenance', 'inspection', 'repair', 'replacement']);
    records.push({
      id: `MR-2026${String(randInt(1, 4)).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
      unitId: unit.id,
      unitName: unit.name,
      deviceId: dev?.id,
      deviceName: dev?.name,
      type,
      content: contentPool[i % contentPool.length],
      result: randPick(['正常', '修复', '更换', '待观察']),
      staff: randPick(['维保组A', '维保组B', '维保组C', '维保组D']),
      date: `2026-${String(randInt(1, 4)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
      nextDate: `2026-${String(randInt(6, 10)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
      createdAt: randomDate(120),
    });
  }
  await MaintRecordDAO.batchCreate(records);
  return records;
}

/* ───── 7. 维保合同种子 ───── */
export async function seedMaintContracts(units: Unit[]) {
  const contracts: MaintContract[] = [];
  const companies = ['新致远消防科技有限公司', '甘肃赋安消防工程公司', '兰州安泰消防设备有限公司', '海湾安全技术有限公司', '西门子楼宇科技', '诺蒂菲尔消防设备公司'];
  for (let i = 0; i < 15; i++) {
    const unit = randPick(units);
    const year = randPick([2024, 2025, 2026]);
    const startMonth = String(randInt(1, 6)).padStart(2, '0');
    const endMonth = String(randInt(7, 12)).padStart(2, '0');
    contracts.push({
      id: `MC-${year}-${String(i + 1).padStart(3, '0')}`,
      name: `${unit.name}${year}年度消防维保合同`,
      unitId: unit.id,
      unitName: unit.name,
      company: randPick(companies),
      startDate: `${year}-${startMonth}-01`,
      endDate: `${year}-${endMonth}-${String(randInt(28, 30)).padStart(2, '0')}`,
      amount: String(randInt(30000, 500000)),
      status: randPick<MaintContract['status']>(['active', 'expiring', 'expired']),
      createdAt: randomDate(365),
    });
  }
  await MaintContractDAO.batchCreate(contracts);
  return contracts;
}

/* ───── 8. 巡检计划种子 ───── */
export async function seedPatrolPlans(units: Unit[]) {
  const plans: PatrolPlan[] = [];
  const t = now();
  const cycles: PatrolPlan['cycle'][] = ['daily', 'weekly', 'monthly', 'quarterly'];
  const cycleNames = { daily: '日巡检', weekly: '周巡检', monthly: '月度巡检', quarterly: '季度巡检' };
  for (let i = 0; i < 20; i++) {
    const unit = randPick(units);
    const cycle = randPick(cycles);
    plans.push({
      id: fmtId('PP', i + 1),
      name: `${unit.name}${cycleNames[cycle]}`,
      unitId: unit.id,
      unitName: unit.name,
      cycle,
      items: randInt(8, 48),
      nextDate: `2026-${String(randInt(5, 8)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
      staff: randPick(['巡检组A', '巡检组B', '巡检组C', '巡检组D']),
      status: randPick<PatrolPlan['status']>(['normal', 'maintenance', 'disabled']),
      createdAt: randomDate(180),
      updatedAt: t,
    });
  }
  await PatrolPlanDAO.batchCreate(plans);
  return plans;
}

/* ───── 9. 巡检记录种子 ───── */
export async function seedPatrolRecords(units: Unit[]) {
  const records: PatrolRecord[] = [];
  const t = now();
  const staffPool = ['张三', '李四', '王五', '赵六', '陈七', '刘八', '周九', '吴十'];
  for (let i = 0; i < 30; i++) {
    const unit = randPick(units);
    const items = randInt(8, 48);
    const failed = randInt(0, 5);
    records.push({
      id: `PR-2026${String(randInt(1, 4)).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
      planId: fmtId('PP', randInt(1, 10)),
      unitId: unit.id,
      unitName: unit.name,
      date: `2026-${String(randInt(1, 4)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
      items,
      passed: items - failed,
      failed,
      staff: randPick(staffPool),
      status: failed > 0 ? 'has-issue' : 'all-normal',
      createdAt: t,
    });
  }
  await PatrolRecordDAO.batchCreate(records);
  return records;
}

/* ───── 10. 隐患种子 ───── */
export async function seedHazards(units: Unit[], devices: Device[]) {
  const hazards: Hazard[] = [];
  const t = now();
  const descPool = [
    '排烟风机轴承磨损严重，存在停机风险',
    '2F疏散通道堆放杂物，影响疏散',
    'B1配电室灭火器压力不足',
    '3F疏散指示灯损坏3处',
    '消防栓水压不足，低于0.15MPa',
    '防火门闭门器损坏，无法正常关闭',
    '应急照明蓄电池老化，续航不足30分钟',
    '烟感探测器防尘罩脱落',
    '消防电梯前室正压送风口堵塞',
    '喷淋系统末端试水装置阀门锈蚀',
    '消防广播扬声器音量不达标',
    '疏散指示标志亮度不足',
    '消防水池液位低于最低警戒线',
    '防排烟系统风管漏风',
    '手动报警按钮防护罩破损',
  ];
  for (let i = 0; i < 25; i++) {
    const unit = randPick(units);
    const dev = randPick(devices.filter(d => d.unitId === unit.id) || devices);
    const status = randPick<Hazard['status']>(['pending', 'rectifying', 'completed', 'closed']);
    hazards.push({
      id: `HZ-2026${String(randInt(1, 4)).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
      unitId: unit.id,
      unitName: unit.name,
      deviceId: dev?.id,
      description: descPool[i % descPool.length],
      level: randPick<Hazard['level']>(['high', 'normal', 'low']),
      foundDate: `2026-${String(randInt(1, 4)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
      deadline: `2026-${String(randInt(4, 8)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
      status,
      handler: status !== 'pending' ? randPick(['维修组A', '物业部', '安保部', '工程部', '维保单位']) : undefined,
      handleNote: status !== 'pending' ? randPick(['已清理并加强巡查', '已更换新设备', '已安排处理并验收合格', '已修复并测试正常']) : undefined,
      createdAt: randomDate(120),
      updatedAt: t,
    });
  }
  await HazardDAO.batchCreate(hazards);
  return hazards;
}

/* ───── 11. 用户种子 ───── */
export async function seedUsers(units: Unit[]) {
  const roles = ['super_admin', 'unit_admin', 'operator', 'inspector', 'maintainer'] as const;
  const names = ['系统管理员', '值班操作员A', '值班操作员B', '单位管理员A', '单位管理员B', '巡检员A', '巡检员B', '巡检员C', '维保人员A', '维保人员B', '监控中心主任', '消防主管', '安全工程师', '技术专员', '数据分析师'];
  const users: User[] = names.map((name, i) => {
    const role = i === 0 ? 'super_admin' : roles[randInt(1, roles.length - 1)];
    const unit = randPick(units);
    return {
      id: fmtId('USR', i + 1),
      username: `user${String(i + 1).padStart(2, '0')}`,
      realName: name,
      role,
      unitId: i === 0 ? undefined : unit.id,
      unitName: i === 0 ? undefined : unit.name,
      phone: `138${String(10000000 + i * 1111).slice(0, 8)}`,
      email: i === 0 ? 'admin@xzy.com' : `user${i + 1}@xzy.com`,
      status: randBool(0.9) ? 'active' : 'disabled',
      lastLogin: randomDate(30),
      createdAt: randomDate(365),
      updatedAt: now(),
    };
  });
  await UserDAO.batchCreate(users);
  return users;
}

/* ───── 12. 角色种子 ───── */
export async function seedRoles() {
  const roleDefs = [
    { name: '系统管理员', code: 'super_admin', desc: '拥有系统所有权限', perms: 156 },
    { name: '单位管理员', code: 'unit_admin', desc: '管理所属单位设备和人员', perms: 68 },
    { name: '值班操作员', code: 'operator', desc: '监控中心值班人员，处理告警', perms: 32 },
    { name: '巡检员', code: 'inspector', desc: '负责日常巡检任务执行', perms: 24 },
    { name: '维保人员', code: 'maintainer', desc: '负责设备维保维修', perms: 28 },
    { name: '监控中心主任', code: 'center_director', desc: '监控中心管理人员，审批重要操作', perms: 96 },
    { name: '安全工程师', code: 'safety_engineer', desc: '消防安全技术评估和方案制定', perms: 52 },
    { name: '数据分析师', code: 'data_analyst', desc: '消防数据分析和报表制作', perms: 36 },
  ];
  const t = now();
  const roles: Role[] = roleDefs.map((r, i) => ({
    id: fmtId('ROLE', i + 1),
    name: r.name,
    code: r.code,
    description: r.desc,
    users: randInt(1, 5),
    perms: r.perms,
    status: 'active' as const,
    createdAt: t,
  }));
  await RoleDAO.batchCreate(roles);
  return roles;
}

/* ───── 13. 预案种子 ───── */
export async function seedPlans(units: Unit[]) {
  const plans: Plan[] = [];
  const t = now();
  const planTypes = ['火灾', '气体泄漏', '疏散', '防汛', '地震', '反恐'];
  const planNames = ['火灾应急预案', '气体泄漏处置预案', '人员疏散预案', '防汛应急预案', '地震应急疏散预案', '反恐防暴应急预案'];
  for (let i = 0; i < 15; i++) {
    const unit = randPick(units);
    const typeIdx = i % planTypes.length;
    plans.push({
      id: fmtId('PL', i + 1),
      name: `${unit.name}${planNames[typeIdx]}`,
      unitId: unit.id,
      unitName: unit.name,
      type: planTypes[typeIdx],
      level: randPick(['一级', '二级', '特级']),
      version: `V${randInt(1, 5)}.${randInt(0, 9)}`,
      updateDate: `2025-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
      status: randPick<Plan['status']>(['active', 'revising', 'revoked']),
      content: randPick([
        '包含疏散路线、联动设备、人员分工等详细内容',
        '明确各岗位人员职责和应急处置流程',
        '配备应急物资清单和联络方式',
        '定期演练和评估改进机制',
      ]),
      createdAt: randomDate(365),
      updatedAt: t,
    });
  }
  await PlanDAO.batchCreate(plans);
  return plans;
}

/* ───── 14. 演练记录种子 ───── */
export async function seedDrills(units: Unit[], plans: Plan[]) {
  const drills: Drill[] = [];
  for (let i = 0; i < 20; i++) {
    const unit = randPick(units);
    const plan = randPick(plans.filter(p => p.unitId === unit.id) || plans);
    const result = randPick<Drill['result']>(['excellent', 'good', 'pass', 'fail']);
    drills.push({
      id: `DR-2026${String(randInt(1, 4)).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
      name: `${unit.name}${randInt(1, 12)}月${randPick(['消防疏散', '灭火实战', '应急联动', '防排烟'])}演练`,
      unitId: unit.id,
      unitName: unit.name,
      planId: plan?.id,
      date: `2026-${String(randInt(1, 4)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
      participants: randInt(30, 150),
      duration: `${randInt(15, 120)}分钟`,
      result,
      summary: result === 'excellent' ? '各环节衔接顺畅，达到预期目标，疏散时间优于标准' :
        result === 'good' ? '整体表现良好，个别环节有待优化' :
        result === 'pass' ? '基本达到演练要求，需针对薄弱环节加强训练' :
        '演练效果不理想，需重新组织并完善预案',
      createdAt: randomDate(180),
    });
  }
  await DrillDAO.batchCreate(drills);
  return drills;
}

/* ───── 15. 检查记录种子 ───── */
export async function seedInspections(units: Unit[]) {
  const inspections: Inspection[] = [];
  const checkers = ['张三', '李四', '王五', '赵六', '陈七', '刘八', '周九', '吴十'];
  const names = ['月度消防设施检查', '季度全面消防检查', '年度消防检测', '专项防火检查', '节假日前安全检查', '装修区域专项检查'];
  for (let i = 0; i < 25; i++) {
    const unit = randPick(units);
    const result = randPick<Inspection['result']>(['pass', 'fail', 'partial']);
    inspections.push({
      id: `IN-2026${String(randInt(1, 4)).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
      name: randPick(names),
      unitId: unit.id,
      unitName: unit.name,
      checker: randPick(checkers),
      date: `2026-${String(randInt(1, 4)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
      result,
      issues: result === 'pass' ? '无' : randPick([
        '2F疏散指示灯损坏1个',
        '消防栓水压不足、灭火器过期3个',
        '防火门闭门器损坏2处',
        '应急照明蓄电池续航不足',
        '烟感探测器防尘罩脱落5个',
        '消防广播扬声器音量不达标',
      ]),
      status: result === 'pass' ? 'completed' : randPick<Inspection['status']>(['rectifying', 'pending', 'no-need']),
      createdAt: randomDate(180),
      updatedAt: now(),
    });
  }
  await InspectionDAO.batchCreate(inspections);
  return inspections;
}

/* ───── 16. 通知种子 ───── */
export async function seedNotifications(units: Unit[], devices: Device[]) {
  const notifications: Notification[] = [];
  for (let i = 0; i < randInt(4, 8); i++) {
    const unit = randPick(units);
    const dev = randPick(devices.filter(d => d.unitId === unit.id) || devices);
    const type = randPick<Notification['type']>(['fire', 'fault', 'warning']);
    const isRead = randBool(0.5);
    notifications.push({
      id: fmtId('NT', i + 1),
      type,
      title: type === 'fire' ? '火警报警' : type === 'fault' ? '设备故障' : '预警通知',
      content: `${unit.name} ${dev?.name ?? ''}${randPick(['触发火警', '通讯中断', '运行异常', '参数超限'])}`,
      unitId: unit.id,
      isRead,
      readTime: isRead ? randomDate(3) : undefined,
      createdAt: randomDate(7),
    });
  }
  await NotificationDAO.batchCreate(notifications);
  return notifications;
}

/* ───── 17. 值班排班种子 ───── */
export async function seedDutySchedules() {
  const schedules: DutySchedule[] = [];
  const t = now();
  const names = ['张明', '李强', '王芳', '赵磊', '陈静'];
  for (let i = 0; i < 5; i++) {
    schedules.push({
      id: `DS-202604${String(19 + Math.floor(i / 2)).padStart(2, '0')}-${i % 2 === 0 ? 'D' : 'N'}${Math.floor(i / 2) + 1}`,
      name: names[i],
      phone: `1380013800${i + 1}`,
      role: i % 2 === 0 ? '值班长' : '操作员',
      date: `2026-04-${String(19 + Math.floor(i / 2)).padStart(2, '0')}`,
      shift: i % 2 === 0 ? 'day' : 'night',
      status: randPick<DutySchedule['status']>(['on', 'off', 'leave']),
      createdAt: t,
      updatedAt: t,
    });
  }
  await DutyScheduleDAO.batchCreate(schedules);
  return schedules;
}

/* ───── 18. 知识库文档种子 ───── */
export async function seedDocuments() {
  const docPool = [
    { title: '火灾自动报警系统操作手册', cat: '操作规程', type: '手册', author: '技术部' },
    { title: '消防设施设备巡检标准', cat: '巡检标准', type: '标准', author: '质控部' },
    { title: '电气火灾监控系统维护规程', cat: '维护规程', type: '规程', author: '维保部' },
    { title: '消防安全培训教材（2025版）', cat: '培训资料', type: '教材', author: '培训部' },
    { title: '消防泵房管理制度', cat: '管理制度', type: '制度', author: '安全部' },
    { title: '消控室值班人员工作规范', cat: '管理制度', type: '规范', author: '人事部' },
    { title: '建筑消防设施检测技术规程', cat: '技术标准', type: '标准', author: '技术部' },
    { title: '应急疏散预案编制指南', cat: '应急预案', type: '指南', author: '安全部' },
    { title: '消防水源管理规定', cat: '管理制度', type: '规定', author: '工程部' },
    { title: '自动喷水灭火系统验收规范', cat: '技术标准', type: '规范', author: '技术部' },
    { title: '防火巡查检查记录表模板', cat: '巡检标准', type: '模板', author: '质控部' },
    { title: '消防控制室图形显示装置操作指南', cat: '操作规程', type: '指南', author: '技术部' },
    { title: '消防安全责任人职责说明', cat: '管理制度', type: '说明', author: '安全部' },
    { title: '火灾隐患排查治理办法', cat: '管理制度', type: '办法', author: '安全部' },
    { title: '消防物联网设备接入规范', cat: '技术标准', type: '规范', author: '技术部' },
  ];
  const t = now();
  const documents: Document[] = docPool.map((d, i) => ({
    id: fmtId('DOC', i + 1),
    title: d.title,
    category: d.cat,
    docType: d.type,
    author: d.author,
    date: `2025-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`,
    version: `V${randInt(1, 3)}.${randInt(0, 9)}`,
    status: randBool(0.85) ? 'active' : 'revising',
    content: `${d.title}的详细内容说明...`,
    fileUrl: i % 3 === 0 ? `/docs/${d.title}.pdf` : undefined,
    createdAt: randomDate(365),
    updatedAt: t,
  }));
  await DocumentDAO.batchCreate(documents);
  return documents;
}

/* ───── 19. 系统日志种子 ───── */
export async function seedSystemLogs() {
  const logs: SystemLog[] = [];
  const t = now();
  const actionPool = [
    { action: '登录系统', module: '认证中心', detail: '用户成功登录系统' },
    { action: '退出登录', module: '认证中心', detail: '用户安全退出系统' },
    { action: '确认告警', module: '告警中心', detail: '确认火警告警并指派处置人员' },
    { action: '消音操作', module: '监控中心', detail: '对报警主机执行消音操作' },
    { action: '复位主机', module: '监控中心', detail: '对火灾报警控制器执行复位' },
    { action: '导出报表', module: '数据分析', detail: '导出月度设备运行报表' },
    { action: '导出告警', module: '数据分析', detail: '导出本周告警统计报表' },
    { action: '修改配置', module: '系统设置', detail: '修改系统参数：告警阈值调整为0.5' },
    { action: '新增用户', module: '用户管理', detail: '新增值班操作员账号' },
    { action: '编辑用户', module: '用户管理', detail: '修改用户信息及权限配置' },
    { action: '禁用用户', module: '用户管理', detail: '禁用离职员工账号' },
    { action: '提交巡检', module: '巡检管理', detail: '提交万达广场月度巡检记录' },
    { action: '审批工单', module: '维保管理', detail: '审批消防泵维修工单' },
    { action: '派发工单', module: '维保管理', detail: '派发烟感探测器更换工单' },
    { action: '完成工单', module: '维保管理', detail: '标记排烟风机维修工单已完成' },
    { action: '新增预案', module: '应急预案', detail: '创建火灾疏散应急预案V2.0' },
    { action: '启动演练', module: '应急演练', detail: '启动兰大二院消防疏散演练' },
    { action: '视频回放', module: '视频监控', detail: '查看1F大厅火警时段录像' },
    { action: 'PTZ控制', module: '视频监控', detail: '调整摄像头云台至指定预置位' },
    { action: '数据导入', module: '数据管理', detail: '批量导入设备档案数据' },
    { action: '备份数据库', module: '系统维护', detail: '执行全量数据库备份' },
    { action: '修改角色', module: '权限管理', detail: '调整值班操作员权限范围' },
    { action: '发布通知', module: '通知公告', detail: '发布清明节消防安全通知' },
    { action: '屏蔽点位', module: '设备管理', detail: '临时屏蔽装修区域烟感点位' },
    { action: '解除屏蔽', module: '设备管理', detail: '解除3F走廊烟感点位屏蔽状态' },
  ];
  const users = ['系统管理员', '值班操作员A', '值班操作员B', '单位管理员A', '监控中心主任', '巡检员A', '巡检员B', '维保人员A', '安全工程师', '技术专员'];
  for (let i = 0; i < 50; i++) {
    const act = actionPool[i % actionPool.length];
    logs.push({
      id: fmtId('LOG', i + 1),
      time: randomDate(30),
      userId: fmtId('USR', randInt(1, 10)),
      userName: randPick(users),
      action: act.action,
      module: act.module,
      detail: act.detail,
      ip: `192.168.${randInt(1, 5)}.${randInt(10, 254)}`,
      result: randBool(0.92) ? 'success' : 'fail',
      createdAt: t,
    });
  }
  await SystemLogDAO.batchCreate(logs);
  return logs;
}

/* ───── 20. IoT设备种子 ───── */
export async function seedIoTDevices(units: Unit[]) {
  const devices: IoTDevice[] = [];
  const t = now();
  const categories = [
    { category: 'fire-controller', protocol: 'Modbus TCP', manufacturer: '海湾安全', model: 'GST5000H' },
    { category: 'elec-monitor', protocol: 'Modbus TCP', manufacturer: '安科瑞', model: 'ARCM300' },
    { category: 'pressure-sensor', protocol: 'MQTT', manufacturer: '西门子', model: 'SITRANS P' },
    { category: 'fan-controller', protocol: 'Modbus RTU', manufacturer: '上风高科', model: 'HTF-II-8' },
    { category: 'level-sensor', protocol: 'MQTT', manufacturer: 'E+H', model: 'Liquiline CM44' },
    { category: 'user-transmission-device', protocol: 'GB26875.1-2011', manufacturer: '赋安', model: 'FSCN8001' },
  ];
  for (let i = 0; i < randInt(5, 10); i++) {
    const unit = randPick(units);
    const cat = randPick(categories);
    // 传输装置始终在线，避免链路故障误导
    const isTransmission = cat.category === 'user-transmission-device';
    const onlineR = Math.random();
    const onlineStatus = isTransmission ? 'online' : (onlineR < 0.85 ? 'online' : onlineR < 0.95 ? 'offline' : 'unknown');
    const status = onlineStatus === 'offline' ? 'fault' : 'normal';
    devices.push({
      id: fmtId('IOT', i + 1),
      name: `${cat.manufacturer}-${cat.model}-${i + 1}`,
      category: cat.category,
      protocol: cat.protocol,
      ip: cat.protocol === 'MQTT' ? undefined : `192.168.1.${randInt(100, 200)}`,
      port: cat.protocol === 'Modbus TCP' ? 502 : cat.protocol === 'GB26875.1-2011' ? 5200 : undefined,
      imei: cat.protocol === 'MQTT' ? `8601230456789${String(i).padStart(2, '0')}` : undefined,
      unitId: unit.id,
      unitName: unit.name,
      floor: randPick(['B1', 'B2', '1F', '2F', 'RF']),
      room: randPick(['消防控制室', '配电室', '水泵房', '风机房', '消防水池']),
      onlineStatus,
      heartbeatInterval: randPick([30, 60]),
      registerCount: randInt(2, 200),
      manufacturer: cat.manufacturer,
      model: cat.model,
      firmware: `V${randInt(1, 3)}.${randInt(0, 9)}`,
      status,
      lastHeartbeat: onlineStatus === 'online' ? t : randomDate(2),
      createdAt: t,
      updatedAt: t,
    });
  }
  await IoTDeviceDAO.batchCreate(devices);
  return devices;
}

/* ───── 21. 人员种子 ───── */
export async function seedPersonnel(units: Unit[]) {
  const roles: Personnel['role'][] = ['manager', 'duty_officer', 'safety_officer', 'operator', 'inspector'];
  const names = ['张伟', '李娜', '王强', '刘洋', '陈静', '杨波', '赵敏', '黄磊', '周杰', '吴倩', '郑涛', '孙丽', '马超', '朱红', '胡军', '郭芳', '何伟', '林峰', '罗娜', '高明'];
  const certs = ['消防设施操作员', '消防安全管理员', '注册消防工程师', '建筑物消防员', '电工证'];
  const personnel: Personnel[] = [];
  const t = now();
  units.forEach((unit, ui) => {
    // 每个单位至少5人：负责人1、管理人1、安全员1、操作员1、巡查员1+
    const baseNames = shuffle(names).slice(0, randInt(5, 8));
    baseNames.forEach((name, i) => {
      const role = i < roles.length ? roles[i] : randPick(roles);
      personnel.push({
        id: fmtId('PER', ui * 10 + i + 1),
        name,
        phone: `1${randPick(['38','39','36','35','37'])}${String(randInt(10000000, 99999999)).padStart(8, '0')}`,
        role,
        unitId: unit.id,
        unitName: unit.name,
        certNo: randBool(0.7) ? `Z${randInt(100000, 999999)}` : undefined,
        certType: randBool(0.7) ? randPick(certs) : undefined,
        status: 'normal' as const,
        createdAt: t,
        updatedAt: t,
      });
    });
  });
  await PersonnelDAO.batchCreate(personnel);
  return personnel;
}

/* ───── 22. 摄像头种子 ───── */
export async function seedCameras(units: Unit[]) {
  const cameraTypes: Camera['type'][] = ['indoor', 'outdoor', 'elevator', 'corridor', 'entrance'];
  const cameraLocs = ['1F大厅', 'B1消防控制室', 'B2水泵房', '屋顶机房', '1F出入口', '电梯轿厢', '2F走廊', '地下车库入口', '消防通道', '配电室'];
  const cameras: Camera[] = [];
  const t = now();
  units.forEach((unit, ui) => {
    const count = randInt(4, 10);
    for (let i = 0; i < count; i++) {
      const type = randPick(cameraTypes);
      cameras.push({
        id: fmtId('CAM', ui * 10 + i + 1),
        name: `${unit.name}-${randPick(cameraLocs)}摄像头${i + 1}`,
        unitId: unit.id,
        unitName: unit.name,
        location: randPick(cameraLocs),
        rtspUrl: `rtsp://192.168.${randInt(1, 255)}.${randInt(1, 255)}:554/stream${i}`,
        streamUrl: `http://124.223.35.58:8080/live/cam${ui * 10 + i + 1}.m3u8`,
        type,
        status: 'normal' as const,
        onlineStatus: randBool(0.9) ? 'online' : 'offline',
        createdAt: t,
        updatedAt: t,
      });
    }
  });
  await CameraDAO.batchCreate(cameras);
  return cameras;
}

/* ───── 23. 建筑楼层平面图种子 ───── */
export async function seedFloorPlans(units: Unit[]) {
  const floorPlans: FloorPlan[] = [];
  const t = now();
  units.forEach((unit, ui) => {
    const floors = randInt(3, 8);
    for (let i = 0; i < floors; i++) {
      const floorNo = i === 0 ? -1 : i;
      const floorName = floorNo < 0 ? '地下一层' : `${floorNo}层`;
      floorPlans.push({
        id: fmtId('FP', ui * 10 + i + 1),
        unitId: unit.id,
        unitName: unit.name,
        floorNo,
        floorName: `${unit.name}-${floorName}`,
        imageUrl: undefined, // 用户上传
        width: 1200,
        height: 800,
        createdAt: t,
        updatedAt: t,
      });
    }
  });
  await FloorPlanDAO.batchCreate(floorPlans);
  return floorPlans;
}

/* ───── 24. 平面图设备点位种子 ───── */
export async function seedFloorDevices(floorPlans: FloorPlan[], devices: Device[]) {
  const floorDevices: FloorDevice[] = [];
  const t = now();
  floorPlans.forEach((fp) => {
    // 为每个平面图随机关联2-5个设备
    const devCount = randInt(2, 5);
    const shuffled = shuffle(devices.filter(d => d.unitId === fp.unitId));
    shuffled.slice(0, devCount).forEach((dev, i) => {
      floorDevices.push({
        id: fmtId('FD', parseInt(fp.id.replace('FP-', '')) * 10 + i + 1),
        floorPlanId: fp.id,
        deviceId: dev.id,
        deviceName: dev.name,
        x: randInt(10, 90),
        y: randInt(10, 90),
        type: dev.type,
        status: dev.status,
        createdAt: t,
        updatedAt: t,
      });
    });
  });
  await FloorDeviceDAO.batchCreate(floorDevices);
  return floorDevices;
}

/* ───── 25. 值班班次种子 ───── */
export async function seedDutyShifts(units: Unit[]) {
  const shiftTemplates = [
    { shiftName: '早班', startTime: '08:00', endTime: '16:00' },
    { shiftName: '中班', startTime: '16:00', endTime: '00:00' },
    { shiftName: '晚班', startTime: '00:00', endTime: '08:00' },
    { shiftName: '白班', startTime: '08:00', endTime: '20:00' },
    { shiftName: '夜班', startTime: '20:00', endTime: '08:00' },
  ];
  const shifts: DutyShift[] = [];
  const t = now();
  units.forEach((unit, ui) => {
    const templates = shuffle(shiftTemplates).slice(0, randInt(2, 4));
    templates.forEach((tmpl, i) => {
      shifts.push({
        id: fmtId('DS', ui * 10 + i + 1),
        unitId: unit.id,
        shiftName: `${unit.name}-${tmpl.shiftName}`,
        startTime: tmpl.startTime,
        endTime: tmpl.endTime,
        staffIds: [],
        status: 'normal' as const,
        createdAt: t,
        updatedAt: t,
      });
    });
  });
  await DutyShiftDAO.batchCreate(shifts);
  return shifts;
}

/* ───── 26. 交接班记录种子 ───── */
export async function seedDutyHandovers(units: Unit[]) {
  const handovers: DutyHandover[] = [];
  const t = now();
  const personnel = await PersonnelDAO.getAll();
  units.forEach((unit, ui) => {
    const unitPersonnel = personnel.filter(p => p.unitId === unit.id);
    if (unitPersonnel.length >= 2) {
      const count = randInt(1, 3);
      for (let i = 0; i < count; i++) {
        const [outgoing, incoming] = shuffle(unitPersonnel).slice(0, 2);
        handovers.push({
          id: fmtId('DH', ui * 10 + i + 1),
          shiftId: fmtId('DS', ui * 10 + 1),
          outgoingStaffId: outgoing.id,
          outgoingStaffName: outgoing.name,
          incomingStaffId: incoming.id,
          incomingStaffName: incoming.name,
          handoverTime: randomDate(7),
          notes: randPick(['设备运行正常', '无未处理报警', '消防泵已检查', '监控系统正常', '发现1处隐患已上报']),
          equipmentStatus: randPick(['全部正常', '1处异常已记录', '系统运行稳定']),
          pendingAlarms: randInt(0, 3),
          createdAt: t,
          updatedAt: t,
        });
      }
    }
  });
  await DutyHandoverDAO.batchCreate(handovers);
  return handovers;
}

/* ───── 27. 报警抓拍种子 ───── */
export async function seedAlarmSnapshots(alarms: Alarm[]) {
  const snapshots: AlarmSnapshot[] = [];
  const t = now();
  const cameras = await CameraDAO.getAll();
  alarms.slice(0, Math.min(alarms.length, 20)).forEach((alarm, i) => {
    const cam = cameras.length > 0 ? randPick(cameras) : undefined;
    snapshots.push({
      id: fmtId('AS', i + 1),
      alarmId: alarm.id,
      cameraId: cam?.id,
      cameraName: cam?.name,
      imageUrl: `https://picsum.photos/640/360?random=${i + 1}`,
      videoUrl: undefined,
      timestamp: alarm.createdAt,
      createdAt: t,
    });
  });
  await AlarmSnapshotDAO.batchCreate(snapshots);
  return snapshots;
}

/* ───── 28. 消控室配置种子 ───── */
export async function seedControlRoomConfigs(units: Unit[]) {
  const configs: ControlRoomConfig[] = [];
  const t = now();
  const personnel = await PersonnelDAO.getAll();
  units.forEach((unit, ui) => {
    const unitPersonnel = personnel.filter(p => p.unitId === unit.id);
    const manager = unitPersonnel.find(p => p.role === 'manager') || unitPersonnel[0];
    const dutyOfficer = unitPersonnel.find(p => p.role === 'duty_officer') || unitPersonnel[1];
    const safetyOfficer = unitPersonnel.find(p => p.role === 'safety_officer') || unitPersonnel[2];
    configs.push({
      id: fmtId('CRC', ui + 1),
      unitId: unit.id,
      roomName: `${unit.name}-消防控制室`,
      managerId: manager?.id,
      managerName: manager?.name,
      managerPhone: manager?.phone,
      dutyOfficerId: dutyOfficer?.id,
      dutyOfficerName: dutyOfficer?.name,
      dutyOfficerPhone: dutyOfficer?.phone,
      safetyOfficerId: safetyOfficer?.id,
      safetyOfficerName: safetyOfficer?.name,
      safetyOfficerPhone: safetyOfficer?.phone,
      address: `${unit.address}-B1层`,
      createdAt: t,
      updatedAt: t,
    });
  });
  await ControlRoomConfigDAO.batchCreate(configs);
  return configs;
}

/* ───── 24. GB28181国标设备种子 ───── */
export async function seedGB28181Devices(units: Unit[]) {
  const manufacturers = ['海康威视', '大华', '宇视', '天地伟业', '科达'];
  const models = ['DS-2CD3T25', 'DH-IPC-HFW2433', 'IPC-B312-IR', 'TC-C32LP', 'IPC2122'];
  const locations = ['1F大厅', 'B1消防控制室', '2F走廊', '屋顶机房', '地下车库入口', '电梯轿厢', '消防通道', '配电室'];
  const t = now();
  const devices: GB28181Device[] = [];
  const archiveDevices: Device[] = [];
  units.forEach((unit, ui) => {
    const count = randInt(2, 5);
    for (let i = 0; i < count; i++) {
      const id = fmtId('GB', ui * 10 + i + 1);
      const deviceId = `3402000000${randInt(11, 13)}${String(ui * 10 + i + 1).padStart(8, '0')}`;
      const status = randBool(0.8) ? 'online' : (randBool(0.5) ? 'offline' : 'fault');
      const loc = randPick(locations);
      const manufacturer = randPick(manufacturers);
      const model = randPick(models);
      const firmware = `V${randInt(1, 5)}.${randInt(0, 9)}.${randInt(0, 9)}`;
      const ip = `192.168.${randInt(1, 255)}.${randInt(1, 255)}`;
      const name = `${unit.name}-${loc}国标摄像头${i + 1}`;
      devices.push({
        id,
        deviceId,
        name,
        manufacturer,
        model,
        firmware,
        ip,
        port: 5060,
        transport: randBool(0.7) ? 'UDP' : 'TCP',
        username: deviceId,
        password: '12345678',
        status,
        registerTime: randomDate(30),
        lastKeepalive: status === 'online' ? t : randomDate(2),
        channelCount: randInt(1, 4),
        channels: Array.from({ length: randInt(1, 4) }, (_, ci) => ({
          channelId: `${deviceId}${String(ci + 1).padStart(2, '0')}`,
          name: `${loc}通道${ci + 1}`,
          status: status === 'online' ? 'on' : 'off',
          streamUrl: status === 'online' ? `http://124.223.35.58:8080/live/gb${ui * 10 + i + 1}_${ci + 1}.m3u8` : undefined,
          snapUrl: `https://picsum.photos/640/360?random=gb${ui * 10 + i + 1}_${ci + 1}`,
        })),
        catalogSynced: status === 'online',
        ptzSupport: randBool(0.6),
        unitId: unit.id,
        unitName: unit.name,
        location: loc,
        createdAt: t,
        updatedAt: t,
      });
      // 同步创建设备档案记录（先档案后接入）
      archiveDevices.push({
        id,
        name,
        type: 'gb28181-camera',
        unitId: unit.id,
        unitName: unit.name,
        location: loc,
        status: status === 'online' ? 'normal' : status === 'fault' ? 'fault' : 'offline',
        onlineStatus: status === 'online' ? 'online' : 'offline',
        manufacturer,
        model,
        firmware,
        ip,
        createdAt: t,
        updatedAt: t,
      });
    }
  });
  await GB28181DeviceDAO.batchCreate(devices);
  await DeviceDAO.batchCreate(archiveDevices);
  return devices;
}

/* ───── 25. SIP服务器配置种子 ───── */
export async function seedSIPServerConfig() {
  const configs: SIPServerConfig[] = [{
    id: 'SIP-SRV-001',
    domain: '3402000000',
    serverId: '34020000002000000001',
    serverIp: '0.0.0.0',
    serverPort: 5060,
    transport: 'UDP',
    heartbeatTimeout: 120,
    maxConnections: 1000,
    status: 'running',
    createdAt: now(),
    updatedAt: now(),
  }];
  await SIPServerConfigDAO.batchCreate(configs);
  return configs;
}

/* ───── 全部种子 ───── */
export async function seedAll(): Promise<void> {
  const units = generateUnits();
  await UnitDAO.batchCreate(units);

  const devices = await seedDevices(units);
  const alarms = await seedAlarms(units, devices);
  await seedControlRooms(units);
  await seedWorkOrders(units, devices);
  await seedMaintRecords(units, devices);
  await seedMaintContracts(units);
  await seedPatrolPlans(units);
  await seedPatrolRecords(units);
  await seedHazards(units, devices);
  await seedUsers(units);
  await seedRoles();
  const firePlans = await seedPlans(units);
  await seedDrills(units, firePlans);
  await seedInspections(units);
  await seedNotifications(units, devices);
  await seedDutySchedules();
  await seedDocuments();
  await seedSystemLogs();
  await seedIoTDevices(units);
  await seedPersonnel(units);
  await seedCameras(units);
  const floorPlans = await seedFloorPlans(units);
  await seedFloorDevices(floorPlans, devices);
  await seedDutyShifts(units);
  await seedDutyHandovers(units);
  await seedAlarmSnapshots(alarms);
  await seedControlRoomConfigs(units);
  await seedGB28181Devices(units);
  await seedSIPServerConfig();
}
