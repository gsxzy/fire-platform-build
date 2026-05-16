import { Router } from 'express';
import { MaintenanceController } from '@/controllers/maintenance.controller';

const router = Router();

router.get('/companies', MaintenanceController.companyList);
router.post('/companies', MaintenanceController.companyCreate);
router.put('/companies/:id', MaintenanceController.companyUpdate);
router.delete('/companies/:id', MaintenanceController.companyDelete);
router.get('/contracts', MaintenanceController.contractList);
router.post('/contracts', MaintenanceController.contractCreate);
router.put('/contracts/:id', MaintenanceController.contractUpdate);
router.delete('/contracts/:id', MaintenanceController.contractDelete);
router.get('/work-orders', MaintenanceController.workOrderList);
router.post('/work-orders', MaintenanceController.workOrderCreate);
router.put('/work-orders/:id', MaintenanceController.workOrderUpdate);
router.delete('/work-orders/:id', MaintenanceController.workOrderDelete);
router.put('/work-orders/:id/assign', MaintenanceController.workOrderAssign);
router.put('/work-orders/:id/complete', MaintenanceController.workOrderComplete);
router.get('/stats', MaintenanceController.stats);

export default router;
