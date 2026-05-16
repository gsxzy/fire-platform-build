"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("@/utils/jwt");
const response_1 = require("@/utils/response");
const models_1 = require("@/models");
const logger_1 = __importDefault(require("@/config/logger"));
const refreshToken_service_1 = require("@/services/refreshToken.service");
function buildLoginUserPayload(user, roles, permissions) {
    return {
        id: user.id,
        userId: user.id,
        username: user.username,
        realName: user.real_name,
        real_name: user.real_name,
        avatar: user.avatar,
        roles: roles.map((r) => r.code),
        permissions,
    };
}
exports.AuthController = {
    async login(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password)
                return res.status(400).json((0, response_1.fail)('用户名和密码不能为空', 400));
            const user = await models_1.User.findOne({
                where: { username },
                include: [{ model: models_1.Role, include: [models_1.Permission] }],
            });
            if (!user)
                return res.status(401).json((0, response_1.fail)('用户名或密码错误', 401));
            if (user.status === 0)
                return res.status(403).json((0, response_1.fail)('账号已被禁用', 403));
            const valid = await bcryptjs_1.default.compare(password, user.password);
            if (!valid)
                return res.status(401).json((0, response_1.fail)('用户名或密码错误', 401));
            await models_1.User.update({ last_login: new Date(), login_ip: req.ip }, { where: { id: user.id } });
            const roles = user.roles?.map((r) => ({ id: r.id, name: r.role_name, code: r.role_code })) || [];
            const permissions = new Set();
            user.roles?.forEach((r) => r.permissions?.forEach((p) => permissions.add(p.perm_code)));
            const accessToken = (0, jwt_1.signToken)({ userId: user.id, username });
            const refreshToken = (0, refreshToken_service_1.generateRefreshToken)();
            await (0, refreshToken_service_1.storeRefreshToken)(refreshToken, user.id, username, roles.map((r) => r.code));
            const userPayload = buildLoginUserPayload(user, roles, Array.from(permissions));
            return res.json((0, response_1.success)({
                accessToken,
                refreshToken,
                tokenType: 'Bearer',
                expiresIn: 86400,
                user: userPayload,
                userInfo: userPayload,
            }, '登录成功'));
        }
        catch (err) {
            logger_1.default.error(`[Auth] login 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`登录失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async refresh(req, res) {
        try {
            const { refreshToken } = req.body || {};
            if (!refreshToken)
                return res.status(400).json((0, response_1.fail)('refreshToken 不能为空', 400));
            const data = await (0, refreshToken_service_1.getRefreshTokenData)(refreshToken);
            if (!data)
                return res.status(401).json((0, response_1.fail)('refreshToken 无效或已过期', 401));
            await (0, refreshToken_service_1.revokeRefreshToken)(refreshToken);
            const user = await models_1.User.findByPk(data.userId, {
                include: [{ model: models_1.Role, include: [models_1.Permission] }],
            });
            if (!user || user.status === 0) {
                return res.status(401).json((0, response_1.fail)('用户不存在或已被禁用', 401));
            }
            const roles = user.roles?.map((r) => ({ id: r.id, name: r.role_name, code: r.role_code })) || [];
            const permissions = new Set();
            user.roles?.forEach((r) => r.permissions?.forEach((p) => permissions.add(p.perm_code)));
            const accessToken = (0, jwt_1.signToken)({ userId: user.id, username: user.username });
            const newRefresh = (0, refreshToken_service_1.generateRefreshToken)();
            await (0, refreshToken_service_1.storeRefreshToken)(newRefresh, user.id, user.username, roles.map((r) => r.code));
            return res.json((0, response_1.success)({ accessToken, refreshToken: newRefresh }, 'Token 刷新成功'));
        }
        catch (err) {
            logger_1.default.error(`[Auth] refresh 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`刷新失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async logout(req, res) {
        try {
            const { refreshToken } = (req.body || {});
            if (refreshToken)
                await (0, refreshToken_service_1.revokeRefreshToken)(refreshToken);
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                const uid = (0, jwt_1.decodeUserIdIgnoreExpiration)(token);
                if (uid != null)
                    await (0, refreshToken_service_1.revokeAllUserRefreshTokens)(uid);
            }
            return res.json((0, response_1.success)(null, '登出成功'));
        }
        catch (err) {
            logger_1.default.error(`[Auth] logout 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`登出失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async register(req, res) {
        try {
            const { username, password, realName, phone } = req.body;
            if (!username || !password)
                return res.status(400).json((0, response_1.fail)('用户名和密码不能为空', 400));
            const exists = await models_1.User.findOne({ where: { username } });
            if (exists)
                return res.status(409).json((0, response_1.fail)('用户名已存在', 409));
            const hashed = await bcryptjs_1.default.hash(password, 10);
            const user = await models_1.User.create({ username, password: hashed, real_name: realName, phone });
            return res.json((0, response_1.success)({ id: user.id }, '注册成功'));
        }
        catch (err) {
            logger_1.default.error(`[Auth] register 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`注册失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async profile(req, res) {
        try {
            const user = await models_1.User.findByPk(req.user.userId, {
                attributes: { exclude: ['password'] },
                include: [models_1.Role],
            });
            return res.json((0, response_1.success)(user));
        }
        catch (err) {
            logger_1.default.error(`[Auth] profile 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`获取失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async updateProfile(req, res) {
        try {
            const { realName, phone, email, avatar } = req.body;
            await models_1.User.update({ real_name: realName, phone, email, avatar }, { where: { id: req.user.userId } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[Auth] updateProfile 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`更新失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async changePassword(req, res) {
        try {
            const { oldPassword, newPassword } = req.body;
            if (!oldPassword || !newPassword) {
                return res.status(400).json((0, response_1.fail)('原密码和新密码不能为空', 400));
            }
            const user = (await models_1.User.findByPk(req.user.userId));
            const valid = await bcryptjs_1.default.compare(oldPassword, user.password);
            if (!valid)
                return res.status(400).json((0, response_1.fail)('原密码错误', 400));
            const hashed = await bcryptjs_1.default.hash(newPassword, 10);
            await models_1.User.update({ password: hashed }, { where: { id: req.user.userId } });
            await (0, refreshToken_service_1.revokeAllUserRefreshTokens)(req.user.userId);
            return res.json((0, response_1.success)(null, '密码修改成功'));
        }
        catch (err) {
            logger_1.default.error(`[Auth] changePassword 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`修改失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=auth.controller.js.map