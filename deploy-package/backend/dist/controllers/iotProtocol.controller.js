"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IoTProtocolController = void 0;
const respond_1 = require("@/utils/respond");
const httpError_1 = require("@/utils/httpError");
const iotProtocol_service_1 = require("@/services/iotProtocol.service");
exports.IoTProtocolController = {
    async readModbus(req, res) {
        const { ip, port, slaveId, registerAddr, quantity } = req.body;
        const result = await iotProtocol_service_1.IoTProtocolService.readModbusDevice(ip, port || 502, slaveId || 1, registerAddr || 0, quantity || 1);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async readSNMP(req, res) {
        const { ip, community, oid } = req.body;
        if (!community)
            throw new httpError_1.HttpError('SNMP community 未配置', 400);
        const result = await iotProtocol_service_1.IoTProtocolService.readSNMPDevice(ip, community, oid);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async sendControl(req, res) {
        const { deviceSn, command } = req.body;
        const result = await iotProtocol_service_1.IoTProtocolService.sendControlCommand(deviceSn, command);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async batchRead(req, res) {
        const { deviceIds } = req.body;
        const result = await iotProtocol_service_1.IoTProtocolService.batchReadDevices(deviceIds);
        (0, respond_1.sendSuccess)(res, req, result);
    },
    async parseMQTT(req, res) {
        const { topic, payload } = req.body;
        const result = await iotProtocol_service_1.IoTProtocolService.parseMQTTMessage(topic, Buffer.from(payload));
        (0, respond_1.sendSuccess)(res, req, result);
    },
};
//# sourceMappingURL=iotProtocol.controller.js.map