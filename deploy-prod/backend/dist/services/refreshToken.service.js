"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureRefreshTokenTable = ensureRefreshTokenTable;
exports.generateRefreshToken = generateRefreshToken;
exports.storeRefreshToken = storeRefreshToken;
exports.getRefreshTokenData = getRefreshTokenData;
exports.revokeRefreshToken = revokeRefreshToken;
exports.revokeAllUserRefreshTokens = revokeAllUserRefreshTokens;
const crypto_1 = __importDefault(require("crypto"));
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
const logger_1 = __importDefault(require("@/config/logger"));
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
async function ensureRefreshTokenTable() {
    await database_1.default.query(`
    CREATE TABLE IF NOT EXISTS sys_refresh_tokens (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      token VARCHAR(128) NOT NULL UNIQUE,
      user_id VARCHAR(64) NOT NULL,
      username VARCHAR(64) NOT NULL,
      roles JSON,
      expires_at BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}
function generateRefreshToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
async function storeRefreshToken(token, userId, username, roles) {
    const expiresAt = Date.now() + REFRESH_MS;
    try {
        await database_1.default.query(`INSERT INTO sys_refresh_tokens (token, user_id, username, roles, expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), username=VALUES(username), roles=VALUES(roles), expires_at=VALUES(expires_at)`, { replacements: [token, String(userId), username, JSON.stringify(roles ?? []), expiresAt] });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger_1.default.error('[AUTH] 存储 refresh token 失败:', msg);
    }
}
async function getRefreshTokenData(token) {
    const rows = (await database_1.default.query('SELECT user_id, username, roles, expires_at FROM sys_refresh_tokens WHERE token = ? AND expires_at > ?', { replacements: [token, Date.now()], type: sequelize_1.QueryTypes.SELECT }));
    const row = rows[0];
    if (!row)
        return null;
    let roles = row.roles;
    if (typeof roles === 'string') {
        try {
            roles = JSON.parse(roles);
        }
        catch {
            /* keep string */
        }
    }
    return { userId: String(row.user_id), username: row.username, roles };
}
async function revokeRefreshToken(token) {
    await database_1.default.query('DELETE FROM sys_refresh_tokens WHERE token = ?', { replacements: [token] });
}
async function revokeAllUserRefreshTokens(userId) {
    await database_1.default.query('DELETE FROM sys_refresh_tokens WHERE user_id = ?', { replacements: [String(userId)] });
}
//# sourceMappingURL=refreshToken.service.js.map