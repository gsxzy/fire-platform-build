import { Router } from 'express';
import { SubsystemController } from '@/controllers/subsystem.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof SubsystemController) =>
  handleController(`Subsystem.${String(name)}`, SubsystemController[name]);

router.get('/', requirePermission('subsystem:view'), h('list'));

export default router;
