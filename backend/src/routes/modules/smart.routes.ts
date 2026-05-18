import { Router } from 'express';
import { SmartAlertController } from '@/controllers/smartAlert.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();

const sa = (name: keyof typeof SmartAlertController) =>
  handleController(`SmartAlert.${String(name)}`, SmartAlertController[name]);

const view = requirePermission('smart:view');
const manage = requirePermission('smart:manage');

router.get('/alerts', view, sa('alertList'));
router.get('/alerts/count', view, sa('alertCount'));
router.post('/alerts', manage, sa('alertCreate'));
router.put('/alerts/:id', manage, sa('alertUpdate'));
router.delete('/alerts/:id', manage, sa('alertDelete'));
router.put('/alerts/:id/confirm', manage, sa('alertConfirm'));
router.put('/alerts/:id/handle', manage, sa('alertHandle'));

export default router;
