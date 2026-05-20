"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = initCronJobs;
/**
 * ═══════════════════════════════════════════════════════════════════
 * 定时任务
 * 巡检计划生成、维保到期提醒、设备离线检测、数据清理、定时报表
 * ═══════════════════════════════════════════════════════════════════
 */
const node_cron_1 = __importDefault(require("node-cron"));
const sequelize_1 = require("sequelize");
const logger_1 = __importDefault(require("@/config/logger"));
const redis_1 = __importDefault(require("@/config/redis"));
const models_1 = require("@/models");
const database_1 = __importDefault(require("@/config/database"));
const report_service_1 = require("@/services/report.service");
const notification_service_1 = require("@/services/notification.service");
/** 简化 Cron 匹配：检查当前时间是否满足 cron 表达式（仅支持标准 5 段式） */
function matchCron(expr, now) {
    const [min, hour, day, month, dow] = expr.trim().split(/\s+/);
    const check = (field, value, max) => {
        if (field === '*')
            return true;
        if (field === String(value))
            return true;
        if (field.includes(','))
            return field.split(',').map(Number).includes(value);
        if (field.includes('-')) {
            const [s, e] = field.split('-').map(Number);
            return value >= s && value <= e;
        }
        if (field.includes('/')) {
            const [, step] = field.split('/').map(Number);
            return value % step === 0;
        }
        return false;
    };
    return check(min, now.getMinutes(), 59)
        && check(hour, now.getHours(), 23)
        && check(day, now.getDate(), 31)
        && check(month, now.getMonth() + 1, 12)
        && check(dow, now.getDay(), 6);
}
function initCronJobs() {
    // 每分钟：生成巡检任务
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            const plans = await models_1.PatrolPlan.findAll({ where: { status: 1 } });
            const now = new Date();
            for (const plan of plans) {
                const key = `patrol:${plan.id}:${now.toISOString().slice(0, 10)}`;
                const exists = await redis_1.default.get(key);
                if (!exists) {
                    const patrolNo = `PT${Date.now()}${Math.floor(Math.random() * 100)}`;
                    await models_1.PatrolRecord.create({
                        plan_id: plan.id, patrol_no: patrolNo,
                        unit_id: plan.unit_id, patrol_date: now,
                        patrol_user_id: plan.responsible_id,
                        patrol_user_name: plan.responsible_name,
                        patrol_items: plan.patrol_items, result: 1,
                    });
                    await redis_1.default.setex(key, 86400, '1');
                }
            }
        }
        catch (err) {
            logger_1.default.error('[Cron] Patrol generation error:', err.message);
        }
    });
    // 每小时：检测维保合同到期
    node_cron_1.default.schedule('0 * * * *', async () => {
        try {
            const soon = new Date();
            soon.setDate(soon.getDate() + 30);
            const contracts = await models_1.MaintenanceContract.findAll({
                where: { end_date: { [sequelize_1.Op.lte]: soon }, status: 1 }
            });
            for (const c of contracts) {
                await redis_1.default.publish('fire:notify', JSON.stringify({
                    type: 'contract_expire',
                    contractId: c.id, contractNo: c.contract_no, endDate: c.end_date
                }));
            }
        }
        catch (err) {
            logger_1.default.error('[Cron] Contract check error:', err.message);
        }
    });
    // 每5分钟：检测设备离线
    node_cron_1.default.schedule('*/5 * * * *', async () => {
        try {
            const threshold = new Date(Date.now() - 10 * 60 * 1000);
            const devices = await models_1.Device.findAll({
                where: { status: 1, last_online: { [sequelize_1.Op.lt]: threshold } }
            });
            for (const d of devices) {
                await models_1.Device.update({ status: 3 }, { where: { id: d.id } });
                logger_1.default.warn(`[Cron] Device ${d.device_name}(${d.device_no}) marked offline`);
            }
        }
        catch (err) {
            logger_1.default.error('[Cron] Offline check error:', err.message);
        }
    });
    // 每天凌晨：数据清理
    node_cron_1.default.schedule('0 3 * * *', async () => {
        try {
            const alarmExpire = new Date();
            alarmExpire.setDate(alarmExpire.getDate() - 365);
            const deletedAlarms = await models_1.Alarm.destroy({ where: { created_at: { [sequelize_1.Op.lt]: alarmExpire }, status: { [sequelize_1.Op.in]: [2, 3] } } });
            logger_1.default.info(`[Cron] Cleaned ${deletedAlarms} expired alarm records`);
            // 清理 CTWing 原始推送日志（保留90天）
            const ctwingExpire = new Date();
            ctwingExpire.setDate(ctwingExpire.getDate() - 90);
            await database_1.default.query(`DELETE FROM ctwing_raw_log WHERE created_at < ?`, { replacements: [ctwingExpire] });
            logger_1.default.info(`[Cron] Cleaned ctwing_raw_log records`);
            // 清理海康4G原始推送日志（保留90天）
            await database_1.default.query(`DELETE FROM hikvision4g_raw_log WHERE created_at < ?`, { replacements: [ctwingExpire] });
            logger_1.default.info(`[Cron] Cleaned hikvision4g_raw_log records`);
            // 清理 IoT 遥测数据（保留180天）
            const telemetryExpire = new Date();
            telemetryExpire.setDate(telemetryExpire.getDate() - 180);
            await database_1.default.query(`DELETE FROM iot_telemetry WHERE created_at < ?`, { replacements: [telemetryExpire] });
            logger_1.default.info(`[Cron] Cleaned iot_telemetry records`);
            // 清理系统日志（保留90天）
            const sysLogExpire = new Date();
            sysLogExpire.setDate(sysLogExpire.getDate() - 90);
            await database_1.default.query(`DELETE FROM sys_log WHERE created_at < ?`, { replacements: [sysLogExpire] });
            logger_1.default.info(`[Cron] Cleaned sys_log records`);
        }
        catch (err) {
            logger_1.default.error('[Cron] Cleanup error:', err.message);
        }
    });
    // 每分钟：定时报表任务
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const schedules = await models_1.ReportSchedule.findAll({ where: { status: 1 } });
            for (const s of schedules) {
                if (!matchCron(s.cron_expr, now))
                    continue;
                // 防止同一分钟内重复执行
                const lastRun = s.last_run_at ? new Date(s.last_run_at) : null;
                if (lastRun && lastRun.getFullYear() === now.getFullYear() && lastRun.getMonth() === now.getMonth() && lastRun.getDate() === now.getDate() && lastRun.getHours() === now.getHours() && lastRun.getMinutes() === now.getMinutes()) {
                    continue;
                }
                try {
                    await report_service_1.ReportService.exportReport(s.report_type, {
                        format: s.format || 'xlsx',
                        unitId: s.unit_id || undefined,
                    });
                    const recipients = String(s.recipients || '').split(/[,;\s]+/).filter(Boolean);
                    if (recipients.length > 0) {
                        for (const to of recipients) {
                            await notification_service_1.NotificationService.sendEmail(to, `【智慧消防】${s.report_name}`, `<p>您好，</p><p>附件为自动生成的「${s.report_name}」，请查收。</p><p>生成时间：${now.toLocaleString('zh-CN')}</p>`);
                        }
                    }
                    await models_1.ReportSchedule.update({ last_run_at: now, last_run_status: 1 }, { where: { id: s.id } });
                    logger_1.default.info(`[Cron] Report schedule ${s.id} (${s.report_name}) executed successfully`);
                }
                catch (err) {
                    await models_1.ReportSchedule.update({ last_run_at: now, last_run_status: 2 }, { where: { id: s.id } });
                    logger_1.default.error(`[Cron] Report schedule ${s.id} (${s.report_name}) failed:`, err.message);
                }
            }
        }
        catch (err) {
            logger_1.default.error('[Cron] Report schedule error:', err.message);
        }
    });
    // ── 每5分钟：接警处置超时检测 ──
    node_cron_1.default.schedule('*/5 * * * *', async () => {
        try {
            const { DispatchService } = await Promise.resolve().then(() => __importStar(require('@/services/dispatch.service')));
            const count = await DispatchService.checkOverdue();
            if (count > 0) {
                logger_1.default.warn(`[Cron] 处置超时检测: ${count} 条记录已超时`);
            }
        }
        catch (err) {
            logger_1.default.error('[Cron] Dispatch overdue check error:', err.message);
        }
    });
    logger_1.default.info('[Cron] All scheduled jobs initialized');
}
//# sourceMappingURL=index.js.map