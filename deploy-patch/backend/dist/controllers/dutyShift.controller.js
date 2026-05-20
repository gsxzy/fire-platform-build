"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutyShiftController = void 0;
const response_1 = require("@/utils/response");
const dutyShift_service_1 = require("@/services/dutyShift.service");
const validator_1 = require("@/utils/validator");
exports.DutyShiftController = {
    async list(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { keyword, status } = req.query;
        const data = await dutyShift_service_1.DutyShiftService.list(keyword, status !== undefined ? +status : undefined, +pageNum, +pageSize);
        (0, response_1.sendPage)(res, req, data.list, data.total, data.pageNum, data.pageSize);
    },
    async byId(req, res) {
        const row = await dutyShift_service_1.DutyShiftService.byId(req.params.id);
        (0, response_1.sendSuccess)(res, req, row);
    },
    async create(req, res) {
        const row = await dutyShift_service_1.DutyShiftService.create(req.body);
        (0, response_1.sendSuccess)(res, req, { id: row.id }, '创建成功');
    },
    async update(req, res) {
        await dutyShift_service_1.DutyShiftService.update(String((0, validator_1.parseIdStrict)(req.params.id)), req.body);
        (0, response_1.sendSuccess)(res, req, null, '更新成功');
    },
    async delete(req, res) {
        await dutyShift_service_1.DutyShiftService.delete(String((0, validator_1.parseIdStrict)(req.params.id)));
        (0, response_1.sendSuccess)(res, req, null, '删除成功');
    },
    async toggleStatus(req, res) {
        const { status } = req.body;
        await dutyShift_service_1.DutyShiftService.toggleStatus(String((0, validator_1.parseIdStrict)(req.params.id)), +status);
        (0, response_1.sendSuccess)(res, req, null, '状态更新成功');
    },
};
//# sourceMappingURL=dutyShift.controller.js.map