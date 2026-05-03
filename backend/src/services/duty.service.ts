import { Op } from 'sequelize';
import { DutySchedule, DutyLog, User } from '@/models';

export class DutyService {
  // 创建排班
  static async createSchedule(data: any) {
    return DutySchedule.create(data as any);
  }

  // 获取排班表
  static async getSchedules(startDate: string, endDate: string) {
    return DutySchedule.findAll({
      where: { duty_date: { [Op.between]: [startDate, endDate] } },
      order: [['duty_date', 'ASC'], ['start_time', 'ASC']],
    });
  }

  // 签到
  static async checkIn(userId: number, userName: string) {
    const log = await DutyLog.create({
      user_id: userId, user_name: userName,
      on_duty_time: new Date(), status: 1,
    } as any);
    return log;
  }

  // 签退（交接班）
  static async checkOut(userId: number, handoverContent: string, incidents?: string) {
    const todayLog = await DutyLog.findOne({
      where: { user_id: userId, off_duty_time: null },
      order: [['created_at', 'DESC']],
    }) as any;

    if (todayLog) {
      await DutyLog.update({
        off_duty_time: new Date(),
        handover_content: handoverContent,
        incidents: incidents || '',
      }, { where: { id: todayLog.id } });
    }
    return { success: true };
  }

  // 获取值班日志
  static async getDutyLogs(pageNum = 1, pageSize = 20, userId?: number) {
    const where: any = {};
    if (userId) where.user_id = userId;
    const { count, rows } = await DutyLog.findAndCountAll({
      where, limit: pageSize, offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    return { list: rows, total: count, pageNum, pageSize };
  }

  // 离岗预警检测
  static async checkAbsence() {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000);
    // 检查正在值班但超过5分钟无活动的人员
    const onDutyLogs = await DutyLog.findAll({
      where: { off_duty_time: null, on_duty_time: { [Op.lt]: fiveMinAgo } },
      raw: true,
    });
    return onDutyLogs;
  }

  // 获取当前值班人员
  static async getCurrentDuty() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentTime = now.toTimeString().slice(0, 8);

    return DutySchedule.findAll({
      where: {
        duty_date: today,
        start_time: { [Op.lte]: currentTime },
        end_time: { [Op.gte]: currentTime },
        status: 1,
      },
    });
  }
}
