/**
 * ═══════════════════════════════════════════════════════════════════
 * 模块注册表 - 23个独立可插拔业务模块定义
 * 每个模块：独立路由/独立页面/独立数据库表/独立权限
 * ═══════════════════════════════════════════════════════════════════
 */
import {
  LayoutDashboard, Monitor, Bell, Shield, Video, Sliders, Link2,
  Building2, Cpu, Wrench, FileText, ClipboardList, Calendar, AlertCircle,
  BookOpen, MapPin, BarChart3, FileBarChart, GraduationCap, PhoneCall,
  Power, BrainCircuit, Server, AlertTriangle, Users, Settings, Activity,
  CheckSquare, Megaphone, Droplets, Zap, Wind, Maximize2, Upload, Mail,
  Clock, Store, Factory, FileCheck, Cable, Radio,
} from 'lucide-react';
import type { PlatformModule } from './types';

export const MODULES: PlatformModule[] = [
  /* ═══════ 1. 工作台 (base) ═══════ */
  {
    id: 'workbench', name: '工作台', version: '1.0.0',
    description: '工作台首页、我的待办、系统公告',
    icon: LayoutDashboard, category: 'base', status: 'enabled',
    path: '/workbench', priority: 1,
    menu: {
      label: '工作台', icon: LayoutDashboard, path: '/workbench',
      children: [
        { id: 'wb-home', label: '工作台首页', path: '/workbench', icon: LayoutDashboard },
        { id: 'wb-todo', label: '我的待办', path: '/workbench/todo', icon: CheckSquare },
        { id: 'wb-notice', label: '系统公告', path: '/workbench/notice', icon: Megaphone },
      ],
    },
    dbTables: ['todos', 'notices'],
    permissions: [
      { code: 'workbench:view', name: '工作台查看', actions: ['view'] },
      { code: 'workbench:manage', name: '工作台管理', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },

  /* ═══════ 2. 监控中心 (monitor) ═══════ */
  {
    id: 'monitor', name: '监控中心', version: '1.0.0',
    description: '实时监控、视频监控、数智消控室、安消联动',
    icon: Monitor, category: 'monitor', status: 'enabled',
    path: '/monitor', priority: 10,
    menu: {
      label: '监控中心', icon: Monitor, path: '/monitor',
      children: [
        { id: 'mon-realtime', label: '实时监控', path: '/monitor/realtime', icon: LayoutDashboard },
        { id: 'mon-video', label: '视频监控', path: '/monitor/video', icon: Video },
        { id: 'mon-control', label: '数智消控室', path: '/monitor/control', icon: Sliders },
        { id: 'mon-linkage', label: '安消联动', path: '/monitor/linkage', icon: Link2 },
      ],
    },
    dbTables: ['monitor_logs', 'video_channels', 'control_rooms', 'control_room_hosts', 'host_device_codes', 'linkage_rules'],
    permissions: [
      { code: 'monitor:view', name: '监控查看', actions: ['view'] },
      { code: 'monitor:control', name: '远程控制', actions: ['view', 'edit'] },
    ],
  },

  /* ═══════ 3. 告警中心 (monitor) ═══════ */
  {
    id: 'alarm', name: '告警中心', version: '1.0.0',
    description: '实时告警、告警确认、告警处理、历史告警',
    icon: Bell, category: 'monitor', status: 'enabled',
    path: '/alarm', priority: 20,
    menu: {
      label: '告警中心', icon: Bell, path: '/alarm',
      children: [
        { id: 'alm-center', label: '告警总览', path: '/alarm/center', icon: Bell },
        { id: 'alm-config', label: '告警配置', path: '/alarm/config', icon: Sliders },
      ],
    },
    dbTables: ['alarms', 'alarm_configs', 'alarm_history'],
    permissions: [
      { code: 'alarm:view', name: '告警查看', actions: ['view'] },
      { code: 'alarm:handle', name: '告警处理', actions: ['view', 'edit'] },
      { code: 'alarm:config', name: '告警配置', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },

  /* ═══════ 4. 值守中心 (monitor) ═══════ */
  {
    id: 'duty', name: '值守中心', version: '1.0.0',
    description: '接警处置、值班排班、值班日志',
    icon: Shield, category: 'monitor', status: 'enabled',
    path: '/duty', priority: 30,
    menu: {
      label: '值守中心', icon: Shield, path: '/duty',
      children: [
        { id: 'duty-dispatch', label: '接警处置', path: '/duty/dispatch', icon: PhoneCall },
        { id: 'duty-log', label: '值班日志', path: '/duty/log', icon: BookOpen },
        { id: 'duty-shift', label: '班次管理', path: '/duty/shift', icon: Calendar },
        { id: 'duty-handover', label: '交接班记录', path: '/duty/handover', icon: ClipboardList },
      ],
    },
    dbTables: ['duty_schedules', 'duty_logs', 'dispatch_records'],
    permissions: [
      { code: 'duty:view', name: '值守查看', actions: ['view'] },
      { code: 'duty:manage', name: '值守管理', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },

  /* ═══════ 5. 子系统监控 (monitor) ═══════ */
  {
    id: 'subsystem', name: '子系统监控', version: '1.0.0',
    description: '消防给水、电气火灾、防排烟等子系统监控',
    icon: Cpu, category: 'monitor', status: 'enabled',
    path: '/subsystem', priority: 40,
    menu: {
      label: '子系统监控', icon: Cpu, path: '/subsystem',
      children: [
        { id: 'sub-water', label: '消防给水', path: '/subsystem/water', icon: Droplets },
        { id: 'sub-elec', label: '电气火灾', path: '/subsystem/elec', icon: Zap },
        { id: 'sub-vent', label: '防排烟', path: '/subsystem/vent', icon: Wind },
      ],
    },
    dbTables: ['subsystems', 'subsystem_devices', 'subsystem_metrics'],
    permissions: [
      { code: 'subsystem:view', name: '子系统查看', actions: ['view'] },
    ],
  },

  /* ═══════ 6. 单位管理 (manage) ═══════ */
  {
    id: 'unit', name: '单位管理', version: '1.0.0',
    description: '一般单位、重点单位、九小场所管理',
    icon: Building2, category: 'manage', status: 'enabled',
    path: '/unit', priority: 50,
    menu: {
      label: '单位管理', icon: Building2, path: '/unit',
      children: [
        { id: 'unit-general', label: '一般单位', path: '/unit/general', icon: Building2 },
        { id: 'unit-key', label: '重点单位', path: '/unit/key', icon: Factory },
        { id: 'unit-nine', label: '九小场所', path: '/unit/nine-small', icon: Store },
        { id: 'unit-stats', label: '单位统计', path: '/unit/stats', icon: BarChart3 },
        { id: 'unit-floorplan', label: '建筑平面图', path: '/floor-plans', icon: MapPin },
      ],
    },
    dbTables: ['units', 'unit_types', 'unit_contacts'],
    permissions: [
      { code: 'unit:view', name: '单位查看', actions: ['view'] },
      { code: 'unit:create', name: '单位新增', actions: ['create'] },
      { code: 'unit:edit', name: '单位编辑', actions: ['edit'] },
      { code: 'unit:delete', name: '单位删除', actions: ['delete'] },
    ],
  },

  /* ═══════ 7. 设备管理 (manage) ═══════ */
  {
    id: 'device', name: '设备管理', version: '2.0.0',
    description: '档案入库→平台接入→单位分配→业务配置/维护，数据唯一源头在档案',
    icon: Cpu, category: 'manage', status: 'enabled',
    path: '/device', priority: 60,
    menu: {
      label: '设备管理', icon: Cpu, path: '/device',
      children: [
        { id: 'dev-archive', label: '入库管理', path: '/device/archive', icon: Cpu },
        { id: 'dev-access', label: '设备接入', path: '/device/access', icon: Cable },
        { id: 'dev-ctwing', label: 'CTWing 4G', path: '/device/access/ctwing', icon: Radio },
        { id: 'dev-allocate', label: '设备分配', path: '/device/allocate', icon: Server },
        { id: 'dev-config', label: '设备配置', path: '/device/config', icon: Settings },
        { id: 'dev-maintain', label: '设备维护', path: '/device/maintain', icon: Wrench },
      ],
    },
    dbTables: ['devices', 'device_configs', 'device_types', 'device_logs', 'iot_devices', 'device_allocation_logs'],
    permissions: [
      { code: 'device:view', name: '设备查看', actions: ['view'] },
      { code: 'device:create', name: '设备新增', actions: ['create'] },
      { code: 'device:edit', name: '设备编辑', actions: ['edit'] },
      { code: 'device:delete', name: '设备删除', actions: ['delete'] },
    ],
  },

  /* ═══════ 8. 消防维保管理 (manage) ═══════ */
  {
    id: 'maintenance', name: '消防维保管理', version: '1.0.0',
    description: '维保合同、维保单位、维保工单、维保记录、维保统计',
    icon: Wrench, category: 'manage', status: 'enabled',
    path: '/maintenance', priority: 70,
    menu: {
      label: '消防维保管理', icon: Wrench, path: '/maintenance',
      children: [
        { id: 'mt-contract', label: '维保合同', path: '/maintenance/contract', icon: FileText },
        { id: 'mt-company', label: '维保单位', path: '/maintenance/company', icon: Building2 },
        { id: 'mt-workorder', label: '维保工单', path: '/maintenance/workorder', icon: ClipboardList },
        { id: 'mt-record', label: '维保记录', path: '/maintenance/record', icon: Clock },
        { id: 'mt-stats', label: '维保统计', path: '/maintenance/stats', icon: BarChart3 },
      ],
    },
    dbTables: ['maint_contracts', 'maint_companies', 'work_orders', 'maint_records'],
    permissions: [
      { code: 'maintenance:view', name: '维保查看', actions: ['view'] },
      { code: 'maintenance:manage', name: '维保管理', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },

  /* ═══════ 9. 巡检管理 (manage) ═══════ */
  {
    id: 'patrol', name: '巡检管理', version: '1.0.0',
    description: '巡检计划、巡检记录、隐患管理',
    icon: MapPin, category: 'manage', status: 'enabled',
    path: '/patrol', priority: 80,
    menu: {
      label: '巡检管理', icon: MapPin, path: '/patrol',
      children: [
        { id: 'pt-plan', label: '巡检计划', path: '/patrol/plan', icon: Calendar },
        { id: 'pt-record', label: '巡检记录', path: '/patrol/record', icon: ClipboardList },
        { id: 'pt-hazard', label: '隐患管理', path: '/patrol/hazard', icon: AlertCircle },
      ],
    },
    dbTables: ['patrol_plans', 'patrol_records', 'patrol_items', 'hazards'],
    permissions: [
      { code: 'patrol:view', name: '巡检查看', actions: ['view'] },
      { code: 'patrol:manage', name: '巡检管理', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },

  /* ═══════ 10. 应急预案 (manage) ═══════ */
  {
    id: 'plan', name: '应急预案', version: '1.0.0',
    description: '预案库、演练记录',
    icon: BookOpen, category: 'manage', status: 'enabled',
    path: '/plan', priority: 90,
    menu: {
      label: '应急预案', icon: BookOpen, path: '/plan',
      children: [
        { id: 'pl-library', label: '预案库', path: '/plan/library', icon: BookOpen },
        { id: 'pl-drill', label: '演练记录', path: '/plan/drill', icon: Calendar },
      ],
    },
    dbTables: ['plans', 'drills', 'drill_participants'],
    permissions: [
      { code: 'plan:view', name: '预案查看', actions: ['view'] },
      { code: 'plan:manage', name: '预案管理', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },

  /* ═══════ 11. GIS地图 (monitor) ═══════ */
  {
    id: 'map', name: 'GIS地图', version: '1.0.0',
    description: '高德地图集成、设备覆盖、实时告警地图展示',
    icon: MapPin, category: 'monitor', status: 'enabled',
    path: '/map', priority: 100,
    menu: {
      label: 'GIS地图', icon: MapPin, path: '/map',
      children: [
        { id: 'map-gis', label: '地图监控', path: '/map/gis', icon: MapPin },
      ],
    },
    dbTables: ['map_markers', 'map_layers', 'map_configs'],
    permissions: [
      { code: 'map:view', name: '地图查看', actions: ['view'] },
    ],
    dependsOn: ['device', 'alarm'],
  },

  /* ═══════ 12. 数据分析 (analyze) ═══════ */
  {
    id: 'analysis', name: '数据分析', version: '1.0.0',
    description: '报警分析、设备分析、趋势分析、统计报表',
    icon: BarChart3, category: 'analyze', status: 'enabled',
    path: '/analysis', priority: 110,
    menu: {
      label: '数据分析', icon: BarChart3, path: '/analysis',
      children: [
        { id: 'an-alarm', label: '报警分析', path: '/analysis/alarm', icon: BarChart3 },
        { id: 'an-device', label: '设备分析', path: '/analysis/device', icon: Activity },
        { id: 'an-trend', label: '趋势分析', path: '/analysis/trend', icon: BarChart3 },
        { id: 'an-report', label: '统计报表', path: '/analysis/report', icon: FileText },
      ],
    },
    dbTables: ['analysis_reports', 'analysis_charts', 'analysis_datasets'],
    permissions: [
      { code: 'analysis:view', name: '分析查看', actions: ['view'] },
      { code: 'analysis:export', name: '报表导出', actions: ['view', 'export'] },
    ],
    dependsOn: ['alarm', 'device'],
  },

  /* ═══════ 13. 报表管理 (analyze) ═══════ */
  {
    id: 'report', name: '报表管理', version: '1.0.0',
    description: '报表导出、定时报表',
    icon: FileBarChart, category: 'analyze', status: 'enabled',
    path: '/report', priority: 120,
    menu: {
      label: '报表管理', icon: FileBarChart, path: '/report',
      children: [
        { id: 'rp-export', label: '报表导出', path: '/report/export', icon: FileBarChart },
      ],
    },
    dbTables: ['reports', 'report_templates', 'report_schedules'],
    permissions: [
      { code: 'report:view', name: '报表查看', actions: ['view'] },
      { code: 'report:export', name: '报表导出', actions: ['view', 'export'] },
    ],
  },

  /* ═══════ 14. 消防知识库 (manage) ═══════ */
  {
    id: 'knowledge', name: '消防知识库', version: '1.0.0',
    description: '消防文档、法规标准、培训资料',
    icon: GraduationCap, category: 'manage', status: 'enabled',
    path: '/knowledge', priority: 130,
    menu: {
      label: '消防知识库', icon: GraduationCap, path: '/knowledge',
      children: [
        { id: 'kn-base', label: '文档中心', path: '/knowledge/base', icon: BookOpen },
      ],
    },
    dbTables: ['documents', 'doc_categories', 'doc_attachments'],
    permissions: [
      { code: 'knowledge:view', name: '知识库查看', actions: ['view'] },
      { code: 'knowledge:manage', name: '知识库管理', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },

  /* ═══════ 15. 大屏模式 (monitor) ═══════ */
  {
    id: 'bigscreen', name: '大屏模式', version: '1.0.0',
    description: '全屏数据可视化监控大屏',
    icon: Maximize2, category: 'monitor', status: 'enabled',
    path: '/bigscreen', priority: 35,
    menu: {
      label: '大屏模式', icon: Maximize2, path: '/bigscreen',
    },
    dbTables: ['screen_configs', 'screen_widgets'],
    permissions: [
      { code: 'bigscreen:view', name: '大屏查看', actions: ['view'] },
    ],
    dependsOn: ['alarm', 'device'],
  },

  /* ═══════ 16. 设备反控 (iot) ═══════ */
  {
    id: 'device-control', name: '设备反控', version: '1.0.0',
    description: '远程控制消防设备启停、参数配置',
    icon: Power, category: 'iot', status: 'enabled',
    path: '/device/control', priority: 150,
    menu: {
      label: '设备反控', icon: Power, path: '/device/control',
    },
    dbTables: ['control_commands', 'control_logs', 'control_templates'],
    permissions: [
      { code: 'device-control:view', name: '反控查看', actions: ['view'] },
      { code: 'device-control:operate', name: '远程控制', actions: ['view', 'edit'] },
    ],
    dependsOn: ['device'],
  },

  /* ═══════ 17. AI决策中心 (ai) ═══════ */
  {
    id: 'ai', name: 'AI决策中心', version: '1.0.0',
    description: 'AI智能分析、自动决策建议、风险预测',
    icon: BrainCircuit, category: 'ai', status: 'enabled',
    path: '/ai/center', priority: 160,
    menu: {
      label: 'AI决策中心', icon: BrainCircuit, path: '/ai/center',
    },
    dbTables: ['ai_decisions', 'ai_models', 'ai_predictions'],
    permissions: [
      { code: 'ai:view', name: 'AI查看', actions: ['view'] },
    ],
    dependsOn: ['alarm', 'analysis'],
  },

  /* ═══════ 18. IoT设备接入 (iot) ═══════ */
  {
    id: 'iot', name: 'IoT设备接入', version: '1.0.0',
    description: 'GB28181、协议模板与数据管道；现场设备入网请使用「设备管理→设备接入」',
    icon: Server, category: 'iot', status: 'enabled',
    path: '/iot', priority: 170,
    menu: {
      label: 'IoT设备接入', icon: Server, path: '/iot',
      children: [
        { id: 'iot-gb28181', label: 'GB28181接入', path: '/iot/gb28181', icon: Video },
        { id: 'iot-protocol', label: '协议解析配置', path: '/iot/protocol', icon: Cable },
        { id: 'iot-pipeline', label: '数据流转管道', path: '/iot/pipeline', icon: FileText },
      ],
    },
    dbTables: ['iot_devices', 'iot_protocols', 'iot_pipelines', 'iot_data_points'],
    permissions: [
      { code: 'iot:view', name: 'IoT查看', actions: ['view'] },
      { code: 'iot:manage', name: 'IoT管理', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },

  /* ═══════ 19. 智能预警 (ai) ═══════ */
  {
    id: 'smart', name: '智能预警', version: '1.0.0',
    description: 'AI智能预警分析、预测性告警',
    icon: AlertTriangle, category: 'ai', status: 'enabled',
    path: '/smart', priority: 180,
    menu: {
      label: '智能预警', icon: AlertTriangle, path: '/smart',
      children: [
        { id: 'sm-warning', label: '智能预警分析', path: '/smart/warning', icon: AlertTriangle },
      ],
    },
    dbTables: ['smart_alerts', 'smart_models', 'smart_rules'],
    permissions: [
      { code: 'smart:view', name: '预警查看', actions: ['view'] },
    ],
    dependsOn: ['alarm', 'device'],
  },

  /* ═══════ 20. 培训考核 (manage) ═══════ */
  {
    id: 'training', name: '培训考核', version: '1.0.0',
    description: '消防培训、在线考核、成绩管理',
    icon: GraduationCap, category: 'manage', status: 'enabled',
    path: '/training', priority: 190,
    menu: {
      label: '培训考核', icon: GraduationCap, path: '/training',
      children: [
        { id: 'tr-manage', label: '培训管理', path: '/training/manage', icon: GraduationCap },
      ],
    },
    dbTables: ['training_courses', 'training_exams', 'training_scores'],
    permissions: [
      { code: 'training:view', name: '培训查看', actions: ['view'] },
      { code: 'training:manage', name: '培训管理', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },

  /* ═══════ 21. 消防检查 (manage) ═══════ */
  {
    id: 'fire-check', name: '消防检查', version: '1.0.0',
    description: '消防检查项目、检查记录、整改跟踪',
    icon: FileCheck, category: 'manage', status: 'enabled',
    path: '/fire-check', priority: 200,
    menu: {
      label: '消防检查', icon: FileCheck, path: '/fire-check',
      children: [
        { id: 'fc-manage', label: '检查管理', path: '/fire-check/manage', icon: FileCheck },
      ],
    },
    dbTables: ['inspections', 'inspection_items', 'inspection_results'],
    permissions: [
      { code: 'fire-check:view', name: '检查查看', actions: ['view'] },
      { code: 'fire-check:manage', name: '检查管理', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },

  /* ═══════ 22. 系统管理 (system) ═══════ */
  {
    id: 'system', name: '系统管理', version: '1.0.0',
    description: '用户管理、角色权限、组织架构、日志管理、系统配置、模块配置中心',
    icon: Settings, category: 'system', status: 'enabled',
    path: '/system', priority: 1000,
    menu: {
      label: '系统管理', icon: Settings, path: '/system',
      children: [
        { id: 'sys-user', label: '用户管理', path: '/system/user', icon: Users },
        { id: 'sys-personnel', label: '人员管理', path: '/system/personnel', icon: Users },
        { id: 'sys-role', label: '角色权限', path: '/system/role', icon: Shield },
        { id: 'sys-org', label: '组织架构', path: '/system/org', icon: Building2 },
        { id: 'sys-log', label: '日志管理', path: '/system/log', icon: FileText },
        { id: 'sys-config', label: '系统配置', path: '/system/config', icon: Settings },
        { id: 'sys-data', label: '数据导入导出', path: '/system/data', icon: Upload },
        { id: 'sys-notify', label: '通知模板', path: '/system/notify', icon: Mail },
        { id: 'sys-monitor', label: '性能监控', path: '/system/monitor', icon: Activity },
        { id: 'sys-module', label: '模块配置中心', path: '/system/module', icon: Sliders },
      ],
    },
    dbTables: ['users', 'roles', 'permissions', 'orgs', 'system_logs', 'system_configs'],
    permissions: [
      { code: 'system:view', name: '系统查看', actions: ['view'] },
      { code: 'system:admin', name: '系统管理', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },

  /* ═══════ 23. 子系统监控-消防给水 (monitor) - 独立扩展预留 ═══════ */
  /* 预留扩展接口：后续新增模块只需在此注册 */
];

/** 二级菜单商用说明（侧边栏悬停），key 为 ModuleMenuChild.id */
const MENU_CHILD_DESCRIPTIONS: Record<string, string> = {
  'wb-home': '工作台总览、快捷入口与运行摘要',
  'wb-todo': '待办事项创建、流转与关闭',
  'wb-notice': '平台公告与通知发布查看',
  'mon-realtime': '消防设备与告警实时监视',
  'mon-video': '视频预览、云台与录像联动（GB28181 等）',
  'mon-control': '消控室主机列表，进入房间级详情操作',
  'mon-linkage': '安消联动策略与执行记录',
  'alm-center': '告警确认、处理、派发与历史追溯',
  'duty-dispatch': '接警工单与处置闭环',
  'duty-log': '值班记录（与系统审计日志区分，见系统管理）',
  'duty-shift': '排班、班次与人员值守',
  'duty-handover': '交接班登记与责任移交',
  'sub-water': '消防给水系统工况与设备点位',
  'sub-elec': '电气火灾监控与预警',
  'sub-vent': '防排烟风机风阀状态监测',
  'unit-general': '一般社会单位档案与监管信息',
  'unit-key': '消防安全重点单位专项管理',
  'unit-nine': '九小场所台账与检查要点',
  'unit-stats': '单位维度统计与对比',
  'unit-floorplan': '建筑平面图与楼层设备标注',
  'dev-archive': '设备档案台账：新增默认为草稿，提交入库后进入「已入库」方可平台接入。禁止从接入侧凭空创建设备',
  'dev-access': '协议、IP/端口、MQTT/CTWing 等；仅可选「已入库」及以上档案，接入成功后将档案置为「已接入」',
  'dev-ctwing': '海康4G 经天翼 CTWing MQTT 转发：产品ID、设备ID、特征串、Broker、保活与阈值；须先完成入库管理',
  'dev-allocate': '绑定单位/项目/建筑/楼层/点位；仅可选「已接入」设备，分配后状态变为「已分配」',
  'dev-config': '业务参数：采集间隔、阈值、联动规则与远程控制（需已完成接入）',
  'dev-maintain': '维保计划与现场维护记录入口；维护中设备暂停正常使用',
  'mt-contract': '维保合同周期与范围',
  'mt-company': '维保服务企业名录',
  'mt-workorder': '维保工单派发与验收',
  'mt-record': '到场维保作业明细',
  'mt-stats': '维保履约与成本统计',
  'pt-plan': '巡检路线与周期计划',
  'pt-record': '巡检执行与签到记录',
  'pt-hazard': '隐患登记、整改与闭环',
  'pl-library': '应急预案文本与版本',
  'pl-drill': '演练计划与总结归档',
  'map-gis': 'GIS 上图：单位、设备与告警',
  'an-alarm': '告警多维统计与归因',
  'an-device': '设备完好率与类型分布',
  'an-trend': '时间序列与同比环比',
  'an-report': '固定格式统计报表',
  'rp-export': '报表导出与定时任务（如已启用）',
  'kn-base': '法规、制度与培训文档库',
  'iot-gb28181': '国标视频设备目录与信令',
  'iot-protocol': '协议模板与 fire_protocol_config 对齐',
  'iot-pipeline': '采集 → 解析 → 存储流水线配置',
  'sm-warning': '基于规则的智能预警与预测',
  'tr-manage': '在线课程与考核题库',
  'fc-manage': '防火检查项与整改单',
  'sys-user': '登录账号与密码策略',
  'sys-personnel': '消防值班与单位人员档案',
  'sys-role': '角色与功能权限绑定',
  'sys-org': '部门与上下级组织',
  'sys-log': '操作与接口审计日志',
  'sys-config': '平台参数、字典与安全选项',
  'sys-data': '批量导入导出与备份辅助',
  'sys-notify': '短信/邮件/站内信模板',
  'sys-monitor': '服务健康与接口性能',
  'sys-module': '启用或禁用业务模块（影响菜单与路由）',
};

/** 无子菜单的一级入口说明 */
const MODULE_MENU_DESCRIPTIONS: Record<string, string> = {
  bigscreen: '指挥大厅全屏数据墙，建议独立显示设备运行',
  'device-control': '符合权限的远程控制，指令经接入层下发',
  ai: 'AI 研判与推荐，依赖历史告警与知识数据',
};

function applyMenuCommercialCopy(mod: PlatformModule): void {
  const md = MODULE_MENU_DESCRIPTIONS[mod.id];
  if (md && mod.menu) mod.menu.description = md;
  mod.menu?.children?.forEach(child => {
    const d = MENU_CHILD_DESCRIPTIONS[child.id];
    if (d) child.description = d;
  });
}

for (const mod of MODULES) applyMenuCommercialCopy(mod);

/* ── 扩展预留接口 ── */
export function registerExtensionModule(module: PlatformModule): void {
  if (MODULES.find(m => m.id === module.id)) {
    console.warn(`[ModuleRegistry] Module ${module.id} already exists`);
    return;
  }
  applyMenuCommercialCopy(module);
  MODULES.push(module);
  // 按优先级排序
  MODULES.sort((a, b) => a.priority - b.priority);
}
