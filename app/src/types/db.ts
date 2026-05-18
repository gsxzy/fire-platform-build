/**
 * ═══════════════════════════════════════════════════════════════════
 * 数据库类型定义 - 智慧消防平台完整数据模型
 * ═══════════════════════════════════════════════════════════════════
 */

/* ───── 基础类型 ───── */
export type DBStatus = 'normal' | 'fault' | 'maintenance' | 'offline' | 'disabled' | 'scrapped';
export type AlarmLevel = 'urgent' | 'high' | 'normal' | 'low';
export type AlarmType = 'fire' | 'fault' | 'supervisory' | 'warning' | 'test';
export type AlarmStatus = 'new' | 'confirmed' | 'handled' | 'ignored';
export type OnlineStatus = 'online' | 'offline' | 'unknown';
export type WorkOrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type WorkOrderType = 'inspection' | 'repair' | 'maintenance' | 'replacement';
export type UnitType = 'general' | 'key' | 'nine-small';
export type RiskLevel = 'extreme' | 'high' | 'medium' | 'low';
export type PatrolCycle = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type HazardStatus = 'pending' | 'rectifying' | 'completed' | 'closed';
export type UserRole = 'super_admin' | 'unit_admin' | 'operator' | 'inspector' | 'maintainer';

/* ───── 1. 单位表 (units) ───── */
export interface Unit {
  id: string;               // 单位编码 UN-001
  name: string;             // 单位名称
  type: UnitType;           // 单位类型
  address: string;          // 地址
  contact: string;          // 联系人
  phone: string;            // 联系电话
  riskLevel: RiskLevel;     // 风险等级
  deviceCount: number;      // 设备数量
  status: DBStatus;         // 状态
  lat?: number;             // 纬度
  lng?: number;             // 经度
  createdAt: string;        // 创建时间
  updatedAt: string;        // 更新时间
}

/* ───── 设备生命周期状态枚举（与后端 DeviceLifecycleStatus 对齐）───── */
export type DeviceLifecycleStatus = 'draft' | 'registered' | 'accessed' | 'assigned' | 'maintenance' | 'scrapped';

/* ───── 2. 设备表 (devices) ───── */
export interface Device {
  id: string;               // 档案主键（fire_device.id）
  deviceNo?: string;         // 设备编号 device_no（展示用）
  name: string;             // 设备名称
  type: string;             // 设备类型 (detector/pump/fan/controller/etc)
  typeName?: string;        // 设备类型名称
  unitId: string;           // 所属单位ID
  unitName?: string;        // 所属单位名称（冗余）
  location: string;         // 安装位置
  status: DBStatus;         // 运行状态
  /** 流程状态：draft草稿→registered已入库→accessed已接入→assigned已分配→maintenance维护中→scrapped报废 */
  archiveStatus?: DeviceLifecycleStatus;
  lifecycleStatus?: number;
  onlineStatus: OnlineStatus; // 在线状态
  manufacturer?: string;    // 制造商
  model?: string;           // 型号
  firmware?: string;        // 固件版本
  serialNo?: string;        // 出厂序列号(SN)
  ip?: string;              // IP地址
  installDate?: string;     // 安装日期
  productionDate?: string;  // 生产日期
  warrantyPeriod?: number;  // 质保期(月)
  warrantyExpire?: string;  // 质保到期日
  maintenanceExpire?: string; // 维保到期日
  lastMaintDate?: string;   // 上次维保日期
  nextMaintDate?: string;   // 下次维保日期
  heartbeatInterval?: number; // 心跳间隔(秒)
  calibrationCycle?: number; // 校准周期(月)
  scrapYear?: number;       // 报废年限(年)
  protocolType?: string;    // 协议类型: standard/gb26875/fscn8001
  gatewayId?: string;       // 关联的用户信息传输装置ID(FSCN8001)
  deviceUniqueId?: string;  // FSCN8001原始设备ID(HEX)
  remark?: string;          // 备注
  /** 是否已有IoT接入配置（后端子查询返回） */
  hasIotConfig?: boolean;
  /** 分配阶段字段 */
  projectCode?: string;     // 项目/工程编码
  buildingId?: number;      // 所属建筑ID
  floorId?: number;         // 所属楼层ID
  pointId?: number;         // 平面图点位ID
  createdAt: string;
  updatedAt: string;
}

