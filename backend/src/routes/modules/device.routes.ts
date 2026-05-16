import { Router } from 'express';
import { DeviceController } from '@/controllers/device.controller';

const router = Router();

router.get('/', DeviceController.list);
router.get('/list', DeviceController.list);
router.post('/', DeviceController.create);
router.put('/:id', DeviceController.update);
router.delete('/:id', DeviceController.delete);
router.post('/:id/scrap', DeviceController.scrap);
router.get('/stats', DeviceController.stats);
router.get('/stats/overview', DeviceController.stats);
router.get('/:id/config', DeviceController.getConfig);
router.put('/:id/config', DeviceController.saveConfig);
router.get('/types', DeviceController.types);

export default router;
