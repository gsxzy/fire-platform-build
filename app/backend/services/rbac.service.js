/**
 * RBAC 权限服务
 */
const { pool } = require('../utils/db');

// 获取用户所有权限
async function getUserPermissions(userId) {
  const sql = `
    SELECT DISTINCT p.perm_code, p.perm_name, p.perm_type, p.path, p.component
    FROM sys_user_role ur
    INNER JOIN sys_role r ON ur.role_id = r.id AND r.status = 1
    INNER JOIN sys_role_permission rp ON ur.role_id = rp.role_id
    INNER JOIN sys_permission p ON rp.permission_id = p.id AND p.status = 1
    WHERE ur.user_id = ?
  `;
  const [rows] = await pool.query(sql, [userId]);
  return rows;
}

// 获取用户所有角色
async function getUserRoles(userId) {
  const sql = `
    SELECT r.id, r.role_code, r.role_name
    FROM sys_user_role ur
    INNER JOIN sys_role r ON ur.role_id = r.id AND r.status = 1
    WHERE ur.user_id = ?
  `;
  const [rows] = await pool.query(sql, [userId]);
  return rows;
}

// 检查用户是否有某个权限
async function hasPermission(userId, permCode) {
  const sql = `
    SELECT COUNT(*) as count
    FROM sys_user_role ur
    INNER JOIN sys_role r ON ur.role_id = r.id AND r.status = 1
    INNER JOIN sys_role_permission rp ON ur.role_id = rp.role_id
    INNER JOIN sys_permission p ON rp.permission_id = p.id AND p.status = 1
    WHERE ur.user_id = ? AND p.perm_code = ?
  `;
  const [[{ count }]] = await pool.query(sql, [userId, permCode]);
  return count > 0;
}

// 获取用户数据权限范围
async function getUserDataScope(userId) {
  const sql = `
    SELECT scope_type, unit_id
    FROM sys_data_scope
    WHERE user_id = ?
    LIMIT 1
  `;
  const [rows] = await pool.query(sql, [userId]);
  if (rows.length === 0) {
    return { scopeType: 'all', unitId: null };
  }
  return { scopeType: rows[0].scope_type, unitId: rows[0].unit_id };
}

// 构建数据权限过滤条件
function buildDataScopeFilter(scope, userId, tableName = '') {
  const prefix = tableName ? `${tableName}.` : '';
  switch (scope.scopeType) {
    case 'all':
      return '1=1';
    case 'self':
      return `${prefix}created_by = ${userId}`;
    case 'custom':
      return scope.unitId ? `${prefix}unit_id = '${scope.unitId}'` : '1=0';
    case 'dept':
      // 需要获取用户部门ID，这里简化处理
      return `${prefix}unit_id IN (SELECT unit_id FROM sys_user_dept WHERE user_id = ${userId})`;
    default:
      return '1=0';
  }
}

// 获取用户菜单树
async function getUserMenuTree(userId) {
  const sql = `
    SELECT p.id, p.perm_code, p.perm_name, p.path, p.component, p.icon, p.parent_id, p.sort_order
    FROM sys_user_role ur
    INNER JOIN sys_role r ON ur.role_id = r.id AND r.status = 1
    INNER JOIN sys_role_permission rp ON ur.role_id = rp.role_id
    INNER JOIN sys_permission p ON rp.permission_id = p.id AND p.status = 1
    WHERE ur.user_id = ? AND p.perm_type = 'menu'
    ORDER BY p.parent_id, p.sort_order
  `;
  const [rows] = await pool.query(sql, [userId]);
  // 构建树形结构
  const tree = [];
  const map = {};
  rows.forEach(row => {
    map[row.id] = { ...row, children: [] };
  });
  rows.forEach(row => {
    if (row.parent_id === 0) {
      tree.push(map[row.id]);
    } else if (map[row.parent_id]) {
      map[row.parent_id].children.push(map[row.id]);
    }
  });
  return tree;
}

module.exports = {
  getUserPermissions,
  getUserRoles,
  hasPermission,
  getUserDataScope,
  buildDataScopeFilter,
  getUserMenuTree,
};
