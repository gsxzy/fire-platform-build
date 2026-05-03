/**
 * ═══════════════════════════════════════════════════════════════════
 * 演示模拟数据生成器
 * 
 * 功能：
 * - 一键生成完整的演示数据
 * - 包含单位、设备、告警、维保、巡检等完整业务数据
 * - 数据符合甘肃本地特点（本地地名、常见设备类型）
 * - 可以随时重置，方便多次演示
 * 
 * 使用场景：
 * - 投标演示
 * - 产品演示
 * - 功能测试
 * - 前端开发联调
 * ═══════════════════════════════════════════════════════════════════
 */
import { Sequelize } from 'sequelize';
import logger from '@/config/logger';

// 甘肃本地常见单位名称（用于演示）
const GANSU_UNIT_NAMES = [
  '兰州中心大厦',
  '东方红广场商业综合体',
  '甘肃省博物馆',
  '兰州大学医学校区',
  '兰州西站',
  '中川国际机场T2航站楼',
  '万达广场（城关店）',
  '兰州皇冠假日酒店',
  '甘肃省人民医院',
  '兰州市第一中学',
  '亚欧国际商厦',
  '鸿运·金茂广场',
  '兰州老街',
  '黄河楼景区',
  '甘肃国际会展中心',
];

// 常见设备名称
const DEVICE_TYPES = [
  { type: '烟感探测器', model: '赋安FS1015', count: 50 },
  { type: '温感探测器', model: '赋安FS1016', count: 30 },
  { type: '手动报警按钮', model: '赋安FS2011', count: 20 },
  { type: '消火栓按钮', model: '赋安FS2012', count: 15 },
  { type: '输入模块', model: '赋安FS1211', count: 10 },
  { type: '控制模块', model: '赋安FS1221', count: 10 },
  { type: '火灾报警控制器', model: '赋安FS5050', count: 1 },
];

/** 演示 SQL 查询返回的设备行 */
interface DemoDeviceRow {
  id: number;
  device_name: string;
  unit_id: number;
  install_location?: string | null;
}

// 维保公司名称
const MAINTENANCE_COMPANIES = [
  '甘肃安消消防工程有限公司',
  '兰州金盾消防技术有限公司',
  '甘肃永安消防设备有限公司',
  '兰州恒安消防工程有限公司',
];

// 维保人员姓名
const MAINTENANCE_WORKERS = [
  '张师傅',
  '王师傅',
  '李师傅',
  '赵师傅',
  '刘师傅',
];

// 隐患描述
const HAZARD_DESCRIPTIONS = [
  '烟感探测器误报频繁，需清洁或更换',
  '消防主机通讯故障，数据上传中断',
  '消火栓压力不足，需检查管网',
  '应急照明灯具故障，需更换',
  '防火门闭门器损坏，需维修',
  '疏散指示标志不亮，需检查电路',
  '消防水泵启动异常，需检修',
  '喷淋管网漏水，需堵漏',
  '气体灭火系统瓶组压力不足',
  '消防电话系统故障，需调试',
];

/**
 * 演示数据生成服务
 */
export class DemoDataService {
  private static instance: DemoDataService;
  private sequelize: Sequelize;

  private constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  public static getInstance(sequelize: Sequelize): DemoDataService {
    if (!DemoDataService.instance) {
      DemoDataService.instance = new DemoDataService(sequelize);
    }
    return DemoDataService.instance;
  }

  /**
   * 生成随机日期（最近30天内）
   */
  private randomDate(daysAgo: number = 30): Date {
    const now = Date.now();
    const randomMs = Math.random() * daysAgo * 24 * 60 * 60 * 1000;
    return new Date(now - randomMs);
  }

