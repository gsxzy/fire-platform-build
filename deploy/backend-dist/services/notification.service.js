"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = __importDefault(require("@/config/logger"));
const redis_1 = __importDefault(require("@/config/redis"));
const models_1 = require("@/models");
class NotificationService {
    static transporter;
    static init() {
        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            this.transporter = nodemailer_1.default.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '465'),
                secure: true,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });
        }
    }
    // 告警通知
    static async sendAlarmNotify(alarm) {
        const msg = JSON.stringify({ type: 'alarm', data: alarm, time: new Date().toISOString() });
        await redis_1.default.publish('fire:notify', msg);
        logger_1.default.info(`[Notify] Alarm notification sent: ${alarm.alarm_no}`);
    }
    // 维保到期提醒
    static async sendContractExpireNotify(contract) {
        const msg = JSON.stringify({ type: 'contract_expire', data: contract });
        await redis_1.default.publish('fire:notify', msg);
        logger_1.default.info(`[Notify] Contract expire reminder: ${contract.contract_no}`);
    }
    // 设备离线通知
    static async sendDeviceOfflineNotify(device) {
        const msg = JSON.stringify({ type: 'device_offline', data: device });
        await redis_1.default.publish('fire:notify', msg);
        logger_1.default.info(`[Notify] Device offline: ${device.device_no}`);
    }
    // 巡检逾期通知
    static async sendPatrolOverdueNotify(plan) {
        const msg = JSON.stringify({ type: 'patrol_overdue', data: plan });
        await redis_1.default.publish('fire:notify', msg);
        logger_1.default.info(`[Notify] Patrol overdue: ${plan.plan_name}`);
    }
    // 邮件发送
    static async sendEmail(to, subject, content) {
        if (!this.transporter)
            return { success: false, msg: '邮件服务未配置' };
        try {
            await this.transporter.sendMail({
                from: process.env.SMTP_FROM,
                to, subject, html: content,
            });
            return { success: true };
        }
        catch (err) {
            logger_1.default.error(`[Notify] Email failed: ${err.message}`);
            return { success: false, msg: err.message };
        }
    }
    // 使用模板发送
    static async sendWithTemplate(templateCode, to, variables) {
        const template = await models_1.NotifyTemplate.findOne({ where: { template_code: templateCode } });
        if (!template)
            return { success: false, msg: '模板不存在' };
        let content = template.content;
        for (const [key, value] of Object.entries(variables)) {
            content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        if (template.channel === 'email') {
            return this.sendEmail(to, template.subject, content);
        }
        await redis_1.default.publish('fire:notify', JSON.stringify({ type: 'template', channel: template.channel, to, content }));
        return { success: true };
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.service.js.map