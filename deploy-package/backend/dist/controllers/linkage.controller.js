"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkageController = void 0;
const respond_1 = require("@/utils/respond");
const httpError_1 = require("@/utils/httpError");
const models_1 = require("@/models");
const linkage_service_1 = require("@/services/linkage.service");
const validator_1 = require("@/utils/validator");
exports.LinkageController = {
    async list(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { status } = req.query;
        const where = {};
        if (status !== undefined)
            where.status = status;
        const { count, rows } = await models_1.LinkageRule.findAndCountAll({
            where,
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
            order: [['id', 'DESC']],
        });
        (0, respond_1.sendSuccess)(res, req, { list: rows, total: count });
    },
    async create(req, res) {
        const body = req.body;
        const status = body.status !== undefined && body.status !== null ? body.status : 1;
        const rule = await models_1.LinkageRule.create({ ...body, status });
        (0, respond_1.sendSuccess)(res, req, rule, '联动规则创建成功');
    },
    async update(req, res) {
        const { id } = req.params;
        const rule = await models_1.LinkageRule.findByPk(id);
        if (!rule)
            throw new httpError_1.HttpError('联动规则不存在', 404);
        await rule.update(req.body);
        (0, respond_1.sendSuccess)(res, req, rule, '联动规则更新成功');
    },
    async delete(req, res) {
        const { id } = req.params;
        const rule = await models_1.LinkageRule.findByPk(id);
        if (!rule)
            throw new httpError_1.HttpError('联动规则不存在', 404);
        await rule.destroy();
        (0, respond_1.sendSuccess)(res, req, null, '联动规则删除成功');
    },
    async manualTrigger(req, res) {
        const id = req.params.id ?? req.params.ruleId;
        const plan = await linkage_service_1.LinkageService.manualTrigger(+id, req.user.userId, req.user.username);
        if (!plan)
            throw new httpError_1.HttpError('联动触发失败', 400);
        (0, respond_1.sendSuccess)(res, req, plan, '联动已触发');
    },
    async getStatus(req, res) {
        const { alarmId } = req.params;
        const status = await linkage_service_1.LinkageService.getLinkageStatus(+alarmId);
        if (!status)
            throw new httpError_1.HttpError('联动不存在', 404);
        (0, respond_1.sendSuccess)(res, req, status);
    },
    async applyPreset(req, res) {
        const { planType, deviceIds } = req.body;
        const validTypes = ['fireAlarm', 'falseAlarm', 'drill'];
        if (!validTypes.includes(planType)) {
            throw new httpError_1.HttpError('无效的联动方案类型', 400);
        }
        await linkage_service_1.LinkageService.applyPresetPlan(planType, deviceIds, req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, null, '联动方案已应用');
    },
    async getRecords(req, res) {
        (0, respond_1.sendSuccess)(res, req, { list: [], total: 0 });
    },
};
//# sourceMappingURL=linkage.controller.js.map