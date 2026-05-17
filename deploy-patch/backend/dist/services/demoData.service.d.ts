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
/**
 * 演示数据生成服务
 */
export declare class DemoDataService {
    private static instance;
    private sequelize;
    private constructor();
    static getInstance(sequelize: Sequelize): DemoDataService;
    /**
     * 生成随机日期（最近30天内）
     */
    private randomDate;
    /**
     * 随机选择数组元素
     */
    private randomPick;
    /**
     * 生成随机数
     */
    private randomInt;
    /**
     * 清空所有演示数据
     */
    clearAllDemoData(): Promise<void>;
    /**
     * 生成演示单位数据
     */
    generateUnits(count?: number): Promise<void>;
    /**
     * 生成演示设备数据
     */
    generateDevicesPerUnit(unitId: number, baseNo: number): Promise<void>;
    /**
     * 生成演示告警数据
     */
    generateAlarms(count?: number): Promise<void>;
    /**
     * 生成演示维保工单
     */
    generateMaintenanceOrders(count?: number): Promise<void>;
    /**
     * 一键生成完整演示数据
     */
    generateAllDemoData(options?: {
        unitCount?: number;
        alarmCount?: number;
        maintenanceCount?: number;
        clearFirst?: boolean;
    }): Promise<void>;
    /**
     * 获取演示数据统计
     */
    getDemoStats(): Promise<{
        units: number;
        devices: number;
        alarms: number;
        maintenanceOrders: number;
    }>;
}
export default DemoDataService;
//# sourceMappingURL=demoData.service.d.ts.map