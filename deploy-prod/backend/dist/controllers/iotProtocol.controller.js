"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IoTProtocolController = void 0;
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const iotProtocol_service_1 = require("@/services/iotProtocol.service");
exports.IoTProtocolController = {
    // Modbus读取
    async readModbus(req, res) {
        try {
            const { ip, port, slaveId, registerAddr, quantity } = req.body;
            const result = await iotProtocol_service_1.IoTProtocolService.readModbusDevice(ip, port || 502, slaveId || 1, registerAddr || 0, quantity || 1);
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[IoTProtocol] readModbus 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // SNMP读取
    async readSNMP(req, res) {
        try {
            const { ip, community, oid } = req.body;
            if (!community) {
                return res.status(400).json((0, response_1.fail)('SNMP community 未配置'));
            }
            const result = await iotProtocol_service_1.IoTProtocolService.readSNMPDevice(ip, community, oid);
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[IoTProtocol] readSNMP 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 发送控制指令
    async sendControl(req, res) {
        try {
            const { deviceSn, command } = req.body;
            const result = await iotProtocol_service_1.IoTProtocolService.sendControlCommand(deviceSn, command);
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[IoTProtocol] sendControl 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // 批量读取
    async batchRead(req, res) {
        try {
            const { deviceIds } = req.body;
            const result = await iotProtocol_service_1.IoTProtocolService.batchReadDevices(deviceIds);
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[IoTProtocol] batchRead 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    // MQTT数据解析（设备上报回调）
    async parseMQTT(req, res) {
        try {
            const { topic, payload } = req.body;
            const result = await iotProtocol_service_1.IoTProtocolService.parseMQTTMessage(topic, Buffer.from(payload));
            return res.json((0, response_1.success)(result));
        }
        catch (err) {
            logger_1.default.error(`[IoTProtocol] parseMQTT 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=iotProtocol.controller.js.map