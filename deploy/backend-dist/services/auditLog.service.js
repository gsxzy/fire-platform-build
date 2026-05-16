"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = exports.AuditLog = exports.AuditActionType = void 0;
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
const sequelize_1 = require("sequelize");
const logger_1 = __importDefault(require("@/config/logger"));
// 操作类型枚举
exports.AuditActionType = {
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
};
// Sequelize模型
class AuditLog extends sequelize_1.Model {
    id;
    traceId;
    userId;
    username;
    displayName;
    action;
    actionDesc;
    ipAddress;
    userAgent;
    module;
    resourceType;
    resourceId;
    oldValue;
    newValue;
    result;
    errorMsg;
    duration;
    createdAt;
}
exports.AuditLog = AuditLog;
/**
 * 审计日志服务
 */
class AuditLogService {
    static instance;
    sequelize;
    initialized = false;
    constructor(sequelize) {
        this.sequelize = sequelize;
    }
    static getInstance(sequelize) {
        if (!AuditLogService.instance) {
            AuditLogService.instance = new AuditLogService(sequelize);
        }
        return AuditLogService.instance;
    }
    /**
     * 初始化模型（在应用启动时调用）
     */
    initModel() {
        if (this.initialized)
            return;
        AuditLog.init({
            id: {
                type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
                primaryKey: true,
                autoIncrement: true,
            },
            traceId: {
                type: sequelize_1.DataTypes.STRING(36),
                allowNull: false,
                unique: true,
                comment: '追踪ID',
            },
            userId: {
                type: sequelize_1.DataTypes.BIGINT.UNSIGNED,
                allowNull: true,
                comment: '操作人ID',
            },
            username: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                comment: '操作人用户名',
            },
            displayName: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
                comment: '操作人姓名',
            },
            action: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                comment: '操作类型',
            },
            actionDesc: {
                type: sequelize_1.DataTypes.STRING(200),
                allowNull: false,
                comment: '操作描述',
            },
            ipAddress: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                comment: '操作IP地址',
            },
            userAgent: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                comment: '客户端信息',
            },
            module: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                comment: '所属模块',
            },
            resourceType: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
                comment: '资源类型',
            },
            resourceId: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
                comment: '资源ID',
            },
            oldValue: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: '变更前值(JSON)',
            },
            newValue: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: '变更后值(JSON)',
            },
            result: {
                type: sequelize_1.DataTypes.ENUM('success', 'failed', 'partial'),
                allowNull: false,
                comment: '操作结果',
            },
            errorMsg: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                comment: '错误信息',
            },
            duration: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: '耗时(毫秒)',
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                comment: '操作时间',
            },
        }, {
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
        });
        this.initialized = true;
        logger_1.default.info('[审计日志] 模型初始化完成');
    }
    /**
     * 生成追踪ID
     */
    generateTraceId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    /**
     * 从操作类型提取模块名
     */
    getModuleFromAction(action) {
        const parts = action.split('.');
        return parts[0] || 'unknown';
    }
    /**
     * 记录操作日志
     */
    async log(params) {
        const traceId = this.generateTraceId();
        const module = this.getModuleFromAction(params.action);
        const log = await AuditLog.create({
            ...params,
            traceId,
            module,
            createdAt: new Date(),
        });
        logger_1.default.debug(`[审计日志] ${params.action} - ${params.username} - ${params.result} - traceId=${traceId}`);
        return traceId;
    }
    /**
     * 简化版：记录成功的操作
     */
    async logSuccess(params) {
        return this.log({
            ...params,
            result: 'success',
        });
    }
    /**
     * 简化版：记录失败的操作
     */
    async logFailure(params) {
        return this.log({
            ...params,
            result: 'failed',
        });
    }
    /**
     * 记录设备控制操作（专用方法）
     */
    async logDeviceControl(userId, username, displayName, ipAddress, controlType, deviceId, deviceName, result, errorMsg) {
        const actionMap = {
            silence: exports.AuditActionType.DEVICE_CONTROL_SILENCE,
            reset: exports.AuditActionType.DEVICE_CONTROL_RESET,
            mode: exports.AuditActionType.DEVICE_CONTROL_MODE,
            shield: exports.AuditActionType.DEVICE_CONTROL_SHIELD,
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
    async logAlarmHandle(userId, username, displayName, ipAddress, handleType, alarmId, alarmNo, result, errorMsg) {
        const actionMap = {
            confirm: exports.AuditActionType.ALARM_CONFIRM,
            handle: exports.AuditActionType.ALARM_HANDLE,
            dismiss: exports.AuditActionType.ALARM_DISMISS,
            silence: exports.AuditActionType.ALARM_SILENCE,
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
    async query(params) {
        const { page = 1, pageSize = 20, ...whereParams } = params;
        const offset = (page - 1) * pageSize;
        const where = {};
        if (whereParams.userId)
            where.userId = whereParams.userId;
        if (whereParams.username)
            where.username = whereParams.username;
        if (whereParams.action)
            where.action = whereParams.action;
        if (whereParams.module)
            where.module = whereParams.module;
        if (whereParams.result)
            where.result = whereParams.result;
        if (whereParams.startTime || whereParams.endTime) {
            where.createdAt = {};
            if (whereParams.startTime)
                where.createdAt[sequelize_2.Op.gte] = whereParams.startTime;
            if (whereParams.endTime)
                where.createdAt[sequelize_2.Op.lte] = whereParams.endTime;
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
    async getStats(startTime, endTime) {
        const logs = await AuditLog.findAll({
            where: {
                createdAt: {
                    [sequelize_2.Op.gte]: startTime,
                    [sequelize_2.Op.lte]: endTime,
                },
            },
        });
        const stats = {
            total: logs.length,
            byUser: {},
            byModule: {},
            byResult: { success: 0, failed: 0, partial: 0 },
        };
        for (const log of logs) {
            stats.byUser[log.username] = (stats.byUser[log.username] || 0) + 1;
            stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1;
            stats.byResult[log.result] = (stats.byResult[log.result] || 0) + 1;
        }
        return stats;
    }
}
exports.AuditLogService = AuditLogService;
// 需要导入Op
const sequelize_2 = require("sequelize");
exports.default = AuditLogService;
//# sourceMappingURL=auditLog.service.js.map