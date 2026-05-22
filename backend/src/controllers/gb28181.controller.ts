/**
 * GB28181 国标设备正式控制器
 * 数据源：PostgreSQL `fire_camera` 表（WVP 关闭时的 fallback）
 * 注释：生产环境 WVP 开启时，前端优先从 WVP API + IndexedDB 获取数据；
 *       此控制器仅作为非 WVP 模式的后端数据源。
 */
import type { Request, Response } from 'express';
import sequelize from '@/config/database';
import { sendSuccess, sendDeleted } from '@/utils/response';
import { page } from '@/utils/response';
import { HttpError } from '@/utils/httpError';
import { sanitizePagination } from '@/utils/validator';

function toSnakeCase(k: string): string {
  return k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

async function getTableColumns(tableName: string): Promise<string[] | null> {
  try {
    const [rows] = await sequelize.query(
      `SELECT COLUMN_NAME as col FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      { replacements: [tableName], type: 'SELECT' }
    );
    return (rows as any[]).map((r) => r.col);
  } catch {
    return null;
  }
}

export const GB28181Controller = {
  async list(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const offset = (pageNum - 1) * pageSize;
    const keyword = (req.query.keyword || req.query.search || '') as string;

    let where = '1=1';
    const params: unknown[] = [];
    if (keyword && keyword.trim()) {
      where = '(`name` LIKE ? OR `device_id` LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const [countRows] = await sequelize.query(
      `SELECT COUNT(*) as total FROM \`gb28181_devices\` WHERE ${where}`,
      { replacements: params, type: 'SELECT' }
    );
    const total = (countRows as any)?.total || 0;

    const [rows] = await sequelize.query(
      `SELECT * FROM \`gb28181_devices\` WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      { replacements: [...params, pageSize, offset], type: 'SELECT' }
    );

    const rowArray = Array.isArray(rows) ? rows : (rows ? [rows] : []);
    res.json(page(rowArray as unknown[], total as number, pageNum, pageSize, req.reqId));
  },

  async byId(req: Request, res: Response) {
    const [rows] = await sequelize.query(
      `SELECT * FROM \`gb28181_devices\` WHERE id = ? LIMIT 1`,
      { replacements: [req.params.id], type: 'SELECT' }
    );
    sendSuccess(res, req, (rows as any[])[0] || null);
  },

  async create(req: Request, res: Response) {
    const body = req.body || {};
    const cols = Object.keys(body).map(toSnakeCase);
    const vals = Object.values(body);
    const placeholders = cols.map(() => '?').join(',');

    const [result] = await sequelize.query(
      `INSERT INTO \`gb28181_devices\` (\`${cols.join('`,`')}\`) VALUES (${placeholders})`,
      { replacements: vals }
    );
    sendSuccess(res, req, { id: (result as any).insertId || body.id }, '创建成功');
  },

  async update(req: Request, res: Response) {
    const id = req.params.id;
    const body = req.body || {};
    const validFields = await getTableColumns('gb28181_devices');
    if (!validFields) {
      throw new HttpError('无法获取表结构，拒绝更新', 500);
    }
    const mappedBody: Record<string, any> = {};
    Object.keys(body).forEach((k) => {
      const sk = toSnakeCase(k);
      if (validFields.includes(sk)) mappedBody[sk] = body[k];
    });
    const cols = Object.keys(mappedBody).filter((k) => k !== 'id');
    const vals = cols.map((k) => mappedBody[k]);
    if (!cols.length) {
      sendSuccess(res, req, null, '暂无更新内容');
      return;
    }

    const [result1] = await sequelize.query(
      `UPDATE \`gb28181_devices\` SET ${cols.map((c) => `\`${c}\`=?`).join(',')} WHERE id=?`,
      { replacements: [...vals, id] }
    );

    if ((result1 as any).affectedRows === 0) {
      await sequelize.query(
        `UPDATE \`gb28181_devices\` SET ${cols.map((c) => `\`${c}\`=?`).join(',')} WHERE device_id=?`,
        { replacements: [...vals, id] }
      );
    }

    sendSuccess(res, req, null, '更新成功');
  },

  async delete(req: Request, res: Response) {
    await sequelize.query(
      `DELETE FROM \`gb28181_devices\` WHERE id = ?`,
      { replacements: [req.params.id] }
    );
    sendDeleted(res, req);
  },
};
