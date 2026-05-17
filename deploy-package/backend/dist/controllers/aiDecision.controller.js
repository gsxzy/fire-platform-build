"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIDecisionController = void 0;
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const ai_service_1 = require("@/services/ai.service");
exports.AIDecisionController = {
    // AI风险研判
    async riskAnalysis(req, res) {
        try {
            const { scene, inputData } = req.body;
            const result = await ai_service_1.AIService.riskAnalysis(scene, inputData);
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[AIDecision] riskAnalysis 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 误报过滤
    async filterFalseAlarm(req, res) {
        try {
            const { alarmId } = req.params;
            const result = await ai_service_1.AIService.filterFalseAlarms(+alarmId);
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[AIDecision] filterFalseAlarm 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 态势研判
    async situationAssessment(req, res) {
        try {
            const result = await ai_service_1.AIService.situationAssessment();
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[AIDecision] situationAssessment 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 生成智能预警
    async generateSmartAlert(req, res) {
        try {
            const { deviceId } = req.body;
            const result = await ai_service_1.AIService.generateSmartAlert(+deviceId);
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[AIDecision] generateSmartAlert 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 趋势分析
    async trendAnalysis(req, res) {
        try {
            const days = parseInt(req.query.days) || 7;
            const result = await ai_service_1.AIService.getTrend(days);
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[AIDecision] trendAnalysis 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=aiDecision.controller.js.map