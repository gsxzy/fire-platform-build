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
import { Model, DataTypes, Optional, Sequelize } from 'sequelize';
import logger from '@/config/logger';

// 操作类型枚举
export const AuditActionType = {
  // 认证相关
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  LOGIN_FAILED: 'auth.login_failed',
  
  // 告警处理
  ALARM_CONFIRM: 'alarm.confirm',
  ALARM_HANDLE: 'alarm.handle',
  ALARM_DISMISS: 'alarm.dismiss',
  ALARM_SILENCE: 'alarm.silence',
  
  // 设备控制
  DEVICE_CONTROL_SILENCE: 'device.control.silence',
  DEVICE_CONTROL_RESET: 'device.control.reset',
  DEVICE_CONTROL_MODE: 'device.control.mode',
  DEVICE_CONTROL_SHIELD: 'device.control.shield',
  
  // 维保管理
  MAINTENANCE_ORDER_CREATE: 'maintenance.order.create',
  MAINTENANCE_ORDER_ASSIGN: 'maintenance.order.assign',
  MAINTENANCE_ORDER_COMPLETE: 'maintenance.order.complete',
  
  // 巡检管理
  PATROL_PLAN_CREATE: 'patrol.plan.create',
  PATROL_HAZARD_HANDLE: 'patrol.hazard.handle',
  
  // 系统管理
  SYSTEM_USER_CREATE: 'system.user.create',
  SYSTEM_USER_UPDATE: 'system.user.update',
  SYSTEM_USER_DELETE: 'system.user.delete',
  SYSTEM_ROLE_CREATE: 'system.role.create',
  SYSTEM_ROLE_UPDATE: 'system.role.update',
  SYSTEM_CONFIG_CHANGE: 'system.config.change',
  
  // 应急预案
  PLAN_START: 'plan.start',
  PLAN_DRILL: 'plan.drill',
} as const;

export type AuditActionType = typeof AuditActionType[keyof typeof AuditActionType];

// 操作结果
export type AuditResult = 'success' | 'failed' | 'partial';

// 审计日志接口
export interface AuditLogAttributes {
  id: number;
  traceId: string;           // 追踪ID（UUID）
  userId?: number;           // 操作人ID
  username: string;          // 操作人用户名
  displayName?: string;      // 操作人姓名
  action: AuditActionType;   // 操作类型
  actionDesc: string;        // 操作描述（人类可读）
  ipAddress: string;         // 操作IP
  userAgent?: string;        // 浏览器/客户端信息
  module: string;            // 所属模块
  resourceType?: string;     // 资源类型
  resourceId?: string;       // 资源ID
  oldValue?: string;         // 变更前的值（JSON）
  newValue?: string;         // 变更后的值（JSON）
  result: AuditResult;       // 操作结果
  errorMsg?: string;         // 错误信息（失败时）
  duration?: number;         // 耗时（毫秒）
  createdAt: Date;
}

export interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'createdAt'> {}

// Sequelize模型
export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public id!: number;
  public traceId!: string;
  public userId?: number;
  public username!: string;
  public displayName?: string;
  public action!: AuditActionType;
  public actionDesc!: string;
  public ipAddress!: string;
  public userAgent?: string;
  public module!: string;
  public resourceType?: string;
  public resourceId?: string;
  public oldValue?: string;
  public newValue?: string;
  public result!: AuditResult;
  public errorMsg?: string;
  public duration?: number;
  public readonly createdAt!: Date;
}

/**
 * 审计日志服务
 */
export class AuditLogService {
  private static instance: AuditLogService;
  private sequelize: Sequelize;
  private initialized: boolean = false;

