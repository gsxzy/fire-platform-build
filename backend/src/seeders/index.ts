/**
 * ═══════════════════════════════════════════════════════════════════
 * 数据库种子数据
 * 初始化超级管理员、角色权限、系统配置、演示数据
 * ═══════════════════════════════════════════════════════════════════
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import sequelize from '@/config/database';
import {
  User, Role, Permission,
  Department, Unit, Device, Alarm, ControlRoom,
  MaintenanceCompany, KnowledgeDoc, SystemConfig,
  ScreenConfig,
} from '@/models';
import { PERMISSION_CODES, PERMISSION_NAMES, PERMISSION_TYPES, type PermissionCode } from '@/constants/permissions';

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('[Seed] DB connected');

    /* ── 1. 组织架构 ── */
    await Department.bulkCreate([
      { dept_name: '新致远消防科技', parent_id: 0, sort: 1, status: 1 },
      { dept_name: '技术研发部', parent_id: 1, sort: 1, status: 1 },
      { dept_name: '运维监控中心', parent_id: 1, sort: 2, status: 1 },
      { dept_name: '维保服务部', parent_id: 1, sort: 3, status: 1 },
      { dept_name: '安全管理部', parent_id: 1, sort: 4, status: 1 },
    ] as any, { ignoreDuplicates: true });
    console.log('[Seed] Departments created');

    /* ── 2. 权限 ──
       统一来源：backend/src/constants/permissions.ts
       此处从常量文件自动生成，确保前后端权限定义一致 */
    const perms = PERMISSION_CODES.map((code: PermissionCode) => ({
      perm_name: PERMISSION_NAMES[code],
      perm_code: code,
      type: PERMISSION_TYPES[code],
    }));
    await Permission.bulkCreate(perms as any, { ignoreDuplicates: true });
    console.log('[Seed] Permissions created');

    /* ── 3. 角色 ── */
    const adminRole = await Role.findOrCreate({
      where: { role_code: 'admin' },
      defaults: { role_name: '超级管理员', role_code: 'admin', description: '系统超级管理员', status: 1, sort: 0 }
    });
    const opsRole = await Role.findOrCreate({
      where: { role_code: 'operator' },
      defaults: { role_name: '运维人员', role_code: 'operator', description: '日常运维操作', status: 1, sort: 1 }
    });
    await Role.findOrCreate({
      where: { role_code: 'viewer' },
      defaults: { role_name: '监控查看员', role_code: 'viewer', description: '只读查看权限', status: 1, sort: 2 }
    });

    // 分配所有权限给admin
    const allPerms = await Permission.findAll();
    await (adminRole[0] as any).setPermissions(allPerms.map((p: any) => p.id));
    // 运维人员角色：保留基础操作权限
    const opsPermCodes: PermissionCode[] = [
      'workbench:view', 'monitor:view', 'alarm:view', 'alarm:handle', 'device:view',
      'unit:view', 'maintenance:view', 'patrol:view', 'bigscreen:view', 'knowledge:view',
    ];
    await (opsRole[0] as any).setPermissions(allPerms.filter((p: any) =>
      opsPermCodes.includes(p.perm_code)
    ).map((p: any) => p.id));
    console.log('[Seed] Roles created');

    /* ── 4. 超级管理员 ── */
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.warn('[Seed] 警告：未设置 ADMIN_PASSWORD，跳过管理员创建');
    } else {
    const hashed = await bcrypt.hash(adminPassword, 10);
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const [adminUser] = await User.findOrCreate({
      where: { username: adminUsername },
      defaults: {
        username: adminUsername,
        password: hashed,
        real_name: '系统管理员',
        phone: process.env.ADMIN_PHONE || null,
        email: 'admin@xzy.cn',
        status: 1,
        dept_id: 1,
      } as any,
    });
    await (adminUser as any).setRoles([(adminRole[0] as any).id]);
    console.log('[Seed] Admin user created');
    }

    /* ── 5. 演示单位 ── */
    await Unit.bulkCreate([
      { unit_name: '万达广场', unit_code: 'WD001', unit_type: 2, address: '兰州市城关区天水路100号', lng: 103.8268, lat: 36.0570, contact_name: '张经理', contact_phone: '13912345678', building_area: 150000, floor_count: 28, fire_level: 1, status: 1 },
      { unit_name: '兰州中心', unit_code: 'LZ002', unit_type: 2, address: '兰州市七里河区西津西路16号', lng: 103.7752, lat: 36.0640, contact_name: '李主任', contact_phone: '13887654321', building_area: 80000, floor_count: 18, fire_level: 1, status: 1 },
      { unit_name: '兰大二院', unit_code: 'LE003', unit_type: 2, address: '兰州市城关区萃英门82号', lng: 103.8205, lat: 36.0520, contact_name: '王院长', contact_phone: '13698765432', building_area: 120000, floor_count: 22, fire_level: 1, status: 1 },
      { unit_name: '西北师范大学', unit_code: 'NX004', unit_type: 2, address: '兰州市安宁区安宁东路967号', lng: 103.7350, lat: 36.1045, contact_name: '赵处长', contact_phone: '13511112222', building_area: 200000, floor_count: 35, fire_level: 2, status: 1 },
      { unit_name: '兰州石化', unit_code: 'LS005', unit_type: 2, address: '兰州市西固区玉门街10号', lng: 103.6280, lat: 36.0950, contact_name: '刘总工', contact_phone: '13333334444', building_area: 500000, floor_count: 10, fire_level: 1, status: 1 },
    ] as any, { ignoreDuplicates: true });
    console.log('[Seed] Units created');

    /* ── 6. 演示设备 ── */
    const devices = [];
    const deviceTypes = ['烟感探测器', '温感探测器', '手动报警按钮', '消火栓', '喷淋泵', '排烟风机', '应急照明', '消防门', '水位传感器', '电气火灾探测器'];
    const locations = ['1F大厅', '2F走廊', 'B1停车场', '天台', '配电室', '消防泵房', '楼梯间', '疏散通道', '消防水池', '变配电室'];
    for (let u = 1; u <= 5; u++) {
      for (let d = 0; d < 20; d++) {
        devices.push({
          device_no: `DEV${String(u).padStart(2, '0')}${String(d + 1).padStart(4, '0')}`,
          device_name: `${['万达广场', '兰州中心', '兰大二院', '西北师范大学', '兰州石化'][u - 1]}_${locations[d % 10]}_${deviceTypes[d % 10]}`,
          device_type: deviceTypes[d % 10],
          device_model: `XZY-${deviceTypes[d % 10].substring(0, 2).toUpperCase()}-${2024}`,
          manufacturer: '新致远消防科技',
          unit_id: u,
          install_location: locations[d % 10],
          floor: `${Math.floor(d / 4) + 1}F`,
          install_date: '2024-01-15',
          warranty_expire: '2027-01-14',
          status: Math.random() > 0.9 ? 2 : Math.random() > 0.8 ? 3 : 1,
          last_online: new Date(Date.now() - Math.random() * 86400000),
          iot_id: `IOT_${u}_${d + 1}`,
          protocol_type: d % 3 === 0 ? 'MQTT' : d % 3 === 1 ? 'Modbus' : 'HTTP',
        });
      }
    }
    await Device.bulkCreate(devices as any, { ignoreDuplicates: true });
    console.log('[Seed] Devices created');

    /* ── 7. 演示告警 ── */
    const alarmDescs = [
      { type: 1, level: 3, desc: '烟感探测器触发火警信号' },
      { type: 1, level: 3, desc: '温感探测器温度异常升高' },
      { type: 2, level: 2, desc: '排烟风机通讯中断' },
      { type: 2, level: 1, desc: '应急照明控制器故障' },
      { type: 3, level: 1, desc: '消防水池液位偏低' },
      { type: 1, level: 3, desc: '手动报警按钮触发' },
      { type: 2, level: 2, desc: '消火栓压力不足' },
      { type: 3, level: 1, desc: '电气线路温度异常' },
    ];
    const alarms = [];
    for (let i = 0; i < 50; i++) {
      const a = alarmDescs[i % alarmDescs.length];
      alarms.push({
        alarm_no: `ALM${Date.now() - i * 3600000}${i}`,
        alarm_type: a.type,
        alarm_level: a.level,
        device_id: (i % 100) + 1,
        device_name: `设备${i + 1}`,
        unit_id: (i % 5) + 1,
        unit_name: ['万达广场', '兰州中心', '兰大二院', '西北师范大学', '兰州石化'][i % 5],
        location: locations[i % 10],
        alarm_desc: a.desc,
        status: i < 5 ? 0 : i < 15 ? 1 : i < 40 ? 2 : 3,
        handler_name: i >= 5 ? '运维人员' : null,
        handle_time: i >= 5 ? new Date(Date.now() - (i - 5) * 1800000) : null,
        handle_result: i >= 5 ? '已现场确认并处理' : null,
      });
    }
    await Alarm.bulkCreate(alarms as any, { ignoreDuplicates: true });
    console.log('[Seed] Alarms created');

    /* ── 8. 消控室 ── */
    await ControlRoom.bulkCreate([
      { room_name: '万达广场消防控制中心', unit_id: 1, unit_name: '万达广场', host_model: 'XZY-FAS-5000', host_no: 'FAS20240001', loop_count: 12, device_count: 328, duty_person: '王值班', duty_phone: '13911110001' },
      { room_name: '兰州中心消防监控室', unit_id: 2, unit_name: '兰州中心', host_model: 'XZY-FAS-3000', host_no: 'FAS20240002', loop_count: 8, device_count: 186, duty_person: '李值班', duty_phone: '13911110002' },
      { room_name: '兰大二院消防中控室', unit_id: 3, unit_name: '兰大二院', host_model: 'XZY-FAS-5000', host_no: 'FAS20240003', loop_count: 15, device_count: 412, duty_person: '张值班', duty_phone: '13911110003' },
      { room_name: '西北师大消控中心', unit_id: 4, unit_name: '西北师范大学', host_model: 'XZY-FAS-3000', host_no: 'FAS20240004', loop_count: 10, device_count: 256, duty_person: '赵值班', duty_phone: '13911110004' },
      { room_name: '兰州石化消防控制中心', unit_id: 5, unit_name: '兰州石化', host_model: 'XZY-FAS-8000', host_no: 'FAS20240005', loop_count: 20, device_count: 689, duty_person: '刘值班', duty_phone: '13911110005' },
    ] as any, { ignoreDuplicates: true });
    console.log('[Seed] Control rooms created');

    /* ── 9. 维保单位 ── */
    await MaintenanceCompany.bulkCreate([
      { company_name: '新致远消防维保有限公司', credit_code: '91620100MA72LJXXXX', legal_person: '陈总', contact_phone: '0931-8888888', address: '兰州市城关区高新路1号', qualification_level: '一级', status: 1 },
    ] as any, { ignoreDuplicates: true });
    console.log('[Seed] Maintenance companies created');

    /* ── 10. 知识库 ── */
    await KnowledgeDoc.bulkCreate([
      { title: '消防给水系统操作规程', category: '操作规程', content: '一、日常检查要求...\n二、水泵启停操作...\n三、常见故障处理...', tags: '消防给水,水泵,操作' },
      { title: '火灾自动报警系统维护手册', category: '维护手册', content: '一、系统概述...\n二、设备巡检要点...\n三、故障排查流程...', tags: '报警系统,维护,故障排查' },
      { title: '消防法相关条文解读', category: '法规标准', content: '一、消防法总则...\n二、消防安全职责...\n三、法律责任...', tags: '消防法,法规,法律' },
      { title: '灭火器使用培训教程', category: '培训资料', content: '一、灭火器种类...\n二、使用方法...\n三、注意事项...', tags: '灭火器,培训,使用教程' },
      { title: '应急疏散预案编制指南', category: '应急预案', content: '一、编制原则...\n二、组织体系...\n三、疏散路线设计...', tags: '疏散预案,编制,指南' },
    ] as any, { ignoreDuplicates: true });
    console.log('[Seed] Knowledge docs created');

    /* ── 11. 系统配置 ── */
    await SystemConfig.bulkCreate([
      { config_key: 'platform_name', config_value: '新致远智慧消防云平台', description: '平台名称' },
      { config_key: 'alarm_auto_dispatch', config_value: 'true', description: '告警自动派单' },
      { config_key: 'alarm_sms_notify', config_value: 'true', description: '告警短信通知' },
      { config_key: 'patrol_reminder_hours', config_value: '2', description: '巡检提前提醒小时数' },
      { config_key: 'data_retention_days', config_value: '365', description: '数据保留天数' },
    ] as any, { ignoreDuplicates: true });
    console.log('[Seed] System config created');

    /* ── 12. 大屏配置 ── */
    await ScreenConfig.bulkCreate([
      { screen_name: '默认大屏', layout_config: JSON.stringify({ layout: 'grid', cols: 3, rows: 2 }), widget_config: JSON.stringify([{ type: 'alarm_stat', position: [0, 0] }, { type: 'device_map', position: [1, 0] }, { type: 'trend_chart', position: [2, 0] }, { type: 'work_order', position: [0, 1] }, { type: 'patrol_status', position: [1, 1] }, { type: 'unit_list', position: [2, 1] }]) },
    ] as any, { ignoreDuplicates: true });
    console.log('[Seed] Screen config created');

    console.log('[Seed] All seed data initialized successfully!');
    process.exit(0);
  } catch (err: any) {
    console.error('[Seed] Error:', err.message);
    process.exit(1);
  }
}

seed();
