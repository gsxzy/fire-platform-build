import { Router } from 'express';
import { PlanController } from '@/controllers/plan.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof PlanController) =>
  handleController(`Plan.${String(name)}`, PlanController[name]);

const view = requirePermission('plan:view');
const manage = requirePermission('plan:manage');

router.get('/', view, h('planList'));
router.post('/', manage, h('planCreate'));
router.put('/:id', manage, h('planUpdate'));
router.delete('/:id', manage, h('planDelete'));
router.get('/drills', view, h('drillList'));
router.post('/drills', manage, h('drillCreate'));
router.put('/drills/:id', manage, h('drillUpdate'));
router.delete('/drills/:id', manage, h('drillDelete'));
router.get('/drills/:id/participants', view, h('participantList'));
router.post('/drills/:id/participants', manage, h('participantCreate'));
router.delete('/drills/:id/participants/:participantId', manage, h('participantDelete'));

export default router;
