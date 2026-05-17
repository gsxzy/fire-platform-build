import { Router } from 'express';
import { TrainingController } from '@/controllers/training.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof TrainingController) =>
  handleController(`Training.${String(name)}`, TrainingController[name]);

const view = requirePermission('training:view');
const manage = requirePermission('training:manage');

router.get('/courses', view, h('courseList'));
router.post('/courses', manage, h('courseCreate'));
router.put('/courses/:id', manage, h('courseUpdate'));
router.delete('/courses/:id', manage, h('courseDelete'));
router.get('/exams', view, h('examList'));
router.post('/exams', manage, h('examCreate'));

export default router;
