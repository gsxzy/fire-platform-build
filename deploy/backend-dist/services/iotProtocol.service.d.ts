export declare class IoTProtocolService {
    static parseMQTTMessage(topic: string, payload: Buffer): Promise<{
        success: boolean;
        deviceId: any;
        parsed: any;
        msg?: undefined;
    } | {
        success: boolean;
        msg: any;
        deviceId?: undefined;
        parsed?: undefined;
    }>;
    private static parse4GDeviceData;
    private static createDeviceAlarm;
    static readModbusDevice(ip: string, port: number, slaveId: number, registerAddr: number, quantity?: number): Promise<{
        success: boolean;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    static readSNMPDevice(ip: string, community: string, oid: string): Promise<unknown>;
    static sendControlCommand(deviceSn: string, command: any): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
    }>;
    static batchReadDevices(deviceIds: number[]): Promise<({
        success: boolean;
        data: any;
        error?: undefined;
        deviceId: number;
        deviceSn: any;
        protocol: string;
        online?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
        deviceId: number;
        deviceSn: any;
        protocol: string;
        online?: undefined;
    } | {
        deviceId: number;
        deviceSn: any;
        protocol: string;
        success?: undefined;
        online?: undefined;
    } | {
        deviceId: number;
        deviceSn: any;
        protocol: any;
        success: boolean;
        online: boolean;
    })[]>;
}
//# sourceMappingURL=iotProtocol.service.d.ts.map