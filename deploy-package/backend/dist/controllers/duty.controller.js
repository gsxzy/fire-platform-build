"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutyController = void 0;
const respond_1 = require("@/utils/respond");
const duty_service_1 = require("@/services/duty.service");
const validator_1 = require("@/utils/validator");
exports.DutyController = {
    async scheduleList(req, res) {
        const { startDate, endDate } = req.query;
        const pageNum = parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1;
        const pageSize = parseInt(String(req.query.pageSize ?? 10), 10) || 10;
        const data = await duty_service_1.DutyService.getSchedules(startDate, endDate, pageNum, pageSize);
        (0, respond_1.sendPage)(res, req, data.list, data.total, data.pageNum, data.pageSize);
    },
    async scheduleById(req, res) {
        const schedule = await duty_service_1.DutyService.getScheduleById(req.params.id);
        (0, respond_1.sendSuccess)(res, req, schedule || null);
    },
    async scheduleCreate(req, res) {
        const schedule = await duty_service_1.DutyService.createSchedule((0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: schedule.id }, '排班成功');
    },
    async scheduleUpdate(req, res) {
        await duty_service_1.DutyService.updateSchedule(String((0, validator_1.parseIdStrict)(req.params.id)), (0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async scheduleDelete(req, res) {
        await duty_service_1.DutyService.deleteSchedule(String((0, validator_1.parseIdStrict)(req.params.id)));
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async checkIn(req, res) {
        const log = await duty_service_1.DutyService.checkIn(req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, { id: log.id }, '签到成功');
    },
    async checkOut(req, res) {
        const { handoverContent, incidents } = req.body;
        await duty_service_1.DutyService.checkOut(req.user.userId, handoverContent, incidents);
        (0, respond_1.sendSuccess)(res, req, null, '签退成功');
    },
    async logList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { userId } = req.query;
        const data = await duty_service_1.DutyService.getDutyLogs(+pageNum, +pageSize, userId ? +userId : undefined);
        (0, respond_1.sendPage)(res, req, data.list, data.total, data.pageNum, data.pageSize);
    },
    async currentDuty(req, res) {
        const data = await duty_service_1.DutyService.getCurrentDuty();
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async absenceAlert(req, res) {
        const data = await duty_service_1.DutyService.checkAbsence();
        (0, respond_1.sendSuccess)(res, req, data);
    },
};
//# sourceMappingURL=duty.controller.js.map