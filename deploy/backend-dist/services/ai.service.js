"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
class AIService {
    // AI风险研判
    static async riskAnalysis(scene, inputData) {
        const decisionNo = `AI${Date.now()}${Math.floor(Math.random() * 100)}`;
        // 模拟AI分析逻辑（实际项目接入AI模型API）
        const recentAlarms = await models_1.Alarm.findAll({
            where: { created_at: { [sequelize_1.Op.gte]: new Date(Date.now() - 7 * 86400000) } },
            order: [['created_at', 'DESC']], limit: 50, raw: true,
        });
        const deviceStatus = await models_1.Device.findAll({
            attributes: ['status', [sequelize_1.Sequelize.fn('COUNT', '*'), 'count']],
            group: ['status'], raw: true,
        });
        // AI分析结果
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
        const decision = await models_1.AIDecision.create({
            decision_no: decisionNo, scene,
            input_data: JSON.stringify(inputData),
            analysis_result: JSON.stringify({ alarmFreq, faultCount, fireCount, deviceStatus, riskLevel }),
            suggestion, confidence,
        });
        return { id: decision.id, decisionNo, riskLevel, suggestion, confidence, analysis: { alarmFreq, faultCount, fireCount } };
    }
    // 误报过滤
    static async filterFalseAlarms(alarmId) {
        const alarm = await models_1.Alarm.findByPk(alarmId);
        if (!alarm)
            return { isFalseAlarm: false, confidence: 0 };
        // 简单规则：短时间内同一设备重复告警可能是误报
        const recent = await models_1.Alarm.count({
            where: {
                device_id: alarm.device_id, alarm_type: alarm.alarm_type,
                created_at: { [sequelize_1.Op.gte]: new Date(Date.now() - 3600000) },
                status: 3,
            },
        });
        const isFalseAlarm = recent >= 3;
        return {
            isFalseAlarm,
            confidence: isFalseAlarm ? 75 + Math.min(recent * 5, 20) : 100 - recent * 10,
            reason: isFalseAlarm ? `该设备近1小时内有${recent}次误报记录` : '无历史误报记录',
        };
    }
    // 智能预警生成
    static async generateSmartAlert(deviceId) {
        const device = await models_1.Device.findByPk(deviceId);
        if (!device || device.status !== 1)
            return null;
        const alertNo = `SW${Date.now()}${Math.floor(Math.random() * 100)}`;
        const alerts = [];
        // 设备老化预警（安装超过2年）
        if (device.install_date) {
            const installDays = (Date.now() - new Date(device.install_date).getTime()) / 86400000;
            if (installDays > 730) {
                alerts.push({
                    alert_no: alertNo, alert_type: 2, device_id: deviceId,
                    device_name: device.device_name,
                    alert_desc: `设备已运行${Math.floor(installDays)}天，建议进行预防性维护`,
                    predict_time: new Date(Date.now() + 30 * 86400000),
                    confidence: Math.min(60 + installDays / 365 * 10, 95),
                });
            }
        }
        // 离线频率预警
        const offlineCount = await models_1.Alarm.count({
            where: { device_id: deviceId, alarm_type: 2, created_at: { [sequelize_1.Op.gte]: new Date(Date.now() - 30 * 86400000) } },
        });
        if (offlineCount >= 3) {
            alerts.push({
                alert_no: `${alertNo}_OFF`, alert_type: 1, device_id: deviceId,
                device_name: device.device_name,
                alert_desc: `近30天内离线${offlineCount}次，设备稳定性下降`,
                predict_time: new Date(Date.now() + 7 * 86400000),
                confidence: 70 + offlineCount * 5,
            });
        }
        if (alerts.length > 0) {
            await models_1.SmartAlert.bulkCreate(alerts);
        }
        return alerts;
    }
    // 态势研判
    static async situationAssessment() {
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
        const totalDevice = deviceStats.reduce((s, d) => s + parseInt(d.count), 0);
        const onlineDevice = deviceStats.find((d) => d.status == 1);
        const onlineRate = totalDevice ? (parseInt(onlineDevice?.count || 0) / totalDevice * 100) : 0;
        const todayAlarm = alarmStats.reduce((s, a) => s + parseInt(a.count), 0);
        let situation = 'normal';
        if (onlineRate < 80)
            situation = 'warning';
        if (todayAlarm > 20)
            situation = 'danger';
        return { situation, onlineRate: onlineRate.toFixed(1), todayAlarm, deviceStats, alarmStats };
    }
    static async getTrend(days = 7) {
        return alarm_service_1.AlarmService.getTrend(days);
    }
}
exports.AIService = AIService;
const alarm_service_1 = require("./alarm.service");
//# sourceMappingURL=ai.service.js.map