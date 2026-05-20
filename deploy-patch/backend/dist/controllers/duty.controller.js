"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutyController = void 0;
const response_1 = require("@/utils/response");
const duty_service_1 = require("@/services/duty.service");
const validator_1 = require("@/utils/validator");
exports.DutyController = {
    // ── 排班 ──
    async scheduleList(req, res) {
        const { startDate, endDate, shiftId } = req.query;
        const pageNum = parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1;
        const pageSize = parseInt(String(req.query.pageSize ?? 10), 10) || 10;
        const data = await duty_service_1.DutyService.getSchedules(startDate, endDate, shiftId, pageNum, pageSize);
        (0, response_1.sendPage)(res, req, data.list, data.total, data.pageNum, data.pageSize);
    },
    async scheduleById(req, res) {
        const schedule = await duty_service_1.DutyService.getScheduleById(req.params.id);
        (0, response_1.sendSuccess)(res, req, schedule || null);
    },
    async scheduleCreate(req, res) {
        const schedule = await duty_service_1.DutyService.createSchedule((0, validator_1.sanitizeBody)(req.body));
        (0, response_1.sendSuccess)(res, req, { id: schedule.id }, '排班成功');
    },
    async scheduleUpdate(req, res) {
        await duty_service_1.DutyService.updateSchedule(String((0, validator_1.parseIdStrict)(req.params.id)), (0, validator_1.sanitizeBody)(req.body));
        (0, response_1.sendSuccess)(res, req, null, '更新成功');
    },
    async scheduleDelete(req, res) {
        await duty_service_1.DutyService.deleteSchedule(String((0, validator_1.parseIdStrict)(req.params.id)));
        (0, response_1.sendSuccess)(res, req, null, '删除成功');
    },
    // ── 签到/签退 ──
    async checkIn(req, res) {
        const { scheduleId } = req.body;
        const log = await duty_service_1.DutyService.checkIn(req.user.userId, req.user.username, scheduleId);
        (0, response_1.sendSuccess)(res, req, { id: log.id }, '签到成功');
    },
    async checkOut(req, res) {
        const { handoverContent, incidents } = req.body;
        await duty_service_1.DutyService.checkOut(req.user.userId, handoverContent, incidents);
        (0, response_1.sendSuccess)(res, req, null, '签退成功');
    },
    // ── 值班日志（增强版） ──
    async logList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { userId, eventType, eventSource, startTime, endTime, scheduleId } = req.query;
        const data = await duty_service_1.DutyService.getDutyLogs(+pageNum, +pageSize, {
            userId: userId ? +userId : undefined,
            eventType: eventType !== undefined ? +eventType : undefined,
            eventSource: eventSource,
            startTime: startTime,
            endTime: endTime,
            scheduleId: scheduleId ? +scheduleId : undefined,
        });
        (0, response_1.sendPage)(res, req, data.list, data.total, data.pageNum, data.pageSize);
    },
    async addLog(req, res) {
        const { scheduleId, content, attachments, eventSource } = req.body;
        const log = await duty_service_1.DutyService.addManualLog(req.user.userId, req.user.username, {
            scheduleId, content, attachments, eventSource,
        });
        (0, response_1.sendSuccess)(res, req, { id: log.id }, '记录成功');
    },
    async generateSummary(req, res) {
        const { scheduleId } = req.params;
        const data = await duty_service_1.DutyService.generateShiftSummary(scheduleId);
        (0, response_1.sendSuccess)(res, req, data);
    },
    // ── 当前值班/缺勤 ──
    async currentDuty(req, res) {
        const data = await duty_service_1.DutyService.getCurrentDuty();
        (0, response_1.sendSuccess)(res, req, data);
    },
    async absenceAlert(req, res) {
        const data = await duty_service_1.DutyService.checkAbsence();
        (0, response_1.sendSuccess)(res, req, data);
    },
};
//# sourceMappingURL=duty.controller.js.map