  private constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  public static getInstance(sequelize: Sequelize): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService(sequelize);
    }
    return AuditLogService.instance;
  }

  /**
   * 初始化模型（在应用启动时调用）
   */
  public initModel(): void {
    if (this.initialized) return;

    AuditLog.init(
      {
        id: {
          type: DataTypes.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
        },
        traceId: {
          type: DataTypes.STRING(36),
          allowNull: false,
          unique: true,
          comment: '追踪ID',
        },
        userId: {
          type: DataTypes.BIGINT.UNSIGNED,
          allowNull: true,
          comment: '操作人ID',
        },
        username: {
          type: DataTypes.STRING(50),
          allowNull: false,
          comment: '操作人用户名',
        },
        displayName: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment: '操作人姓名',
        },
        action: {
          type: DataTypes.STRING(50),
          allowNull: false,
          comment: '操作类型',
        },
        actionDesc: {
          type: DataTypes.STRING(200),
          allowNull: false,
          comment: '操作描述',
        },
        ipAddress: {
          type: DataTypes.STRING(50),
          allowNull: false,
          comment: '操作IP地址',
        },
        userAgent: {
          type: DataTypes.STRING(500),
          allowNull: true,
          comment: '客户端信息',
        },
        module: {
          type: DataTypes.STRING(50),
          allowNull: false,
          comment: '所属模块',
        },
        resourceType: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment: '资源类型',
        },
        resourceId: {
          type: DataTypes.STRING(100),
          allowNull: true,
          comment: '资源ID',
        },
        oldValue: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: '变更前值(JSON)',
        },
        newValue: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: '变更后值(JSON)',
        },
        result: {
          type: DataTypes.ENUM('success', 'failed', 'partial'),
          allowNull: false,
          comment: '操作结果',
        },
        errorMsg: {
          type: DataTypes.STRING(500),
          allowNull: true,
          comment: '错误信息',
        },
        duration: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: '耗时(毫秒)',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: '操作时间',
        },
      },
      {
        sequelize: this.sequelize,
        tableName: 'sys_audit_log',
        comment: '系统审计日志表',
        updatedAt: false, // 审计日志不允许更新，不需要updatedAt
        indexes: [
          { fields: ['traceId'], unique: true },
          { fields: ['userId'] },
          { fields: ['username'] },
          { fields: ['action'] },
          { fields: ['module'] },
          { fields: ['result'] },
          { fields: ['createdAt'] },
          { fields: ['ipAddress'] },
        ],
      }
    );

    this.initialized = true;
    logger.info('[审计日志] 模型初始化完成');
  }

  /**
   * 生成追踪ID
   */
  private generateTraceId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 从操作类型提取模块名
   */
  private getModuleFromAction(action: AuditActionType): string {
    const parts = action.split('.');
    return parts[0] || 'unknown';
  }

  /**
   * 记录操作日志
   */
  async log(
    params: Omit<AuditLogCreationAttributes, 'traceId' | 'module' | 'createdAt'>
  ): Promise<string> {
    const traceId = this.generateTraceId();
    const module = this.getModuleFromAction(params.action);

    const log = await AuditLog.create({
      ...params,
      traceId,
      module,
      createdAt: new Date(),
    });

    logger.debug(`[审计日志] ${params.action} - ${params.username} - ${params.result} - traceId=${traceId}`);
    return traceId;
  }

  /**
   * 简化版：记录成功的操作
   */
  async logSuccess(
    params: Pick<AuditLogCreationAttributes, 'userId' | 'username' | 'displayName' | 'action' | 'actionDesc' | 'ipAddress' | 'userAgent' | 'resourceType' | 'resourceId'>
  ): Promise<string> {
    return this.log({
      ...params,
      result: 'success',
    });
  }

  /**
   * 简化版：记录失败的操作
   */
  async logFailure(
    params: Pick<AuditLogCreationAttributes, 'userId' | 'username' | 'displayName' | 'action' | 'actionDesc' | 'ipAddress' | 'userAgent' | 'errorMsg' | 'resourceType' | 'resourceId'>
  ): Promise<string> {
    return this.log({
      ...params,
      result: 'failed',
    });
  }

  /**
   * 记录设备控制操作（专用方法）
   */
  async logDeviceControl(
    userId: number,
    username: string,
    displayName: string | undefined,
    ipAddress: string,
    controlType: 'silence' | 'reset' | 'mode' | 'shield',
    deviceId: number,
    deviceName: string,
    result: AuditResult,
    errorMsg?: string
  ): Promise<string> {
    const actionMap = {
      silence: AuditActionType.DEVICE_CONTROL_SILENCE,
      reset: AuditActionType.DEVICE_CONTROL_RESET,
      mode: AuditActionType.DEVICE_CONTROL_MODE,
      shield: AuditActionType.DEVICE_CONTROL_SHIELD,
    };
    const descMap = {
      silence: '消音',
      reset: '复位',
      mode: '切换手自动模式',
      shield: '屏蔽设备',
    };

    return this.log({
      userId,
      username,
      displayName,
      action: actionMap[controlType],
      actionDesc: `${descMap[controlType]}设备: ${deviceName}`,
      ipAddress,
      resourceType: 'device',
      resourceId: String(deviceId),
      result,
      errorMsg,
    });
  }

  /**
   * 记录告警处理操作（专用方法）
   */
  async logAlarmHandle(
    userId: number,
    username: string,
    displayName: string | undefined,
    ipAddress: string,
    handleType: 'confirm' | 'handle' | 'dismiss' | 'silence',
    alarmId: number,
    alarmNo: string,
    result: AuditResult,
    errorMsg?: string
  ): Promise<string> {
    const actionMap = {
      confirm: AuditActionType.ALARM_CONFIRM,
      handle: AuditActionType.ALARM_HANDLE,
      dismiss: AuditActionType.ALARM_DISMISS,
      silence: AuditActionType.ALARM_SILENCE,
    };
    const descMap = {
      confirm: '确认告警',
      handle: '处理告警',
      dismiss: '忽略告警',
      silence: '消音告警',
    };

    return this.log({
      userId,
      username,
      displayName,
      action: actionMap[handleType],
      actionDesc: `${descMap[handleType]}: ${alarmNo}`,
      ipAddress,
      resourceType: 'alarm',
      resourceId: String(alarmId),
      result,
      errorMsg,
    });
  }

  /**
   * 查询日志（分页）
   */
  async query(params: {
    userId?: number;
    username?: string;
    action?: string;
    module?: string;
    result?: AuditResult;
    startTime?: Date;
    endTime?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{ list: AuditLog[]; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 20, ...whereParams } = params;
    const offset = (page - 1) * pageSize;

    const where: any = {};
    if (whereParams.userId) where.userId = whereParams.userId;
    if (whereParams.username) where.username = whereParams.username;
    if (whereParams.action) where.action = whereParams.action;
    if (whereParams.module) where.module = whereParams.module;
    if (whereParams.result) where.result = whereParams.result;
    if (whereParams.startTime || whereParams.endTime) {
      where.createdAt = {};
      if (whereParams.startTime) where.createdAt[Op.gte] = whereParams.startTime;
      if (whereParams.endTime) where.createdAt[Op.lte] = whereParams.endTime;
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    return {
      list: rows,
      total: count,
      page,
      pageSize,
    };
  }

  /**
   * 获取操作统计
   */
  async getStats(startTime: Date, endTime: Date): Promise<{
    total: number;
    byUser: Record<string, number>;
    byModule: Record<string, number>;
    byResult: Record<AuditResult, number>;
  }> {
    const logs = await AuditLog.findAll({
      where: {
        createdAt: {
          [Op.gte]: startTime,
          [Op.lte]: endTime,
        },
      },
    });

    const stats = {
      total: logs.length,
      byUser: {} as Record<string, number>,
      byModule: {} as Record<string, number>,
      byResult: { success: 0, failed: 0, partial: 0 } as Record<AuditResult, number>,
    };

    for (const log of logs) {
      stats.byUser[log.username] = (stats.byUser[log.username] || 0) + 1;
      stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1;
      stats.byResult[log.result] = (stats.byResult[log.result] || 0) + 1;
    }

    return stats;
  }
}

// 需要导入Op
import { Op } from 'sequelize';

export default AuditLogService;
