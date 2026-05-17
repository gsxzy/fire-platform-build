import { Router } from 'express';
import { LinkageController } from '@/controllers/linkage.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof LinkageController) =>
  handleController(`Linkage.${String(name)}`, LinkageController[name]);

const view = requirePermission('monitor:view');
const control = requirePermission('monitor:control');

router.get('/rules', view, h('list'));
router.post('/rules', control, h('create'));
router.put('/rules/:id', control, h('update'));
router.delete('/rules/:id', control, h('delete'));
router.post('/rules/:id/trigger', control, h('manualTrigger'));
router.get('/status/:alarmId', view, h('getStatus'));
router.post('/preset', control, h('applyPreset'));
router.get('/records', view, h('getRecords'));

export default router;
