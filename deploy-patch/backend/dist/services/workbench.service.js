"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkbenchNoticeService = exports.WorkbenchTodoService = void 0;
/**
 * workbench.service.ts — 工作台业务层（待办 + 公告）
 */
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
const cache_1 = require("@/utils/cache");
class WorkbenchTodoService {
    static async list(q) {
        const page = Math.max(1, q.page || 1);
        const pageSize = Math.max(1, Math.min(100, q.pageSize || 20));
        const where = {};
        if (q.status !== undefined)
            where.status = q.status;
        if (q.userId)
            where.user_id = q.userId;
        if (q.keyword) {
            where[sequelize_1.Op.or] = [
                { title: { [sequelize_1.Op.like]: `%${q.keyword}%` } },
                { content: { [sequelize_1.Op.like]: `%${q.keyword}%` } },
            ];
        }
        const { count, rows } = await models_1.Todo.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: pageSize,
            offset: (page - 1) * pageSize,
        });
        return { list: rows, total: count, page, pageSize };
    }
    static async create(body) {
        return models_1.Todo.create(body);
    }
    static async update(id, body) {
        const row = await models_1.Todo.findByPk(id);
        if (!row)
            throw new Error('待办不存在');
        await row.update(body);
        return row;
    }
    static async delete(id) {
        const row = await models_1.Todo.findByPk(id);
        if (!row)
            throw new Error('待办不存在');
        await row.destroy();
        return row;
    }
    static async byId(id) {
        return models_1.Todo.findByPk(id);
    }
    static async countPending(userId) {
        return (0, cache_1.withCache)(cache_1.CacheTags.DASHBOARD, `workbench:pending:${userId || 'all'}`, async () => {
            const where = { status: { [sequelize_1.Op.in]: [0, 1] } };
            if (userId)
                where.user_id = userId;
            return models_1.Todo.count({ where });
        }, { ttl: 30 });
    }
}
exports.WorkbenchTodoService = WorkbenchTodoService;
class WorkbenchNoticeService {
    static async list(q) {
        const page = Math.max(1, q.page || 1);
        const pageSize = Math.max(1, Math.min(100, q.pageSize || 20));
        const where = {};
        if (q.type)
            where.type = q.type;
        if (q.status !== undefined)
            where.status = q.status;
        if (q.keyword) {
            where[sequelize_1.Op.or] = [
                { title: { [sequelize_1.Op.like]: `%${q.keyword}%` } },
                { content: { [sequelize_1.Op.like]: `%${q.keyword}%` } },
            ];
        }
        const { count, rows } = await models_1.Notice.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: pageSize,
            offset: (page - 1) * pageSize,
        });
        return { list: rows, total: count, page, pageSize };
    }
    static async create(body) {
        return models_1.Notice.create(body);
    }
    static async update(id, body) {
        const row = await models_1.Notice.findByPk(id);
        if (!row)
            throw new Error('公告不存在');
        await row.update(body);
        return row;
    }
    static async delete(id) {
        const row = await models_1.Notice.findByPk(id);
        if (!row)
            throw new Error('公告不存在');
        await row.destroy();
        return row;
    }
    static async byId(id) {
        return models_1.Notice.findByPk(id);
    }
}
exports.WorkbenchNoticeService = WorkbenchNoticeService;
//# sourceMappingURL=workbench.service.js.map