/**
 * workbench.service.ts — 工作台业务层（待办 + 公告）
 */
import { Op } from 'sequelize';
import { Todo, Notice } from '@/models';

/* ── 待办 ── */

export interface TodoListQuery {
  status?: number;
  userId?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export class WorkbenchTodoService {
  static async list(q: TodoListQuery) {
    const page = Math.max(1, q.page || 1);
    const pageSize = Math.max(1, Math.min(100, q.pageSize || 20));
    const where: any = {};

    if (q.status !== undefined) where.status = q.status;
    if (q.userId) where.user_id = q.userId;
    if (q.keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${q.keyword}%` } },
        { content: { [Op.like]: `%${q.keyword}%` } },
      ];
    }

    const { count, rows } = await Todo.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return { list: rows, total: count, page, pageSize };
  }

  static async create(body: any) {
    return Todo.create(body);
  }

  static async update(id: number, body: any) {
    const row = await Todo.findByPk(id);
    if (!row) throw new Error('待办不存在');
    await row.update(body);
    return row;
  }

  static async delete(id: number) {
    const row = await Todo.findByPk(id);
    if (!row) throw new Error('待办不存在');
    await row.destroy();
    return row;
  }

  static async byId(id: number) {
    return Todo.findByPk(id);
  }

  static async countPending(userId?: string) {
    const where: any = { status: { [Op.in]: [0, 1] } };
    if (userId) where.user_id = userId;
    return Todo.count({ where });
  }
}

/* ── 公告 ── */

export interface NoticeListQuery {
  type?: string;
  status?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export class WorkbenchNoticeService {
  static async list(q: NoticeListQuery) {
    const page = Math.max(1, q.page || 1);
    const pageSize = Math.max(1, Math.min(100, q.pageSize || 20));
    const where: any = {};

    if (q.type) where.type = q.type;
    if (q.status !== undefined) where.status = q.status;
    if (q.keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${q.keyword}%` } },
        { content: { [Op.like]: `%${q.keyword}%` } },
      ];
    }

    const { count, rows } = await Notice.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return { list: rows, total: count, page, pageSize };
  }

  static async create(body: any) {
    return Notice.create(body);
  }

  static async update(id: number, body: any) {
    const row = await Notice.findByPk(id);
    if (!row) throw new Error('公告不存在');
    await row.update(body);
    return row;
  }

  static async delete(id: number) {
    const row = await Notice.findByPk(id);
    if (!row) throw new Error('公告不存在');
    await row.destroy();
    return row;
  }

  static async byId(id: number) {
    return Notice.findByPk(id);
  }
}
