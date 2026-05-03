/**
 * ═══════════════════════════════════════════════════════════════
 * 用户认证路由模块
 * 路径前缀: /api/auth/*
 * 功能：登录/注册/刷新Token/登出/用户信息/修改密码
 * ═══════════════════════════════════════════════════════════════
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../utils/db');
const { success, fail, handleError } = require('../utils/response');
const { validateRequired } = require('../utils/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] 环境变量 JWT_SECRET 未设置');
  if (isProduction) process.exit(1);
}
const _jwtSecret = JWT_SECRET || 'fire-platform-jwt-secret-dev-only';
const BCRYPT_ROUNDS = 10;

/* ── Token 配置 ── */
const ACCESS_TOKEN_EXPIRES = '24h';      // access_token 有效期 24 小时
const REFRESH_TOKEN_EXPIRES = '7d';      // refresh_token 有效期 7 天
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

/* ── Refresh Token 内存存储（生产环境建议改为 Redis/DB） ── */
const refreshTokenStore = new Map(); // token -> { userId, username, roles, expiresAt }

function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

function storeRefreshToken(token, userId, username, roles) {
  refreshTokenStore.set(token, {
    userId,
    username,
    roles,
    expiresAt: Date.now() + REFRESH_TOKEN_EXPIRES_MS,
  });
}

function getRefreshTokenData(token) {
  const data = refreshTokenStore.get(token);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    refreshTokenStore.delete(token);
    return null;
  }
  return data;
}

function revokeRefreshToken(token) {
  refreshTokenStore.delete(token);
}

function revokeAllUserRefreshTokens(userId) {
  for (const [token, data] of refreshTokenStore.entries()) {
    if (data.userId === userId) refreshTokenStore.delete(token);
  }
}

/* ── 生成 Access Token ── */
function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, roles: user.roles },
    _jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRES, issuer: 'fire-platform' }
  );
}

/* ── 生成双 Token 响应 ── */
function tokenResponse(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  storeRefreshToken(refreshToken, user.id, user.username, user.roles);
  return { accessToken, refreshToken };
}

// POST /api/auth/login - 用户登录
router.post('/login', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['username', 'password']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { username, password } = req.body;
    const [rows] = await pool.query(
      'SELECT id, username, password_hash AS password, real_name AS realName, roles, status, created_at AS createdAt FROM users WHERE username = ?',
      [username]
    );
    if (!rows.length) return res.status(401).json(fail('用户名或密码错误', 401));
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json(fail('用户名或密码错误', 401));
    if (user.status === 0) return res.status(403).json(fail('账号已禁用', 403));
    delete user.password;
    const { accessToken, refreshToken } = tokenResponse(user);
    res.json(success({ accessToken, refreshToken, user }, '登录成功'));
  } catch (err) {
    handleError(res, err, req, 'login error');
  }
});

// POST /api/auth/register - 用户注册
router.post('/register', async (req, res) => {
  try {
    const validation = validateRequired(req.body, ['username', 'password']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const { username, password, realName, phone } = req.body;
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [result] = await pool.query(
      'INSERT INTO users (id, username, password_hash, real_name, phone, roles, status) VALUES (UUID(), ?, ?, ?, ?, ?, 1)',
      [username, hash, realName || username, phone || '', 'operator']
    );
    res.json(success({ id: result.insertId }, '注册成功'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json(fail('用户名已存在', 400));
    handleError(res, err, req, 'register error');
  }
});

// POST /api/auth/refresh - 刷新 Access Token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json(fail('refreshToken 不能为空', 400));
    }
    const data = getRefreshTokenData(refreshToken);
    if (!data) {
      return res.status(401).json(fail('refreshToken 无效或已过期', 401));
    }
    // 刷新时重新生成一对新 token（旋转策略，防止重放攻击）
    revokeRefreshToken(refreshToken);
    const user = { id: data.userId, username: data.username, roles: data.roles };
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = tokenResponse(user);
    res.json(success({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }, 'Token 刷新成功'));
  } catch (err) {
    handleError(res, err, req, 'refresh error');
  }
});

// POST /api/auth/logout - 登出（销毁 refreshToken）
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      revokeRefreshToken(refreshToken);
    }
    // 如果有 accessToken，也尝试从 header 中获取用户信息并清理
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, _jwtSecret, { ignoreExpiration: true });
        if (decoded && decoded.userId) {
          revokeAllUserRefreshTokens(decoded.userId);
        }
      } catch { /* ignore */ }
    }
    res.json(success(null, '登出成功'));
  } catch (err) {
    handleError(res, err, req, 'logout error');
  }
});

// GET /api/auth/profile - 获取用户信息（需认证）
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, real_name AS realName, roles, phone, email, avatar, status, created_at AS createdAt FROM users WHERE id = ?',
      [req.user.userId]
    );
    if (!rows.length) return res.status(404).json(fail('用户不存在', 404));
    res.json(success(rows[0]));
  } catch (err) {
    handleError(res, err, req, 'profile error');
  }
});

// PUT /api/auth/password - 修改密码（需认证）
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const validation = validateRequired(req.body, ['oldPassword', 'newPassword']);
    if (!validation.valid) return res.status(400).json(fail(validation.msg, 400));
    const [rows] = await pool.query(
      'SELECT id, password_hash AS password FROM users WHERE id = ?',
      [req.user.userId]
    );
    if (!rows.length) return res.status(404).json(fail('用户不存在', 404));
    const valid = await bcrypt.compare(oldPassword, rows[0].password);
    if (!valid) return res.status(400).json(fail('原密码错误', 400));
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, rows[0].id]);
    // 修改密码后，强制该用户所有设备重新登录
    revokeAllUserRefreshTokens(rows[0].id);
    res.json(success(null, '密码修改成功，请重新登录'));
  } catch (err) {
    handleError(res, err, req, 'password change error');
  }
});

module.exports = router;
