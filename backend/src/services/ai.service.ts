import { Op, Sequelize } from 'sequelize';
import { AIDecision, SmartAlert, Alarm, Device } from '@/models';
import { sanitizePagination } from '@/utils/validator';
import type { Request } from 'express';

export class AIService {
  // AI风险研判
  static async riskAnalysis(scene: string, inputData: any) {
    const decisionNo = `AI${Date.now()}${Math.floor(Math.random() * 100)}`;

    // 模拟AI分析逻辑（实际项目接入AI模型API）
    const recentAlarms = await Alarm.findAll({
      where: { created_at: { [Op.gte]: new Date(Date.now() - 7 * 86400000) } },
      order: [['created_at', 'DESC']], limit: 50, raw: true,
    });

    const deviceStatus = await Device.findAll({
      attributes: ['status', [Sequelize.fn('COUNT', '*'), 'count']],
      group: ['status'], raw: true,
    });

    // AI分析结果
    const alarmFreq = recentAlarms.length;
    const faultCount = recentAlarms.filter((a: any) => a.alarm_type === 2).length;
    const fireCount = recentAlarms.filter((a: any) => a.alarm_type === 1).length;

    let riskLevel = 'low';
    let suggestion = '当前安全态势正常，继续保持常规巡检。';
    let confidence = 85;

    if (fireCount > 5) {
      riskLevel = 'high';
      suggestion = '火警频次异常偏高，建议立即排查高频告警点位，加强现场巡查。';
      confidence = 92;
    } else if (faultCount > 10) {
      riskLevel = 'medium';
      suggestion = '设备故障率偏高，建议安排维保人员近期进行集中检修。';
      confidence = 88;
    } else if (alarmFreq > 20) {
      riskLevel = 'medium';
      suggestion = '告警总量偏高，建议核查是否存在误报或阈值设置不当。';
      confidence = 80;
    }

    const decision = await AIDecision.create({
      decision_no: decisionNo, scene,
      input_data: JSON.stringify(inputData),
      analysis_result: JSON.stringify({ alarmFreq, faultCount, fireCount, deviceStatus, riskLevel }),
      suggestion, confidence,
    } as any);

    return { id: (decision as any).id, decisionNo, riskLevel, suggestion, confidence, analysis: { alarmFreq, faultCount, fireCount } };
  }

  // 误报过滤
  static async filterFalseAlarms(alarmId: number) {
    const alarm = await Alarm.findByPk(alarmId) as any;
    if (!alarm) return { isFalseAlarm: false, confidence: 0 };

    // 简单规则：短时间内同一设备重复告警可能是误报
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

  // 态势研判
  static async situationAssessment() {
    const [alarmStats, deviceStats] = await Promise.all([
      Alarm.findAll({
        attributes: ['alarm_type', [Sequelize.fn('COUNT', '*'), 'count']],
        where: { created_at: { [Op.gte]: new Date(Date.now() - 24 * 3600000) } },
        group: ['alarm_type'], raw: true,
      }),
      Device.findAll({
        attributes: ['status', [Sequelize.fn('COUNT', '*'), 'count']],
        group: ['status'], raw: true,
      }),
    ]);

    const totalDevice = deviceStats.reduce((s: number, d: any) => s + parseInt(d.count), 0);
    const onlineDevice = deviceStats.find((d: any) => d.status == 1);
    const onlineRate = totalDevice ? (parseInt((onlineDevice as any)?.count || 0) / totalDevice * 100) : 0;
    const todayAlarm = alarmStats.reduce((s: number, a: any) => s + parseInt(a.count), 0);

    let situation = 'normal';
    if (onlineRate < 80) situation = 'warning';
    if (todayAlarm > 20) situation = 'danger';

    return { situation, onlineRate: onlineRate.toFixed(1), todayAlarm, deviceStats, alarmStats };
  }

  static async getTrend(days: number = 7) {
    return AlarmService.getTrend(days);
  }

  /* ── AI 决策记录 ── */
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

import { AlarmService } from './alarm.service';
