"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AILearningService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
const logger_1 = __importDefault(require("@/config/logger"));
const cache_1 = require("@/utils/cache");
class AILearningService {
    /**
     * 记录一次故障事件（自动累加次数）
     */
    static async recordIssue(data) {
        // 查找同一设备同一类型的最近记录
        const existing = await models_1.IssueHistory.findOne({
            where: {
                device_id: data.deviceId,
                issue_type: data.issueType,
            },
            order: [['created_at', 'DESC']],
        });
        if (existing) {
            // 如果 24 小时内有相同记录，则更新次数而不是新建
            const lastTime = new Date(existing.created_at).getTime();
            const now = Date.now();
            const hoursDiff = (now - lastTime) / (1000 * 60 * 60);
            if (hoursDiff < 24) {
                existing.occurrence_count = (existing.occurrence_count || 1) + 1;
                existing.symptoms = data.symptoms || existing.symptoms;
                existing.root_cause = data.rootCause || existing.root_cause;
                existing.solution = data.solution || existing.solution;
                existing.status = data.status ?? existing.status;
                existing.source_ip = data.sourceIp || existing.source_ip;
                await existing.save();
                logger_1.default.info(`[AILearning] 故障累计+1: ${data.deviceId}/${data.issueType}, count=${existing.occurrence_count}`);
                return existing;
            }
        }
        const record = await models_1.IssueHistory.create({
            device_id: data.deviceId,
            device_name: data.deviceName || data.deviceId,
            issue_type: data.issueType,
            symptoms: data.symptoms || '',
            root_cause: data.rootCause || '',
            solution: data.solution || '',
            status: data.status ?? 0,
            occurrence_count: 1,
            source_ip: data.sourceIp || '',
            resolved_by: data.resolvedBy || '',
        });
        logger_1.default.info(`[AILearning] 新故障记录: ${data.deviceId}/${data.issueType}`);
        return record;
    }
    /**
     * 智能诊断：查询某设备的历史故障并生成建议
     */
    static async diagnose(deviceId, symptoms) {
        const where = {};
        if (deviceId && deviceId !== '*') {
            where.device_id = deviceId;
        }
        const rows = await models_1.IssueHistory.findAll({
            where,
            order: [['created_at', 'DESC']],
            limit: 10,
        });
        const totalOccurrences = rows.reduce((sum, r) => sum + (r.occurrence_count || 1), 0);
        const similarIssues = rows.map(r => ({
            id: r.id,
            issueType: r.issue_type,
            symptoms: r.symptoms,
            rootCause: r.root_cause,
            solution: r.solution,
            occurrenceCount: r.occurrence_count,
            lastOccurrence: r.updated_at || r.created_at,
            status: r.status,
        }));
        // 生成建议
        let suggestion = '';
        if (similarIssues.length === 0) {
            suggestion = `设备 ${deviceId} 暂无历史故障记录。建议检查设备电源、网络连接和配置。`;
        }
        else {
            const topIssue = similarIssues[0];
            const typeCount = similarIssues.filter(i => i.issueType === topIssue.issueType).length;
            suggestion = `设备 ${deviceId} 累计发生故障 ${totalOccurrences} 次。`;
            if (topIssue.occurrenceCount >= 3) {
                suggestion += `其中「${this.translateIssueType(topIssue.issueType)}」最为频繁（${topIssue.occurrenceCount} 次）。`;
            }
            if (topIssue.solution) {
                suggestion += `\n\n📌 上次有效修复方案：\n${topIssue.solution}`;
            }
            if (topIssue.rootCause) {
                suggestion += `\n\n🔍 根因分析：\n${topIssue.rootCause}`;
            }
            if (typeCount >= 3) {
                suggestion += `\n\n⚠️ 该问题已重复出现 ${typeCount} 次，建议彻底排查根本原因，考虑更换设备或调整网络架构。`;
            }
        }
        return {
            deviceId,
            totalOccurrences,
            similarIssues,
            suggestion,
        };
    }
    /**
     * 按故障类型统计 TOP N
     */
    static async statsByType(limit = 10) {
        return (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, `aiLearning:type:${limit}`, async () => {
            const rows = await models_1.IssueHistory.findAll({
                attributes: [
                    'issue_type',
                    [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('occurrence_count')), 'total_count'],
                    [sequelize_1.Sequelize.fn('COUNT', sequelize_1.Sequelize.col('id')), 'record_count'],
                ],
                group: ['issue_type'],
                order: [[sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('occurrence_count')), 'DESC']],
                limit,
                raw: true,
            });
            return rows.map((r) => ({
                issueType: r.issue_type,
                totalCount: Number(r.total_count),
                recordCount: Number(r.record_count),
                label: this.translateIssueType(r.issue_type),
            }));
        }, { ttl: 120 });
    }
    /**
     * 按设备统计 TOP N
     */
    static async statsByDevice(limit = 10) {
        return (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, `aiLearning:device:${limit}`, async () => {
            const rows = await models_1.IssueHistory.findAll({
                attributes: [
                    'device_id',
                    'device_name',
                    [sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('occurrence_count')), 'total_count'],
                ],
                group: ['device_id', 'device_name'],
                order: [[sequelize_1.Sequelize.fn('SUM', sequelize_1.Sequelize.col('occurrence_count')), 'DESC']],
                limit,
                raw: true,
            });
            return rows.map((r) => ({
                deviceId: r.device_id,
                deviceName: r.device_name,
                totalCount: Number(r.total_count),
            }));
        }, { ttl: 120 });
    }
    /**
     * 更新故障状态或解决方案
     */
    static async updateIssue(id, data) {
        const record = await models_1.IssueHistory.findByPk(id);
        if (!record)
            return null;
        if (data.deviceName !== undefined)
            record.device_name = data.deviceName;
        if (data.symptoms !== undefined)
            record.symptoms = data.symptoms;
        if (data.rootCause !== undefined)
            record.root_cause = data.rootCause;
        if (data.solution !== undefined)
            record.solution = data.solution;
        if (data.status !== undefined)
            record.status = data.status;
        if (data.resolvedBy !== undefined)
            record.resolved_by = data.resolvedBy;
        if (data.sourceIp !== undefined)
            record.source_ip = data.sourceIp;
        await record.save();
        return record;
    }
    /**
     * 故障类型中文映射
     */
    static translateIssueType(type) {
        const map = {
            camera_offline: '摄像头离线',
            camera_register_fail: '摄像头注册失败',
            sip_ban: 'SIP被封禁',
            device_fault: '设备故障',
            network_error: '网络异常',
            timeout: '连接超时',
            heartbeat_lost: '心跳丢失',
            unknown: '未知故障',
        };
        return map[type] || type;
    }
}
exports.AILearningService = AILearningService;
//# sourceMappingURL=aiLearning.service.js.map