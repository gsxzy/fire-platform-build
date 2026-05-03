/**
 * ═══════════════════════════════════════════════════════════════════
 * AI风险分析服务
 * 火情真伪识别、等级判定、蔓延预测、最优策略推荐
 * ═══════════════════════════════════════════════════════════════════
 */
import { Alarm, Device, AIDecision } from '@/models';
import logger from '@/config/logger';

export interface RiskAnalysisResult {
  isReal: boolean;           // 真火警 or 误报
  confidence: number;        // 置信度 0-1
  fireLevel: number;         // 火情等级 1-5
  spreadPrediction: any[];    // 蔓延预测
  recommendedActions: string[]; // 推荐措施
  decision: string;          // AI决策结论
}

export class AIAriskAnalysisService {
  /**
   * 分析告警风险
   */
  static async analyzeAlarm(alarmId: number): Promise<RiskAnalysisResult> {
    try {
      // 获取告警信息
      const alarm = await Alarm.findByPk(alarmId) as any;
      if (!alarm) {
        throw new Error('告警不存在');
      }

      // 获取设备信息
      const device = await Device.findByPk(alarm.device_id) as any;

      // 获取历史告警
      const history = await Alarm.findAll({
        where: { device_id: alarm.device_id },
        order: [['id', 'DESC']],
        limit: 10
      }) as any[];

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
      await AIDecision.create({
        decision_no: `AI_${alarmId}_${Date.now()}`,
        scene: `告警${alarm.alarm_no}`,
        input_data: JSON.stringify({ alarm, device, history }),
        analysis_result: JSON.stringify({ isReal, confidence, fireLevel }),
        suggestion: decision,
        confidence: confidence,
        status: 1
      } as any);

      logger.info(`[AI] 风险分析完成: alarmId=${alarmId}, isReal=${isReal.isReal}, level=${fireLevel}`);

      return {
        isReal: isReal.isReal,
        confidence,
        fireLevel,
        spreadPrediction,
        recommendedActions,
        decision
      };
    } catch (err: any) {
      logger.error(`[AI] 风险分析失败: ${err.message}`);
      throw err;
    }
  }

  /**
   * 火情真伪识别
   */
  private static async detectRealAlarm(alarm: any, device: any, history: any[]): Promise<{ isReal: boolean; confidence: number; reason: string }> {
    let score = 0; // 真火警得分
    let totalScore = 0;

    // 1. 历史误报率分析
    const recentFalseAlarms = history.filter((h: any) => h.status === 3 && h.alarm_type === 1).length;
    const falseAlarmRate = history.length > 0 ? recentFalseAlarms / history.length : 0;
    
    if (falseAlarmRate > 0.7) {
      score -= 30;
      logger.info(`[AI] 设备误报率过高: ${(falseAlarmRate * 100).toFixed(1)}%`);
    }
    totalScore += 30;

    // 2. 设备健康状态分析
    if (device.status === 4) {
      // 报废设备
      score -= 50;
      logger.warn('[AI] 设备已报废，误报可能性高');
    } else if (device.status === 2) {
      // 故障设备
      score -= 30;
      logger.warn('[AI] 设备故障，误报可能性较高');
    }
    totalScore += 50;

    // 3. 时间分布分析
    const alarmHour = new Date().getHours();
    if (alarmHour >= 2 && alarmHour <= 6) {
      // 凌晨时段，真火警可能性降低
      score -= 10;
      logger.info('[AI] 凌晨时段，误报可能性略高');
    }
    totalScore += 10;

    // 4. 短时间内多次告警
    const recentAlarms = history.filter((h: any) => {
      const diff = Date.now() - new Date(h.created_at).getTime();
      return diff < 300000; // 5分钟内
    }).length;

    if (recentAlarms > 3) {
      score -= 20;
      logger.warn(`[AI] 短时间内多次告警（${recentAlarms}次）`);
    }
    totalScore += 20;

    // 5. 多设备同时告警（真火警特征）
    if (recentAlarms >= 2) {
      score += 30;
      logger.info('[AI] 多设备同时告警，真火警可能性高');
    }
    totalScore += 30;

    // 6. 告警类型分析
    if (alarm.alarm_desc.includes('故障') || alarm.alarm_desc.includes('误报')) {
      score -= 40;
      logger.warn('[AI] 告警描述包含故障或误报');
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
  private static async assessFireLevel(alarm: any, device: any, history: any[]): Promise<number> {
    let level = 1; // 默认1级

    // 1. 告警数量
    const recentAlarms = history.filter((h: any) => {
      const diff = Date.now() - new Date(h.created_at).getTime();
      return diff < 600000; // 10分钟内
    }).length;

    if (recentAlarms >= 10) level = 5; // 特大
    else if (recentAlarms >= 5) level = 4; // 重大
    else if (recentAlarms >= 3) level = 3; // 较大
    else if (recentAlarms >= 2) level = 2; // 一般

    // 2. 设备类型权重
    if (alarm.alarm_desc.includes('烟感')) {
      level = Math.min(5, level + 1); // 烟感权重高
    }

    // 3. 告警级别
    if (alarm.alarm_level === 3) {
      level = Math.min(5, level + 1); // 紧急等级
    }

    logger.info(`[AI] 火情等级: ${level}级, 告警数: ${recentAlarms}`);

    return level;
  }

  /**
   * 火势蔓延预测
   */
  private static async predictSpread(alarm: any, device: any, history: any[]): Promise<any[]> {
    const predictions = [];

    // 简化版蔓延预测（实际应结合GIS、风向、建筑结构）
    const baseTime = new Date();

    // 获取同楼层/同区域的设备
    const nearbyDevices = await Device.findAll({
      where: {
        unit_id: device.unit_id,
        floor: device.floor
      },
      limit: 20
    }) as any[];

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

    logger.info(`[AI] 蔓延预测: ${predictions.length}个时间点`);

    return predictions;
  }

  /**
   * 最优联动策略推荐
   */
  private static async recommendActions(alarm: any, device: any, fireLevel: number): Promise<string[]> {
    const actions: string[] = [];

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

    logger.info(`[AI] 推荐措施: ${actions.length}条`);

    return actions;
  }

  /**
   * 生成决策结论
   */
  private static generateDecision(isReal: any, fireLevel: number, actions: string[]): string {
    if (!isReal.isReal) {
      return `经AI分析，该告警可能为误报（置信度: ${isReal.confidence}）。建议：${isReal.reason}，通知值班人员核实。`;
    }

    return `确认真火警（置信度: ${isReal.confidence}），火情等级${fireLevel}级。建议立即采取以下措施：${actions.join('；')}。`;
  }

  /**
   * 批量分析告警
   */
  static async batchAnalyze(alarmIds: number[]): Promise<Map<number, RiskAnalysisResult>> {
    const results = new Map<number, RiskAnalysisResult>();

    for (const alarmId of alarmIds) {
      try {
        const result = await this.analyzeAlarm(alarmId);
        results.set(alarmId, result);
      } catch (err: any) {
        logger.error(`[AI] 分析告警失败: ${alarmId}, ${err.message}`);
      }
    }

    return results;
  }
}