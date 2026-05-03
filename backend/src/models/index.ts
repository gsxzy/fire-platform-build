import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';
import {
  Building,
  Floor,
  FloorDevicePosition,
  FloorCameraBinding,
  initFloorPlanAssociations,
} from './floorPlan.model';

export { Building, Floor, FloorDevicePosition, FloorCameraBinding, initFloorPlanAssociations };

/* ═══════════════════════════════════════════════════════════════════
   新致远智慧消防云平台 - 全量数据库模型定义
   对应前端23个业务模块，共30+张核心表
   ═══════════════════════════════════════════════════════════════════ */

/* ── 1. 用户与权限 ── */
export const User = sequelize.define('user', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  real_name: { type: DataTypes.STRING(50), defaultValue: '' },
  phone: { type: DataTypes.STRING(20), defaultValue: '' },
  email: { type: DataTypes.STRING(100), defaultValue: '' },
  avatar: { type: DataTypes.STRING(255), defaultValue: '' },
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '0禁用 1启用' },
  last_login: DataTypes.DATE,
  login_ip: DataTypes.STRING(50),
  dept_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
}, { tableName: 'sys_user', comment: '系统用户表' });

export const Role = sequelize.define('role', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  role_name: { type: DataTypes.STRING(50), allowNull: false },
  role_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  description: DataTypes.STRING(200),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
  sort: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'sys_role', comment: '角色表' });

export const Permission = sequelize.define('permission', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  perm_name: { type: DataTypes.STRING(50), allowNull: false },
  perm_code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  type: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1菜单 2按钮 3接口' },
  parent_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
  path: DataTypes.STRING(200),
  icon: DataTypes.STRING(50),
  sort: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'sys_permission', comment: '权限表' });

export const UserRole = sequelize.define('user_role', {
  user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
}, { tableName: 'sys_user_role', comment: '用户角色关联', timestamps: false });

export const RolePermission = sequelize.define('role_permission', {
  role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  perm_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
}, { tableName: 'sys_role_permission', comment: '角色权限关联', timestamps: false });

export const Department = sequelize.define('department', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  dept_name: { type: DataTypes.STRING(100), allowNull: false },
  parent_id: { type: DataTypes.BIGINT.UNSIGNED, defaultValue: 0 },
  leader: DataTypes.STRING(50),
  phone: DataTypes.STRING(20),
  sort: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'sys_department', comment: '组织架构表' });

export const SystemLog = sequelize.define('system_log', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT.UNSIGNED },
  username: DataTypes.STRING(50),
  operation: { type: DataTypes.STRING(100), allowNull: false },
  method: DataTypes.STRING(10),
  path: DataTypes.STRING(255),
  ip: DataTypes.STRING(50),
  params: DataTypes.TEXT,
  result: DataTypes.TEXT,
  duration: DataTypes.INTEGER,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'sys_log', comment: '系统日志表' });

/* ── 2. 单位管理 ── */
export const Unit = sequelize.define('unit', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  unit_name: { type: DataTypes.STRING(200), allowNull: false },
  unit_code: { type: DataTypes.STRING(50), unique: true },
  unit_type: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1一般单位 2重点单位 3九小场所' },
  address: DataTypes.STRING(300),
  lng: DataTypes.DECIMAL(10, 7),
  lat: DataTypes.DECIMAL(10, 7),
  contact_name: DataTypes.STRING(50),
  contact_phone: DataTypes.STRING(20),
  building_area: DataTypes.DECIMAL(10, 2),
  floor_count: DataTypes.INTEGER,
  fire_level: { type: DataTypes.TINYINT, defaultValue: 1, comment: '消防等级 1-5' },
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
  remark: DataTypes.TEXT,
}, { tableName: 'fire_unit', comment: '消防单位表' });

/* ── 3. 设备管理 ── */
export const Device = sequelize.define('device', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  device_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  device_name: { type: DataTypes.STRING(100), allowNull: false },
  device_type: { type: DataTypes.STRING(30), allowNull: false, comment: '烟感/温感/手报/消火栓/水泵/风机/摄像头等' },
  device_model: DataTypes.STRING(50),
  manufacturer: DataTypes.STRING(100),
  unit_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  install_location: DataTypes.STRING(200),
  floor: DataTypes.STRING(10),
  room: DataTypes.STRING(50),
  lng: DataTypes.DECIMAL(10, 7),
  lat: DataTypes.DECIMAL(10, 7),
  install_date: DataTypes.DATEONLY,
  warranty_expire: DataTypes.DATEONLY,
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1正常 2故障 3离线 4报废' },
  last_online: DataTypes.DATE,
  iot_id: DataTypes.STRING(100),
  protocol_type: DataTypes.STRING(20),
}, { tableName: 'fire_device', comment: '消防设备表' });

