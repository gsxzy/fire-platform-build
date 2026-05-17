import { Router } from 'express';
import { DeviceController } from '@/controllers/device.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof DeviceController) =>
  handleController(`Device.${String(name)}`, DeviceController[name]);

router.get('/', requirePermission('device:view'), h('list'));
router.get('/list', requirePermission('device:view'), h('list'));
router.get('/stats', requirePermission('device:view'), h('stats'));
router.get('/stats/overview', requirePermission('device:view'), h('stats'));
router.get('/types', requirePermission('device:view'), h('types'));
router.get('/:id/config', requirePermission('device:view'), h('getConfig'));
router.post('/', requirePermission('device:create'), h('create'));
router.put('/:id', requirePermission('device:edit'), h('update'));
router.delete('/:id', requirePermission('device:delete'), h('delete'));
router.post('/:id/scrap', requirePermission('device:edit'), h('scrap'));
router.put('/:id/config', requirePermission('device:edit'), h('saveConfig'));

export default router;
