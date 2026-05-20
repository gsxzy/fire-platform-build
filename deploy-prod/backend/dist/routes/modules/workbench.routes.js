"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * workbench.routes.ts — 工作台路由（待办 + 公告）
 * 权限：workbench:view / workbench:manage
 */
const express_1 = require("express");
const workbench_controller_1 = require("@/controllers/workbench.controller");
const handleController_1 = require("@/utils/handleController");
const permission_1 = require("@/middleware/permission");
const router = (0, express_1.Router)();
const view = (0, permission_1.requirePermission)('workbench:view');
const manage = (0, permission_1.requirePermission)('workbench:manage');
/* ── 待办 ── */
const todo = (name) => (0, handleController_1.handleController)(`WorkbenchTodo.${String(name)}`, workbench_controller_1.WorkbenchTodoController[name]);
router.get('/todos', view, todo('list'));
router.get('/todos/pending-count', view, todo('pendingCount'));
router.get('/todos/:id', view, todo('byId'));
router.post('/todos', manage, todo('create'));
router.put('/todos/:id', manage, todo('update'));
router.delete('/todos/:id', manage, todo('delete'));
/* ── 公告 ── */
const notice = (name) => (0, handleController_1.handleController)(`WorkbenchNotice.${String(name)}`, workbench_controller_1.WorkbenchNoticeController[name]);
router.get('/notices', view, notice('list'));
router.get('/notices/:id', view, notice('byId'));
router.post('/notices', manage, notice('create'));
router.put('/notices/:id', manage, notice('update'));
router.delete('/notices/:id', manage, notice('delete'));
exports.default = router;
//# sourceMappingURL=workbench.routes.js.map