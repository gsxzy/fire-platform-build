/**
 * ═══════════════════════════════════════════════════════════════
 * 数据库连接池管理与健康检查
 * ═══════════════════════════════════════════════════════════════
 */
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config/database');

const dbConfig = getDbConfig();
const pool = mysql.createPool(dbConfig);

/* ── 连接池健康检查 ── */
async function healthCheck() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return true;
  } catch (err) {
    console.error('[DB.healthCheck] failed:', err.message);
    return false;
  }
}

/* ── 带重试的查询执行 ── */
async function queryWithRetry(sql, params, retries = 2) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      lastErr = err;
      if (i < retries && (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST')) {
        console.warn(`[DB] Query retry ${i + 1}/${retries}: ${err.code}`);
        await new Promise(r => setTimeout(r, 100 * (i + 1)));
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

module.exports = { pool, healthCheck, queryWithRetry };
