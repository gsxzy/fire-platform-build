"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkageController = void 0;
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const models_1 = require("@/models");
const linkage_service_1 = require("@/services/linkage.service");
const validator_1 = require("@/utils/validator");
exports.LinkageController = {
    /**
     * 获取联动规则列表
     */
    async list(req, res) {
        try {
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
            return res.json((0, response_1.success)({ list: rows, total: count }));
        }
        catch (err) {
            logger_1.default.error(`[LinkageController] list 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /**
     * 创建联动规则
     */
    async create(req, res) {
        try {
            const body = req.body;
            const status = body.status !== undefined && body.status !== null ? body.status : 1;
            const rule = await models_1.LinkageRule.create({
                ...body,
                status,
            });
            return res.json((0, response_1.success)(rule, '联动规则创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[LinkageController] create 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /**
     * 更新联动规则
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const rule = await models_1.LinkageRule.findByPk(id);
            if (!rule) {
                return res.json((0, response_1.fail)('联动规则不存在'));
            }
            await rule.update(req.body);
            return res.json((0, response_1.success)(rule, '联动规则更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[LinkageController] update 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /**
     * 删除联动规则
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            const rule = await models_1.LinkageRule.findByPk(id);
            if (!rule) {
                return res.json((0, response_1.fail)('联动规则不存在'));
            }
            await rule.destroy();
            return res.json((0, response_1.success)(null, '联动规则删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[LinkageController] delete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /**
     * 手动触发联动
     */
    async manualTrigger(req, res) {
        try {
            const id = req.params.id ?? req.params.ruleId;
            const plan = await linkage_service_1.LinkageService.manualTrigger(+id, req.user.userId, req.user.username);
            if (!plan) {
                return res.json((0, response_1.fail)('联动触发失败'));
            }
            return res.json((0, response_1.success)(plan, '联动已触发'));
        }
        catch (err) {
            logger_1.default.error(`[LinkageController] manualTrigger 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /**
     * 获取联动状态
     */
    async getStatus(req, res) {
        try {
            const { alarmId } = req.params;
            const status = await linkage_service_1.LinkageService.getLinkageStatus(+alarmId);
            if (!status) {
                return res.json((0, response_1.fail)('联动不存在'));
            }
            return res.json((0, response_1.success)(status));
        }
        catch (err) {
            logger_1.default.error(`[LinkageController] getStatus 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /**
     * 应用预设联动方案
     */
    async applyPreset(req, res) {
        try {
            const { planType, deviceIds } = req.body;
            const validTypes = ['fireAlarm', 'falseAlarm', 'drill'];
            if (!validTypes.includes(planType)) {
                return res.json((0, response_1.fail)('无效的联动方案类型'));
            }
            await linkage_service_1.LinkageService.applyPresetPlan(planType, deviceIds, req.user.userId, req.user.username);
            return res.json((0, response_1.success)(null, '联动方案已应用'));
        }
        catch (err) {
            logger_1.default.error(`[LinkageController] applyPreset 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /**
     * 获取联动记录
     */
    async getRecords(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { alarmId } = req.query;
            const where = {};
            if (alarmId)
                where.alarm_id = alarmId;
            // 这里应该有联动记录表，暂时返回空
            const records = [];
            return res.json((0, response_1.success)({ list: records, total: 0 }));
        }
        catch (err) {
            logger_1.default.error(`[LinkageController] getRecords 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    }
};
//# sourceMappingURL=linkage.controller.js.map