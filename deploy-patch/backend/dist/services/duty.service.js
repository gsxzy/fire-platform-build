"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutyService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
class DutyService {
    // 创建排班
    static async createSchedule(data) {
        return models_1.DutySchedule.create(data);
    }
    // 获取排班表（支持分页）
    static async getSchedules(startDate, endDate, pageNum, pageSize) {
        const where = {};
        if (startDate && endDate) {
            where.duty_date = { [sequelize_1.Op.between]: [startDate, endDate] };
        }
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
    // 按ID获取排班
    static async getScheduleById(id) {
        return models_1.DutySchedule.findByPk(id);
    }
    // 更新排班
    static async updateSchedule(id, data) {
        return models_1.DutySchedule.update(data, { where: { id } });
    }
    // 删除排班
    static async deleteSchedule(id) {
        return models_1.DutySchedule.destroy({ where: { id } });
    }
    // 签到
    static async checkIn(userId, userName) {
        const log = await models_1.DutyLog.create({
            user_id: userId, user_name: userName,
            on_duty_time: new Date(), status: 1,
        });
        return log;
    }
    // 签退（交接班）
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
    // 获取值班日志
    static async getDutyLogs(pageNum = 1, pageSize = 20, userId) {
        const where = {};
        if (userId)
            where.user_id = userId;
        const { count, rows } = await models_1.DutyLog.findAndCountAll({
            where, limit: pageSize, offset: (pageNum - 1) * pageSize,
            order: [['created_at', 'DESC']],
        });
        return { list: rows, total: count, pageNum, pageSize };
    }
    // 离岗预警检测
    static async checkAbsence() {
        const fiveMinAgo = new Date(Date.now() - 5 * 60000);
        // 检查正在值班但超过5分钟无活动的人员
        const onDutyLogs = await models_1.DutyLog.findAll({
            where: { off_duty_time: null, on_duty_time: { [sequelize_1.Op.lt]: fiveMinAgo } },
            raw: true,
        });
        return onDutyLogs;
    }
    // 获取当前值班人员
    static async getCurrentDuty() {
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
    }
}
exports.DutyService = DutyService;
//# sourceMappingURL=duty.service.js.map