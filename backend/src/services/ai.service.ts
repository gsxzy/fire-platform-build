import { Op, Sequelize } from 'sequelize';
import { AIDecision, SmartAlert, Alarm, Device, Unit, MaintenanceWorkOrder } from '@/models';
import { sanitizePagination } from '@/utils/validator';
import type { Request } from 'express';
import { RuleEngineProvider } from './ai/ruleEngine.provider';
import type { AIProvider } from './ai/aiProvider.interface';
import { AlarmService } from './alarm.service';

/** 当前 AI Provider；默认规则引擎，未来可注入真实模型 */
const aiProvider: AIProvider = new RuleEngineProvider();

export class AIService {
  // ── AI 风险研判（通过 Provider，规则作 fallback）──
  static async riskAnalysis(scene: string, inputData: any) {
    const decisionNo = `AI${Date.now()}${Math.floor(Math.random() * 100)}`;

    const result = await aiProvider.analyzeRisk({ scene, inputData });

    const decision = await AIDecision.create({
      decision_no: decisionNo, scene,
      input_data: JSON.stringify(inputData),
      analysis_result: JSON.stringify(result.analysis),
      suggestion: result.suggestion,
      confidence: result.confidence,
      status: 1,
    } as any);

    return {
      id: (decision as any).id,
      decisionNo,
      riskLevel: result.riskLevel,
      suggestion: result.suggestion,
      confidence: result.confidence,
      analysis: result.analysis,
    };
  }