/* ───── 3. 告警表 (alarms) ───── */
export interface Alarm {
  id: string;               // 告警编号
  alarmNo?: string;         // 业务报警编号 alarm_no
  type: AlarmType;          // 告警类型
  level: AlarmLevel;        // 告警等级
  deviceId: string;         // 设备ID
  deviceName?: string;      // 设备名称（冗余）
  unitId: string;           // 单位ID
  unitName?: string;        // 单位名称（冗余）
  location: string;         // 位置
  message: string;          // 告警内容
  status: AlarmStatus;      // 处理状态
  handler?: string;         // 处理人
  handleTime?: string;      // 处理时间
  handleNote?: string;      // 处理备注
  snapshotUrl?: string;     // 抓拍图片
  loopNo?: number;          // 回路号
  pointNo?: number;         // 点位号
  rawFrameHex?: string;     // 原始帧HEX(排障用)
  createdAt: string;        // 告警时间
  updatedAt: string;
}

/* ───── 4. 消控室表 (control_rooms) ───── */
export interface ControlRoom {
  id: string;               // 编码
  unitId: string;           // 单位ID
  unitName: string;         // 单位名称
  hostModel: string;        // 主机型号
  hostCode: string;         // 主机编码
  systemCount: number;      // 子系统数量
  deviceCount: number;      // 接入设备数
  status: DBStatus;         // 状态
  contactName: string;      // 值班负责人
  contactPhone: string;     // 联系电话
  dutyCount: number;        // 值班人员数
  staffList?: string;       // 人员名单
  address: string;          // 地址
  remark?: string;          // 备注
  createdAt: string;
  updatedAt: string;
}

/* ───── 5. 维保工单表 (work_orders) ───── */
export interface WorkOrder {
  id: string;               // 工单编号
  type: WorkOrderType;      // 工单类型
  unitId: string;           // 单位ID
  unitName?: string;        // 单位名称
  deviceId?: string;        // 设备ID
  deviceName?: string;      // 设备名称
  title: string;            // 工单标题
  content: string;          // 工作内容
  staff: string;            // 执行人员
  planDate: string;         // 计划日期
  completeDate?: string;    // 完成日期
  status: WorkOrderStatus;  // 状态
  result?: string;          // 处理结果
  createdAt: string;
  updatedAt: string;
}

/* ───── 6. 维保记录表 (maint_records) ───── */
export interface MaintRecord {
  id: string;               // 记录编号
  unitId: string;           // 单位ID
  unitName?: string;        // 单位名称
  deviceId?: string;        // 设备ID
  deviceName?: string;      // 设备名称
  type: WorkOrderType;      // 维保类型
  content: string;          // 维保内容
  result: string;           // 维保结果
  staff: string;            // 维保人员
  date: string;             // 维保日期
  nextDate?: string;        // 下次维保日期
  createdAt: string;
}

/* ───── 7. 维保合同表 (maint_contracts) ───── */
export interface MaintContract {
  id: string;               // 合同编号
  name: string;             // 合同名称
  unitId: string;           // 服务单位ID
  unitName?: string;        // 服务单位
  company: string;          // 维保公司
  startDate: string;        // 起始日期
  endDate: string;          // 终止日期
  amount: string;           // 合同金额
  status: 'active' | 'expiring' | 'expired'; // 状态
  createdAt: string;
}

/* ───── 8. 巡检计划表 (patrol_plans) ───── */
export interface PatrolPlan {
  id: string;               // 计划编号
  name: string;             // 计划名称
  unitId: string;           // 巡检单位ID
  unitName?: string;        // 巡检单位
  cycle: PatrolCycle;       // 巡检周期
  items: number;            // 巡检项数
  nextDate: string;         // 下次巡检
  staff: string;            // 责任人
  status: DBStatus;         // 状态
  createdAt: string;
  updatedAt: string;
}

/* ───── 9. 巡检记录表 (patrol_records) ───── */
export interface PatrolRecord {
  id: string;               // 记录编号
  planId?: string;          // 关联计划ID
  unitId: string;           // 巡检单位ID
  unitName?: string;        // 巡检单位
  date: string;             // 巡检日期
  items: number;            // 巡检项
  passed: number;           // 通过数
  failed: number;           // 异常数
  staff: string;            // 巡检人
  status: 'all-normal' | 'has-issue'; // 结果
  createdAt: string;
}

