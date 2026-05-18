/**
 * 智能预警控制器
 * ═══════════════════════════════════════════════════════════════════
 * 架构说明：智能预警是 AI 决策的子集（智能预警 ⊂ AI）。
 * 预警记录由 AI 服务（`generateSmartAlert`）或规则引擎生成，
 * 写入 `fire_smart_alert` 表；此控制器仅负责预警的生命周期管理。
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/respond';
import { HttpError } from '@/utils/httpError';
import { SmartAlert, Alarm } from '@/models';
import { generateAlarmNo } from '@/utils/alarmNo';
import { sanitizePagination } from '@/utils/validator';

/** alert_type → alarm_type 映射 */
const ALERT_TO_ALARM_TYPE: Record<number, number> = {
  1: 3, // 趋势预警 → 预警
  2: 2, // 寿命预警 → 故障
  3: 3, // 环境预警 → 预警
};

export const SmartAlertController = {
  async alertList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { status } = req.query;
    const where: any = {};
    if (status !== undefined && status !== '') where.status = status;
    const { count, rows } = await SmartAlert.findAndCountAll({
      where,
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, pageNum, pageSize);
  },

  async alertCount(req: Request, res: Response) {
    const total = await SmartAlert.count();
    const pending = await SmartAlert.count({ where: { status: 0 } });
    sendSuccess(res, req, { total, pending });
  },

  async alertCreate(req: Request, res: Response) {
    const body = req.body || {};
    const alertNo = body.alert_no || `SW${Date.now()}${Math.floor(Math.random() * 100)}`;
    const row = await SmartAlert.create({ ...body, alert_no: alertNo } as any);
    sendSuccess(res, req, { id: (row as any).id, alertNo }, '创建成功');
  },

  async alertUpdate(req: Request, res: Response) {
    const [n] = await SmartAlert.update(req.body, { where: { id: req.params.id } });
    if (!n) throw new HttpError('预警不存在', 404, 404);
    sendSuccess(res, req, null, '更新成功');
  },

  async alertDelete(req: Request, res: Response) {
    const n = await SmartAlert.destroy({ where: { id: req.params.id } });
    if (!n) throw new HttpError('预警不存在', 404, 404);
    sendSuccess(res, req, null, '删除成功');
  },

  /** 预警确认 → 同步写入告警中心 */
  async alertConfirm(req: Request, res: Response) {
    const id = req.params.id;
    const alert = await SmartAlert.findByPk(id) as any;
    if (!alert) throw new HttpError('预警不存在', 404, 404);

    await SmartAlert.update({ status: 1 }, { where: { id } });

    // P2: 确认后回写告警中心
    await createAlarmFromAlert(alert);

    sendSuccess(res, req, null, '已确认并同步至告警中心');
  },

  /** 预警处理 → 同步写入告警中心 */
  async alertHandle(req: Request, res: Response) {
    const id = req.params.id;
    const alert = await SmartAlert.findByPk(id) as any;
    if (!alert) throw new HttpError('预警不存在', 404, 404);

    await SmartAlert.update({ status: 2 }, { where: { id } });

    // P2: 处理后回写告警中心
    await createAlarmFromAlert(alert);

    sendSuccess(res, req, null, '已处理并同步至告警中心');
  },
};

/** 将 SmartAlert 转换为 Alarm 记录 */
async function createAlarmFromAlert(alert: any) {
  const existing = await Alarm.findOne({
    where: { alarm_no: alert.alert_no },
  }) as any;
  if (existing) {
    // 已存在则更新状态
    await Alarm.update({ status: alert.status === 2 ? 2 : 1 }, { where: { id: existing.id } });
    return;
  }

  await Alarm.create({
    alarm_no: alert.alert_no || generateAlarmNo(),
    alarm_type: ALERT_TO_ALARM_TYPE[alert.alert_type] || 3,
    alarm_level: alert.alert_type === 2 ? 2 : 3,
    device_id: alert.device_id,
    device_name: alert.device_name,
    unit_id: alert.unit_id,
    alarm_desc: alert.alert_desc || '智能预警触发',
    status: alert.status === 2 ? 2 : 1,
  } as any);
}
