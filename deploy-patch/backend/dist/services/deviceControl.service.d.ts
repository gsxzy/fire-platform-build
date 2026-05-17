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
}
export declare class DeviceControlService {
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
     * 批量控制
     */
    static batchControl(deviceIds: number[], commandType: number, params: any, operatorId: number, operatorName: string): Promise<ControlResult[]>;
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