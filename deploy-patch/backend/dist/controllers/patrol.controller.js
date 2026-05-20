"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatrolController = void 0;
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
const logger_1 = __importDefault(require("@/config/logger"));
function parsePage(req) {
    const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
    return { pageNum, pageSize };
}
exports.PatrolController = {
    async planList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { status } = req.query;
        const where = {};
        if (status !== undefined)
            where.status = status;
        const { count, rows } = await models_1.PatrolPlan.findAndCountAll({
            where,
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async planCreate(req, res) {
        const p = await models_1.PatrolPlan.create((0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: p.id }, '创建成功');
    },
    async planUpdate(req, res) {
        await models_1.PatrolPlan.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async planDelete(req, res) {
        await models_1.PatrolPlan.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async recordList(req, res) {
        const { pageNum, pageSize } = parsePage(req);
        const { count, rows } = await models_1.PatrolRecord.findAndCountAll({
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async recordById(req, res) {
        const r = await models_1.PatrolRecord.findByPk(req.params.id);
        (0, respond_1.sendSuccess)(res, req, r || null);
    },
    async recordCreate(req, res) {
        const patrolNo = `PT${Date.now()}${Math.floor(Math.random() * 100)}`;
        const r = await models_1.PatrolRecord.create({ ...(0, validator_1.sanitizeBody)(req.body), patrol_no: patrolNo });
        (0, respond_1.sendSuccess)(res, req, { id: r.id }, '创建成功');
    },
    async recordUpdate(req, res) {
        await models_1.PatrolRecord.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async recordDelete(req, res) {
        await models_1.PatrolRecord.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async hazardList(req, res) {
        const { pageNum, pageSize } = parsePage(req);
        const { status, level } = req.query;
        const where = {};
        if (status !== undefined)
            where.status = status;
        if (level)
            where.level = level;
        const { count, rows } = await models_1.Hazard.findAndCountAll({
            where,
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async hazardCreate(req, res) {
        const hazardNo = `HZ${Date.now()}${Math.floor(Math.random() * 100)}`;
        const h = await models_1.Hazard.create({ ...(0, validator_1.sanitizeBody)(req.body), hazard_no: hazardNo });
        (0, respond_1.sendSuccess)(res, req, { id: h.id }, '创建成功');
    },
    async hazardUpdate(req, res) {
        await models_1.Hazard.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async hazardDelete(req, res) {
        await models_1.Hazard.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async recordCheckIn(req, res) {
        const id = (0, validator_1.parseIdStrict)(req.params.id);
        const { result, abnormalDesc, photos, signature, checkItems } = req.body;
        const updateBody = {
            result: result ?? 1,
            patrol_date: new Date(),
        };
        if (abnormalDesc !== undefined)
            updateBody.abnormal_desc = abnormalDesc;
        if (photos !== undefined)
            updateBody.photos = Array.isArray(photos) ? JSON.stringify(photos) : photos;
        if (signature !== undefined)
            updateBody.signature = signature;
        if (checkItems !== undefined)
            updateBody.patrol_items = Array.isArray(checkItems) ? JSON.stringify(checkItems) : checkItems;
        await models_1.PatrolRecord.update(updateBody, { where: { id } });
        const record = await models_1.PatrolRecord.findByPk(id);
        if (result === 2 && record) {
            const hazardNo = `HZ${Date.now()}${Math.floor(Math.random() * 100)}`;
            await models_1.Hazard.create({
                hazard_no: hazardNo,
                unit_id: record.unit_id,
                unit_name: record.unit_name,
                hazard_type: 4,
                description: abnormalDesc || `巡检异常：${record.patrol_no}`,
                level: 1,
                status: 0,
            }).catch((err) => logger_1.default.warn(`[Patrol] 自动创建隐患失败: ${err.message}`));
        }
        (0, respond_1.sendSuccess)(res, req, null, '签到成功');
    },
    async hazardRectify(req, res) {
        const id = (0, validator_1.parseIdStrict)(req.params.id);
        const hazard = await models_1.Hazard.findByPk(id);
        await models_1.Hazard.update({ status: 2, rectification_date: new Date() }, { where: { id } });
        if (hazard && hazard.level >= 2) {
            const alarmNo = `ALM${Date.now()}${Math.floor(Math.random() * 100)}`;
            await models_1.Alarm.create({
                alarm_no: alarmNo,
                alarm_type: 3,
                alarm_level: hazard.level === 3 ? 3 : 2,
                unit_id: hazard.unit_id,
                unit_name: hazard.unit_name,
                alarm_desc: `隐患整改完成：${hazard.description}`,
                status: 2,
                handle_result: '隐患已整改',
            }).catch((err) => logger_1.default.warn(`[Patrol] 隐患整改联动告警失败: ${err.message}`));
        }
        (0, respond_1.sendSuccess)(res, req, null, '已整改');
    },
};
//# sourceMappingURL=patrol.controller.js.map