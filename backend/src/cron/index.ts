/**
 * ═══════════════════════════════════════════════════════════════════
 * 定时任务
 * 巡检计划生成、维保到期提醒、设备离线检测、数据清理、定时报表
 * ═══════════════════════════════════════════════════════════════════
 */
import cron from 'node-cron';
import { Op } from 'sequelize';
import logger from '@/config/logger';
import redis from '@/config/redis';
import { PatrolPlan, PatrolRecord, MaintenanceContract, Device, Alarm, ReportSchedule } from '@/models';
import { ReportService } from '@/services/report.service';
import { NotificationService } from '@/services/notification.service';

/** 简化 Cron 匹配：检查当前时间是否满足 cron 表达式（仅支持标准 5 段式） */
function matchCron(expr: string, now: Date): boolean {
  const [min, hour, day, month, dow] = expr.trim().split(/\s+/);
  const check = (field: string, value: number, _max: number) => {
    if (field === '*') return true;
    if (field === String(value)) return true;
    if (field.includes(',')) return field.split(',').map(Number).includes(value);
    if (field.includes('-')) {
      const [s, e] = field.split('-').map(Number);
      return value >= s && value <= e;
    }
    if (field.includes('/')) {
      const [, step] = field.split('/').map(Number);
      return value % step === 0;
    }
    return false;
  };
  return check(min, now.getMinutes(), 59)
    && check(hour, now.getHours(), 23)
    && check(day, now.getDate(), 31)
    && check(month, now.getMonth() + 1, 12)
    && check(dow, now.getDay(), 6);
}

export function initCronJobs() {
  // 每分钟：生成巡检任务
  cron.schedule('* * * * *', async () => {
    try {
      const plans = await PatrolPlan.findAll({ where: { status: 1 } });
      const now = new Date();
      for (const plan of plans as any[]) {
        const key = `patrol:${plan.id}:${now.toISOString().slice(0, 10)}`;
        const exists = await redis.get(key);
        if (!exists) {
          const patrolNo = `PT${Date.now()}${Math.floor(Math.random() * 100)}`;
          await PatrolRecord.create({
            plan_id: plan.id, patrol_no: patrolNo,
            unit_id: plan.unit_id, patrol_date: now,
            patrol_user_id: plan.responsible_id,
            patrol_user_name: plan.responsible_name,
            patrol_items: plan.patrol_items, result: 1,
          } as any);
          await redis.setex(key, 86400, '1');
        }
      }
    } catch (err: any) {
      logger.error('[Cron] Patrol generation error:', err.message);
    }
  });

  // 每小时：检测维保合同到期
  cron.schedule('0 * * * *', async () => {
    try {
      const soon = new Date();
      soon.setDate(soon.getDate() + 30);
      const contracts = await MaintenanceContract.findAll({
        where: { end_date: { [Op.lte]: soon }, status: 1 }
      });
      for (const c of contracts as any[]) {
        await redis.publish('fire:notify', JSON.stringify({
          type: 'contract_expire',
          contractId: c.id, contractNo: c.contract_no, endDate: c.end_date
        }));
      }
    } catch (err: any) {
      logger.error('[Cron] Contract check error:', err.message);
    }
  });

  // 每5分钟：检测设备离线
  cron.schedule('*/5 * * * *', async () => {
    try {
      const threshold = new Date(Date.now() - 10 * 60 * 1000);
      const devices = await Device.findAll({
        where: { status: 1, last_online: { [Op.lt]: threshold } }
      });
      for (const d of devices as any[]) {
        await Device.update({ status: 3 }, { where: { id: d.id } });
        logger.warn(`[Cron] Device ${d.device_name}(${d.device_no}) marked offline`);
      }
    } catch (err: any) {
      logger.error('[Cron] Offline check error:', err.message);
    }
  });

  // 每天凌晨：数据清理
  cron.schedule('0 3 * * *', async () => {
    try {
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() - 365);
      const deleted = await Alarm.destroy({ where: { created_at: { [Op.lt]: expireDate }, status: { [Op.in]: [2, 3] } } });
      logger.info(`[Cron] Cleaned ${deleted} expired alarm records`);
    } catch (err: any) {
      logger.error('[Cron] Cleanup error:', err.message);
    }
  });

  // 每分钟：定时报表任务
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const schedules = await ReportSchedule.findAll({ where: { status: 1 } }) as any[];
      for (const s of schedules) {
        if (!matchCron(s.cron_expr, now)) continue;
        // 防止同一分钟内重复执行
        const lastRun = s.last_run_at ? new Date(s.last_run_at) : null;
        if (lastRun && lastRun.getFullYear() === now.getFullYear() && lastRun.getMonth() === now.getMonth() && lastRun.getDate() === now.getDate() && lastRun.getHours() === now.getHours() && lastRun.getMinutes() === now.getMinutes()) {
          continue;
        }
        try {
          await ReportService.exportReport(s.report_type, {
            format: s.format || 'xlsx',
            unitId: s.unit_id || undefined,
          });
          const recipients = String(s.recipients || '').split(/[,;\s]+/).filter(Boolean);
          if (recipients.length > 0) {
            for (const to of recipients) {
              await NotificationService.sendEmail(
                to,
                `【智慧消防】${s.report_name}`,
                `<p>您好，</p><p>附件为自动生成的「${s.report_name}」，请查收。</p><p>生成时间：${now.toLocaleString('zh-CN')}</p>`
              );
            }
          }
          await ReportSchedule.update(
            { last_run_at: now, last_run_status: 1 },
            { where: { id: s.id } }
          );
          logger.info(`[Cron] Report schedule ${s.id} (${s.report_name}) executed successfully`);
        } catch (err: any) {
          await ReportSchedule.update(
            { last_run_at: now, last_run_status: 2 },
            { where: { id: s.id } }
          );
          logger.error(`[Cron] Report schedule ${s.id} (${s.report_name}) failed:`, err.message);
        }
      }
    } catch (err: any) {
      logger.error('[Cron] Report schedule error:', err.message);
    }
  });

  logger.info('[Cron] All scheduled jobs initialized');
}