/* ── 4. 告警中心 ── */
export const Alarm = sequelize.define('alarm', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  alarm_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  alarm_type: { type: DataTypes.TINYINT, allowNull: false, comment: '1火警 2故障 3预警 4屏蔽 5其他' },
  alarm_level: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1一般 2严重 3紧急' },
  device_id: DataTypes.BIGINT.UNSIGNED,
  device_name: DataTypes.STRING(100),
  unit_id: DataTypes.BIGINT.UNSIGNED,
  unit_name: DataTypes.STRING(200),
  location: DataTypes.STRING(200),
  alarm_desc: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0未处理 1确认中 2已处理 3误报' },
  handler_id: DataTypes.BIGINT.UNSIGNED,
  handler_name: DataTypes.STRING(50),
  handle_time: DataTypes.DATE,
  handle_result: DataTypes.TEXT,
  confirm_time: DataTypes.DATE,
  push_status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0未推送 1已推送 2推送失败' },
}, { tableName: 'fire_alarm', comment: '告警记录表' });

/* ── 5. 维保管理 ── */
export const MaintenanceCompany = sequelize.define('maintenance_company', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  company_name: { type: DataTypes.STRING(200), allowNull: false },
  credit_code: { type: DataTypes.STRING(50), unique: true },
  legal_person: DataTypes.STRING(50),
  contact_phone: DataTypes.STRING(20),
  address: DataTypes.STRING(300),
  qualification_level: DataTypes.STRING(20),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_maint_company', comment: '维保单位表' });

export const MaintenanceContract = sequelize.define('maintenance_contract', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  contract_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  company_id: DataTypes.BIGINT.UNSIGNED,
  unit_id: DataTypes.BIGINT.UNSIGNED,
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY,
  amount: DataTypes.DECIMAL(12, 2),
  service_content: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1有效 2到期 3终止' },
}, { tableName: 'fire_maint_contract', comment: '维保合同表' });

export const MaintenanceWorkOrder = sequelize.define('maintenance_work_order', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  order_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  order_type: { type: DataTypes.TINYINT, allowNull: false, comment: '1巡检 2维修 3保养 4检测' },
  device_id: DataTypes.BIGINT.UNSIGNED,
  device_name: DataTypes.STRING(100),
  unit_id: DataTypes.BIGINT.UNSIGNED,
  unit_name: DataTypes.STRING(200),
  fault_desc: DataTypes.TEXT,
  priority: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1低 2中 3高 4紧急' },
  status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0待派单 1处理中 2已完成 3已关闭' },
  assignee_id: DataTypes.BIGINT.UNSIGNED,
  assignee_name: DataTypes.STRING(50),
  plan_start: DataTypes.DATE,
  plan_end: DataTypes.DATE,
  actual_start: DataTypes.DATE,
  actual_end: DataTypes.DATE,
  handle_result: DataTypes.TEXT,
  material_cost: DataTypes.DECIMAL(10, 2),
  labor_cost: DataTypes.DECIMAL(10, 2),
  satisfaction: { type: DataTypes.TINYINT, comment: '1-5星' },
}, { tableName: 'fire_maint_work_order', comment: '维保工单表' });

/* ── 6. 巡检管理 ── */
export const PatrolPlan = sequelize.define('patrol_plan', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  plan_name: { type: DataTypes.STRING(100), allowNull: false },
  unit_id: DataTypes.BIGINT.UNSIGNED,
  patrol_type: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1日检 2周检 3月检 4季检 5年检' },
  patrol_items: DataTypes.TEXT,
  responsible_id: DataTypes.BIGINT.UNSIGNED,
  responsible_name: DataTypes.STRING(50),
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY,
  cron_expr: DataTypes.STRING(50),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_patrol_plan', comment: '巡检计划表' });

export const PatrolRecord = sequelize.define('patrol_record', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  plan_id: DataTypes.BIGINT.UNSIGNED,
  patrol_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  unit_id: DataTypes.BIGINT.UNSIGNED,
  unit_name: DataTypes.STRING(200),
  patrol_user_id: DataTypes.BIGINT.UNSIGNED,
  patrol_user_name: DataTypes.STRING(50),
  patrol_date: DataTypes.DATE,
  patrol_items: DataTypes.TEXT,
  result: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1正常 2异常' },
  abnormal_desc: DataTypes.TEXT,
  photos: DataTypes.TEXT,
  signature: DataTypes.STRING(255),
}, { tableName: 'fire_patrol_record', comment: '巡检记录表' });

