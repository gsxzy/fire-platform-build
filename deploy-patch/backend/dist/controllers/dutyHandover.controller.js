"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutyHandoverController = void 0;
const response_1 = require("@/utils/response");
const dutyHandover_service_1 = require("@/services/dutyHandover.service");
const validator_1 = require("@/utils/validator");
exports.DutyHandoverController = {
    async list(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { startTime, endTime, shiftId, fromUserId, toUserId, status } = req.query;
        const data = await dutyHandover_service_1.DutyHandoverService.list({
            startTime: startTime,
            endTime: endTime,
            shiftId: shiftId,
            fromUserId: fromUserId ? String(fromUserId) : undefined,
            toUserId: toUserId ? String(toUserId) : undefined,
            status: status !== undefined ? +status : undefined,
            pageNum: +pageNum, pageSize: +pageSize,
        });
        (0, response_1.sendPage)(res, req, data.list, data.total, data.pageNum, data.pageSize);
    },
    async byId(req, res) {
        const row = await dutyHandover_service_1.DutyHandoverService.byId(req.params.id);
        (0, response_1.sendSuccess)(res, req, row);
    },
    async create(req, res) {
        const row = await dutyHandover_service_1.DutyHandoverService.create(req.body);
        (0, response_1.sendSuccess)(res, req, { id: row.id }, '交接记录创建成功');
    },
    async accept(req, res) {
        const { toSignature } = req.body;
        await dutyHandover_service_1.DutyHandoverService.accept(String((0, validator_1.parseIdStrict)(req.params.id)), req.user.userId, req.user.username, toSignature);
        (0, response_1.sendSuccess)(res, req, null, '交接确认成功');
    },
    async summary(req, res) {
        const { scheduleId } = req.query;
        const data = await dutyHandover_service_1.DutyHandoverService.getHandoverSummary(scheduleId);
        (0, response_1.sendSuccess)(res, req, data);
    },
};
//# sourceMappingURL=dutyHandover.controller.js.map