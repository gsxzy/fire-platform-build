import { Router } from 'express';
import { TrainingController } from '@/controllers/training.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof TrainingController) =>
  handleController(`Training.${String(name)}`, TrainingController[name]);

const view = requirePermission('training:view');
const manage = requirePermission('training:manage');

/* ── 课程 ── */
router.get('/courses', view, h('courseList'));
router.post('/courses', manage, h('courseCreate'));
router.put('/courses/:id', manage, h('courseUpdate'));
router.delete('/courses/:id', manage, h('courseDelete'));

/* ── 考试 ── */
router.get('/exams', view, h('examList'));
router.get('/exams/:id', view, h('examById'));
router.post('/exams', manage, h('examCreate'));
router.post('/exams/:id/submit', view, h('examSubmit'));

/* ── 成绩记录 ── */
router.get('/records', view, h('recordList'));
router.get('/records/:id', view, h('recordById'));

export default router;