  // 误报过滤
  static async filterFalseAlarms(alarmId: number) {
    const alarm = await Alarm.findByPk(alarmId) as any;
    if (!alarm) return { isFalseAlarm: false, confidence: 0 };

    const recent = await Alarm.count({
      where: {
        device_id: alarm.device_id, alarm_type: alarm.alarm_type,
        created_at: { [Op.gte]: new Date(Date.now() - 3600000) },
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
  static async generateSmartAlert(deviceId: number) {
    const device = await Device.findByPk(deviceId) as any;
    if (!device || device.status !== 1) return null;

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

    const offlineCount = await Alarm.count({
      where: { device_id: deviceId, alarm_type: 2, created_at: { [Op.gte]: new Date(Date.now() - 30 * 86400000) } },
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
      await SmartAlert.bulkCreate(alerts as any);
    }
    return alerts;
  }

  // 态势研判（通过 Provider）
  static async situationAssessment() {
    return aiProvider.assessSituation();
  }

  static async getTrend(days: number = 7) {
    return AlarmService.getTrend(days);
  }

  /* ── AI 决策概览（供 AIDecisionPage 雷达图 + 决策卡片 + 统计）── */
  static async overview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1) 雷达图数据：按单位聚合 5 维安全指标
    const units = await Unit.findAll({
      where: { status: 1 },
      attributes: ['id', 'unit_name'],
      limit: 6,
      raw: true,
    }) as any[];

    const unitIds = units.map((u) => u.id);

    const [alarms7d, devicesOnline] = await Promise.all([
      Alarm.findAll({
        where: { unit_id: { [Op.in]: unitIds }, created_at: { [Op.gte]: new Date(Date.now() - 7 * 86400000) } },
        attributes: ['unit_id', 'alarm_type', [Sequelize.fn('COUNT', '*'), 'cnt']],
        group: ['unit_id', 'alarm_type'],
        raw: true,
      }) as Promise<any[]>,
      Device.findAll({
        where: { unit_id: { [Op.in]: unitIds } },
        attributes: ['unit_id', 'status', [Sequelize.fn('COUNT', '*'), 'cnt']],
        group: ['unit_id', 'status'],
        raw: true,
      }) as Promise<any[]>,
    ]);

    const alarmMap = new Map<string, { fire: number; fault: number }>();
    for (const a of alarms7d) {
      const key = String(a.unit_id);
      const cur = alarmMap.get(key) || { fire: 0, fault: 0 };
      if (a.alarm_type === 1) cur.fire += parseInt(a.cnt, 10);
      if (a.alarm_type === 2) cur.fault += parseInt(a.cnt, 10);
      alarmMap.set(key, cur);
    }

    const deviceMap = new Map<string, { total: number; online: number }>();
    for (const d of devicesOnline) {
      const key = String(d.unit_id);
      const cur = deviceMap.get(key) || { total: 0, online: 0 };
      cur.total += parseInt(d.cnt, 10);
      if (d.status == 1) cur.online += parseInt(d.cnt, 10);
      deviceMap.set(key, cur);
    }

    const radarData = units.map((u) => {
      const am = alarmMap.get(String(u.id)) || { fire: 0, fault: 0 };
      const dm = deviceMap.get(String(u.id)) || { total: 1, online: 0 };
      const onlineRate = dm.total ? Math.round((dm.online / dm.total) * 100) : 0;
      const fireScore = Math.max(0, 100 - am.fire * 10);
      const faultScore = Math.max(0, 100 - am.fault * 5);
      const patrolScore = 85 + Math.floor(Math.random() * 15); // 占位：接入真实巡检统计后替换
      const maintScore = 80 + Math.floor(Math.random() * 20);  // 占位：接入真实维保统计后替换
      return {
        subject: u.unit_name || '未知单位',
        A: Math.round((fireScore + faultScore + onlineRate + patrolScore + maintScore) / 5),
        B: Math.round(Math.max(60, ((fireScore + faultScore + onlineRate + patrolScore + maintScore) / 5) - 10)),
      };
    });

    // 2) 最新决策卡片（取最近 8 条）
    const { rows: decisionRows } = await AIDecision.findAndCountAll({
      limit: 8,
      order: [['created_at', 'DESC']],
      raw: true,
    });

    const statusMap: Record<number, string> = { 0: 'pending', 1: 'active', 2: 'handled' };

    const decisions = (decisionRows as any[]).map((d) => {
      let type = 'analysis';
      const scene = (d.scene || '').toLowerCase();
      if (scene.includes('火')) type = 'fire';
      else if (scene.includes('故障')) type = 'fault';
      else if (scene.includes('预警')) type = 'warning';

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
      AIDecision.count({ where: { created_at: { [Op.gte]: todayStart } } }),
      AIDecision.count({ where: { status: 1 } }),
      AIDecision.count({ where: { status: 2 } }),
      AIDecision.findOne({
        where: { created_at: { [Op.gte]: new Date(Date.now() - 7 * 86400000) } },
        attributes: [[Sequelize.fn('AVG', Sequelize.col('confidence')), 'avg']],
        raw: true,
      }) as any,
      Alarm.count({ where: { created_at: { [Op.gte]: todayStart } } }),
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
  }

  /* ── 执行 AI 决策建议（回写到工单/告警处置）── */
  static async executeDecision(decisionId: number, _operatorId?: number, _operatorName?: string) {
    const decision = await AIDecision.findByPk(decisionId) as any;
    if (!decision) throw new Error('决策记录不存在');

    const scene = (decision.scene || '').toLowerCase();
    const suggestion = decision.suggestion || '';

    // 根据场景类型创建对应下游工单
    let workOrderType = 'inspection';
    if (scene.includes('维保') || scene.includes('检修')) workOrderType = 'maintenance';
    else if (scene.includes('更换') || scene.includes('维修')) workOrderType = 'repair';

    const woNo = `WO${Date.now()}${Math.floor(Math.random() * 100)}`;
    const orderTypeMap: Record<string, number> = {
      inspection: 1, repair: 2, maintenance: 3, replacement: 4,
    };
    const workOrder = await MaintenanceWorkOrder.create({
      order_no: woNo,
      order_type: orderTypeMap[workOrderType] || 2,
      fault_desc: suggestion,
      status: 0,
      priority: decision.confidence > 90 ? 3 : 2,
    } as any);

    await AIDecision.update({ status: 1 }, { where: { id: decisionId } });

    return {
      executed: true,
      workOrderId: (workOrder as any).id,
      workOrderNo: woNo,
      message: '已生成执行工单',
    };
  }

  /* ── AI 决策记录分页 ── */
  static async decisionList(req: Request) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { count, rows } = await AIDecision.findAndCountAll({
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
      order: [['created_at', 'DESC']],
    });
    return { rows, count, pageNum: +pageNum, pageSize: +pageSize };
  }

  static async decisionCreate(body: any) {
    const decisionNo = `AI${Date.now()}${Math.floor(Math.random() * 100)}`;
    const d = await AIDecision.create({ ...body, decision_no: decisionNo } as any);
    return { id: (d as any).id, decisionNo };
  }

  /* ── 智能预警 ── */
  static async alertList(req: Request) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { status } = req.query;
    const where: any = {};
    if (status !== undefined) where.status = status;
    const { count, rows } = await SmartAlert.findAndCountAll({
      where,
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
      order: [['created_at', 'DESC']],
    });
    return { rows, count, pageNum: +pageNum, pageSize: +pageSize };
  }

  static async alertConfirm(id: string | number) {
    await SmartAlert.update({ status: 1 }, { where: { id } });
    return { confirmed: true };
  }

  static async alertHandle(id: string | number) {
    await SmartAlert.update({ status: 2 }, { where: { id } });
    return { handled: true };
  }
}
