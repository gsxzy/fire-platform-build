"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("@/controllers/user.controller");
const role_controller_1 = require("@/controllers/role.controller");
const system_controller_1 = require("@/controllers/system.controller");
const auth_controller_1 = require("@/controllers/auth.controller");
const permission_1 = require("@/middleware/permission");
const handleController_1 = require("@/utils/handleController");
const router = (0, express_1.Router)();
const ah = (name) => (0, handleController_1.handleController)(`Auth.${String(name)}`, auth_controller_1.AuthController[name]);
const uh = (name) => (0, handleController_1.handleController)(`User.${String(name)}`, user_controller_1.UserController[name]);
const rh = (name) => (0, handleController_1.handleController)(`Role.${String(name)}`, role_controller_1.RoleController[name]);
const sh = (name) => (0, handleController_1.handleController)(`System.${String(name)}`, system_controller_1.SystemController[name]);
// 用户管理
router.get('/users', (0, permission_1.requirePermission)('system:user:view'), uh('list'));
router.get('/users/list', (0, permission_1.requirePermission)('system:user:view'), uh('list'));
router.post('/users', (0, permission_1.requirePermission)('system:user:create'), uh('create'));
router.put('/users/:id', (0, permission_1.requirePermission)('system:user:edit'), uh('update'));
router.delete('/users/:id', (0, permission_1.requirePermission)('system:user:delete'), uh('delete'));
router.put('/users/:id/reset-password', (0, permission_1.requirePermission)('system:user:edit'), uh('resetPassword'));
// 角色权限
router.get('/roles', (0, permission_1.requirePermission)('system:role:view'), rh('list'));
router.post('/roles', (0, permission_1.requirePermission)('system:role:create'), rh('create'));
router.put('/roles/:id', (0, permission_1.requirePermission)('system:role:edit'), rh('update'));
router.delete('/roles/:id', (0, permission_1.requirePermission)('system:role:delete'), rh('delete'));
router.get('/permissions', (0, permission_1.requirePermission)('system:role:view'), sh('permList'));
// 组织架构
router.get('/departments', (0, permission_1.requirePermission)('system:view'), sh('deptList'));
router.post('/departments', (0, permission_1.requirePermission)('system:view'), sh('deptCreate'));
router.put('/departments/:id', (0, permission_1.requirePermission)('system:view'), sh('deptUpdate'));
router.delete('/departments/:id', (0, permission_1.requirePermission)('system:view'), sh('deptDelete'));
// 个人中心
router.get('/auth/profile', ah('profile'));
router.put('/auth/profile', ah('updateProfile'));
router.put('/auth/password', ah('changePassword'));
// 系统配置
router.get('/config', (0, permission_1.requirePermission)('system:view'), sh('configList'));
router.post('/config', (0, permission_1.requirePermission)('system:view'), sh('configSet'));
router.get('/logs', (0, permission_1.requirePermission)('system:view'), sh('logList'));
router.get('/notify-templates', (0, permission_1.requirePermission)('system:view'), sh('notifyTemplateList'));
router.post('/notify-templates', (0, permission_1.requirePermission)('system:view'), sh('notifyTemplateCreate'));
router.put('/notify-templates/:id', (0, permission_1.requirePermission)('system:view'), sh('notifyTemplateUpdate'));
router.delete('/notify-templates/:id', (0, permission_1.requirePermission)('system:view'), sh('notifyTemplateDelete'));
router.get('/screens', (0, permission_1.requirePermission)('system:view'), sh('screenList'));
router.post('/screens', (0, permission_1.requirePermission)('system:view'), sh('screenSave'));
router.get('/modules', sh('modules'));
router.put('/modules/toggle', (0, permission_1.requirePermission)('system:view'), sh('toggleModule'));
router.get('/dashboard', sh('dashboard'));
exports.default = router;
//# sourceMappingURL=system.routes.js.map