/**
 * ═══════════════════════════════════════════════════════════════════
 * 定时任务
 * 巡检计划生成、维保到期提醒、设备离线检测、数据备份
 * ═══════════════════════════════════════════════════════════════════
 */
import cron from 'node-cron';
import { Op } from 'sequelize';
import logger from '@/config/logger';
import redis from '@/config/redis';
import { PatrolPlan, PatrolRecord, MaintenanceContract, Device, Alarm } from '@/models';

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

  logger.info('[Cron] All scheduled jobs initialized');
}
