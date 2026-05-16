import { Router } from 'express';
import { AlarmController } from '@/controllers/alarm.controller';

const router = Router();

router.get('/', AlarmController.list);
router.get('/list', AlarmController.list);
router.get('/:id/detail', AlarmController.getDetail);
router.post('/', AlarmController.create);
router.get('/stats', AlarmController.stats);
router.get('/recent', AlarmController.recent);
router.get('/trend', AlarmController.trend);
router.put('/:id/confirm', AlarmController.confirm);
router.put('/:id/handle', AlarmController.handle);
router.put('/:id/dismiss', AlarmController.dismiss);
router.put('/:id/silence', AlarmController.silence);

export default router;
