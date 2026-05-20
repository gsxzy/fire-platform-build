"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hostList = hostList;
exports.hostCreate = hostCreate;
exports.hostUpdate = hostUpdate;
exports.hostDelete = hostDelete;
exports.hostDetail = hostDetail;
exports.silence = silence;
exports.reset = reset;
exports.switchMode = switchMode;
exports.controlMultiline = controlMultiline;
const respond_1 = require("@/utils/respond");
const response_1 = require("@/utils/response");
const models_1 = require("@/models");
const controlRoom_service_1 = require("@/services/controlRoom.service");
const logger_1 = __importDefault(require("@/config/logger"));
async function hostList(req, res) {
    try {
        const { roomId } = req.query;
        const where = {};
        if (roomId)
            where.room_id = roomId;
        const hosts = await models_1.ControlRoomHost.findAll({ where, order: [['id', 'ASC']] });
        (0, respond_1.sendSuccess)(res, req, hosts);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] hostList 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function hostCreate(req, res) {
    try {
        const host = await models_1.ControlRoomHost.create(req.body);
        (0, respond_1.sendSuccess)(res, req, { id: host.id }, '主机添加成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] hostCreate 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function hostUpdate(req, res) {
    try {
        await models_1.ControlRoomHost.update(req.body, { where: { id: req.params.id } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] hostUpdate 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function hostDelete(req, res) {
    try {
        await models_1.ControlRoomHost.destroy({ where: { id: req.params.id } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] hostDelete 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function hostDetail(req, res) {
    try {
        const data = await controlRoom_service_1.ControlRoomService.getHostDetail(+req.params.id);
        if (!data)
            return res.json((0, response_1.fail)('主机不存在'));
        (0, respond_1.sendSuccess)(res, req, data);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] hostDetail 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function silence(req, res) {
    try {
        const { hostId } = req.body;
        const result = await controlRoom_service_1.ControlRoomService.silenceHost(+hostId, req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, result, result.msg);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] silence 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function reset(req, res) {
    try {
        const { hostId } = req.body;
        const result = await controlRoom_service_1.ControlRoomService.resetHost(+hostId, req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, result, result.msg);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] reset 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function switchMode(req, res) {
    try {
        const { hostId, mode } = req.body;
        const result = await controlRoom_service_1.ControlRoomService.switchMode(+hostId, mode, req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, result, result.msg);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] switchMode 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function controlMultiline(req, res) {
    try {
        const { hostId, pointId, action } = req.body;
        const result = await controlRoom_service_1.ControlRoomService.controlMultiline(+hostId, +pointId, action, req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, result, result.msg);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] controlMultiline 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
//# sourceMappingURL=host.js.map