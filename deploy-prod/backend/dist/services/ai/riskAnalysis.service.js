"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAriskAnalysisService = void 0;
/**
 * ═══════════════════════════════════════════════════════════════════
 * AI风险分析服务
 * 火情真伪识别、等级判定、蔓延预测、最优策略推荐
 * ═══════════════════════════════════════════════════════════════════
 */
const models_1 = require("@/models");
const logger_1 = __importDefault(require("@/config/logger"));
class AIAriskAnalysisService {
    /**
     * 分析告警风险
     */
    static async analyzeAlarm(alarmId) {
        try {
            // 获取告警信息
            const alarm = await models_1.Alarm.findByPk(alarmId);
            if (!alarm) {
                throw new Error('告警不存在');
            }
            // 获取设备信息
            const device = await models_1.Device.findByPk(alarm.device_id);
            // 获取历史告警
            const history = await models_1.Alarm.findAll({
                where: { device_id: alarm.device_id },
                order: [['id', 'DESC']],
                limit: 10
            });
            // 1. 火情真伪识别
            const isReal = await this.detectRealAlarm(alarm, device, history);
            const confidence = isReal.confidence;
            // 2. 火情等级判定
            const fireLevel = await this.assessFireLevel(alarm, device, history);
            // 3. 火势蔓延预测
            const spreadPrediction = await this.predictSpread(alarm, device, history);
            // 4. 最优联动策略推荐
            const recommendedActions = await this.recommendActions(alarm, device, fireLevel);
            // 5. 生成决策结论
            const decision = this.generateDecision(isReal, fireLevel, recommendedActions);
            // 保存AI决策记录
            await models_1.AIDecision.create({
                decision_no: `AI_${alarmId}_${Date.now()}`,
                scene: `告警${alarm.alarm_no}`,
                input_data: JSON.stringify({ alarm, device, history }),
                analysis_result: JSON.stringify({ isReal, confidence, fireLevel }),
                suggestion: decision,
                confidence: confidence,
                status: 1
            });
            logger_1.default.info(`[AI] 风险分析完成: alarmId=${alarmId}, isReal=${isReal.isReal}, level=${fireLevel}`);
            return {
                isReal: isReal.isReal,
                confidence,
                fireLevel,
                spreadPrediction,
                recommendedActions,
                decision
            };
        }
        catch (err) {
            logger_1.default.error(`[AI] 风险分析失败: ${err.message}`);
            throw err;
        }
    }
    /**
     * 火情真伪识别
     */
    static async detectRealAlarm(alarm, device, history) {
        let score = 0; // 真火警得分
        let totalScore = 0;
        // 1. 历史误报率分析
        const recentFalseAlarms = history.filter((h) => h.status === 3 && h.alarm_type === 1).length;
        const falseAlarmRate = history.length > 0 ? recentFalseAlarms / history.length : 0;
        if (falseAlarmRate > 0.7) {
            score -= 30;
            logger_1.default.info(`[AI] 设备误报率过高: ${(falseAlarmRate * 100).toFixed(1)}%`);
        }
        totalScore += 30;
        // 2. 设备健康状态分析
        if (device.status === 4) {
            // 报废设备
            score -= 50;
            logger_1.default.warn('[AI] 设备已报废，误报可能性高');
        }
        else if (device.status === 2) {
            // 故障设备
            score -= 30;
            logger_1.default.warn('[AI] 设备故障，误报可能性较高');
        }
        totalScore += 50;
        // 3. 时间分布分析
        const alarmHour = new Date().getHours();
        if (alarmHour >= 2 && alarmHour <= 6) {
            // 凌晨时段，真火警可能性降低
            score -= 10;
            logger_1.default.info('[AI] 凌晨时段，误报可能性略高');
        }
        totalScore += 10;
        // 4. 短时间内多次告警
        const recentAlarms = history.filter((h) => {
            const diff = Date.now() - new Date(h.created_at).getTime();
            return diff < 300000; // 5分钟内
        }).length;
        if (recentAlarms > 3) {
            score -= 20;
            logger_1.default.warn(`[AI] 短时间内多次告警（${recentAlarms}次）`);
        }
        totalScore += 20;
        // 5. 多设备同时告警（真火警特征）
        if (recentAlarms >= 2) {
            score += 30;
            logger_1.default.info('[AI] 多设备同时告警，真火警可能性高');
        }
        totalScore += 30;
        // 6. 告警类型分析
        if (alarm.alarm_desc.includes('故障') || alarm.alarm_desc.includes('误报')) {
            score -= 40;
            logger_1.default.warn('[AI] 告警描述包含故障或误报');
        }
        totalScore += 40;
        // 计算置信度
        const confidence = Math.max(0.5, Math.min(0.95, (score + totalScore) / (totalScore * 2)));
        const isReal = score >= 0;
        const reason = isReal
            ? '基于历史数据、设备状态、多设备协同等分析，判断为真火警'
            : '基于历史误报率、设备状态、时间分布等分析，可能为误报';
        return { isReal, confidence, reason };
    }
    /**
     * 火情等级判定
     */
    static async assessFireLevel(alarm, device, history) {
        let level = 1; // 默认1级
        // 1. 告警数量
        const recentAlarms = history.filter((h) => {
            const diff = Date.now() - new Date(h.created_at).getTime();
            return diff < 600000; // 10分钟内
        }).length;
        if (recentAlarms >= 10)
            level = 5; // 特大
        else if (recentAlarms >= 5)
            level = 4; // 重大
        else if (recentAlarms >= 3)
            level = 3; // 较大
        else if (recentAlarms >= 2)
            level = 2; // 一般
        // 2. 设备类型权重
        if (alarm.alarm_desc.includes('烟感')) {
            level = Math.min(5, level + 1); // 烟感权重高
        }
        // 3. 告警级别
        if (alarm.alarm_level === 3) {
            level = Math.min(5, level + 1); // 紧急等级
        }
        logger_1.default.info(`[AI] 火情等级: ${level}级, 告警数: ${recentAlarms}`);
        return level;
    }
    /**
     * 火势蔓延预测
     */
    static async predictSpread(alarm, device, history) {
        const predictions = [];
        // 简化版蔓延预测（实际应结合GIS、风向、建筑结构）
        const baseTime = new Date();
        // 获取同楼层/同区域的设备
        const nearbyDevices = await models_1.Device.findAll({
            where: {
                unit_id: device.unit_id,
                floor: device.floor
            },
            limit: 20
        });
        for (let i = 1; i <= 4; i++) {
            const riskTime = new Date(baseTime.getTime() + i * 5 * 60000); // 每隔5分钟
            const riskLevel = Math.min(100, i * 25); // 风险逐步增加
            predictions.push({
                time: riskTime.toISOString(),
                riskLevel,
                affectedDevices: Math.floor(nearbyDevices.length * (i / 4)),
                description: `${i * 5}分钟后，火势可能蔓延至${Math.floor(nearbyDevices.length * (i / 4))}个设备`
            });
        }
        logger_1.default.info(`[AI] 蔓延预测: ${predictions.length}个时间点`);
        return predictions;
    }
    /**
     * 最优联动策略推荐
     */
    static async recommendActions(alarm, device, fireLevel) {
        const actions = [];
        // 基础动作（所有等级）
        actions.push('立即通知值班人员');
        actions.push('启动应急广播');
        actions.push('解锁门禁系统');
        // 根据等级推荐
        if (fireLevel >= 2) {
            actions.push('电梯自动归首');
        }
        if (fireLevel >= 3) {
            actions.push('启动排烟风机');
            actions.push('启动喷淋系统');
            actions.push('强切非消防电源');
        }
        if (fireLevel >= 4) {
            actions.push('联动周边单位');
            actions.push('通知消防部门');
        }
        if (fireLevel >= 5) {
            actions.push('启动所有消防设施');
            actions.push('疏散周边人员');
        }
        logger_1.default.info(`[AI] 推荐措施: ${actions.length}条`);
        return actions;
    }
    /**
     * 生成决策结论
     */
    static generateDecision(isReal, fireLevel, actions) {
        if (!isReal.isReal) {
            return `经AI分析，该告警可能为误报（置信度: ${isReal.confidence}）。建议：${isReal.reason}，通知值班人员核实。`;
        }
        return `确认真火警（置信度: ${isReal.confidence}），火情等级${fireLevel}级。建议立即采取以下措施：${actions.join('；')}。`;
    }
    /**
     * 批量分析告警
     */
    static async batchAnalyze(alarmIds) {
        const results = new Map();
        for (const alarmId of alarmIds) {
            try {
                const result = await this.analyzeAlarm(alarmId);
                results.set(alarmId, result);
            }
            catch (err) {
                logger_1.default.error(`[AI] 分析告警失败: ${alarmId}, ${err.message}`);
            }
        }
        return results;
    }
}
exports.AIAriskAnalysisService = AIAriskAnalysisService;
//# sourceMappingURL=riskAnalysis.service.js.map