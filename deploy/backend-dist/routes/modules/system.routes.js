"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("@/controllers/user.controller");
const role_controller_1 = require("@/controllers/role.controller");
const system_controller_1 = require("@/controllers/system.controller");
const auth_controller_1 = require("@/controllers/auth.controller");
const router = (0, express_1.Router)();
// 用户管理
router.get('/', user_controller_1.UserController.list);
router.get('/list', user_controller_1.UserController.list);
router.post('/', user_controller_1.UserController.create);
router.put('/:id', user_controller_1.UserController.update);
router.delete('/:id', user_controller_1.UserController.delete);
router.put('/:id/reset-password', user_controller_1.UserController.resetPassword);
// 角色权限
router.get('/roles', role_controller_1.RoleController.list);
router.post('/roles', role_controller_1.RoleController.create);
router.put('/roles/:id', role_controller_1.RoleController.update);
router.delete('/roles/:id', role_controller_1.RoleController.delete);
router.get('/permissions', system_controller_1.SystemController.permList);
// 组织架构
router.get('/departments', system_controller_1.SystemController.deptList);
router.post('/departments', system_controller_1.SystemController.deptCreate);
router.put('/departments/:id', system_controller_1.SystemController.deptUpdate);
router.delete('/departments/:id', system_controller_1.SystemController.deptDelete);
// 个人中心
router.get('/auth/profile', auth_controller_1.AuthController.profile);
router.put('/auth/profile', auth_controller_1.AuthController.updateProfile);
router.put('/auth/password', auth_controller_1.AuthController.changePassword);
// 系统配置
router.get('/config', system_controller_1.SystemController.configList);
router.post('/config', system_controller_1.SystemController.configSet);
router.get('/logs', system_controller_1.SystemController.logList);
router.get('/notify-templates', system_controller_1.SystemController.notifyTemplateList);
router.post('/notify-templates', system_controller_1.SystemController.notifyTemplateCreate);
router.put('/notify-templates/:id', system_controller_1.SystemController.notifyTemplateUpdate);
router.delete('/notify-templates/:id', system_controller_1.SystemController.notifyTemplateDelete);
router.get('/screens', system_controller_1.SystemController.screenList);
router.post('/screens', system_controller_1.SystemController.screenSave);
router.get('/modules', system_controller_1.SystemController.modules);
router.put('/modules/toggle', system_controller_1.SystemController.toggleModule);
router.get('/dashboard', system_controller_1.SystemController.dashboard);
exports.default = router;
//# sourceMappingURL=system.routes.js.map