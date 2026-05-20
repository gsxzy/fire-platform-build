"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceControlController = void 0;
const respond_1 = require("@/utils/respond");
const validator_1 = require("@/utils/validator");
const deviceControl_service_1 = require("@/services/deviceControl.service");
exports.DeviceControlController = {
    async sendCommand(req, res) {
        const { deviceId, cmdType, cmdParam, confirmToken } = req.body;
        const commandType = Number(cmdType);
        try {
            const confirm = await deviceControl_service_1.DeviceControlService.requireConfirmToken(commandType, confirmToken);
            if (confirm.needConfirm) {
                (0, respond_1.sendSuccess)(res, req, { needConfirm: true, confirmToken: confirm.token }, '高危操作，请二次确认');
                return;
            }
        }
        catch (err) {
            (0, respond_1.sendSuccess)(res, req, { success: false, message: err.message }, err.message);
            return;
        }
        const result = await deviceControl_service_1.DeviceControlService.sendCommand({
            deviceId: Number(deviceId),
            commandType,
            params: cmdParam ?? {},
            operatorId: req.user.userId,
            operatorName: req.user.username,
        });
        (0, respond_1.sendSuccess)(res, req, result, result.message);
    },
    async remoteStartStop(req, res) {
        const { deviceId, action, confirmToken } = req.body;
        const commandType = action === 'start' ? 1 : 2;
        try {
            const confirm = await deviceControl_service_1.DeviceControlService.requireConfirmToken(commandType, confirmToken);
            if (confirm.needConfirm) {
                (0, respond_1.sendSuccess)(res, req, { needConfirm: true, confirmToken: confirm.token }, '高危操作，请二次确认');
                return;
            }
        }
        catch (err) {
            (0, respond_1.sendSuccess)(res, req, { success: false, message: err.message }, err.message);
            return;
        }
        const result = await deviceControl_service_1.DeviceControlService.remoteStartStop(deviceId, action, req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async remoteReset(req, res) {
        const { deviceId, confirmToken } = req.body;
        try {
            const confirm = await deviceControl_service_1.DeviceControlService.requireConfirmToken(3, confirmToken);
            if (confirm.needConfirm) {
                (0, respond_1.sendSuccess)(res, req, { needConfirm: true, confirmToken: confirm.token }, '复位为高危操作，请二次确认');
                return;
            }
        }
        catch (err) {
            (0, respond_1.sendSuccess)(res, req, { success: false, message: err.message }, err.message);
            return;
        }
        const result = await deviceControl_service_1.DeviceControlService.remoteReset(deviceId, req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async silence(req, res) {
        const { deviceId, confirmToken } = req.body;
        try {
            const confirm = await deviceControl_service_1.DeviceControlService.requireConfirmToken(4, confirmToken);
            if (confirm.needConfirm) {
                (0, respond_1.sendSuccess)(res, req, { needConfirm: true, confirmToken: confirm.token }, '消音为高危操作，请二次确认');
                return;
            }
        }
        catch (err) {
            (0, respond_1.sendSuccess)(res, req, { success: false, message: err.message }, err.message);
            return;
        }
        const result = await deviceControl_service_1.DeviceControlService.silence(deviceId, req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async batchCommand(req, res) {
        const { deviceIds, cmdType, param, confirmToken } = req.body;
        const commandType = Number(cmdType);
        try {
            const confirm = await deviceControl_service_1.DeviceControlService.requireConfirmToken(commandType, confirmToken);
            if (confirm.needConfirm) {
                (0, respond_1.sendSuccess)(res, req, { needConfirm: true, confirmToken: confirm.token }, '批量控制为高危操作，请二次确认');
                return;
            }
        }
        catch (err) {
            (0, respond_1.sendSuccess)(res, req, { success: false, message: err.message }, err.message);
            return;
        }
        const ids = Array.isArray(deviceIds) ? deviceIds.map((id) => Number(id)) : [];
        const result = await deviceControl_service_1.DeviceControlService.batchControl(ids, commandType, param ?? {}, req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async commandHistory(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { deviceId } = req.query;
        const data = await deviceControl_service_1.DeviceControlService.getCommandHistory(deviceId ? +deviceId : undefined, +pageNum, +pageSize);
        (0, respond_1.sendPage)(res, req, data.list, data.total, data.pageNum, data.pageSize);
    },
};
//# sourceMappingURL=deviceControl.controller.js.map