  /**
   * 随机选择数组元素
   */
  private randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * 生成随机数
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 清空所有演示数据
   */
  async clearAllDemoData(): Promise<void> {
    const t = await this.sequelize.transaction();
    try {
      // 按依赖关系反向删除
      await this.sequelize.query('DELETE FROM patrol_hazard WHERE hazard_desc LIKE "%演示%"', { transaction: t });
      await this.sequelize.query('DELETE FROM fire_maint_work_order WHERE order_no LIKE "DEMO%"', { transaction: t });
      await this.sequelize.query('DELETE FROM fire_alarm WHERE alarm_no LIKE "DEMO%"', { transaction: t });
      await this.sequelize.query('DELETE FROM fire_device WHERE device_no LIKE "DEMO%"', { transaction: t });
      await this.sequelize.query('DELETE FROM fire_unit WHERE unit_name LIKE "%演示%"', { transaction: t });
      await t.commit();
      logger.info('[演示数据] 已清空所有演示数据');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * 生成演示单位数据
   */
  async generateUnits(count: number = 10): Promise<void> {
    const values: string[] = [];
    for (let i = 0; i < Math.min(count, GANSU_UNIT_NAMES.length); i++) {
      const unitName = GANSU_UNIT_NAMES[i] + '（演示）';
      const unitCode = `DEMO-UNIT-${String(i + 1).padStart(3, '0')}`;
      const unitType = this.randomPick([1, 2, 3]); // 1一般，2重点，3九小场所
      const area = this.randomInt(1000, 50000);
      const floorCount = this.randomInt(3, 45);
      const fireLevel = this.randomPick([1, 2, 3]);

      values.push(`('${unitName}', '${unitCode}', ${unitType}, ${area}, ${floorCount}, ${fireLevel}, 1)`);
    }

    if (values.length > 0) {
      await this.sequelize.query(`
        INSERT INTO fire_unit (unit_name, unit_code, unit_type, building_area, floor_count, fire_level, status)
        VALUES ${values.join(',')}
      `);
      logger.info(`[演示数据] 已生成 ${values.length} 个单位数据`);
    }
  }

  /**
   * 生成演示设备数据
   */
  async generateDevicesPerUnit(unitId: number, baseNo: number): Promise<void> {
    const values: string[] = [];
    let deviceIndex = 0;

    for (const deviceType of DEVICE_TYPES) {
      for (let i = 0; i < deviceType.count; i++) {
        const deviceNo = `DEMO-${String(baseNo).padStart(3, '0')}-${String(deviceIndex + 1).padStart(4, '0')}`;
        const deviceName = `${deviceType.type} - ${deviceNo}`;
        const floor = this.randomInt(1, 20);
        const room = `${floor}层${String(this.randomInt(1, 50)).padStart(2, '0')}号点位`;
        const installDate = this.randomDate(365); // 最近一年内安装

        values.push(`(
          '${deviceNo}',
          '${deviceName}',
          '${deviceType.type}',
          '${deviceType.model}',
          ${unitId},
          ${floor},
          '${room}',
          '${installDate.toISOString().split('T')[0]}',
          1
        )`);
        deviceIndex++;
      }
    }

    if (values.length > 0) {
      await this.sequelize.query(`
        INSERT INTO fire_device (device_no, device_name, device_type, manufacturer, unit_id, floor, install_location, install_date, status)
        VALUES ${values.join(',')}
      `);
      logger.info(`[演示数据] 单位 ${unitId} 已生成 ${values.length} 个设备数据`);
    }
  }

  /**
   * 生成演示告警数据
   */
  async generateAlarms(count: number = 50): Promise<void> {
    // 获取所有演示设备
    const [devices]: any = await this.sequelize.query(`
      SELECT id, device_no, device_name, unit_id, install_location FROM fire_device WHERE device_no LIKE 'DEMO-%'
    `);

    if (devices.length === 0) {
      logger.warn('[演示数据] 没有演示设备，无法生成告警');
      return;
    }

    const devList = devices as DemoDeviceRow[];
    const values: string[] = [];
    for (let i = 0; i < count; i++) {
      const device = this.randomPick(devList);
      const alarmType = this.randomPick([1, 2, 3, 4]); // 1火警，2故障，3监管，4屏蔽
      const alarmLevel = alarmType === 1 ? this.randomPick([2, 3]) : this.randomPick([1, 2]); // 火警级别高
      const alarmNo = `DEMO-ALM-${String(i + 1).padStart(5, '0')}`;
      const createdAt = this.randomDate(7); // 最近7天的告警
      const status = this.randomPick([0, 1, 2]); // 0未处理，1确认中，2已处理

      const alarmDescs = [
        `探测器异常报警`,
        `设备通讯故障`,
        `设备离线告警`,
        `手动报警按钮触发`,
        `模块故障告警`,
      ];
      const alarmDesc = this.randomPick(alarmDescs);

      values.push(`(
        '${alarmNo}',
        ${alarmType},
        ${alarmLevel},
        ${device.id},
        '${device.device_name}',
        ${device.unit_id},
        '${alarmDesc}',
        '${device.install_location || '未知位置'}',
        ${status},
        '${createdAt.toISOString()}'
      )`);
    }

    if (values.length > 0) {
      await this.sequelize.query(`
        INSERT INTO fire_alarm (alarm_no, alarm_type, alarm_level, device_id, device_name, unit_id, alarm_desc, location, status, created_at)
        VALUES ${values.join(',')}
      `);
      logger.info(`[演示数据] 已生成 ${values.length} 条告警记录`);
    }
  }

  /**
   * 生成演示维保工单
   */
  async generateMaintenanceOrders(count: number = 20): Promise<void> {
    const [devices]: any = await this.sequelize.query(`
      SELECT id, device_no, device_name, unit_id FROM fire_device WHERE device_no LIKE 'DEMO-%'
    `);

    if (devices.length === 0) return;

    const devList = devices as DemoDeviceRow[];
    const values: string[] = [];
    for (let i = 0; i < count; i++) {
      const device = this.randomPick(devList);
      const orderNo = `DEMO-MO-${String(i + 1).padStart(5, '0')}`;
      const orderType = this.randomPick([1, 2, 3, 4]); // 1巡检，2维修，3保养，4检测
      const status = this.randomPick([0, 1, 2, 3]); // 0待派单，1处理中，2已完成，3已关闭
      const createdAt = this.randomDate(30);
      const assignee = this.randomPick(MAINTENANCE_WORKERS);
      const faultDesc = this.randomPick(HAZARD_DESCRIPTIONS);

      values.push(`(
        '${orderNo}',
        ${orderType},
        ${device.id},
        '${device.device_name}',
        ${device.unit_id},
        '${faultDesc}',
        ${status},
        '${assignee}',
        '${createdAt.toISOString()}'
      )`);
    }

    if (values.length > 0) {
      await this.sequelize.query(`
        INSERT INTO fire_maint_work_order (order_no, order_type, device_id, device_name, unit_id, fault_desc, status, assignee_name, created_at)
        VALUES ${values.join(',')}
      `);
      logger.info(`[演示数据] 已生成 ${values.length} 条维保工单`);
    }
  }

  /**
   * 一键生成完整演示数据
   */
  async generateAllDemoData(options: {
    unitCount?: number;
    alarmCount?: number;
    maintenanceCount?: number;
    clearFirst?: boolean;
  } = {}): Promise<void> {
    const {
      unitCount = 10,
      alarmCount = 50,
      maintenanceCount = 20,
      clearFirst = true,
    } = options;

    logger.info('[演示数据] ========================================');
    logger.info('[演示数据] 开始生成完整演示数据');
    logger.info('[演示数据] ========================================');

    if (clearFirst) {
      await this.clearAllDemoData();
    }

    // 1. 生成单位
    await this.generateUnits(unitCount);

    // 2. 获取单位ID，为每个单位生成设备
    const [units]: any = await this.sequelize.query(`
      SELECT id FROM fire_unit WHERE unit_name LIKE '%演示%'
    `);

    for (let i = 0; i < units.length; i++) {
      await this.generateDevicesPerUnit(units[i].id, i + 1);
    }

    // 3. 生成告警
    await this.generateAlarms(alarmCount);

    // 4. 生成维保工单
    await this.generateMaintenanceOrders(maintenanceCount);

    logger.info('[演示数据] ========================================');
    logger.info('[演示数据] ✅ 演示数据生成完成！');
    logger.info(`[演示数据]    - 单位数量: ${units.length}个`);
    logger.info(`[演示数据]    - 设备数量: 每单位约136个，总计约${units.length * 136}个`);
    logger.info(`[演示数据]    - 告警数量: ${alarmCount}条`);
    logger.info(`[演示数据]    - 维保工单: ${maintenanceCount}条`);
    logger.info('[演示数据] ========================================');
  }

  /**
   * 获取演示数据统计
   */
  async getDemoStats(): Promise<{
    units: number;
    devices: number;
    alarms: number;
    maintenanceOrders: number;
  }> {
    const [[units]]: any = await this.sequelize.query(`SELECT COUNT(*) as count FROM fire_unit WHERE unit_name LIKE '%演示%'`);
    const [[devices]]: any = await this.sequelize.query(`SELECT COUNT(*) as count FROM fire_device WHERE device_no LIKE 'DEMO-%'`);
    const [[alarms]]: any = await this.sequelize.query(`SELECT COUNT(*) as count FROM fire_alarm WHERE alarm_no LIKE 'DEMO%'`);
    const [[maintenanceOrders]]: any = await this.sequelize.query(`SELECT COUNT(*) as count FROM fire_maint_work_order WHERE order_no LIKE 'DEMO%'`);

    return {
      units: parseInt(units.count, 10),
      devices: parseInt(devices.count, 10),
      alarms: parseInt(alarms.count, 10),
      maintenanceOrders: parseInt(maintenanceOrders.count, 10),
    };
  }
}

export default DemoDataService;
