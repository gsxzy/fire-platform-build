"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingController = void 0;
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
exports.TrainingController = {
    async courseList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { count, rows } = await models_1.TrainingCourse.findAndCountAll({
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
        });
        (0, respond_1.sendPage)(res, req, rows, count, +pageNum, +pageSize);
    },
    async courseCreate(req, res) {
        const c = await models_1.TrainingCourse.create((0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: c.id }, '创建成功');
    },
    async courseUpdate(req, res) {
        await models_1.TrainingCourse.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async courseDelete(req, res) {
        await models_1.TrainingCourse.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async examList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { count, rows } = await models_1.TrainingExam.findAndCountAll({
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
        });
        (0, respond_1.sendPage)(res, req, rows, count, +pageNum, +pageSize);
    },
    async examCreate(req, res) {
        const e = await models_1.TrainingExam.create((0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: e.id }, '创建成功');
    },
};
//# sourceMappingURL=training.controller.js.map