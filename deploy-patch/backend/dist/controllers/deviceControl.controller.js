"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceControlController = void 0;
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const validator_1 = require("@/utils/validator");
const deviceControl_service_1 = require("@/services/deviceControl.service");
exports.DeviceControlController = {
    async sendCommand(req, res) {
        try {
            const { deviceId, cmdType, cmdParam } = req.body;
            const result = await deviceControl_service_1.DeviceControlService.sendCommand({
                deviceId: Number(deviceId),
                commandType: Number(cmdType),
                params: cmdParam ?? {},
                operatorId: req.user.userId,
                operatorName: req.user.username,
            });
            return res.json((0, response_1.success)(result, result.message));
        }
        catch (err) {
            logger_1.default.error(`[DeviceControl] sendCommand 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async remoteStartStop(req, res) {
        try {
            const { deviceId, action } = req.body;
            const result = await deviceControl_service_1.DeviceControlService.remoteStartStop(deviceId, action, req.user.userId, req.user.username);
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[DeviceControl] remoteStartStop 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async remoteReset(req, res) {
        try {
            const { deviceId } = req.body;
            const result = await deviceControl_service_1.DeviceControlService.remoteReset(deviceId, req.user.userId, req.user.username);
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[DeviceControl] remoteReset 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async silence(req, res) {
        try {
            const { deviceId } = req.body;
            const result = await deviceControl_service_1.DeviceControlService.silence(deviceId, req.user.userId, req.user.username);
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[DeviceControl] silence 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async batchCommand(req, res) {
        try {
            const { deviceIds, cmdType, param } = req.body;
            const ids = Array.isArray(deviceIds) ? deviceIds.map((id) => Number(id)) : [];
            const result = await deviceControl_service_1.DeviceControlService.batchControl(ids, Number(cmdType), param ?? {}, req.user.userId, req.user.username);
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[DeviceControl] batchCommand 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async commandHistory(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { deviceId } = req.query;
            const data = await deviceControl_service_1.DeviceControlService.getCommandHistory(deviceId ? +deviceId : undefined, +pageNum, +pageSize);
            return res.json((0, response_1.page)(data.list, data.total, data.pageNum, data.pageSize));
        }
        catch (err) {
            logger_1.default.error(`[DeviceControl] commandHistory 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=deviceControl.controller.js.map