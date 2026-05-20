"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutyService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
const cache_1 = require("@/utils/cache");
const noGenerator_1 = require("@/utils/noGenerator");
const logger_1 = __importDefault(require("@/config/logger"));
class DutyService {
    // ── 排班 ──
    static async createSchedule(data) {
        return models_1.DutySchedule.create(data);
    }
    static async getSchedules(startDate, endDate, shiftId, pageNum, pageSize) {
        const where = {};
        if (startDate && endDate) {
            where.duty_date = { [sequelize_1.Op.between]: [startDate, endDate] };
        }
        if (shiftId)
            where.shift_id = shiftId;
        if (pageNum && pageSize) {
            const { count, rows } = await models_1.DutySchedule.findAndCountAll({
                where, limit: pageSize, offset: (pageNum - 1) * pageSize,
                order: [['duty_date', 'ASC'], ['start_time', 'ASC']],
            });
            return { list: rows, total: count, pageNum, pageSize };
        }
        const rows = await models_1.DutySchedule.findAll({
            where, order: [['duty_date', 'ASC'], ['start_time', 'ASC']],
        });
        return { list: rows, total: rows.length, pageNum: 1, pageSize: rows.length };
    }
    static async getScheduleById(id) {
        return models_1.DutySchedule.findByPk(id);
    }
    static async updateSchedule(id, data) {
        return models_1.DutySchedule.update(data, { where: { id } });
    }
    static async deleteSchedule(id) {
        return models_1.DutySchedule.destroy({ where: { id } });
    }
    // ── 签到/签退 ──
    static async checkIn(userId, userName, scheduleId) {
        const log = await models_1.DutyLog.create({
            user_id: userId, user_name: userName,
            schedule_id: scheduleId,
            on_duty_time: new Date(), status: 1,
        });
        return log;
    }
    static async checkOut(userId, handoverContent, incidents) {
        const todayLog = await models_1.DutyLog.findOne({
            where: { user_id: userId, off_duty_time: null },
            order: [['created_at', 'DESC']],
        });
        if (todayLog) {
            await models_1.DutyLog.update({
                off_duty_time: new Date(),
                handover_content: handoverContent,
                incidents: incidents || '',
            }, { where: { id: todayLog.id } });
        }
        return { success: true };
    }
    // ── 值班日志（增强版） ──
    static async getDutyLogs(pageNum = 1, pageSize = 20, filters) {
        const where = {};
        if (filters?.userId)
            where.user_id = filters.userId;
        if (filters?.eventType !== undefined)
            where.event_type = filters.eventType;
        if (filters?.eventSource)
            where.event_source = filters.eventSource;
        if (filters?.scheduleId)
            where.schedule_id = filters.scheduleId;
        if (filters?.startTime && filters?.endTime) {
            where.created_at = { [sequelize_1.Op.between]: [filters.startTime, filters.endTime] };
        }
        const { count, rows } = await models_1.DutyLog.findAndCountAll({
            where, limit: pageSize, offset: (pageNum - 1) * pageSize,
            order: [['created_at', 'DESC']],
        });
        return { list: rows, total: count, pageNum, pageSize };
    }
    /** 手动记录日志 */
    static async addManualLog(userId, userName, data) {
        const logNo = await (0, noGenerator_1.generateNo)('RZ');
        const log = await models_1.DutyLog.create({
            log_no: logNo,
            user_id: userId,
            user_name: userName,
            schedule_id: data.scheduleId,
            event_type: 2,
            event_source: data.eventSource || 'manual',
            content: data.content,
            attachments: data.attachments,
            status: 1,
        });
        logger_1.default.info(`[DutyLog] 手动记录: user=${userName} log=${logNo}`);
        return log;
    }
    /** 自动记录日志（告警联动等） */
    static async addAutoLog(data) {
        const logNo = await (0, noGenerator_1.generateNo)('RZ');
        const log = await models_1.DutyLog.create({
            log_no: logNo,
            schedule_id: data.scheduleId,
            user_id: data.userId,
            user_name: data.userName,
            event_type: 1,
            event_source: data.eventSource,
            source_id: data.sourceId,
            content: data.content,
            status: 1,
        });
        return log;
    }
    /** 按班次自动汇总生成值班日志 */
    static async generateShiftSummary(scheduleId) {
        const schedule = await models_1.DutySchedule.findByPk(scheduleId);
        if (!schedule)
            throw new Error('排班记录不存在');
        const logs = await models_1.DutyLog.findAll({
            where: { schedule_id: scheduleId },
            order: [['created_at', 'ASC']],
        });
        const autoLogs = logs.filter((l) => l.event_type === 1);
        const manualLogs = logs.filter((l) => l.event_type === 2);
        const summaryContent = [
            `【班次】${schedule.shift_name || '值班'}`,
            `【值班人】${schedule.user_name || '-'}`,
            `【日期】${schedule.duty_date}`,
            `【时段】${schedule.start_time || ''} - ${schedule.end_time || ''}`,
            '',
            `【系统自动记录】共 ${autoLogs.length} 条`,
            ...autoLogs.map((l) => `- ${l.content}`),
            '',
            `【手动记录】共 ${manualLogs.length} 条`,
            ...manualLogs.map((l) => `- ${l.content}`),
        ].join('\n');
        return {
            schedule,
            summaryContent,
            autoCount: autoLogs.length,
            manualCount: manualLogs.length,
            totalCount: logs.length,
        };
    }
    // ── 当前值班 ──
    static async getCurrentDuty() {
        return (0, cache_1.withCache)(cache_1.CacheTags.DASHBOARD, 'duty:current', async () => {
            const now = new Date();
            const today = now.toISOString().slice(0, 10);
            const currentTime = now.toTimeString().slice(0, 8);
            return models_1.DutySchedule.findAll({
                where: {
                    duty_date: today,
                    start_time: { [sequelize_1.Op.lte]: currentTime },
                    end_time: { [sequelize_1.Op.gte]: currentTime },
                    status: 1,
                },
            });
        }, { ttl: 60 });
    }
    // ── 离岗预警 ──
    static async checkAbsence() {
        const fiveMinAgo = new Date(Date.now() - 5 * 60000);
        const onDutyLogs = await models_1.DutyLog.findAll({
            where: { off_duty_time: null, on_duty_time: { [sequelize_1.Op.lt]: fiveMinAgo } },
            raw: true,
        });
        return onDutyLogs;
    }
}
exports.DutyService = DutyService;
//# sourceMappingURL=duty.service.js.map