import { Router } from 'express';
import { DeviceMaintenanceController } from '@/controllers/deviceMaintenance.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof DeviceMaintenanceController) =>
  handleController(`DeviceMaintenance.${String(name)}`, DeviceMaintenanceController[name]);

const view = requirePermission('maintenance:view');

router.get('/stats', view, h('stats'));
router.get('/list', view, h('list'));
router.post('/', view, h('create'));
router.put('/:id', view, h('update'));
router.delete('/:id', view, h('delete'));

export default router;
