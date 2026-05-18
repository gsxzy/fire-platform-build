import { Router } from 'express';
import { InspectionController } from '@/controllers/inspection.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof InspectionController) =>
  handleController(`Inspection.${String(name)}`, InspectionController[name]);

const view = requirePermission('fire-check:view');
const manage = requirePermission('fire-check:manage');

/* ── 检查记录 ── */
router.get('/', view, h('list'));
router.post('/', manage, h('create'));
router.put('/:id', manage, h('update'));
router.delete('/:id', manage, h('delete'));

/* ── 检查项模板（P2 新增）── */
router.get('/templates', view, h('templateList'));
router.post('/templates', manage, h('templateCreate'));
router.put('/templates/:id', manage, h('templateUpdate'));
router.delete('/templates/:id', manage, h('templateDelete'));

export default router;
