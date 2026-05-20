"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlarmNotifyPolicyController = exports.AlarmThresholdController = void 0;
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
const sequelize_1 = require("sequelize");
/* ── 阈值规则 ── */
exports.AlarmThresholdController = {
    async list(req, res) {
        const { pageNum = 1, pageSize = 20, status, keyword } = req.query;
        const where = {};
        if (status !== undefined)
            where.status = Number(status);
        if (keyword) {
            where[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: `%${keyword}%` } },
                { device_type: { [sequelize_1.Op.like]: `%${keyword}%` } },
                { metric_type: { [sequelize_1.Op.like]: `%${keyword}%` } },
            ];
        }
        const { count, rows } = await models_1.AlarmThreshold.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            offset: (pageNum - 1) * pageSize,
            limit: Number(pageSize),
        });
        (0, respond_1.sendPage)(res, req, rows, count, +pageNum, +pageSize);
    },
    async create(req, res) {
        const row = await models_1.AlarmThreshold.create(req.body);
        (0, respond_1.sendSuccess)(res, req, row, '创建成功');
    },
    async update(req, res) {
        const row = await models_1.AlarmThreshold.findByPk(req.params.id);
        if (!row)
            throw new Error('规则不存在');
        await row.update(req.body);
        (0, respond_1.sendSuccess)(res, req, row, '更新成功');
    },
    async delete(req, res) {
        const row = await models_1.AlarmThreshold.findByPk(req.params.id);
        if (!row)
            throw new Error('规则不存在');
        await row.destroy();
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async byId(req, res) {
        const row = await models_1.AlarmThreshold.findByPk(req.params.id);
        (0, respond_1.sendSuccess)(res, req, row);
    },
};
/* ── 通知策略 ── */
exports.AlarmNotifyPolicyController = {
    async list(req, res) {
        const { pageNum = 1, pageSize = 20, status, keyword } = req.query;
        const where = {};
        if (status !== undefined)
            where.status = Number(status);
        if (keyword) {
            where[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: `%${keyword}%` } },
            ];
        }
        const { count, rows } = await models_1.AlarmNotifyPolicy.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            offset: (pageNum - 1) * pageSize,
            limit: Number(pageSize),
        });
        (0, respond_1.sendPage)(res, req, rows, count, +pageNum, +pageSize);
    },
    async create(req, res) {
        const row = await models_1.AlarmNotifyPolicy.create(req.body);
        (0, respond_1.sendSuccess)(res, req, row, '创建成功');
    },
    async update(req, res) {
        const row = await models_1.AlarmNotifyPolicy.findByPk(req.params.id);
        if (!row)
            throw new Error('策略不存在');
        await row.update(req.body);
        (0, respond_1.sendSuccess)(res, req, row, '更新成功');
    },
    async delete(req, res) {
        const row = await models_1.AlarmNotifyPolicy.findByPk(req.params.id);
        if (!row)
            throw new Error('策略不存在');
        await row.destroy();
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async byId(req, res) {
        const row = await models_1.AlarmNotifyPolicy.findByPk(req.params.id);
        (0, respond_1.sendSuccess)(res, req, row);
    },
};
//# sourceMappingURL=alarmConfig.controller.js.map