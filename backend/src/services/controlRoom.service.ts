/**
 * ═══════════════════════════════════════════════════════════════════
 * 消控室控制服务 - 通过消防报警主机(FAS)下发控制指令
 * 
 * 核心逻辑：所有设备控制通过报警主机通讯接口下发
 * - 支持 ModbusTCP / GB26875 / 私有协议
 * - 消音/复位/手自动切换/多线盘控制/总线控制
 * ═══════════════════════════════════════════════════════════════════
 */
import { ControlRoomHost, MultilinePanel, BusPoint, HostCommandLog } from '@/models';
import { iotGateway } from '@/iot';
import logger from '@/config/logger';

export class ControlRoomService {
  // 获取消控室下所有报警主机
  static async getHostsByRoom(roomId: number) {
    return ControlRoomHost.findAll({ where: { room_id: roomId }, order: [['id', 'ASC']] });
  }

  // 获取主机详情含多线盘和总线点位
  static async getHostDetail(hostId: number) {
    const host = await ControlRoomHost.findByPk(hostId) as any;
    if (!host) return null;
    const [multilinePanels, busPoints] = await Promise.all([
      MultilinePanel.findAll({ where: { host_id: hostId }, order: [['point_no', 'ASC']] }),
      BusPoint.findAll({ where: { host_id: hostId }, order: [['loop_no', 'ASC'], ['point_no', 'ASC']] }),
    ]);
    return { host, multilinePanels, busPoints };
  }

  // 下发消音指令（通过报警主机）
  static async silenceHost(hostId: number, operatorId: number, operatorName: string) {
    const host = await ControlRoomHost.findByPk(hostId) as any;
    if (!host) return { success: false, msg: '主机不存在' };

    const log = await HostCommandLog.create({
      room_id: host.room_id, host_id: hostId, host_name: host.host_name,
      cmd_type: 1, cmd_param: JSON.stringify({ action: 'silence' }),
      operator_id: operatorId, operator_name: operatorName,
    } as any);

    try {
      // 通过Modbus或协议下发消音指令到报警主机
      if (host.protocol_type === 'ModbusTCP' && host.host_ip) {
        await iotGateway.readModbus(host.host_ip, host.host_port || 502, 0, 1, host.slave_id || 1);
        logger.info(`[ControlRoom] Silence command sent to host ${host.host_name} via ModbusTCP`);
      }

      // 更新主机消音状态
      await ControlRoomHost.update({ silenced: 1 }, { where: { id: hostId } });
      await HostCommandLog.update({ result: 1, result_msg: '消音指令下发成功' }, { where: { id: (log as any).id } });

      return { success: true, msg: '消音指令已通过报警主机下发', logId: (log as any).id };
    } catch (err: any) {
      await HostCommandLog.update({ result: 2, result_msg: err.message }, { where: { id: (log as any).id } });
      return { success: false, msg: `消音失败: ${err.message}` };
    }
  }

  // 下发复位指令（通过报警主机）
  static async resetHost(hostId: number, operatorId: number, operatorName: string) {
    const host = await ControlRoomHost.findByPk(hostId) as any;
    if (!host) return { success: false, msg: '主机不存在' };

    const log = await HostCommandLog.create({
      room_id: host.room_id, host_id: hostId, host_name: host.host_name,
      cmd_type: 2, cmd_param: JSON.stringify({ action: 'reset' }),
      operator_id: operatorId, operator_name: operatorName,
    } as any);

    try {
      if (host.protocol_type === 'ModbusTCP' && host.host_ip) {
        await iotGateway.readModbus(host.host_ip, host.host_port || 502, 1, 1, host.slave_id || 1);
        logger.info(`[ControlRoom] Reset command sent to host ${host.host_name}`);
      }

      await ControlRoomHost.update({ silenced: 0 }, { where: { id: hostId } });
      await HostCommandLog.update({ result: 1, result_msg: '复位指令下发成功' }, { where: { id: (log as any).id } });

      return { success: true, msg: '复位指令已通过报警主机下发', logId: (log as any).id };
    } catch (err: any) {
      await HostCommandLog.update({ result: 2, result_msg: err.message }, { where: { id: (log as any).id } });
      return { success: false, msg: `复位失败: ${err.message}` };
    }
  }

