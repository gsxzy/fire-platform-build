export interface ControlRequest {
    deviceId: number;
    commandType: number;
    params: any;
    operatorId: number;
    operatorName: string;
}
export interface ControlResult {
    success: boolean;
    commandId?: number;
    message: string;
    result?: any;
    needConfirm?: boolean;
    confirmToken?: string;
}
export declare class DeviceControlService {
    /**
     * 判断是否为高危操作
     */
    static isHighRisk(commandType: number): boolean;
    /**
     * 高危操作二次确认 Token 管理
     * - 无 token 时生成并返回 needConfirm=true
     * - 有 token 时验证，通过后删除 token 返回 needConfirm=false
     */
    static requireConfirmToken(commandType: number, confirmToken?: string): Promise<{
        needConfirm: boolean;
        token?: string;
    }>;
    /**
     * 发送控制指令
     */
    static sendCommand(request: ControlRequest): Promise<ControlResult>;
    /**
     * ModbusTCP控制
     */
    private static modbusControl;
    /**
     * GB26875控制
     */
    private static gb26875Control;
    /**
     * MQTT控制
     */
    private static mqttControl;
    /**
     * 远程启停设备
     */
    static remoteStartStop(deviceId: number, action: 'start' | 'stop', operatorId: number, operatorName: string): Promise<ControlResult>;
    /**
     * 远程复位设备
     */
    static remoteReset(deviceId: number, operatorId: number, operatorName: string): Promise<ControlResult>;
    /**
     * 远程消音
     */
    static silence(deviceId: number, operatorId: number, operatorName: string): Promise<ControlResult>;
    /**
     * 批量控制（并行执行 + 超时重试）
     */
    static batchControl(deviceIds: number[], commandType: number, params: any, operatorId: number, operatorName: string, maxRetries?: number): Promise<ControlResult[]>;
    /**
     * 获取控制历史（分页）
     */
    static getCommandHistory(deviceId?: number, pageNum?: number, pageSize?: number): Promise<{
        list: {
            id: any;
            cmd_no: any;
            device_id: any;
            device_name: any;
            cmd_type: any;
            cmd_param: any;
            status: any;
            result: any;
            execute_time: any;
            operator_id: any;
            operator_name: any;
            created_at: any;
        }[];
        total: number;
        pageNum: number;
        pageSize: number;
    }>;
}
//# sourceMappingURL=deviceControl.service.d.ts.map