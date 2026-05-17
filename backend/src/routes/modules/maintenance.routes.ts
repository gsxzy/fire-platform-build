import { Router } from 'express';
import { MaintenanceController } from '@/controllers/maintenance.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof MaintenanceController) =>
  handleController(`Maintenance.${String(name)}`, MaintenanceController[name]);

const view = requirePermission('maintenance:view');
const dispatch = requirePermission('maintenance:dispatch');

router.get('/companies', view, h('companyList'));
router.post('/companies', view, h('companyCreate'));
router.put('/companies/:id', view, h('companyUpdate'));
router.delete('/companies/:id', view, h('companyDelete'));
router.get('/contracts', view, h('contractList'));
router.post('/contracts', view, h('contractCreate'));
router.put('/contracts/:id', view, h('contractUpdate'));
router.delete('/contracts/:id', view, h('contractDelete'));
router.get('/work-orders', view, h('workOrderList'));
router.post('/work-orders', view, h('workOrderCreate'));
router.put('/work-orders/:id', view, h('workOrderUpdate'));
router.delete('/work-orders/:id', view, h('workOrderDelete'));
router.put('/work-orders/:id/assign', dispatch, h('workOrderAssign'));
router.put('/work-orders/:id/complete', dispatch, h('workOrderComplete'));
router.get('/stats', view, h('stats'));

export default router;
