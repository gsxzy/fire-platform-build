import { Router } from 'express';
import { AlarmController } from '@/controllers/alarm.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof AlarmController) =>
  handleController(`Alarm.${String(name)}`, AlarmController[name]);

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

export default router;
