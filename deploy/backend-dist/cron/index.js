"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = initCronJobs;
/**
 * ═══════════════════════════════════════════════════════════════════
 * 定时任务
 * 巡检计划生成、维保到期提醒、设备离线检测、数据备份
 * ═══════════════════════════════════════════════════════════════════
 */
const node_cron_1 = __importDefault(require("node-cron"));
const sequelize_1 = require("sequelize");
const logger_1 = __importDefault(require("@/config/logger"));
const redis_1 = __importDefault(require("@/config/redis"));
const models_1 = require("@/models");
function initCronJobs() {
    // 每分钟：生成巡检任务
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            const plans = await models_1.PatrolPlan.findAll({ where: { status: 1 } });
            const now = new Date();
            for (const plan of plans) {
                const key = `patrol:${plan.id}:${now.toISOString().slice(0, 10)}`;
                const exists = await redis_1.default.get(key);
                if (!exists) {
                    const patrolNo = `PT${Date.now()}${Math.floor(Math.random() * 100)}`;
                    await models_1.PatrolRecord.create({
                        plan_id: plan.id, patrol_no: patrolNo,
                        unit_id: plan.unit_id, patrol_date: now,
                        patrol_user_id: plan.responsible_id,
                        patrol_user_name: plan.responsible_name,
                        patrol_items: plan.patrol_items, result: 1,
                    });
                    await redis_1.default.setex(key, 86400, '1');
                }
            }
        }
        catch (err) {
            logger_1.default.error('[Cron] Patrol generation error:', err.message);
        }
    });
    // 每小时：检测维保合同到期
    node_cron_1.default.schedule('0 * * * *', async () => {
        try {
            const soon = new Date();
            soon.setDate(soon.getDate() + 30);
            const contracts = await models_1.MaintenanceContract.findAll({
                where: { end_date: { [sequelize_1.Op.lte]: soon }, status: 1 }
            });
            for (const c of contracts) {
                await redis_1.default.publish('fire:notify', JSON.stringify({
                    type: 'contract_expire',
                    contractId: c.id, contractNo: c.contract_no, endDate: c.end_date
                }));
            }
        }
        catch (err) {
            logger_1.default.error('[Cron] Contract check error:', err.message);
        }
    });
    // 每5分钟：检测设备离线
    node_cron_1.default.schedule('*/5 * * * *', async () => {
        try {
            const threshold = new Date(Date.now() - 10 * 60 * 1000);
            const devices = await models_1.Device.findAll({
                where: { status: 1, last_online: { [sequelize_1.Op.lt]: threshold } }
            });
            for (const d of devices) {
                await models_1.Device.update({ status: 3 }, { where: { id: d.id } });
                logger_1.default.warn(`[Cron] Device ${d.device_name}(${d.device_no}) marked offline`);
            }
        }
        catch (err) {
            logger_1.default.error('[Cron] Offline check error:', err.message);
        }
    });
    // 每天凌晨：数据清理
    node_cron_1.default.schedule('0 3 * * *', async () => {
        try {
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() - 365);
            const deleted = await models_1.Alarm.destroy({ where: { created_at: { [sequelize_1.Op.lt]: expireDate }, status: { [sequelize_1.Op.in]: [2, 3] } } });
            logger_1.default.info(`[Cron] Cleaned ${deleted} expired alarm records`);
        }
        catch (err) {
            logger_1.default.error('[Cron] Cleanup error:', err.message);
        }
    });
    logger_1.default.info('[Cron] All scheduled jobs initialized');
}
//# sourceMappingURL=index.js.map