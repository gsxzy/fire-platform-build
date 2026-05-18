"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceControlController = void 0;
const respond_1 = require("@/utils/respond");
const validator_1 = require("@/utils/validator");
const deviceControl_service_1 = require("@/services/deviceControl.service");
exports.DeviceControlController = {
    async sendCommand(req, res) {
        const { deviceId, cmdType, cmdParam } = req.body;
        const result = await deviceControl_service_1.DeviceControlService.sendCommand({
            deviceId: Number(deviceId),
            commandType: Number(cmdType),
            params: cmdParam ?? {},
            operatorId: req.user.userId,
            operatorName: req.user.username,
        });
        (0, respond_1.sendSuccess)(res, req, result, result.message);
    },
    async remoteStartStop(req, res) {
        const { deviceId, action } = req.body;
        const result = await deviceControl_service_1.DeviceControlService.remoteStartStop(deviceId, action, req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async remoteReset(req, res) {
        const { deviceId } = req.body;
        const result = await deviceControl_service_1.DeviceControlService.remoteReset(deviceId, req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async silence(req, res) {
        const { deviceId } = req.body;
        const result = await deviceControl_service_1.DeviceControlService.silence(deviceId, req.user.userId, req.user.username);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async batchCommand(req, res) {
        const { deviceIds, cmdType, param } = req.body;
        const ids = Array.isArray(deviceIds) ? deviceIds.map((id) => Number(id)) : [];
        const result = await deviceControl_service_1.DeviceControlService.batchControl(ids, Number(cmdType), param ?? {}, req.user.userId, req.user.username);
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