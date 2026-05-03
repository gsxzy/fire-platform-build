import nodemailer from 'nodemailer';
import logger from '@/config/logger';
import redis from '@/config/redis';
import { NotifyTemplate } from '@/models';

export class NotificationService {
  private static transporter: nodemailer.Transporter;

  static init() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    }
  }

  // 告警通知
  static async sendAlarmNotify(alarm: any) {
    const msg = JSON.stringify({ type: 'alarm', data: alarm, time: new Date().toISOString() });
    await redis.publish('fire:notify', msg);
    logger.info(`[Notify] Alarm notification sent: ${alarm.alarm_no}`);
  }

  // 维保到期提醒
  static async sendContractExpireNotify(contract: any) {
    const msg = JSON.stringify({ type: 'contract_expire', data: contract });
    await redis.publish('fire:notify', msg);
    logger.info(`[Notify] Contract expire reminder: ${contract.contract_no}`);
  }

  // 设备离线通知
  static async sendDeviceOfflineNotify(device: any) {
    const msg = JSON.stringify({ type: 'device_offline', data: device });
    await redis.publish('fire:notify', msg);
    logger.info(`[Notify] Device offline: ${device.device_no}`);
  }

  // 巡检逾期通知
  static async sendPatrolOverdueNotify(plan: any) {
    const msg = JSON.stringify({ type: 'patrol_overdue', data: plan });
    await redis.publish('fire:notify', msg);
    logger.info(`[Notify] Patrol overdue: ${plan.plan_name}`);
  }

  // 邮件发送
  static async sendEmail(to: string, subject: string, content: string) {
    if (!this.transporter) return { success: false, msg: '邮件服务未配置' };
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to, subject, html: content,
      });
      return { success: true };
    } catch (err: any) {
      logger.error(`[Notify] Email failed: ${err.message}`);
      return { success: false, msg: err.message };
    }
  }

  // 使用模板发送
  static async sendWithTemplate(templateCode: string, to: string, variables: Record<string, string>) {
    const template = await NotifyTemplate.findOne({ where: { template_code: templateCode } }) as any;
    if (!template) return { success: false, msg: '模板不存在' };

    let content = template.content;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    if (template.channel === 'email') {
      return this.sendEmail(to, template.subject, content);
    }

    await redis.publish('fire:notify', JSON.stringify({ type: 'template', channel: template.channel, to, content }));
    return { success: true };
  }
}
