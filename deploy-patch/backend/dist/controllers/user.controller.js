"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const sequelize_1 = require("sequelize");
const response_1 = require("@/utils/response");
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
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { keyword, status, deptId } = req.query;
            const where = {};
            if (keyword)
                where[sequelize_1.Op.or] = [{ username: { [sequelize_1.Op.like]: `%${keyword}%` } }, { real_name: { [sequelize_1.Op.like]: `%${keyword}%` } }];
            if (status !== undefined)
                where.status = status;
            if (deptId)
                where.dept_id = deptId;
            const { count, rows } = await models_1.User.findAndCountAll({
                where, limit: +pageSize, offset: (+pageNum - 1) * +pageSize,
                attributes: { exclude: ['password'] }, include: [{ model: models_1.Role, attributes: ['id', 'role_name', 'role_code'] }],
                order: [['created_at', 'DESC']],
            });
            return res.json((0, response_1.page)(rows, count, +pageNum, +pageSize));
        }
        catch (err) {
            logger_1.default.error(`[User] list 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async create(req, res) {
        try {
            const { username, password, realName, phone, email, status, deptId, roleIds } = req.body;
            const exists = await models_1.User.findOne({ where: { username } });
            if (exists)
                return res.status(409).json((0, response_1.fail)('用户名已存在', 409));
            const hashed = await bcryptjs_1.default.hash(password, 10);
            const user = await models_1.User.create({ username, password: hashed, real_name: realName, phone, email, status, dept_id: deptId });
            if (roleIds?.length)
                await user.setRoles(roleIds);
            return res.json((0, response_1.success)({ id: user.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[User] create 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async update(req, res) {
        try {
            const { id } = req.params;
            const { realName, phone, email, status, deptId, roleIds } = req.body;
            await models_1.User.update({ real_name: realName, phone, email, status, dept_id: deptId }, { where: { id } });
            if (roleIds?.length) {
                const user = await models_1.User.findByPk(id);
                if (user)
                    await user.setRoles(roleIds);
            }
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[User] update 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async delete(req, res) {
        try {
            await models_1.User.destroy({ where: { id: req.params.id } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[User] delete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async resetPassword(req, res) {
        try {
            const newPwd = generateRandomPassword(10);
            const hashed = await bcryptjs_1.default.hash(newPwd, 10);
            await models_1.User.update({ password: hashed }, { where: { id: req.params.id } });
            logger_1.default.info(`[User] 密码重置 id=${req.params.id}`);
            return res.json((0, response_1.success)({ tempPassword: newPwd }, `密码已重置为临时密码: ${newPwd}，请尽快修改`));
        }
        catch (err) {
            logger_1.default.error(`[User] resetPassword 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=user.controller.js.map