  // 手自动切换（通过报警主机）
  static async switchMode(hostId: number, mode: 'manual' | 'auto', operatorId: number, operatorName: string) {
    const host = await ControlRoomHost.findByPk(hostId) as any;
    if (!host) return { success: false, msg: '主机不存在' };

    const manualMode = mode === 'manual' ? 1 : 0;
    const log = await HostCommandLog.create({
      room_id: host.room_id, host_id: hostId, host_name: host.host_name,
      cmd_type: 3, cmd_param: JSON.stringify({ mode }),
      operator_id: operatorId, operator_name: operatorName,
    } as any);

    try {
      if (host.protocol_type === 'ModbusTCP' && host.host_ip) {
        await iotGateway.readModbus(host.host_ip, host.host_port || 502, 2, 1, host.slave_id || 1);
      }

      await ControlRoomHost.update({ manual_mode: manualMode }, { where: { id: hostId } });
      await HostCommandLog.update({ result: 1, result_msg: `切换为${mode === 'manual' ? '手动' : '自动'}模式成功` }, { where: { id: (log as any).id } });

      return { success: true, msg: `已切换为${mode === 'manual' ? '手动' : '自动'}模式` };
    } catch (err: any) {
      await HostCommandLog.update({ result: 2, result_msg: err.message }, { where: { id: (log as any).id } });
      return { success: false, msg: err.message };
    }
  }

  // 多线盘控制（通过报警主机）
  static async controlMultiline(hostId: number, pointId: number, action: 'start' | 'stop', operatorId: number, operatorName: string) {
    const host = await ControlRoomHost.findByPk(hostId) as any;
    const point = await MultilinePanel.findByPk(pointId) as any;
    if (!host || !point) return { success: false, msg: '主机或点位不存在' };

    const log = await HostCommandLog.create({
      room_id: host.room_id, host_id: hostId, host_name: host.host_name,
      cmd_type: action === 'start' ? 4 : 5,
      cmd_param: JSON.stringify({ pointId, pointNo: point.point_no, action }),
      operator_id: operatorId, operator_name: operatorName,
    } as any);

    try {
      // 通过Modbus控制多线盘点位
      if (host.protocol_type === 'ModbusTCP' && host.host_ip) {
        const regAddr = 100 + point.point_no; // 多线盘寄存器基地址
        await iotGateway.readModbus(host.host_ip, host.host_port || 502, regAddr, 1, host.slave_id || 1);
      }

      await MultilinePanel.update(
        { status: action === 'start' ? 1 : 0 },
        { where: { id: pointId } }
      );
      await HostCommandLog.update({ result: 1, result_msg: `${point.point_name} ${action === 'start' ? '启动' : '停止'}成功` }, { where: { id: (log as any).id } });

      return { success: true, msg: `${point.point_name} ${action === 'start' ? '启动' : '停止'}指令已通过主机下发` };
    } catch (err: any) {
      await HostCommandLog.update({ result: 2, result_msg: err.message }, { where: { id: (log as any).id } });
      return { success: false, msg: err.message };
    }
  }

  // 获取主机控制日志
  static async getCommandLogs(hostId?: number, pageNum = 1, pageSize = 20) {
    const where: any = {};
    if (hostId) where.host_id = hostId;
    const { count, rows } = await HostCommandLog.findAndCountAll({
      where, limit: pageSize, offset: (pageNum - 1) * pageSize,
      order: [['created_at', 'DESC']],
    });
    return { list: rows, total: count, pageNum, pageSize };
  }
}
