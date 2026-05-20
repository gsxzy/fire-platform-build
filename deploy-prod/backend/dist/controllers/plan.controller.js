"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanController = void 0;
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
function parsePage(req) {
    const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
    return { pageNum, pageSize };
}
function mapPlanBody(body) {
    const m = {};
    if (body.name !== undefined)
        m.plan_name = body.name;
    if (body.type !== undefined)
        m.plan_type = body.type;
    if (body.level !== undefined)
        m.plan_level = body.level;
    if (body.version !== undefined)
        m.version_no = body.version;
    if (body.unitId !== undefined)
        m.unit_id = body.unitId;
    if (body.unitName !== undefined)
        m.unit_name = body.unitName;
    if (body.applicableScene !== undefined)
        m.applicable_scene = body.applicableScene;
    if (body.content !== undefined)
        m.content = body.content;
    if (body.fileUrl !== undefined)
        m.file_url = body.fileUrl;
    if (body.updateDate !== undefined)
        m.update_date = body.updateDate;
    if (body.status !== undefined)
        m.status = body.status;
    return { ...(0, validator_1.sanitizeBody)(body), ...m };
}
function mapDrillBody(body) {
    const m = {};
    if (body.name !== undefined)
        m.drill_name = body.name;
    if (body.planId !== undefined)
        m.plan_id = body.planId;
    if (body.unitId !== undefined)
        m.unit_id = body.unitId;
    if (body.unitName !== undefined)
        m.unit_name = body.unitName;
    if (body.date !== undefined)
        m.drill_date = body.date;
    if (body.location !== undefined)
        m.location = body.location;
    if (body.duration !== undefined)
        m.duration = body.duration;
    if (body.drillType !== undefined)
        m.drill_type = body.drillType;
    if (body.participants !== undefined)
        m.participants = body.participants;
    if (body.drillContent !== undefined)
        m.drill_content = body.drillContent;
    if (body.result !== undefined)
        m.result = body.result;
    if (body.photos !== undefined)
        m.photos = Array.isArray(body.photos) ? JSON.stringify(body.photos) : body.photos;
    if (body.videoUrl !== undefined)
        m.video_url = body.videoUrl;
    if (body.status !== undefined)
        m.status = body.status;
    return { ...(0, validator_1.sanitizeBody)(body), ...m };
}
exports.PlanController = {
    async planList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { count, rows } = await models_1.EmergencyPlan.findAndCountAll({
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async planCreate(req, res) {
        const p = await models_1.EmergencyPlan.create(mapPlanBody(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: p.id }, '创建成功');
    },
    async planUpdate(req, res) {
        await models_1.EmergencyPlan.update(mapPlanBody(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async planDelete(req, res) {
        await models_1.EmergencyPlan.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async drillList(req, res) {
        const { pageNum, pageSize } = parsePage(req);
        const { count, rows } = await models_1.EmergencyDrill.findAndCountAll({
            limit: pageSize,
            offset: (pageNum - 1) * pageSize,
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async drillCreate(req, res) {
        const drillNo = `DR${Date.now()}${Math.floor(Math.random() * 100)}`;
        const d = await models_1.EmergencyDrill.create({ ...mapDrillBody(req.body), drill_no: drillNo });
        (0, respond_1.sendSuccess)(res, req, { id: d.id }, '创建成功');
    },
    async drillUpdate(req, res) {
        await models_1.EmergencyDrill.update(mapDrillBody(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async drillDelete(req, res) {
        await models_1.EmergencyDrill.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async participantList(req, res) {
        const drillId = (0, validator_1.parseIdStrict)(req.params.id);
        const rows = await models_1.DrillParticipant.findAll({ where: { drill_id: drillId } });
        (0, respond_1.sendSuccess)(res, req, rows);
    },
    async participantCreate(req, res) {
        const drillId = (0, validator_1.parseIdStrict)(req.params.id);
        const { name, role } = req.body;
        const p = await models_1.DrillParticipant.create({ drill_id: drillId, name, role });
        (0, respond_1.sendSuccess)(res, req, { id: p.id }, '添加成功');
    },
    async participantDelete(req, res) {
        const drillId = (0, validator_1.parseIdStrict)(req.params.id);
        const participantId = (0, validator_1.parseIdStrict)(req.params.participantId);
        await models_1.DrillParticipant.destroy({ where: { id: participantId, drill_id: drillId } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
};
//# sourceMappingURL=plan.controller.js.map