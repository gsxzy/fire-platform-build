"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleEngineProvider = void 0;
/**
 * 规则引擎 AI Provider — 基于业务规则的 fallback 实现
 * 注释写明：待接入真实 AI 模型时替换为 ModelProvider
 */
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
class RuleEngineProvider {
    name = 'RuleEngine';
    async isAvailable() {
        return true; // 规则引擎永远在线
    }
    async analyzeRisk(input) {
        const recentAlarms = await models_1.Alarm.findAll({
            where: { created_at: { [sequelize_1.Op.gte]: new Date(Date.now() - 7 * 86400000) } },
            order: [['created_at', 'DESC']], limit: 50, raw: true,
        });
        const alarmFreq = recentAlarms.length;
        const faultCount = recentAlarms.filter((a) => a.alarm_type === 2).length;
        const fireCount = recentAlarms.filter((a) => a.alarm_type === 1).length;
        let riskLevel = 'low';
        let suggestion = '当前安全态势正常，继续保持常规巡检。';
        let confidence = 85;
        if (fireCount > 5) {
            riskLevel = 'high';
            suggestion = '火警频次异常偏高，建议立即排查高频告警点位，加强现场巡查。';
            confidence = 92;
        }
        else if (faultCount > 10) {
            riskLevel = 'medium';
            suggestion = '设备故障率偏高，建议安排维保人员近期进行集中检修。';
            confidence = 88;
        }
        else if (alarmFreq > 20) {
            riskLevel = 'medium';
            suggestion = '告警总量偏高，建议核查是否存在误报或阈值设置不当。';
            confidence = 80;
        }
        return { riskLevel, suggestion, confidence, analysis: { alarmFreq, faultCount, fireCount } };
    }
    async assessSituation() {
        const [alarmStats, deviceStats] = await Promise.all([
            models_1.Alarm.findAll({
                attributes: ['alarm_type', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                where: { created_at: { [sequelize_1.Op.gte]: new Date(Date.now() - 24 * 3600000) } },
                group: ['alarm_type'], raw: true,
            }),
            models_1.Device.findAll({
                attributes: ['status', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
                group: ['status'], raw: true,
            }),
        ]);
        const totalDevice = deviceStats.reduce((s, d) => s + parseInt(d.count, 10), 0);
        const onlineDevice = deviceStats.find((d) => d.status == 1);
        const onlineRate = totalDevice ? (parseInt(onlineDevice?.count || 0, 10) / totalDevice * 100) : 0;
        const todayAlarm = alarmStats.reduce((s, a) => s + parseInt(a.count, 10), 0);
        let situation = 'normal';
        if (onlineRate < 80)
            situation = 'warning';
        if (todayAlarm > 20)
            situation = 'danger';
        return { situation, onlineRate: onlineRate.toFixed(1), todayAlarm };
    }
}
exports.RuleEngineProvider = RuleEngineProvider;
//# sourceMappingURL=ruleEngine.provider.js.map