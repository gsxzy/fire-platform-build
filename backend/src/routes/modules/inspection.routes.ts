import { Router } from 'express';
import { InspectionController } from '@/controllers/inspection.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof InspectionController) =>
  handleController(`Inspection.${String(name)}`, InspectionController[name]);

const view = requirePermission('fire-check:view');
const manage = requirePermission('fire-check:manage');

router.get('/', view, h('list'));
router.post('/', manage, h('create'));
router.put('/:id', manage, h('update'));
router.delete('/:id', manage, h('delete'));

export default router;
