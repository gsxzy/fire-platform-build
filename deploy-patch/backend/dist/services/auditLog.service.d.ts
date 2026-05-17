/**
 * ═══════════════════════════════════════════════════════════════════
 * 操作审计日志服务
 *
 * 符合等保2.0要求：
 * - 所有用户操作必须可追溯
 * - 记录操作人、操作时间、操作内容、IP地址、操作结果
 * - 日志不可删除，只能归档
 * - 保存时间不少于6个月
 *
 * 操作分类：
 * - 登录/登出：01
 * - 告警处理：02（确认、处理、忽略、关闭）
 * - 设备控制：03（消音、复位、手自动切换、屏蔽）
 * - 维保管理：04（工单创建、分配、完成）
 * - 巡检管理：05（巡检计划、隐患处理）
 * - 系统管理：06（用户、角色、权限、配置）
 * - 应急预案：07（预案启动、演练）
 * ═══════════════════════════════════════════════════════════════════
 */
import { Model, Optional, Sequelize } from 'sequelize';
export declare const AuditActionType: {
    readonly LOGIN: "auth.login";
    readonly LOGOUT: "auth.logout";
    readonly LOGIN_FAILED: "auth.login_failed";
    readonly ALARM_CONFIRM: "alarm.confirm";
    readonly ALARM_HANDLE: "alarm.handle";
    readonly ALARM_DISMISS: "alarm.dismiss";
    readonly ALARM_SILENCE: "alarm.silence";
    readonly DEVICE_CONTROL_SILENCE: "device.control.silence";
    readonly DEVICE_CONTROL_RESET: "device.control.reset";
    readonly DEVICE_CONTROL_MODE: "device.control.mode";
    readonly DEVICE_CONTROL_SHIELD: "device.control.shield";
    readonly MAINTENANCE_ORDER_CREATE: "maintenance.order.create";
    readonly MAINTENANCE_ORDER_ASSIGN: "maintenance.order.assign";
    readonly MAINTENANCE_ORDER_COMPLETE: "maintenance.order.complete";
    readonly PATROL_PLAN_CREATE: "patrol.plan.create";
    readonly PATROL_HAZARD_HANDLE: "patrol.hazard.handle";
    readonly SYSTEM_USER_CREATE: "system.user.create";
    readonly SYSTEM_USER_UPDATE: "system.user.update";
    readonly SYSTEM_USER_DELETE: "system.user.delete";
    readonly SYSTEM_ROLE_CREATE: "system.role.create";
    readonly SYSTEM_ROLE_UPDATE: "system.role.update";
    readonly SYSTEM_CONFIG_CHANGE: "system.config.change";
    readonly PLAN_START: "plan.start";
    readonly PLAN_DRILL: "plan.drill";
};
export type AuditActionType = typeof AuditActionType[keyof typeof AuditActionType];
export type AuditResult = 'success' | 'failed' | 'partial';
export interface AuditLogAttributes {
    id: number;
    traceId: string;
    userId?: number;
    username: string;
    displayName?: string;
    action: AuditActionType;
    actionDesc: string;
    ipAddress: string;
    userAgent?: string;
    module: string;
    resourceType?: string;
    resourceId?: string;
    oldValue?: string;
    newValue?: string;
    result: AuditResult;
    errorMsg?: string;
    duration?: number;
    createdAt: Date;
}
export interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'createdAt'> {
}
export declare class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
    id: number;
    traceId: string;
    userId?: number;
    username: string;
    displayName?: string;
    action: AuditActionType;
    actionDesc: string;
    ipAddress: string;
    userAgent?: string;
    module: string;
    resourceType?: string;
    resourceId?: string;
    oldValue?: string;
    newValue?: string;
    result: AuditResult;
    errorMsg?: string;
    duration?: number;
    readonly createdAt: Date;
}
/**
 * 审计日志服务
 */
export declare class AuditLogService {
    private static instance;
    private sequelize;
    private initialized;
    private constructor();
    static getInstance(sequelize: Sequelize): AuditLogService;
    /**
     * 初始化模型（在应用启动时调用）
     */
    initModel(): void;
    /**
     * 生成追踪ID
     */
    private generateTraceId;
    /**
     * 从操作类型提取模块名
     */
    private getModuleFromAction;
    /**
     * 记录操作日志
     */
    log(params: Omit<AuditLogCreationAttributes, 'traceId' | 'module' | 'createdAt'>): Promise<string>;
    /**
     * 简化版：记录成功的操作
     */
    logSuccess(params: Pick<AuditLogCreationAttributes, 'userId' | 'username' | 'displayName' | 'action' | 'actionDesc' | 'ipAddress' | 'userAgent' | 'resourceType' | 'resourceId'>): Promise<string>;
    /**
     * 简化版：记录失败的操作
     */
    logFailure(params: Pick<AuditLogCreationAttributes, 'userId' | 'username' | 'displayName' | 'action' | 'actionDesc' | 'ipAddress' | 'userAgent' | 'errorMsg' | 'resourceType' | 'resourceId'>): Promise<string>;
    /**
     * 记录设备控制操作（专用方法）
     */
    logDeviceControl(userId: number, username: string, displayName: string | undefined, ipAddress: string, controlType: 'silence' | 'reset' | 'mode' | 'shield', deviceId: number, deviceName: string, result: AuditResult, errorMsg?: string): Promise<string>;
    /**
     * 记录告警处理操作（专用方法）
     */
    logAlarmHandle(userId: number, username: string, displayName: string | undefined, ipAddress: string, handleType: 'confirm' | 'handle' | 'dismiss' | 'silence', alarmId: number, alarmNo: string, result: AuditResult, errorMsg?: string): Promise<string>;
    /**
     * 查询日志（分页）
     */
    query(params: {
        userId?: number;
        username?: string;
        action?: string;
        module?: string;
        result?: AuditResult;
        startTime?: Date;
        endTime?: Date;
        page?: number;
        pageSize?: number;
    }): Promise<{
        list: AuditLog[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    /**
     * 获取操作统计
     */
    getStats(startTime: Date, endTime: Date): Promise<{
        total: number;
        byUser: Record<string, number>;
        byModule: Record<string, number>;
        byResult: Record<AuditResult, number>;
    }>;
}
export default AuditLogService;
//# sourceMappingURL=auditLog.service.d.ts.map