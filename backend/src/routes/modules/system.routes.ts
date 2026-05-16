/**
 * 系统管理子路由（预留）
 * 当前在 routes/index.ts 中已扁平化注册所有系统管理路由，此文件未被主动挂载。
 * 保留作为未来模块拆分或路由聚合的参考。
 */
import { Router } from 'express';
import { UserController } from '@/controllers/user.controller';
import { RoleController } from '@/controllers/role.controller';
import { SystemController } from '@/controllers/system.controller';
import { AuthController } from '@/controllers/auth.controller';

const router = Router();

// 用户管理
router.get('/', UserController.list);
router.get('/list', UserController.list);
router.post('/', UserController.create);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.delete);
router.put('/:id/reset-password', UserController.resetPassword);

// 角色权限
router.get('/roles', RoleController.list);
router.post('/roles', RoleController.create);
router.put('/roles/:id', RoleController.update);
router.delete('/roles/:id', RoleController.delete);
router.get('/permissions', SystemController.permList);

// 组织架构
router.get('/departments', SystemController.deptList);
router.post('/departments', SystemController.deptCreate);
router.put('/departments/:id', SystemController.deptUpdate);
router.delete('/departments/:id', SystemController.deptDelete);

// 个人中心
router.get('/auth/profile', AuthController.profile);
router.put('/auth/profile', AuthController.updateProfile);
router.put('/auth/password', AuthController.changePassword);

// 系统配置
router.get('/config', SystemController.configList);
router.post('/config', SystemController.configSet);
router.get('/logs', SystemController.logList);
router.get('/notify-templates', SystemController.notifyTemplateList);
router.post('/notify-templates', SystemController.notifyTemplateCreate);
router.put('/notify-templates/:id', SystemController.notifyTemplateUpdate);
router.delete('/notify-templates/:id', SystemController.notifyTemplateDelete);
router.get('/screens', SystemController.screenList);
router.post('/screens', SystemController.screenSave);
router.get('/modules', SystemController.modules);
router.put('/modules/toggle', SystemController.toggleModule);
router.get('/dashboard', SystemController.dashboard);

export default router;
