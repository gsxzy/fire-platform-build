import { Router } from 'express';
import { DeviceControlController } from '@/controllers/deviceControl.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof DeviceControlController) =>
  handleController(`DeviceControl.${String(name)}`, DeviceControlController[name]);

const view = requirePermission('device-control:view');
const operate = requirePermission('device-control:operate');

router.post('/command', operate, h('sendCommand'));
router.post('/start-stop', operate, h('remoteStartStop'));
router.post('/reset', operate, h('remoteReset'));
router.post('/silence', operate, h('silence'));
router.post('/batch', operate, h('batchCommand'));
router.get('/history', view, h('commandHistory'));

export default router;
