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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AILearningController = void 0;
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const aiLearning_service_1 = require("@/services/aiLearning.service");
const validator_1 = require("@/utils/validator");
exports.AILearningController = {
    /**
     * 记录故障事件
     */
    async record(req, res) {
        try {
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
            return res.json((0, response_1.success)(record, '故障记录已保存'));
        }
        catch (err) {
            logger_1.default.error(`[AILearning] record 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /**
     * 智能诊断查询
     */
    async diagnose(req, res) {
        try {
            const { deviceId, symptoms } = req.query;
            const result = await aiLearning_service_1.AILearningService.diagnose(String(deviceId || ''), symptoms ? String(symptoms) : undefined);
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[AILearning] diagnose 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /**
     * 故障统计（按类型）
     */
    async statsByType(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const data = await aiLearning_service_1.AILearningService.statsByType(limit);
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[AILearning] statsByType 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /**
     * 故障统计（按设备）
     */
    async statsByDevice(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const data = await aiLearning_service_1.AILearningService.statsByDevice(limit);
            return res.json((0, response_1.success)(data));
        }
        catch (err) {
            logger_1.default.error(`[AILearning] statsByDevice 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /**
     * 更新故障记录
     */
    async update(req, res) {
        try {
            const id = parseInt(req.params.id);
            const record = await aiLearning_service_1.AILearningService.updateIssue(id, req.body);
            if (!record)
                return res.json((0, response_1.success)(null, '记录不存在'));
            return res.json((0, response_1.success)(record, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[AILearning] update 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /**
     * 故障记录列表
     */
    async list(req, res) {
        try {
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
            return res.json((0, response_1.page)(rows, count, +pageNum, +pageSize));
        }
        catch (err) {
            logger_1.default.error(`[AILearning] list 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=aiLearning.controller.js.map