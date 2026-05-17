import { Router } from 'express';
import { UserController } from '@/controllers/user.controller';
import { RoleController } from '@/controllers/role.controller';
import { SystemController } from '@/controllers/system.controller';
import { AuthController } from '@/controllers/auth.controller';
import { requirePermission } from '@/middleware/permission';
import { handleController } from '@/utils/handleController';

const router = Router();

const ah = (name: keyof typeof AuthController) =>
  handleController(`Auth.${String(name)}`, AuthController[name]);
const uh = (name: keyof typeof UserController) =>
  handleController(`User.${String(name)}`, UserController[name]);
const rh = (name: keyof typeof RoleController) =>
  handleController(`Role.${String(name)}`, RoleController[name]);
const sh = (name: keyof typeof SystemController) =>
  handleController(`System.${String(name)}`, SystemController[name]);

// 用户管理
router.get('/users', requirePermission('system:user:view'), uh('list'));
router.get('/users/list', requirePermission('system:user:view'), uh('list'));
router.post('/users', requirePermission('system:user:create'), uh('create'));
router.put('/users/:id', requirePermission('system:user:edit'), uh('update'));
router.delete('/users/:id', requirePermission('system:user:delete'), uh('delete'));
router.put('/users/:id/reset-password', requirePermission('system:user:edit'), uh('resetPassword'));

// 角色权限
router.get('/roles', requirePermission('system:role:view'), rh('list'));
router.post('/roles', requirePermission('system:role:create'), rh('create'));
router.put('/roles/:id', requirePermission('system:role:edit'), rh('update'));
router.delete('/roles/:id', requirePermission('system:role:delete'), rh('delete'));
router.get('/permissions', requirePermission('system:role:view'), sh('permList'));

// 组织架构
router.get('/departments', requirePermission('system:view'), sh('deptList'));
router.post('/departments', requirePermission('system:view'), sh('deptCreate'));
router.put('/departments/:id', requirePermission('system:view'), sh('deptUpdate'));
router.delete('/departments/:id', requirePermission('system:view'), sh('deptDelete'));

// 个人中心
router.get('/auth/profile', ah('profile'));
router.put('/auth/profile', ah('updateProfile'));
router.put('/auth/password', ah('changePassword'));

// 系统配置
router.get('/config', requirePermission('system:view'), sh('configList'));
router.post('/config', requirePermission('system:view'), sh('configSet'));
router.get('/logs', requirePermission('system:view'), sh('logList'));
router.get('/notify-templates', requirePermission('system:view'), sh('notifyTemplateList'));
router.post('/notify-templates', requirePermission('system:view'), sh('notifyTemplateCreate'));
router.put('/notify-templates/:id', requirePermission('system:view'), sh('notifyTemplateUpdate'));
router.delete('/notify-templates/:id', requirePermission('system:view'), sh('notifyTemplateDelete'));
router.get('/screens', requirePermission('system:view'), sh('screenList'));
router.post('/screens', requirePermission('system:view'), sh('screenSave'));
router.get('/modules', sh('modules'));
router.put('/modules/toggle', requirePermission('system:view'), sh('toggleModule'));
router.get('/dashboard', sh('dashboard'));

export default router;
