"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AILearningController = void 0;
const respond_1 = require("@/utils/respond");
const aiLearning_service_1 = require("@/services/aiLearning.service");
const validator_1 = require("@/utils/validator");
exports.AILearningController = {
    async record(req, res) {
        const { deviceId, deviceName, issueType, symptoms, rootCause, solution, status, sourceIp, resolvedBy } = req.body;
        const record = await aiLearning_service_1.AILearningService.recordIssue({
            deviceId,
            deviceName,
            issueType,
            symptoms,
            rootCause,
            solution,
            status,
            sourceIp,
            resolvedBy,
        });
        (0, respond_1.sendSuccess)(res, req, record, '故障记录已保存');
    },
    async diagnose(req, res) {
        const { deviceId, symptoms } = req.query;
        const result = await aiLearning_service_1.AILearningService.diagnose(String(deviceId || ''), symptoms ? String(symptoms) : undefined);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async statsByType(req, res) {
        const limit = parseInt(req.query.limit) || 10;
        const data = await aiLearning_service_1.AILearningService.statsByType(limit);
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async statsByDevice(req, res) {
        const limit = parseInt(req.query.limit) || 10;
        const data = await aiLearning_service_1.AILearningService.statsByDevice(limit);
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async update(req, res) {
        const id = parseInt(req.params.id);
        const record = await aiLearning_service_1.AILearningService.updateIssue(id, req.body);
        if (!record) {
            (0, respond_1.sendSuccess)(res, req, null, '记录不存在');
            return;
        }
        (0, respond_1.sendSuccess)(res, req, record, '更新成功');
    },
    async list(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { deviceId, issueType } = req.query;
        const where = {};
        if (deviceId)
            where.device_id = deviceId;
        if (issueType)
            where.issue_type = issueType;
        const { IssueHistory } = await Promise.resolve().then(() => __importStar(require('@/models')));
        const { count, rows } = await IssueHistory.findAndCountAll({
            where,
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, +pageNum, +pageSize);
    },
};
//# sourceMappingURL=aiLearning.controller.js.map