import { Sequelize } from 'sequelize';
import { IssueHistory } from '@/models';
import logger from '@/config/logger';

export interface IssueRecord {
  deviceId: string;
  deviceName?: string;
  issueType: string;
  symptoms?: string;
  rootCause?: string;
  solution?: string;
  status?: number;
  sourceIp?: string;
  resolvedBy?: string;
}

export interface DiagnoseResult {
  deviceId: string;
  totalOccurrences: number;
  similarIssues: Array<{
    id: number;
    issueType: string;
    symptoms: string;
    rootCause: string;
    solution: string;
    occurrenceCount: number;
    lastOccurrence: string;
    status: number;
  }>;
  suggestion: string;
}

export class AILearningService {
  /**
   * 记录一次故障事件（自动累加次数）
   */
  static async recordIssue(data: IssueRecord) {
    // 查找同一设备同一类型的最近记录
    const existing = await IssueHistory.findOne({
      where: {
        device_id: data.deviceId,
        issue_type: data.issueType,
      },
      order: [['created_at', 'DESC']],
    }) as any;

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
        logger.info(`[AILearning] 故障累计+1: ${data.deviceId}/${data.issueType}, count=${existing.occurrence_count}`);
        return existing;
      }
    }

    const record = await IssueHistory.create({
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
    } as any);

    logger.info(`[AILearning] 新故障记录: ${data.deviceId}/${data.issueType}`);
    return record;
  }

  /**
   * 智能诊断：查询某设备的历史故障并生成建议
   */
  static async diagnose(deviceId: string, _symptoms?: string): Promise<DiagnoseResult> {
    const where: any = {};
    if (deviceId && deviceId !== '*') {
      where.device_id = deviceId;
    }

    const rows = await IssueHistory.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 10,
    }) as any[];

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
    } else {
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
    const rows = await IssueHistory.findAll({
      attributes: [
        'issue_type',
        [Sequelize.fn('SUM', Sequelize.col('occurrence_count')), 'total_count'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'record_count'],
      ],
      group: ['issue_type'],
      order: [[Sequelize.fn('SUM', Sequelize.col('occurrence_count')), 'DESC']],
      limit,
      raw: true,
    }) as any[];

    return rows.map((r: any) => ({
      issueType: r.issue_type,
      totalCount: Number(r.total_count),
      recordCount: Number(r.record_count),
      label: this.translateIssueType(r.issue_type),
    }));
  }

  /**
   * 按设备统计 TOP N
   */
  static async statsByDevice(limit = 10) {
    const rows = await IssueHistory.findAll({
      attributes: [
        'device_id',
        'device_name',
        [Sequelize.fn('SUM', Sequelize.col('occurrence_count')), 'total_count'],
      ],
      group: ['device_id', 'device_name'],
      order: [[Sequelize.fn('SUM', Sequelize.col('occurrence_count')), 'DESC']],
      limit,
      raw: true,
    }) as any[];

    return rows.map((r: any) => ({
      deviceId: r.device_id,
      deviceName: r.device_name,
      totalCount: Number(r.total_count),
    }));
  }

  /**
   * 更新故障状态或解决方案
   */
  static async updateIssue(id: number, data: Partial<IssueRecord>) {
    const record = await IssueHistory.findByPk(id) as any;
    if (!record) return null;

    if (data.deviceName !== undefined) record.device_name = data.deviceName;
    if (data.symptoms !== undefined) record.symptoms = data.symptoms;
    if (data.rootCause !== undefined) record.root_cause = data.rootCause;
    if (data.solution !== undefined) record.solution = data.solution;
    if (data.status !== undefined) record.status = data.status;
    if (data.resolvedBy !== undefined) record.resolved_by = data.resolvedBy;
    if (data.sourceIp !== undefined) record.source_ip = data.sourceIp;

    await record.save();
    return record;
  }

  /**
   * 故障类型中文映射
   */
  private static translateIssueType(type: string): string {
    const map: Record<string, string> = {
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
