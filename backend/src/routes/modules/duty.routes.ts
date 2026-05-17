import { Router } from 'express';
import { DutyController } from '@/controllers/duty.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof DutyController) =>
  handleController(`Duty.${String(name)}`, DutyController[name]);

const view = requirePermission('duty:view');
const manage = requirePermission('duty:manage');

router.get('/schedules', view, h('scheduleList'));
router.get('/schedules/:id', view, h('scheduleById'));
router.post('/schedules', manage, h('scheduleCreate'));
router.put('/schedules/:id', manage, h('scheduleUpdate'));
router.delete('/schedules/:id', manage, h('scheduleDelete'));
router.post('/check-in', manage, h('checkIn'));
router.post('/check-out', manage, h('checkOut'));
router.get('/logs', view, h('logList'));
router.get('/current', view, h('currentDuty'));
router.get('/absence-alert', view, h('absenceAlert'));

export default router;
