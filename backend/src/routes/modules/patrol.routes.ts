import { Router } from 'express';
import { PatrolController } from '@/controllers/patrol.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof PatrolController) =>
  handleController(`Patrol.${String(name)}`, PatrolController[name]);

const view = requirePermission('patrol:view');
const manage = requirePermission('patrol:manage');

router.get('/plans', view, h('planList'));
router.post('/plans', manage, h('planCreate'));
router.put('/plans/:id', manage, h('planUpdate'));
router.delete('/plans/:id', manage, h('planDelete'));
router.get('/records', view, h('recordList'));
router.get('/records/:id', view, h('recordById'));
router.post('/records', manage, h('recordCreate'));
router.put('/records/:id', manage, h('recordUpdate'));
router.delete('/records/:id', manage, h('recordDelete'));
router.post('/records/:id/checkin', manage, h('recordCheckIn'));
router.get('/hazards', view, h('hazardList'));
router.post('/hazards', manage, h('hazardCreate'));
router.put('/hazards/:id', manage, h('hazardUpdate'));
router.delete('/hazards/:id', manage, h('hazardDelete'));
router.put('/hazards/:id/rectify', manage, h('hazardRectify'));

export default router;