export const Hazard = sequelize.define('hazard', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  hazard_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  unit_id: DataTypes.BIGINT.UNSIGNED,
  unit_name: DataTypes.STRING(200),
  hazard_type: { type: DataTypes.TINYINT, comment: '1设备故障 2通道堵塞 3标识缺失 4其他' },
  description: DataTypes.TEXT,
  level: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1一般 2重大 3特大' },
  photos: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0待整改 1整改中 2已整改 3延期' },
  rectification_measures: DataTypes.TEXT,
  deadline: DataTypes.DATEONLY,
  rectifier_id: DataTypes.BIGINT.UNSIGNED,
  rectifier_name: DataTypes.STRING(50),
  rectification_date: DataTypes.DATE,
  before_photo: DataTypes.STRING(255),
  after_photo: DataTypes.STRING(255),
}, { tableName: 'fire_hazard', comment: '隐患管理表' });

/* ── 7. 值守中心 ── */
export const DutySchedule = sequelize.define('duty_schedule', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: DataTypes.BIGINT.UNSIGNED,
  user_name: DataTypes.STRING(50),
  duty_date: DataTypes.DATEONLY,
  shift_type: { type: DataTypes.TINYINT, comment: '1早班 2中班 3晚班' },
  start_time: DataTypes.TIME,
  end_time: DataTypes.TIME,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_duty_schedule', comment: '值班排班表' });

export const DutyLog = sequelize.define('duty_log', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: DataTypes.BIGINT.UNSIGNED,
  user_name: DataTypes.STRING(50),
  on_duty_time: DataTypes.DATE,
  off_duty_time: DataTypes.DATE,
  handover_content: DataTypes.TEXT,
  incidents: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_duty_log', comment: '值班日志表' });

/* ── 8. 消控室 ── */
export const ControlRoom = sequelize.define('control_room', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  room_name: { type: DataTypes.STRING(100), allowNull: false },
  unit_id: DataTypes.BIGINT.UNSIGNED,
  unit_name: DataTypes.STRING(200),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
  duty_person: DataTypes.STRING(50),
  duty_phone: DataTypes.STRING(20),
  video_url: DataTypes.STRING(500),
}, { tableName: 'fire_control_room', comment: '消控室表' });

/* ── 消控室报警主机 ── */
export const ControlRoomHost = sequelize.define('control_room_host', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  room_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, comment: '所属消控室ID' },
  host_name: { type: DataTypes.STRING(100), allowNull: false, comment: '主机名称' },
  host_model: { type: DataTypes.STRING(50), comment: '主机型号' },
  host_no: { type: DataTypes.STRING(50), comment: '主机编号' },
  host_ip: { type: DataTypes.STRING(50), comment: '主机IP地址' },
  host_port: { type: DataTypes.INTEGER, defaultValue: 502, comment: '主机通讯端口' },
  protocol_type: { type: DataTypes.STRING(20), defaultValue: 'ModbusTCP', comment: '通讯协议 ModbusTCP/GB26875/私有协议' },
  slave_id: { type: DataTypes.INTEGER, defaultValue: 1, comment: '从机地址' },
  loop_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '回路数量' },
  device_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '挂载设备数' },
  manual_mode: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0自动 1手动' },
  silenced: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0正常 1消音' },
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '0离线 1在线 2故障' },
  last_heartbeat: DataTypes.DATE,
}, { tableName: 'fire_control_room_host', comment: '消控室报警主机表' });

/* ── 消控室主机多线盘 ── */
export const MultilinePanel = sequelize.define('multiline_panel', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  host_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  panel_name: { type: DataTypes.STRING(50), defaultValue: '多线盘' },
  point_no: { type: DataTypes.INTEGER, allowNull: false, comment: '点位号' },
  point_name: { type: DataTypes.STRING(100), comment: '点位名称' },
  device_type: { type: DataTypes.STRING(30), comment: '设备类型' },
  status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0停止 1启动 2故障' },
  feedback_status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0无反馈 1有反馈' },
}, { tableName: 'fire_multiline_panel', comment: '多线盘点位表' });

/* ── 消控室主机总线点位 ── */
export const BusPoint = sequelize.define('bus_point', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  host_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  loop_no: { type: DataTypes.INTEGER, allowNull: false, comment: '回路号' },
  point_no: { type: DataTypes.INTEGER, allowNull: false, comment: '点位号' },
  point_name: { type: DataTypes.STRING(100), comment: '点位名称' },
  device_type: { type: DataTypes.STRING(30), comment: '设备类型' },
  install_location: DataTypes.STRING(200),
  status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0正常 1火警 2故障 3屏蔽 4预警' },
}, { tableName: 'fire_bus_point', comment: '总线点位表' });

