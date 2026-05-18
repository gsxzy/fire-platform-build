"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIDecisionController = void 0;
const respond_1 = require("@/utils/respond");
const ai_service_1 = require("@/services/ai.service");
exports.AIDecisionController = {
    async riskAnalysis(req, res) {
        const { scene, inputData } = req.body;
        const result = await ai_service_1.AIService.riskAnalysis(scene, inputData);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async filterFalseAlarm(req, res) {
        const { alarmId } = req.params;
        const result = await ai_service_1.AIService.filterFalseAlarms(+alarmId);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async situationAssessment(req, res) {
        const result = await ai_service_1.AIService.situationAssessment();
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async generateSmartAlert(req, res) {
        const { deviceId } = req.body;
        const result = await ai_service_1.AIService.generateSmartAlert(+deviceId);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async trendAnalysis(req, res) {
        const days = parseInt(req.query.days) || 7;
        const result = await ai_service_1.AIService.getTrend(days);
        (0, respond_1.sendSuccess)(res, req, result);
    },
};
//# sourceMappingURL=aiDecision.controller.js.map