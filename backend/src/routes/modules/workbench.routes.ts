/**
 * workbench.routes.ts — 工作台路由（待办 + 公告）
 * 权限：workbench:view / workbench:manage
 */
import { Router } from 'express';
import { WorkbenchTodoController, WorkbenchNoticeController } from '@/controllers/workbench.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();

const view = requirePermission('workbench:view');
const manage = requirePermission('workbench:manage');

/* ── 待办 ── */
const todo = (name: keyof typeof WorkbenchTodoController) =>
  handleController(`WorkbenchTodo.${String(name)}`, WorkbenchTodoController[name]);

router.get('/todos', view, todo('list'));
router.get('/todos/pending-count', view, todo('pendingCount'));
router.get('/todos/:id', view, todo('byId'));
router.post('/todos', manage, todo('create'));
router.put('/todos/:id', manage, todo('update'));
router.delete('/todos/:id', manage, todo('delete'));

/* ── 公告 ── */
const notice = (name: keyof typeof WorkbenchNoticeController) =>
  handleController(`WorkbenchNotice.${String(name)}`, WorkbenchNoticeController[name]);

router.get('/notices', view, notice('list'));
router.get('/notices/:id', view, notice('byId'));
router.post('/notices', manage, notice('create'));
router.put('/notices/:id', manage, notice('update'));
router.delete('/notices/:id', manage, notice('delete'));

export default router;
