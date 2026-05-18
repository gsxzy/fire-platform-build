"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleController = void 0;
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
exports.RoleController = {
    async list(req, res) {
        const roles = await models_1.Role.findAll({
            include: [{ model: models_1.Permission, attributes: ['id', 'perm_name', 'perm_code'] }],
        });
        (0, respond_1.sendSuccess)(res, req, roles);
    },
    async create(req, res) {
        const role = await models_1.Role.create(req.body);
        (0, respond_1.sendSuccess)(res, req, { id: role.id }, '创建成功');
    },
    async update(req, res) {
        const { id } = req.params;
        const { roleName, roleCode, description, status, permIds } = req.body;
        await models_1.Role.update({ role_name: roleName, role_code: roleCode, description, status }, { where: { id } });
        if (permIds?.length) {
            const role = await models_1.Role.findByPk(id);
            if (role)
                await role.setPermissions(permIds);
        }
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async delete(req, res) {
        await models_1.Role.destroy({ where: { id: req.params.id } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
};
//# sourceMappingURL=role.controller.js.map