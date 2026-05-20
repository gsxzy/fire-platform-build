"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const respond_1 = require("@/utils/respond");
const ai_service_1 = require("@/services/ai.service");
exports.AIController = {
    async overview(req, res) {
        const data = await ai_service_1.AIService.overview();
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async executeDecision(req, res) {
        const { id } = req.params;
        const { user } = req;
        try {
            const result = await ai_service_1.AIService.executeDecision(+id, user?.id, user?.real_name || user?.username);
            (0, respond_1.sendSuccess)(res, req, result, '决策建议已执行');
        }
        catch (e) {
            (0, respond_1.sendFail)(res, req, e.message || '执行失败', 400);
        }
    },
    async decisionList(req, res) {
        const { rows, count, pageNum, pageSize } = await ai_service_1.AIService.decisionList(req);
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async decisionCreate(req, res) {
        const result = await ai_service_1.AIService.decisionCreate(req.body);
        (0, respond_1.sendSuccess)(res, req, { id: result.id }, '分析完成');
    },
    async alertList(req, res) {
        const { rows, count, pageNum, pageSize } = await ai_service_1.AIService.alertList(req);
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async alertConfirm(req, res) {
        await ai_service_1.AIService.alertConfirm(req.params.id);
        (0, respond_1.sendSuccess)(res, req, null, '已确认');
    },
    async alertHandle(req, res) {
        await ai_service_1.AIService.alertHandle(req.params.id);
        (0, respond_1.sendSuccess)(res, req, null, '已处理');
    },
};
//# sourceMappingURL=ai.controller.js.map