import { Router } from 'express';
import { AlarmController } from '@/controllers/alarm.controller';
import { AlarmThresholdController, AlarmNotifyPolicyController } from '@/controllers/alarmConfig.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof AlarmController) =>
  handleController(`Alarm.${String(name)}`, AlarmController[name]);

/* ── 告警主接口 ── */
router.get('/', requirePermission('alarm:view'), h('list'));
router.get('/list', requirePermission('alarm:view'), h('list'));
router.get('/stats', requirePermission('alarm:view'), h('stats'));
router.get('/recent', requirePermission('alarm:view'), h('recent'));
router.get('/trend', requirePermission('alarm:view'), h('trend'));
router.get('/:id/detail', requirePermission('alarm:view'), h('getDetail'));
router.post('/', requirePermission('alarm:handle'), h('create'));
router.put('/:id/confirm', requirePermission('alarm:handle'), h('confirm'));
router.put('/:id/handle', requirePermission('alarm:handle'), h('handle'));
router.put('/:id/dismiss', requirePermission('alarm:handle'), h('dismiss'));
router.put('/:id/silence', requirePermission('alarm:handle'), h('silence'));

/* ── 告警配置（阈值 + 通知策略） ── */
const th = (name: keyof typeof AlarmThresholdController) =>
  handleController(`AlarmThreshold.${String(name)}`, AlarmThresholdController[name]);
const nh = (name: keyof typeof AlarmNotifyPolicyController) =>
  handleController(`AlarmNotifyPolicy.${String(name)}`, AlarmNotifyPolicyController[name]);

const cfgView = requirePermission('alarm:config');
const cfgEdit = requirePermission('alarm:config');

router.get('/config/thresholds', cfgView, th('list'));
router.get('/config/thresholds/:id', cfgView, th('byId'));
router.post('/config/thresholds', cfgEdit, th('create'));
router.put('/config/thresholds/:id', cfgEdit, th('update'));
router.delete('/config/thresholds/:id', cfgEdit, th('delete'));

router.get('/config/policies', cfgView, nh('list'));
router.get('/config/policies/:id', cfgView, nh('byId'));
router.post('/config/policies', cfgEdit, nh('create'));
router.put('/config/policies/:id', cfgEdit, nh('update'));
router.delete('/config/policies/:id', cfgEdit, nh('delete'));

export default router;
