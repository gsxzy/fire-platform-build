import crypto from 'crypto';
import { QueryTypes } from 'sequelize';
import sequelize from '@/config/database';
import logger from '@/config/logger';

const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

export async function ensureRefreshTokenTable(): Promise<void> {
  await sequelize.query(`
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

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function storeRefreshToken(
  token: string,
  userId: string | number,
  username: string,
  roles: unknown
): Promise<void> {
  const expiresAt = Date.now() + REFRESH_MS;
  try {
    await sequelize.query(
      `INSERT INTO sys_refresh_tokens (token, user_id, username, roles, expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), username=VALUES(username), roles=VALUES(roles), expires_at=VALUES(expires_at)`,
      { replacements: [token, String(userId), username, JSON.stringify(roles ?? []), expiresAt] }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[AUTH] 存储 refresh token 失败:', msg);
  }
}

type RefreshRow = { user_id: string; username: string; roles: unknown; expires_at: number };

export async function getRefreshTokenData(
  token: string
): Promise<{ userId: string; username: string; roles: unknown } | null> {
  const rows = (await sequelize.query(
    'SELECT user_id, username, roles, expires_at FROM sys_refresh_tokens WHERE token = ? AND expires_at > ?',
    { replacements: [token, Date.now()], type: QueryTypes.SELECT }
  )) as RefreshRow[];
  const row = rows[0];
  if (!row) return null;
  let roles = row.roles;
  if (typeof roles === 'string') {
    try {
      roles = JSON.parse(roles);
    } catch {
      /* keep string */
    }
  }
  return { userId: String(row.user_id), username: row.username, roles };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await sequelize.query('DELETE FROM sys_refresh_tokens WHERE token = ?', { replacements: [token] });
}

export async function revokeAllUserRefreshTokens(userId: string | number): Promise<void> {
  await sequelize.query('DELETE FROM sys_refresh_tokens WHERE user_id = ?', { replacements: [String(userId)] });
}
