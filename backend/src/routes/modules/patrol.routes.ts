import { Router } from 'express';
import { PatrolController } from '@/controllers/patrol.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof PatrolController) =>
  handleController(`Patrol.${String(name)}`, PatrolController[name]);

const view = requirePermission('patrol:view');

router.get('/plans', view, h('planList'));
router.post('/plans', view, h('planCreate'));
router.put('/plans/:id', view, h('planUpdate'));
router.delete('/plans/:id', view, h('planDelete'));
router.get('/records', view, h('recordList'));
router.get('/records/:id', view, h('recordById'));
router.post('/records', view, h('recordCreate'));
router.put('/records/:id', view, h('recordUpdate'));
router.delete('/records/:id', view, h('recordDelete'));
router.get('/hazards', view, h('hazardList'));
router.post('/hazards', view, h('hazardCreate'));
router.put('/hazards/:id', view, h('hazardUpdate'));
router.delete('/hazards/:id', view, h('hazardDelete'));
router.put('/hazards/:id/rectify', view, h('hazardRectify'));

export default router;
