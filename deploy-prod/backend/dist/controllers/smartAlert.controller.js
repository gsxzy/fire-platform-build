"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartAlertController = void 0;
const respond_1 = require("@/utils/respond");
const cache_1 = require("@/utils/cache");
const httpError_1 = require("@/utils/httpError");
const models_1 = require("@/models");
const alarmNo_1 = require("@/utils/alarmNo");
const validator_1 = require("@/utils/validator");
/** alert_type → alarm_type 映射 */
const ALERT_TO_ALARM_TYPE = {
    1: 3, // 趋势预警 → 预警
    2: 2, // 寿命预警 → 故障
    3: 3, // 环境预警 → 预警
};
exports.SmartAlertController = {
    async alertList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { status } = req.query;
        const where = {};
        if (status !== undefined && status !== '')
            where.status = status;
        const { count, rows } = await models_1.SmartAlert.findAndCountAll({
            where,
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
    },
    async alertCount(req, res) {
        const data = await (0, cache_1.withCache)(cache_1.CacheTags.DASHBOARD, 'smartAlert:count', async () => {
            const total = await models_1.SmartAlert.count();
            const pending = await models_1.SmartAlert.count({ where: { status: 0 } });
            return { total, pending };
        }, { ttl: 60 });
        (0, respond_1.sendSuccess)(res, req, data);
    },
    async alertCreate(req, res) {
        const body = req.body || {};
        const alertNo = body.alert_no || `SW${Date.now()}${Math.floor(Math.random() * 100)}`;
        const row = await models_1.SmartAlert.create({ ...body, alert_no: alertNo });
        (0, respond_1.sendSuccess)(res, req, { id: row.id, alertNo }, '创建成功');
    },
    async alertUpdate(req, res) {
        const [n] = await models_1.SmartAlert.update(req.body, { where: { id: req.params.id } });
        if (!n)
            throw new httpError_1.HttpError('预警不存在', 404, 404);
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async alertDelete(req, res) {
        const n = await models_1.SmartAlert.destroy({ where: { id: req.params.id } });
        if (!n)
            throw new httpError_1.HttpError('预警不存在', 404, 404);
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    /** 预警确认 → 同步写入告警中心 */
    async alertConfirm(req, res) {
        const id = req.params.id;
        const alert = await models_1.SmartAlert.findByPk(id);
        if (!alert)
            throw new httpError_1.HttpError('预警不存在', 404, 404);
        await models_1.SmartAlert.update({ status: 1 }, { where: { id } });
        // P2: 确认后回写告警中心
        await createAlarmFromAlert(alert);
        (0, respond_1.sendSuccess)(res, req, null, '已确认并同步至告警中心');
    },
    /** 预警处理 → 同步写入告警中心 */
    async alertHandle(req, res) {
        const id = req.params.id;
        const alert = await models_1.SmartAlert.findByPk(id);
        if (!alert)
            throw new httpError_1.HttpError('预警不存在', 404, 404);
        await models_1.SmartAlert.update({ status: 2 }, { where: { id } });
        // P2: 处理后回写告警中心
        await createAlarmFromAlert(alert);
        (0, respond_1.sendSuccess)(res, req, null, '已处理并同步至告警中心');
    },
};
/** 将 SmartAlert 转换为 Alarm 记录 */
async function createAlarmFromAlert(alert) {
    const existing = await models_1.Alarm.findOne({
        where: { alarm_no: alert.alert_no },
    });
    if (existing) {
        // 已存在则更新状态
        await models_1.Alarm.update({ status: alert.status === 2 ? 2 : 1 }, { where: { id: existing.id } });
        return;
    }
    await models_1.Alarm.create({
        alarm_no: alert.alert_no || (0, alarmNo_1.generateAlarmNo)(),
        alarm_type: ALERT_TO_ALARM_TYPE[alert.alert_type] || 3,
        alarm_level: alert.alert_type === 2 ? 2 : 3,
        device_id: alert.device_id,
        device_name: alert.device_name,
        unit_id: alert.unit_id,
        alarm_desc: alert.alert_desc || '智能预警触发',
        status: alert.status === 2 ? 2 : 1,
    });
}
//# sourceMappingURL=smartAlert.controller.js.map