/* ───── 10. 隐患表 (hazards) ───── */
export interface Hazard {
  id: string;               // 隐患编号
  unitId: string;           // 所属单位ID
  unitName?: string;        // 所属单位
  deviceId?: string;        // 涉及设备
  description: string;      // 隐患描述
  level: AlarmLevel;        // 隐患等级
  foundDate: string;        // 发现日期
  deadline: string;         // 整改期限
  status: HazardStatus;     // 状态
  handler?: string;         // 整改人
  handleNote?: string;      // 整改说明
  createdAt: string;
  updatedAt: string;
}

/* ───── 11. 用户表 (users) ───── */
export interface User {
  id: string;               // 用户ID
  username: string;         // 用户名
  realName: string;         // 真实姓名
  role: UserRole;           // 角色
  unitId?: string;          // 所属单位
  unitName?: string;        // 单位名称
  phone: string;            // 电话
  email?: string;           // 邮箱
  password?: string;        // 密码（前端不存储）
  avatar?: string;          // 头像
  status: 'active' | 'disabled'; // 状态
  lastLogin?: string;       // 最后登录
  createdAt: string;
  updatedAt: string;
}

/* ───── 12. 角色表 (roles) ───── */
export interface Role {
  id: string;               // 角色ID
  name: string;             // 角色名称
  code: string;             // 角色编码
  description: string;      // 描述
  users: number;            // 用户数量
  perms: number;            // 权限数
  status: 'active' | 'disabled';
  createdAt: string;
}

/* ───── 13. 预案表 (plans) ───── */
export interface Plan {
  id: string;               // 预案编号
  name: string;             // 预案名称
  unitId: string;           // 适用单位
  unitName?: string;        // 适用单位
  type: string;             // 预案类型
  level: string;            // 预案级别
  version: string;          // 版本号
  updateDate: string;       // 更新日期
  status: 'active' | 'revoked' | 'revising';
  content?: string;         // 预案内容
  createdAt: string;
  updatedAt: string;
}

/* ───── 14. 演练记录表 (drills) ───── */
export interface Drill {
  id: string;               // 演练编号
  name: string;             // 演练名称
  unitId: string;           // 演练单位
  unitName?: string;        // 演练单位
  planId?: string;          // 关联预案
  date: string;             // 演练日期
  participants: number;     // 参与人数
  duration: string;         // 用时
  result: 'excellent' | 'good' | 'pass' | 'fail';
  summary?: string;         // 总结
  createdAt: string;
}

/* ───── 14.1 演练参与人表 (drill_participants) ───── */
export interface DrillParticipant {
  id: string;
  drillId: string;
  name: string;
  role?: string;
  createdAt: string;
}

/* ───── 15. 消防检查表 (inspections) ───── */
export interface Inspection {
  id: string;               // 检查编号
  name: string;             // 检查项目
  unitId: string;           // 检查单位
  unitName?: string;        // 检查单位
  checker: string;          // 检查人
  date: string;             // 检查日期
  result: 'pass' | 'fail' | 'partial'; // 结果
  issues: string;           // 发现问题
  status: 'no-need' | 'pending' | 'rectifying' | 'completed'; // 整改状态
  createdAt: string;
  updatedAt: string;
}

/* ───── 16. 通知表 (notifications) ───── */
export interface Notification {
  id: string;               // 通知ID
  type: AlarmType;          // 通知类型
  title: string;            // 标题
  content: string;          // 内容
  alarmId?: string;         // 关联告警ID
  unitId?: string;          // 关联单位
  isRead: boolean;          // 是否已读
  readTime?: string;        // 读取时间
  createdAt: string;
}

/* ───── 17. 值班表 (duty_schedules) ───── */
export interface DutySchedule {
  id: string;               // 排班ID
  name: string;             // 姓名
  phone: string;            // 电话
  role: string;             // 角色
  date: string;             // 日期
  shift: 'day' | 'night';   // 班次
  status: 'on' | 'off' | 'leave'; // 状态
  createdAt: string;
  updatedAt: string;
}

/* ───── 18. 知识库文档表 (documents) ───── */
export interface Document {
  id: string;               // 文档编号
  title: string;            // 文档标题
  category: string;         // 分类
  docType: string;          // 文档类型
  author: string;           // 编写人
  date: string;             // 发布日期
  version: string;          // 版本
  status: 'active' | 'revoked' | 'revising';
  content?: string;         // 内容摘要
  fileUrl?: string;         // 文件链接
  createdAt: string;
  updatedAt: string;
}

