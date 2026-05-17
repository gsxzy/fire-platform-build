declare class IoTGateway {
    private mqttClient;
    start(): Promise<void>;
    private handleMqttMessage;
    private processAlarm;
    readModbus(ip: string, port: number, address: number, quantity: number, slaveId?: number): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    /** Modbus TCP 写单个保持寄存器 */
    writeModbus(ip: string, port: number, slaveId: number, register: number, value: number): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    readSNMP(ip: string, community: string, oid: string): Promise<unknown>;
    sendCommand(deviceSn: string, command: any): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
    }>;
}
export declare const iotGateway: IoTGateway;
export {};
//# sourceMappingURL=index.d.ts.map