/**
 * ═══════════════════════════════════════════════════════════════════
 * 设备反控服务
 * 支持ModbusTCP、GB26875、MQTT等多种协议的远程控制
 * ═══════════════════════════════════════════════════════════════════
 */
import { Device, IoTDevice, ControlCommand } from '@/models';
import { iotGateway } from '@/iot';
import { gb26875Server } from '@/protocols/gb26875.server';
import logger from '@/config/logger';

export interface ControlRequest {
  deviceId: number;
  commandType: number;  // 1远程启停 2参数配置 3复位 4消音
  params: any;
  operatorId: number;
  operatorName: string;
}

export interface ControlResult {
  success: boolean;
  commandId?: number;
  message: string;
  result?: any;
}

export class DeviceControlService {
  /**
   * 发送控制指令
   */
  static async sendCommand(request: ControlRequest): Promise<ControlResult> {
    try {
      // 获取设备信息
      const device = await Device.findByPk(request.deviceId) as any;
      if (!device) {
        return { success: false, message: '设备不存在' };
      }

      // 获取IoT设备信息
      const iotDevice = await IoTDevice.findOne({
        where: { device_sn: device.iot_id }
      }) as any;

      if (!iotDevice) {
        return { success: false, message: 'IoT设备不存在' };
      }

      // 创建控制指令记录
      const commandNo = `CTRL_${device.device_no}_${Date.now()}`;
      const command = await ControlCommand.create({
        cmd_no: commandNo,
        device_id: request.deviceId,
        device_name: device.device_name,
        cmd_type: request.commandType,
        cmd_param: JSON.stringify(request.params),
        status: 0, // 待执行
        operator_id: request.operatorId,
        operator_name: request.operatorName,
      } as any);

      // 根据协议类型选择控制方式
      let result: any;
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
      await ControlCommand.update(
        {
          status: result.success ? 2 : 3, // 成功或失败
          result: JSON.stringify(result),
          execute_time: new Date(),
        },
        { where: { id: (command as any).id } }
      );

      logger.info(`[DeviceControl] 发送指令: ${commandNo}, 结果: ${result.success ? '成功' : '失败'}`);

      return {
        success: result.success,
        commandId: (command as any).id,
        message: result.success ? '指令发送成功' : result.error || '指令发送失败',
        result: result.data
      };
    } catch (err: any) {
      logger.error(`[DeviceControl] 发送指令失败: ${err.message}`);
      return { success: false, message: err.message };
    }
  }

  /**
   * ModbusTCP控制
   */
  private static async modbusControl(iotDevice: any, params: any): Promise<any> {
    try {
      const config = JSON.parse(iotDevice.protocol_config || '{}');
      const { address, port = 502, slaveId = 1 } = config;

      // 使用IoT网关的Modbus读取/写入功能
      const writeResult = await iotGateway.writeModbus(address, port, slaveId, params.register, params.value);

      if (writeResult?.success) {
        return { success: true, data: writeResult };
      } else {
        return { success: false, error: writeResult?.error || 'Modbus写入失败' };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * GB26875控制
   */
  private static async gb26875Control(iotDevice: any, commandType: number, params: any): Promise<any> {
    try {
      const systemId = iotDevice.device_sn;

      // 构造控制参数
      const controlParams = Buffer.alloc(16);
      controlParams.writeUInt8(params.loopNo || 0, 0);
      controlParams.writeUInt8(params.pointNo || 0, 1);
      controlParams.writeUInt8(params.action || 1, 2); // 1启动 0停止

      // 发送指令
      const sent = gb26875Server.sendCommand(systemId, commandType, controlParams);

      if (sent) {
        return { success: true, data: { systemId, commandType } };
      } else {
        return { success: false, error: '设备离线' };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * MQTT控制
   */
  private static async mqttControl(iotDevice: any, params: any): Promise<any> {
    try {
      const command = {
        type: 'control',
        command: params.command,
        value: params.value,
        timestamp: Date.now()
      };

      const result = await iotGateway.sendCommand(iotDevice.device_sn, command);

      if (result?.success) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result?.error || 'MQTT发送失败' };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 远程启停设备
   */
  static async remoteStartStop(deviceId: number, action: 'start' | 'stop', operatorId: number, operatorName: string): Promise<ControlResult> {
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
  static async remoteReset(deviceId: number, operatorId: number, operatorName: string): Promise<ControlResult> {
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
  static async silence(deviceId: number, operatorId: number, operatorName: string): Promise<ControlResult> {
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
  static async batchControl(deviceIds: number[], commandType: number, params: any, operatorId: number, operatorName: string): Promise<ControlResult[]> {
    const results: ControlResult[] = [];

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
  static async getCommandHistory(deviceId?: number, pageNum: number = 1, pageSize: number = 20) {
    const where: any = {};
    if (deviceId) {
      where.device_id = deviceId;
    }

    const offset = (pageNum - 1) * pageSize;
    const { count, rows } = await ControlCommand.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit: pageSize,
      offset,
    });

    const list = rows.map((cmd: any) => ({
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