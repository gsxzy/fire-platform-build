"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleController = void 0;
const response_1 = require("@/utils/response");
const models_1 = require("@/models");
const logger_1 = __importDefault(require("@/config/logger"));
exports.RoleController = {
    async list(req, res) {
        try {
            const roles = await models_1.Role.findAll({ include: [{ model: models_1.Permission, attributes: ['id', 'perm_name', 'perm_code'] }] });
            return res.json((0, response_1.success)(roles));
        }
        catch (err) {
            logger_1.default.error(`[Role] list 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async create(req, res) {
        try {
            const role = await models_1.Role.create(req.body);
            return res.json((0, response_1.success)({ id: role.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[Role] create 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async update(req, res) {
        try {
            const { id } = req.params;
            const { roleName, roleCode, description, status, permIds } = req.body;
            await models_1.Role.update({ role_name: roleName, role_code: roleCode, description, status }, { where: { id } });
            if (permIds?.length) {
                const role = await models_1.Role.findByPk(id);
                if (role)
                    await role.setPermissions(permIds);
            }
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[Role] update 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async delete(req, res) {
        try {
            await models_1.Role.destroy({ where: { id: req.params.id } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[Role] delete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=role.controller.js.map