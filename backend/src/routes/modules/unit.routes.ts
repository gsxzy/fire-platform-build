import { Router } from 'express';
import { UnitController } from '@/controllers/unit.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof UnitController) =>
  handleController(`Unit.${String(name)}`, UnitController[name]);

router.get('/list', requirePermission('unit:view'), h('list'));
router.get('/stats', requirePermission('unit:view'), h('stats'));
router.post('/', requirePermission('unit:create'), h('create'));
router.put('/:id', requirePermission('unit:edit'), h('update'));
router.delete('/:id', requirePermission('unit:delete'), h('delete'));

export default router;
