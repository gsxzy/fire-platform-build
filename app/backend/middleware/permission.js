/**
 * 权限校验中间件
 */
const { hasPermission } = require('../services/rbac.service');
const { fail } = require('../utils/response');

// 权限校验装饰器
function requirePermission(permCode) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(fail('未登录', 401));
      }
      const hasPerm = await hasPermission(userId, permCode);
      if (!hasPerm) {
        return res.status(403).json(fail('无权限', 403));
      }
      next();
    } catch (err) {
      console.error('[PERMISSION] 权限校验失败:', err);
      res.status(500).json(fail('权限校验失败', 500));
    }
  };
}

// 数据权限过滤中间件
function requireDataScope(tableName = '') {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(fail('未登录', 401));
      }
      const { getUserDataScope, buildDataScopeFilter } = require('../services/rbac.service');
      const scope = await getUserDataScope(userId);
      req.dataScopeFilter = buildDataScopeFilter(scope, userId, tableName);
      next();
    } catch (err) {
      console.error('[PERMISSION] 数据权限过滤失败:', err);
      res.status(500).json(fail('数据权限过滤失败', 500));
    }
  };
}

module.exports = { requirePermission, requireDataScope };
