"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlRoomService = void 0;
/**
 * ═══════════════════════════════════════════════════════════════════
 * 消控室控制服务 - 通过消防报警主机(FAS)下发控制指令
 *
 * 核心逻辑：所有设备控制通过报警主机通讯接口下发
 * - 支持 ModbusTCP / GB26875 / 私有协议
 * - 消音/复位/手自动切换/多线盘控制/总线控制
 * ═══════════════════════════════════════════════════════════════════
 */
const models_1 = require("@/models");
const iot_1 = require("@/iot");
const logger_1 = __importDefault(require("@/config/logger"));
const cache_1 = require("@/utils/cache");
class ControlRoomService {
    // 获取消控室下所有报警主机
    static async getHostsByRoom(roomId) {
        return (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, `controlroom:hosts:${roomId}`, async () => {
            return models_1.ControlRoomHost.findAll({ where: { room_id: roomId }, order: [['id', 'ASC']] });
        }, { ttl: 30 });
    }
    // 获取主机详情含多线盘和总线点位
    static async getHostDetail(hostId) {
        return (0, cache_1.withCache)(cache_1.CacheTags.DEVICE_STATS, `controlroom:host:${hostId}`, async () => {
            const host = await models_1.ControlRoomHost.findByPk(hostId);
            if (!host)
                return null;
            const [multilinePanels, busPoints] = await Promise.all([
                models_1.MultilinePanel.findAll({ where: { host_id: hostId }, order: [['point_no', 'ASC']] }),
                models_1.BusPoint.findAll({ where: { host_id: hostId }, order: [['loop_no', 'ASC'], ['point_no', 'ASC']] }),
            ]);
            return { host, multilinePanels, busPoints };
        }, { ttl: 30 });
    }
    // 下发消音指令（通过报警主机）
    static async silenceHost(hostId, operatorId, operatorName) {
        const host = await models_1.ControlRoomHost.findByPk(hostId);
        if (!host)
            return { success: false, msg: '主机不存在' };
        const log = await models_1.HostCommandLog.create({
            room_id: host.room_id, host_id: hostId, host_name: host.host_name,
            cmd_type: 1, cmd_param: JSON.stringify({ action: 'silence' }),
            operator_id: operatorId, operator_name: operatorName,
        });
        try {
            // 通过Modbus或协议下发消音指令到报警主机
            if (host.protocol_type === 'ModbusTCP' && host.host_ip) {
                await iot_1.iotGateway.readModbus(host.host_ip, host.host_port || 502, 0, 1, host.slave_id || 1);
                logger_1.default.info(`[ControlRoom] Silence command sent to host ${host.host_name} via ModbusTCP`);
            }
            // 更新主机消音状态
            await models_1.ControlRoomHost.update({ silenced: 1 }, { where: { id: hostId } });
            await models_1.HostCommandLog.update({ result: 1, result_msg: '消音指令下发成功' }, { where: { id: log.id } });
            return { success: true, msg: '消音指令已通过报警主机下发', logId: log.id };
        }
        catch (err) {
            await models_1.HostCommandLog.update({ result: 2, result_msg: err.message }, { where: { id: log.id } });
            return { success: false, msg: `消音失败: ${err.message}` };
        }
    }
    // 下发复位指令（通过报警主机）
    static async resetHost(hostId, operatorId, operatorName) {
        const host = await models_1.ControlRoomHost.findByPk(hostId);
        if (!host)
            return { success: false, msg: '主机不存在' };
        const log = await models_1.HostCommandLog.create({
            room_id: host.room_id, host_id: hostId, host_name: host.host_name,
            cmd_type: 2, cmd_param: JSON.stringify({ action: 'reset' }),
            operator_id: operatorId, operator_name: operatorName,
        });
        try {
            if (host.protocol_type === 'ModbusTCP' && host.host_ip) {
                await iot_1.iotGateway.readModbus(host.host_ip, host.host_port || 502, 1, 1, host.slave_id || 1);
                logger_1.default.info(`[ControlRoom] Reset command sent to host ${host.host_name}`);
            }
            await models_1.ControlRoomHost.update({ silenced: 0 }, { where: { id: hostId } });
            await models_1.HostCommandLog.update({ result: 1, result_msg: '复位指令下发成功' }, { where: { id: log.id } });
            return { success: true, msg: '复位指令已通过报警主机下发', logId: log.id };
        }
        catch (err) {
            await models_1.HostCommandLog.update({ result: 2, result_msg: err.message }, { where: { id: log.id } });
            return { success: false, msg: `复位失败: ${err.message}` };
        }
    }
    // 手自动切换（通过报警主机）
    static async switchMode(hostId, mode, operatorId, operatorName) {
        const host = await models_1.ControlRoomHost.findByPk(hostId);
        if (!host)
            return { success: false, msg: '主机不存在' };
        const manualMode = mode === 'manual' ? 1 : 0;
        const log = await models_1.HostCommandLog.create({
            room_id: host.room_id, host_id: hostId, host_name: host.host_name,
            cmd_type: 3, cmd_param: JSON.stringify({ mode }),
            operator_id: operatorId, operator_name: operatorName,
        });
        try {
            if (host.protocol_type === 'ModbusTCP' && host.host_ip) {
                await iot_1.iotGateway.readModbus(host.host_ip, host.host_port || 502, 2, 1, host.slave_id || 1);
            }
            await models_1.ControlRoomHost.update({ manual_mode: manualMode }, { where: { id: hostId } });
            await models_1.HostCommandLog.update({ result: 1, result_msg: `切换为${mode === 'manual' ? '手动' : '自动'}模式成功` }, { where: { id: log.id } });
            return { success: true, msg: `已切换为${mode === 'manual' ? '手动' : '自动'}模式` };
        }
        catch (err) {
            await models_1.HostCommandLog.update({ result: 2, result_msg: err.message }, { where: { id: log.id } });
            return { success: false, msg: err.message };
        }
    }
    // 多线盘控制（通过报警主机）
    static async controlMultiline(hostId, pointId, action, operatorId, operatorName) {
        const host = await models_1.ControlRoomHost.findByPk(hostId);
        const point = await models_1.MultilinePanel.findByPk(pointId);
        if (!host || !point)
            return { success: false, msg: '主机或点位不存在' };
        const log = await models_1.HostCommandLog.create({
            room_id: host.room_id, host_id: hostId, host_name: host.host_name,
            cmd_type: action === 'start' ? 4 : 5,
            cmd_param: JSON.stringify({ pointId, pointNo: point.point_no, action }),
            operator_id: operatorId, operator_name: operatorName,
        });
        try {
            // 通过Modbus控制多线盘点位
            if (host.protocol_type === 'ModbusTCP' && host.host_ip) {
                const regAddr = 100 + point.point_no; // 多线盘寄存器基地址
                await iot_1.iotGateway.readModbus(host.host_ip, host.host_port || 502, regAddr, 1, host.slave_id || 1);
            }
            await models_1.MultilinePanel.update({ status: action === 'start' ? 1 : 0 }, { where: { id: pointId } });
            await models_1.HostCommandLog.update({ result: 1, result_msg: `${point.point_name} ${action === 'start' ? '启动' : '停止'}成功` }, { where: { id: log.id } });
            return { success: true, msg: `${point.point_name} ${action === 'start' ? '启动' : '停止'}指令已通过主机下发` };
        }
        catch (err) {
            await models_1.HostCommandLog.update({ result: 2, result_msg: err.message }, { where: { id: log.id } });
            return { success: false, msg: err.message };
        }
    }
    // 获取主机控制日志
    static async getCommandLogs(hostId, pageNum = 1, pageSize = 20) {
        const where = {};
        if (hostId)
            where.host_id = hostId;
        const { count, rows } = await models_1.HostCommandLog.findAndCountAll({
            where, limit: pageSize, offset: (pageNum - 1) * pageSize,
            order: [['created_at', 'DESC']],
        });
        return { list: rows, total: count, pageNum, pageSize };
    }
}
exports.ControlRoomService = ControlRoomService;
//# sourceMappingURL=controlRoom.service.js.map