/* ───── 19. 系统日志表 (system_logs) ───── */
export interface SystemLog {
  id: string;               // 日志ID
  time: string;             // 操作时间
  userId: string;           // 操作人ID
  userName?: string;        // 操作人
  action: string;           // 操作类型
  module: string;           // 操作模块
  detail: string;           // 操作内容
  ip?: string;              // IP地址
  result: 'success' | 'fail';
  createdAt: string;
}

/* ───── 20. IoT设备接入表 (iot_devices) ───── */
export interface IoTDevice {
  id: string;               // 设备编码
  name: string;             // 设备名称
  category: string;         // 设备分类
  protocol: string;         // 通信协议
  ip?: string;              // IP地址
  port?: number;            // 端口
  imei?: string;            // IMEI
  unitId: string;           // 所属单位
  unitName?: string;        // 单位名称
  floor: string;            // 楼层
  room?: string;            // 房间号
  onlineStatus: OnlineStatus;
  lastHeartbeat?: string;   // 最后心跳
  heartbeatInterval: number;
  registerCount: number;
  manufacturer?: string;
  model?: string;
  firmware?: string;
  status: DBStatus;
  createdAt: string;
  updatedAt: string;
}

/* ───── 21. 人员表 (personnel) ───── */
export interface Personnel {
  id: string;               // 人员编码
  name: string;             // 姓名
  phone: string;            // 电话
  role: 'manager' | 'duty_officer' | 'safety_officer' | 'operator' | 'inspector'; // 角色
  unitId: string;           // 所属单位
  unitName?: string;        // 单位名称
  certNo?: string;          // 资质证书编号
  certType?: string;        // 资质类型
  status: DBStatus;         // 状态
  createdAt: string;
  updatedAt: string;
}

/* ───── 22. 摄像头表 (cameras) ───── */
export interface Camera {
  id: string;               // 摄像头编码
  name: string;             // 摄像头名称
  unitId: string;           // 所属单位
  unitName?: string;        // 单位名称
  location: string;         // 安装位置
  rtspUrl?: string;         // RTSP流地址
  streamUrl?: string;       // HLS/WS流地址
  type: 'indoor' | 'outdoor' | 'elevator' | 'corridor' | 'entrance'; // 类型
  status: DBStatus;         // 状态
  onlineStatus: OnlineStatus;
  createdAt: string;
  updatedAt: string;
  deviceId?: string;        // WVP 国标设备编码
  channelId?: string;       // WVP 通道编码
}

/* ───── 23. 建筑楼层平面图 (floor_plans) ───── */
export interface FloorPlan {
  id: string;               // 平面图ID
  unitId: string;           // 所属单位
  unitName?: string;        // 单位名称
  floorNo: number;          // 楼层号
  floorName: string;        // 楼层名称
  imageUrl?: string;        // 平面图图片(base64或URL)
  width?: number;           // 图片宽度
  height?: number;          // 图片高度
  createdAt: string;
  updatedAt: string;
}

/* ───── 24. 平面图设备点位 (floor_devices) ───── */
export interface FloorDevice {
  id: string;               // 点位ID
  floorPlanId: string;      // 所属平面图
  deviceId: string;         // 关联设备ID
  deviceName?: string;      // 设备名称
  x: number;                // X坐标(百分比0-100)
  y: number;                // Y坐标(百分比0-100)
  type: string;             // 点位类型
  status: DBStatus;         // 状态
  createdAt: string;
  updatedAt: string;
}

/* ───── 25. 值班班次 (duty_shifts) ───── */
export interface DutyShift {
  id: string;               // 班次ID
  unitId: string;           // 所属单位
  shiftName: string;        // 班次名称
  startTime: string;        // 开始时间 HH:MM
  endTime: string;          // 结束时间 HH:MM
  staffIds: string[];       // 值班人员ID列表
  staffNames?: string[];    // 值班人员名称
  status: DBStatus;
  createdAt: string;
  updatedAt: string;
}