/* ── 消控室控制指令日志 ── */
export const HostCommandLog = sequelize.define('host_command_log', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  room_id: DataTypes.BIGINT.UNSIGNED,
  host_id: DataTypes.BIGINT.UNSIGNED,
  host_name: DataTypes.STRING(100),
  cmd_type: { type: DataTypes.TINYINT, allowNull: false, comment: '1消音 2复位 3手自动切换 4多线启动 5多线停止 6总线控制' },
  cmd_param: DataTypes.TEXT,
  result: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0待执行 1成功 2失败' },
  result_msg: DataTypes.STRING(255),
  operator_id: DataTypes.BIGINT.UNSIGNED,
  operator_name: DataTypes.STRING(50),
}, { tableName: 'fire_host_command_log', comment: '主机控制指令日志表' });

/* ── 9. 应急预案 ── */
export const EmergencyPlan = sequelize.define('emergency_plan', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  plan_name: { type: DataTypes.STRING(200), allowNull: false },
  plan_type: { type: DataTypes.TINYINT, comment: '1灭火 2疏散 3防汛 4停电' },
  unit_id: DataTypes.BIGINT.UNSIGNED,
  applicable_scene: DataTypes.TEXT,
  content: DataTypes.TEXT('long'),
  file_url: DataTypes.STRING(500),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_emergency_plan', comment: '应急预案表' });

export const EmergencyDrill = sequelize.define('emergency_drill', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  drill_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  plan_id: DataTypes.BIGINT.UNSIGNED,
  unit_id: DataTypes.BIGINT.UNSIGNED,
  unit_name: DataTypes.STRING(200),
  drill_date: DataTypes.DATE,
  drill_type: DataTypes.STRING(30),
  participants: DataTypes.INTEGER,
  drill_content: DataTypes.TEXT,
  result: DataTypes.TEXT,
  photos: DataTypes.TEXT,
  video_url: DataTypes.STRING(500),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_emergency_drill', comment: '演练记录表' });

/* ── 10. 知识库 ── */
export const KnowledgeDoc = sequelize.define('knowledge_doc', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  category: { type: DataTypes.STRING(30), allowNull: false },
  content: DataTypes.TEXT('long'),
  file_url: DataTypes.STRING(500),
  tags: DataTypes.STRING(200),
  view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_knowledge_doc', comment: '知识库文档表' });

/* ── 11. IoT设备接入 ── */
export const IoTDevice = sequelize.define('iot_device', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  device_sn: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  device_name: { type: DataTypes.STRING(100), allowNull: false },
  device_type: DataTypes.STRING(30),
  protocol_type: { type: DataTypes.STRING(20), comment: 'MQTT/Modbus/HTTP/GB26875' },
  protocol_config: DataTypes.TEXT,
  unit_id: DataTypes.BIGINT.UNSIGNED,
  status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0离线 1在线 2故障' },
  last_online: DataTypes.DATE,
  ip_address: DataTypes.STRING(50),
  port: DataTypes.INTEGER,
  data_format: DataTypes.STRING(20),
}, { tableName: 'fire_iot_device', comment: 'IoT接入设备表' });

export const ProtocolConfig = sequelize.define('protocol_config', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  protocol_name: { type: DataTypes.STRING(50), allowNull: false },
  protocol_type: { type: DataTypes.STRING(20), allowNull: false },
  config_json: DataTypes.TEXT,
  description: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_protocol_config', comment: '协议配置表' });

export const DataPipeline = sequelize.define('data_pipeline', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  pipeline_name: { type: DataTypes.STRING(100), allowNull: false },
  source_type: DataTypes.STRING(20),
  source_config: DataTypes.TEXT,
  transform_rules: DataTypes.TEXT,
  dest_type: DataTypes.STRING(20),
  dest_config: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_data_pipeline', comment: '数据流转管道表' });

/* ── 12. 设备反控 ── */
export const ControlCommand = sequelize.define('control_command', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  cmd_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  device_id: DataTypes.BIGINT.UNSIGNED,
  device_name: DataTypes.STRING(100),
  cmd_type: { type: DataTypes.TINYINT, comment: '1远程启停 2参数配置 3复位' },
  cmd_param: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0待执行 1执行中 2成功 3失败' },
  execute_time: DataTypes.DATE,
  result: DataTypes.TEXT,
  operator_id: DataTypes.BIGINT.UNSIGNED,
  operator_name: DataTypes.STRING(50),
}, { tableName: 'fire_control_command', comment: '设备控制指令表' });

/* ── 13. 安消联动 ── */
export const LinkageRule = sequelize.define('linkage_rule', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  rule_name: { type: DataTypes.STRING(100), allowNull: false },
  trigger_type: { type: DataTypes.TINYINT, comment: '1告警触发 2手动触发 3定时触发' },
  trigger_device_id: DataTypes.BIGINT.UNSIGNED,
  trigger_condition: DataTypes.TEXT,
  action_devices: DataTypes.TEXT,
  action_commands: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_linkage_rule', comment: '联动规则表' });

/* ── 14. AI决策 ── */
export const AIDecision = sequelize.define('ai_decision', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  decision_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  scene: DataTypes.STRING(200),
  input_data: DataTypes.TEXT,
  analysis_result: DataTypes.TEXT,
  suggestion: DataTypes.TEXT,
  confidence: DataTypes.DECIMAL(5, 2),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_ai_decision', comment: 'AI决策记录表' });

/* ── 15. 智能预警 ── */
export const SmartAlert = sequelize.define('smart_alert', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  alert_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  alert_type: { type: DataTypes.TINYINT, comment: '1趋势预警 2寿命预警 3环境预警' },
  device_id: DataTypes.BIGINT.UNSIGNED,
  device_name: DataTypes.STRING(100),
  alert_desc: DataTypes.TEXT,
  predict_time: DataTypes.DATE,
  confidence: DataTypes.DECIMAL(5, 2),
  status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0未处理 1已确认 2已处理' },
}, { tableName: 'fire_smart_alert', comment: '智能预警表' });

/* ── 16. 培训考核 ── */
export const TrainingCourse = sequelize.define('training_course', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  course_name: { type: DataTypes.STRING(200), allowNull: false },
  course_type: { type: DataTypes.TINYINT, comment: '1安全培训 2操作培训 3法规培训' },
  content: DataTypes.TEXT,
  file_url: DataTypes.STRING(500),
  duration: DataTypes.INTEGER,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_training_course', comment: '培训课程表' });

export const TrainingExam = sequelize.define('training_exam', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  exam_name: { type: DataTypes.STRING(200), allowNull: false },
  course_id: DataTypes.BIGINT.UNSIGNED,
  questions: DataTypes.TEXT,
  pass_score: { type: DataTypes.INTEGER, defaultValue: 60 },
  duration: DataTypes.INTEGER,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_training_exam', comment: '考核试卷表' });

/* ── 17. 消防检查 ── */
export const FireInspection = sequelize.define('fire_inspection', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  inspect_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  unit_id: DataTypes.BIGINT.UNSIGNED,
  unit_name: DataTypes.STRING(200),
  inspect_type: { type: DataTypes.TINYINT, comment: '1日常检查 2专项检查 3联合检查' },
  inspector: DataTypes.STRING(50),
  inspect_date: DataTypes.DATE,
  items: DataTypes.TEXT,
  result: { type: DataTypes.TINYINT, comment: '1合格 2不合格 3限期整改' },
  photos: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_inspection', comment: '消防检查表' });

/* ── 18. 系统配置 ── */
export const SystemConfig = sequelize.define('system_config', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  config_key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  config_value: DataTypes.TEXT,
  description: DataTypes.STRING(200),
}, { tableName: 'sys_config', comment: '系统配置表' });

/* ── 19. 通知模板 ── */
export const NotifyTemplate = sequelize.define('notify_template', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  template_name: { type: DataTypes.STRING(100), allowNull: false },
  template_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  channel: { type: DataTypes.STRING(20), comment: 'sms/email/app/wechat' },
  subject: DataTypes.STRING(200),
  content: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'sys_notify_template', comment: '通知模板表' });

/* ── 20. 大屏配置 ── */
export const ScreenConfig = sequelize.define('screen_config', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  screen_name: { type: DataTypes.STRING(100), allowNull: false },
  layout_config: DataTypes.TEXT('long'),
  widget_config: DataTypes.TEXT('long'),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_screen_config', comment: '大屏配置表' });

/* ── 建筑平面图模型见 floorPlan.model.ts（Building / Floor / FloorDevicePosition / FloorCameraBinding） ── */

/* ── 关联关系 ── */
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id' });
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'perm_id' });

initFloorPlanAssociations({ Unit, Device });

console.log('[Model] All 30+ models loaded');