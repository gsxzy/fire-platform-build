"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutyController = void 0;
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const duty_service_1 = require("@/services/duty.service");
const validator_1 = require("@/utils/validator");
function sanitizeId(id) {
    const n = parseInt(id, 10);
    if (isNaN(n) || n <= 0)
        throw new Error('无效ID');
    return n;
}
function sanitizeBody(body) {
    if (!body || typeof body !== 'object')
        return {};
    const b = body;
    const result = {};
    for (const key of Object.keys(b)) {
        if (key !== 'id')
            result[key] = b[key];
    }
    return result;
}
exports.DutyController = {
    // 排班
    async scheduleList(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const pageNum = parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1;
            const pageSize = parseInt(String(req.query.pageSize ?? 10), 10) || 10;
            const data = await duty_service_1.DutyService.getSchedules(startDate, endDate, pageNum, pageSize);
            return res.json((0, response_1.page)(data.list, data.total, data.pageNum, data.pageSize));
        }
        catch (err) {
            logger_1.default.error(`[DutyController] scheduleList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async scheduleById(req, res) {
        try {
            const schedule = await duty_service_1.DutyService.getScheduleById(req.params.id);
            return res.json((0, response_1.success)(schedule || null));
        }
        catch (err) {
            logger_1.default.error(`[DutyController] scheduleById 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async scheduleCreate(req, res) {
        try {
            const schedule = await duty_service_1.DutyService.createSchedule(sanitizeBody(req.body));
            return res.json((0, response_1.success)({ id: schedule.id }, '排班成功'));
        }
        catch (err) {
            logger_1.default.error(`[DutyController] scheduleCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async scheduleUpdate(req, res) {
        try {
            await duty_service_1.DutyService.updateSchedule(String(sanitizeId(req.params.id)), sanitizeBody(req.body));
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[DutyController] scheduleUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async scheduleDelete(req, res) {
        try {
            await duty_service_1.DutyService.deleteSchedule(String(sanitizeId(req.params.id)));
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[DutyController] scheduleDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 签到
    async checkIn(req, res) {
        try {
            const log = await duty_service_1.DutyService.checkIn(req.user.userId, req.user.username);
            return res.json((0, response_1.success)({ id: log.id }, '签到成功'));
        }
        catch (err) {
            logger_1.default.error(`[DutyController] checkIn 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 签退（交接班）
    async checkOut(req, res) {
        try {
            const { handoverContent, incidents } = req.body;
            await duty_service_1.DutyService.checkOut(req.user.userId, handoverContent, incidents);
            return res.json((0, response_1.success)(null, '签退成功'));
        }
        catch (err) {
            logger_1.default.error(`[DutyController] checkOut 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 值班日志
    async logList(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { userId } = req.query;
            const data = await duty_service_1.DutyService.getDutyLogs(+pageNum, +pageSize, userId ? +userId : undefined);
            return res.json((0, response_1.page)(data.list, data.total, data.pageNum, data.pageSize));
        }
        catch (err) {
            logger_1.default.error(`[DutyController] logList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 当前值班人员
    async currentDuty(req, res) {
        try {
            const data = await duty_service_1.DutyService.getCurrentDuty();
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[DutyController] currentDuty 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 离岗预警
    async absenceAlert(req, res) {
        try {
            const data = await duty_service_1.DutyService.checkAbsence();
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[DutyController] absenceAlert 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=duty.controller.js.map