/* ───── 26. 交接班记录 (duty_handovers) ───── */
export interface DutyHandover {
  id: string;               // 记录ID
  shiftId: string;          // 班次ID
  outgoingStaffId: string;  // 交班人ID
  outgoingStaffName?: string; // 交班人姓名
  incomingStaffId: string;  // 接班人ID
  incomingStaffName?: string; // 接班人姓名
  handoverTime: string;     // 交接时间
  notes?: string;           // 交接备注
  equipmentStatus?: string; // 设备状态
  pendingAlarms?: number;   // 未处理报警数
  createdAt: string;
  updatedAt: string;
}

/* ───── 27. 报警抓拍/快照 (alarm_snapshots) ───── */
export interface AlarmSnapshot {
  id: string;               // 快照ID
  alarmId: string;          // 关联报警ID
  cameraId?: string;        // 关联摄像头ID
  cameraName?: string;      // 摄像头名称
  imageUrl?: string;        // 抓拍图片
  videoUrl?: string;        // 录像片段
  timestamp: string;        // 抓拍时间
  createdAt: string;
}

/* ───── 28. 消控室配置 (control_room_configs) ───── */
export interface ControlRoomConfig {
  id: string;               // 配置ID
  unitId: string;           // 所属单位
  roomName: string;         // 消控室名称
  managerId?: string;       // 消控室负责人ID
  managerName?: string;     // 消控室负责人姓名
  managerPhone?: string;    // 消控室负责人电话
  dutyOfficerId?: string;   // 消控室管理人ID
  dutyOfficerName?: string; // 消控室管理人姓名
  dutyOfficerPhone?: string;// 消控室管理人电话
  safetyOfficerId?: string; // 消防安全管理人ID
  safetyOfficerName?: string; // 消防安全管理人姓名
  safetyOfficerPhone?: string; // 消防安全管理人电话
  address?: string;         // 地址
  createdAt: string;
  updatedAt: string;
}

/* ───── 29. GB28181国标设备 (gb28181_devices) ───── */
export interface GB28181Channel {
  channelId: string;        // 通道编码 20位
  name: string;             // 通道名称
  status: 'on' | 'off';     // 推流状态
  streamUrl?: string;       // HLS流地址
  snapUrl?: string;         // 快照地址
}

export interface GB28181Device {
  id: string;               // 内部ID
  deviceId: string;         // 国标设备编码 20位
  name: string;             // 设备名称
  manufacturer: string;     // 厂商
  model: string;            // 型号
  firmware: string;         // 固件版本
  ip: string;               // 设备IP
  port: number;             // SIP端口
  transport: 'UDP' | 'TCP'; // 传输协议
  username?: string;        // SIP认证用户名
  password?: string;        // SIP认证密码
  status: 'online' | 'offline' | 'registering' | 'fault';
  registerTime: string;     // 注册时间
  lastKeepalive: string;    // 最后心跳
  channelCount: number;
  channels: GB28181Channel[];
  catalogSynced: boolean;   // 目录是否已同步
  ptzSupport: boolean;      // 是否支持云台
  unitId: string;           // 所属单位
  unitName?: string;        // 单位名称
  location: string;         // 安装位置
  createdAt: string;
  updatedAt: string;
  isLocal?: boolean;        // 是否为本地预配置设备（WVP模式下）
}

/* ───── 30. SIP服务器配置 (sip_server_config) ───── */
export interface SIPServerConfig {
  id: string;
  domain: string;           // 国标域
  serverId: string;         // SIP服务器ID
  serverIp: string;         // 监听IP
  serverPort: number;       // SIP端口
  transport: 'UDP' | 'TCP';
  heartbeatTimeout: number; // 心跳超时(秒)
  maxConnections: number;   // 最大连接数
  status: 'running' | 'stopped';
  createdAt: string;
  updatedAt: string;
}

/* ───── 31. 报警主机编码表 (host_device_codes) ───── */
export interface HostDeviceCode {
  id: string;
  hostId: string;
  loopNo: number;
  pointNo: number;
  deviceType: string;
  deviceName: string;
  installLocation: string;
  floor: string;
  parentDevice: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

/* ───── API 通用响应（与后端 apiEnvelope：msg + message + timestamp 对齐） ───── */
export interface ApiResponse<T = unknown> {
  code: number;
  /** 与 msg 二选一或并存，见 getApiEnvelopeMessage */
  message?: string;
  msg?: string;
  data: T;
  timestamp?: number;
  /** 与响应头 X-Request-Id 对应（后端可选返回） */
  requestId?: string;
  _reqId?: string;
}

export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  archive_status?: string;
  [key: string]: string | number | undefined;
}
