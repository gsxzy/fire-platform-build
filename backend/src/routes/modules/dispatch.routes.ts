import { Router } from 'express';
import { DispatchController } from '@/controllers/dispatch.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof DispatchController) =>
  handleController(`Dispatch.${String(name)}`, DispatchController[name]);

const view = requirePermission('alarm:view');

router.get('/', view, h('list'));
router.get('/stats', view, h('stats'));
router.get('/:id', view, h('byId'));

export default router;
