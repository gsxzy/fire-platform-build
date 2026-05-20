"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
const ruleEngine_provider_1 = require("./ai/ruleEngine.provider");
const alarm_service_1 = require("./alarm.service");
const cache_1 = require("@/utils/cache");
/** 当前 AI Provider；默认规则引擎，未来可注入真实模型 */
const aiProvider = new ruleEngine_provider_1.RuleEngineProvider();
class AIService {
    // ── AI 风险研判（通过 Provider，规则作 fallback）──
    static async riskAnalysis(scene, inputData) {
        const decisionNo = `AI${Date.now()}${Math.floor(Math.random() * 100)}`;
        const result = await aiProvider.analyzeRisk({ scene, inputData });
        const decision = await models_1.AIDecision.create({
            decision_no: decisionNo, scene,
            input_data: JSON.stringify(inputData),
            analysis_result: JSON.stringify(result.analysis),
            suggestion: result.suggestion,
            confidence: result.confidence,
            status: 1,
        });
        return {
            id: decision.id,
            decisionNo,
            riskLevel: result.riskLevel,
            suggestion: result.suggestion,
            confidence: result.confidence,
            analysis: result.analysis,
        };
    }
    // 误报过滤
    static async filterFalseAlarms(alarmId) {
        const alarm = await models_1.Alarm.findByPk(alarmId);
        if (!alarm)
            return { isFalseAlarm: false, confidence: 0 };
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
    // 态势研判（通过 Provider）
    static async situationAssessment() {
        return aiProvider.assessSituation();
    }
    static async getTrend(days = 7) {
        return alarm_service_1.AlarmService.getTrend(days);
    }
    /* ── AI 决策概览（供 AIDecisionPage 雷达图 + 决策卡片 + 统计）── */
    static async overview() {
        return (0, cache_1.withCache)(cache_1.CacheTags.DASHBOARD, 'ai:overview', async () => {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            // 1) 雷达图数据：按单位聚合 5 维安全指标
            const units = await models_1.Unit.findAll({
                where: { status: 1 },
                attributes: ['id', 'unit_name'],
                limit: 6,
                raw: true,
            });
            const unitIds = units.map((u) => u.id);
            const [alarms7d, devicesOnline] = await Promise.all([
                models_1.Alarm.findAll({
                    where: { unit_id: { [sequelize_1.Op.in]: unitIds }, created_at: { [sequelize_1.Op.gte]: new Date(Date.now() - 7 * 86400000) } },
                    attributes: ['unit_id', 'alarm_type', [sequelize_1.Sequelize.fn('COUNT', '*'), 'cnt']],
                    group: ['unit_id', 'alarm_type'],
                    raw: true,
                }),
                models_1.Device.findAll({
                    where: { unit_id: { [sequelize_1.Op.in]: unitIds } },
                    attributes: ['unit_id', 'status', [sequelize_1.Sequelize.fn('COUNT', '*'), 'cnt']],
                    group: ['unit_id', 'status'],
                    raw: true,
                }),
            ]);
            const alarmMap = new Map();
            for (const a of alarms7d) {
                const key = String(a.unit_id);
                const cur = alarmMap.get(key) || { fire: 0, fault: 0 };
                if (a.alarm_type === 1)
                    cur.fire += parseInt(a.cnt, 10);
                if (a.alarm_type === 2)
                    cur.fault += parseInt(a.cnt, 10);
                alarmMap.set(key, cur);
            }
            const deviceMap = new Map();
            for (const d of devicesOnline) {
                const key = String(d.unit_id);
                const cur = deviceMap.get(key) || { total: 0, online: 0 };
                cur.total += parseInt(d.cnt, 10);
                if (d.status == 1)
                    cur.online += parseInt(d.cnt, 10);
                deviceMap.set(key, cur);
            }
            const radarData = units.map((u) => {
                const am = alarmMap.get(String(u.id)) || { fire: 0, fault: 0 };
                const dm = deviceMap.get(String(u.id)) || { total: 1, online: 0 };
                const onlineRate = dm.total ? Math.round((dm.online / dm.total) * 100) : 0;
                const fireScore = Math.max(0, 100 - am.fire * 10);
                const faultScore = Math.max(0, 100 - am.fault * 5);
                const patrolScore = 85 + Math.floor(Math.random() * 15); // 占位：接入真实巡检统计后替换
                const maintScore = 80 + Math.floor(Math.random() * 20); // 占位：接入真实维保统计后替换
                return {
                    subject: u.unit_name || '未知单位',
                    A: Math.round((fireScore + faultScore + onlineRate + patrolScore + maintScore) / 5),
                    B: Math.round(Math.max(60, ((fireScore + faultScore + onlineRate + patrolScore + maintScore) / 5) - 10)),
                };
            });
            // 2) 最新决策卡片（取最近 8 条）
            const { rows: decisionRows } = await models_1.AIDecision.findAndCountAll({
                limit: 8,
                order: [['created_at', 'DESC']],
                raw: true,
            });
            const statusMap = { 0: 'pending', 1: 'active', 2: 'handled' };
            const decisions = decisionRows.map((d) => {
                let type = 'analysis';
                const scene = (d.scene || '').toLowerCase();
                if (scene.includes('火'))
                    type = 'fire';
                else if (scene.includes('故障'))
                    type = 'fault';
                else if (scene.includes('预警'))
                    type = 'warning';
                const analysis = d.analysis_result ? JSON.parse(d.analysis_result) : {};
                return {
                    id: d.id,
                    title: d.suggestion ? (d.suggestion.length > 30 ? d.suggestion.slice(0, 30) + '…' : d.suggestion) : 'AI分析建议',
                    type,
                    status: statusMap[d.status] || 'pending',
                    confidence: Math.round(parseFloat(d.confidence || 0)),
                    time: d.created_at ? new Date(d.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '',
                    content: d.suggestion || '暂无详细建议',
                    scene: d.scene,
                    analysis,
                };
            });
            // 3) 顶部统计
            const [todayDecisionCount, activeCount, handledCount, avgConfidence, todayAlarmCount] = await Promise.all([
                models_1.AIDecision.count({ where: { created_at: { [sequelize_1.Op.gte]: todayStart } } }),
                models_1.AIDecision.count({ where: { status: 1 } }),
                models_1.AIDecision.count({ where: { status: 2 } }),
                models_1.AIDecision.findOne({
                    where: { created_at: { [sequelize_1.Op.gte]: new Date(Date.now() - 7 * 86400000) } },
                    attributes: [[sequelize_1.Sequelize.fn('AVG', sequelize_1.Sequelize.col('confidence')), 'avg']],
                    raw: true,
                }),
                models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: todayStart } } }),
            ]);
            const avgConf = avgConfidence?.avg ? Math.round(parseFloat(avgConfidence.avg)) : 85;
            const stats = {
                todayDecision: todayDecisionCount,
                active: activeCount,
                handled: handledCount,
                avgConfidence: avgConf,
                responseTime: todayAlarmCount > 0 ? '< 3s' : '--',
            };
            return { radarData, decisions, stats };
        }, { ttl: 60 });
    }
    /* ── 执行 AI 决策建议（回写到工单/告警处置）── */
    static async executeDecision(decisionId, operatorId, operatorName) {
        const decision = await models_1.AIDecision.findByPk(decisionId);
        if (!decision)
            throw new Error('决策记录不存在');
        const scene = (decision.scene || '').toLowerCase();
        const suggestion = decision.suggestion || '';
        // 根据场景类型创建对应下游工单
        let workOrderType = 'inspection';
        if (scene.includes('维保') || scene.includes('检修'))
            workOrderType = 'maintenance';
        else if (scene.includes('更换') || scene.includes('维修'))
            workOrderType = 'repair';
        const woNo = `WO${Date.now()}${Math.floor(Math.random() * 100)}`;
        const orderTypeMap = {
            inspection: 1, repair: 2, maintenance: 3, replacement: 4,
        };
        const workOrder = await models_1.MaintenanceWorkOrder.create({
            order_no: woNo,
            order_type: orderTypeMap[workOrderType] || 2,
            fault_desc: suggestion,
            status: 0,
            priority: decision.confidence > 90 ? 3 : 2,
        });
        await models_1.AIDecision.update({ status: 1 }, { where: { id: decisionId } });
        return {
            executed: true,
            workOrderId: workOrder.id,
            workOrderNo: woNo,
            message: '已生成执行工单',
        };
    }
    /* ── AI 决策记录分页 ── */
    static async decisionList(req) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { count, rows } = await models_1.AIDecision.findAndCountAll({
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
            order: [['created_at', 'DESC']],
        });
        return { rows, count, pageNum: +pageNum, pageSize: +pageSize };
    }
    static async decisionCreate(body) {
        const decisionNo = `AI${Date.now()}${Math.floor(Math.random() * 100)}`;
        const d = await models_1.AIDecision.create({ ...body, decision_no: decisionNo });
        return { id: d.id, decisionNo };
    }
    /* ── 智能预警 ── */
    static async alertList(req) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { status } = req.query;
        const where = {};
        if (status !== undefined)
            where.status = status;
        const { count, rows } = await models_1.SmartAlert.findAndCountAll({
            where,
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
            order: [['created_at', 'DESC']],
        });
        return { rows, count, pageNum: +pageNum, pageSize: +pageSize };
    }
    static async alertConfirm(id) {
        await models_1.SmartAlert.update({ status: 1 }, { where: { id } });
        return { confirmed: true };
    }
    static async alertHandle(id) {
        await models_1.SmartAlert.update({ status: 2 }, { where: { id } });
        return { handled: true };
    }
}
exports.AIService = AIService;
//# sourceMappingURL=ai.service.js.map