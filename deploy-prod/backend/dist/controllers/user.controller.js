"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const sequelize_1 = require("sequelize");
const respond_1 = require("@/utils/respond");
const httpError_1 = require("@/utils/httpError");
const models_1 = require("@/models");
const logger_1 = __importDefault(require("@/config/logger"));
const validator_1 = require("@/utils/validator");
function generateRandomPassword(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
exports.UserController = {
    async list(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { keyword, status, deptId } = req.query;
        const where = {};
        if (keyword) {
            where[sequelize_1.Op.or] = [
                { username: { [sequelize_1.Op.like]: `%${keyword}%` } },
                { real_name: { [sequelize_1.Op.like]: `%${keyword}%` } },
            ];
        }
        if (status !== undefined)
            where.status = status;
        if (deptId)
            where.dept_id = deptId;
        const { count, rows } = await models_1.User.findAndCountAll({
            where,
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
            attributes: { exclude: ['password'] },
            include: [{ model: models_1.Role, attributes: ['id', 'role_name', 'role_code'] }],
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, +pageNum, +pageSize);
    },
    async create(req, res) {
        const { username, password, realName, phone, email, status, deptId, roleIds } = req.body;
        const exists = await models_1.User.findOne({ where: { username } });
        if (exists)
            throw new httpError_1.HttpError('用户名已存在', 409);
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = await models_1.User.create({
            username,
            password: hashed,
            real_name: realName,
            phone,
            email,
            status,
            dept_id: deptId,
        });
        if (roleIds?.length)
            await user.setRoles(roleIds);
        (0, respond_1.sendSuccess)(res, req, { id: user.id }, '创建成功');
    },
    async update(req, res) {
        const { id } = req.params;
        const { realName, phone, email, status, deptId, roleIds } = req.body;
        await models_1.User.update({ real_name: realName, phone, email, status, dept_id: deptId }, { where: { id } });
        if (roleIds?.length) {
            const user = await models_1.User.findByPk(id);
            if (user)
                await user.setRoles(roleIds);
        }
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async delete(req, res) {
        await models_1.User.destroy({ where: { id: req.params.id } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async resetPassword(req, res) {
        const newPwd = generateRandomPassword(10);
        const hashed = await bcryptjs_1.default.hash(newPwd, 10);
        await models_1.User.update({ password: hashed }, { where: { id: req.params.id } });
        logger_1.default.info(`[User] 密码重置 id=${req.params.id}`);
        (0, respond_1.sendSuccess)(res, req, { tempPassword: newPwd }, `密码已重置为临时密码: ${newPwd}，请尽快修改`);
    },
};
//# sourceMappingURL=user.controller.js.map