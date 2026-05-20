"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkbenchNoticeController = exports.WorkbenchTodoController = void 0;
const respond_1 = require("@/utils/respond");
const workbench_service_1 = require("@/services/workbench.service");
/* ── 待办 ── */
exports.WorkbenchTodoController = {
    async list(req, res) {
        const q = req.query;
        const data = await workbench_service_1.WorkbenchTodoService.list({
            status: q.status !== undefined ? Number(q.status) : undefined,
            userId: q.userId,
            keyword: q.keyword,
            page: q.page ? Number(q.page) : 1,
            pageSize: q.pageSize ? Number(q.pageSize) : 20,
        });
        (0, respond_1.sendPage)(res, req, data.list, data.total, data.page, data.pageSize);
    },
    async create(req, res) {
        const row = await workbench_service_1.WorkbenchTodoService.create(req.body);
        (0, respond_1.sendSuccess)(res, req, row, '创建成功');
    },
    async update(req, res) {
        const row = await workbench_service_1.WorkbenchTodoService.update(Number(req.params.id), req.body);
        (0, respond_1.sendSuccess)(res, req, row, '更新成功');
    },
    async delete(req, res) {
        await workbench_service_1.WorkbenchTodoService.delete(Number(req.params.id));
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async byId(req, res) {
        const row = await workbench_service_1.WorkbenchTodoService.byId(Number(req.params.id));
        (0, respond_1.sendSuccess)(res, req, row);
    },
    async pendingCount(req, res) {
        const count = await workbench_service_1.WorkbenchTodoService.countPending(req.query.userId);
        (0, respond_1.sendSuccess)(res, req, { count });
    },
};
/* ── 公告 ── */
exports.WorkbenchNoticeController = {
    async list(req, res) {
        const q = req.query;
        const data = await workbench_service_1.WorkbenchNoticeService.list({
            type: q.type,
            status: q.status !== undefined ? Number(q.status) : undefined,
            keyword: q.keyword,
            page: q.page ? Number(q.page) : 1,
            pageSize: q.pageSize ? Number(q.pageSize) : 20,
        });
        (0, respond_1.sendPage)(res, req, data.list, data.total, data.page, data.pageSize);
    },
    async create(req, res) {
        const row = await workbench_service_1.WorkbenchNoticeService.create(req.body);
        (0, respond_1.sendSuccess)(res, req, row, '创建成功');
    },
    async update(req, res) {
        const row = await workbench_service_1.WorkbenchNoticeService.update(Number(req.params.id), req.body);
        (0, respond_1.sendSuccess)(res, req, row, '更新成功');
    },
    async delete(req, res) {
        await workbench_service_1.WorkbenchNoticeService.delete(Number(req.params.id));
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async byId(req, res) {
        const row = await workbench_service_1.WorkbenchNoticeService.byId(Number(req.params.id));
        (0, respond_1.sendSuccess)(res, req, row);
    },
};
//# sourceMappingURL=workbench.controller.js.map