"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.multilineList = multilineList;
exports.multilineCreate = multilineCreate;
exports.multilineUpdate = multilineUpdate;
exports.busPointList = busPointList;
exports.busPointCreate = busPointCreate;
exports.busPointUpdate = busPointUpdate;
exports.commandLogs = commandLogs;
const respond_1 = require("@/utils/respond");
const response_1 = require("@/utils/response");
const models_1 = require("@/models");
const controlRoom_service_1 = require("@/services/controlRoom.service");
const logger_1 = __importDefault(require("@/config/logger"));
async function multilineList(req, res) {
    try {
        const { hostId } = req.query;
        const where = {};
        if (hostId)
            where.host_id = hostId;
        const list = await models_1.MultilinePanel.findAll({ where, order: [['point_no', 'ASC']] });
        (0, respond_1.sendSuccess)(res, req, list);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] multilineList 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function multilineCreate(req, res) {
    try {
        const p = await models_1.MultilinePanel.create(req.body);
        (0, respond_1.sendSuccess)(res, req, { id: p.id }, '创建成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] multilineCreate 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function multilineUpdate(req, res) {
    try {
        await models_1.MultilinePanel.update(req.body, { where: { id: req.params.id } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] multilineUpdate 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function busPointList(req, res) {
    try {
        const { hostId, loopNo, status } = req.query;
        const where = {};
        if (hostId)
            where.host_id = hostId;
        if (loopNo)
            where.loop_no = loopNo;
        if (status !== undefined)
            where.status = status;
        const list = await models_1.BusPoint.findAll({ where, order: [['loop_no', 'ASC'], ['point_no', 'ASC']] });
        (0, respond_1.sendSuccess)(res, req, list);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] busPointList 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function busPointCreate(req, res) {
    try {
        const p = await models_1.BusPoint.create(req.body);
        (0, respond_1.sendSuccess)(res, req, { id: p.id }, '创建成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] busPointCreate 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function busPointUpdate(req, res) {
    try {
        await models_1.BusPoint.update(req.body, { where: { id: req.params.id } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] busPointUpdate 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function commandLogs(req, res) {
    try {
        const { hostId, pageNum = 1, pageSize = 20 } = req.query;
        const data = await controlRoom_service_1.ControlRoomService.getCommandLogs(hostId ? +hostId : undefined, +pageNum, +pageSize);
        (0, respond_1.sendPage)(res, req, data.list, data.total, data.pageNum, data.pageSize);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] commandLogs 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
//# sourceMappingURL=point.js.map