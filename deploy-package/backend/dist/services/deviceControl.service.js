"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceControlService = void 0;
/**
 * ═══════════════════════════════════════════════════════════════════
 * 设备反控服务
 * 支持ModbusTCP、GB26875、MQTT等多种协议的远程控制
 * ═══════════════════════════════════════════════════════════════════
 */
const models_1 = require("@/models");
const iot_1 = require("@/iot");
const gb26875_server_1 = require("@/protocols/gb26875.server");
const logger_1 = __importDefault(require("@/config/logger"));
class DeviceControlService {
    /**
     * 发送控制指令
     */
    static async sendCommand(request) {
        try {
            // 获取设备信息
            const device = await models_1.Device.findByPk(request.deviceId);
            if (!device) {
                return { success: false, message: '设备不存在' };
            }
            // 获取IoT设备信息
            const iotDevice = await models_1.IoTDevice.findOne({
                where: { device_sn: device.iot_id }
            });
            if (!iotDevice) {
                return { success: false, message: 'IoT设备不存在' };
            }
            // 创建控制指令记录
            const commandNo = `CTRL_${device.device_no}_${Date.now()}`;
            const command = await models_1.ControlCommand.create({
                cmd_no: commandNo,
                device_id: request.deviceId,
                device_name: device.device_name,
                cmd_type: request.commandType,
                cmd_param: JSON.stringify(request.params),
                status: 0, // 待执行
                operator_id: request.operatorId,
                operator_name: request.operatorName,
            });
            // 根据协议类型选择控制方式
            let result;
            const protocolType = iotDevice.protocol_type || 'MQTT';
            switch (protocolType) {
                case 'ModbusTCP':
                    result = await this.modbusControl(iotDevice, request.params);
                    break;
                case 'GB26875':
                    result = await this.gb26875Control(iotDevice, request.commandType, request.params);
                    break;
                case 'MQTT':
                    result = await this.mqttControl(iotDevice, request.params);
                    break;
                default:
                    result = { success: false, error: '不支持的协议类型' };
            }
            // 更新指令状态
            await models_1.ControlCommand.update({
                status: result.success ? 2 : 3, // 成功或失败
                result: JSON.stringify(result),
                execute_time: new Date(),
            }, { where: { id: command.id } });
            logger_1.default.info(`[DeviceControl] 发送指令: ${commandNo}, 结果: ${result.success ? '成功' : '失败'}`);
            return {
                success: result.success,
                commandId: command.id,
                message: result.success ? '指令发送成功' : result.error || '指令发送失败',
                result: result.data
            };
        }
        catch (err) {
            logger_1.default.error(`[DeviceControl] 发送指令失败: ${err.message}`);
            return { success: false, message: err.message };
        }
    }
    /**
     * ModbusTCP控制
     */
    static async modbusControl(iotDevice, params) {
        try {
            const config = JSON.parse(iotDevice.protocol_config || '{}');
            const { address, port = 502, slaveId = 1 } = config;
            // 使用IoT网关的Modbus读取/写入功能
            const writeResult = await iot_1.iotGateway.writeModbus(address, port, slaveId, params.register, params.value);
            if (writeResult?.success) {
                return { success: true, data: writeResult };
            }
            else {
                return { success: false, error: writeResult?.error || 'Modbus写入失败' };
            }
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    /**
     * GB26875控制
     */
    static async gb26875Control(iotDevice, commandType, params) {
        try {
            const systemId = iotDevice.device_sn;
            // 构造控制参数
            const controlParams = Buffer.alloc(16);
            controlParams.writeUInt8(params.loopNo || 0, 0);
            controlParams.writeUInt8(params.pointNo || 0, 1);
            controlParams.writeUInt8(params.action || 1, 2); // 1启动 0停止
            // 发送指令
            const sent = gb26875_server_1.gb26875Server.sendCommand(systemId, commandType, controlParams);
            if (sent) {
                return { success: true, data: { systemId, commandType } };
            }
            else {
                return { success: false, error: '设备离线' };
            }
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    /**
     * MQTT控制
     */
    static async mqttControl(iotDevice, params) {
        try {
            const command = {
                type: 'control',
                command: params.command,
                value: params.value,
                timestamp: Date.now()
            };
            const result = await iot_1.iotGateway.sendCommand(iotDevice.device_sn, command);
            if (result?.success) {
                return { success: true, data: result };
            }
            else {
                return { success: false, error: result?.error || 'MQTT发送失败' };
            }
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    /**
     * 远程启停设备
     */
    static async remoteStartStop(deviceId, action, operatorId, operatorName) {
        const commandType = action === 'start' ? 1 : 2;
        return this.sendCommand({
            deviceId,
            commandType,
            params: { action: action === 'start' ? 1 : 0 },
            operatorId,
            operatorName
        });
    }
    /**
     * 远程复位设备
     */
    static async remoteReset(deviceId, operatorId, operatorName) {
        return this.sendCommand({
            deviceId,
            commandType: 3,
            params: { action: 'reset' },
            operatorId,
            operatorName
        });
    }
    /**
     * 远程消音
     */
    static async silence(deviceId, operatorId, operatorName) {
        return this.sendCommand({
            deviceId,
            commandType: 4,
            params: { action: 'silence' },
            operatorId,
            operatorName
        });
    }
    /**
     * 批量控制
     */
    static async batchControl(deviceIds, commandType, params, operatorId, operatorName) {
        const results = [];
        for (const deviceId of deviceIds) {
            const result = await this.sendCommand({
                deviceId,
                commandType,
                params,
                operatorId,
                operatorName
            });
            results.push(result);
        }
        return results;
    }
    /**
     * 获取控制历史（分页）
     */
    static async getCommandHistory(deviceId, pageNum = 1, pageSize = 20) {
        const where = {};
        if (deviceId) {
            where.device_id = deviceId;
        }
        const offset = (pageNum - 1) * pageSize;
        const { count, rows } = await models_1.ControlCommand.findAndCountAll({
            where,
            order: [['id', 'DESC']],
            limit: pageSize,
            offset,
        });
        const list = rows.map((cmd) => ({
            id: cmd.id,
            cmd_no: cmd.cmd_no,
            device_id: cmd.device_id,
            device_name: cmd.device_name,
            cmd_type: cmd.cmd_type,
            cmd_param: cmd.cmd_param ? JSON.parse(cmd.cmd_param) : null,
            status: cmd.status,
            result: cmd.result ? JSON.parse(cmd.result) : null,
            execute_time: cmd.execute_time,
            operator_id: cmd.operator_id,
            operator_name: cmd.operator_name,
            created_at: cmd.created_at
        }));
        return { list, total: count, pageNum, pageSize };
    }
}
exports.DeviceControlService = DeviceControlService;
//# sourceMappingURL=deviceControl.service.js.map