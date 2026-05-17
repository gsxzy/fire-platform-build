import { Router } from 'express';
import { DeviceAllocationController } from '@/controllers/deviceAllocation.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof DeviceAllocationController) =>
  handleController(`DeviceAllocation.${String(name)}`, DeviceAllocationController[name]);

const view = requirePermission('device:view');
const edit = requirePermission('device:edit');

router.get('/pending', view, h('listPending'));
router.post('/allocate', edit, h('allocate'));
router.post('/unallocate', edit, h('unallocate'));
router.post('/reallocate', edit, h('reallocate'));
router.get('/list', view, h('listLogs'));

export default router;
