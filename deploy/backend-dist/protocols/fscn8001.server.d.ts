/**
 * ═══════════════════════════════════════════════════════════════════
 * FSCN8001 TCP 服务器
 * 监听端口: 5201（默认，可通过 FSCN8001_PORT 覆盖）
 * 移植自旧版 JS 后端 fscn8001Server.js
 * ═══════════════════════════════════════════════════════════════════
 */
import { Socket } from 'net';
import { BaseProtocolServer } from './baseProtocol.server';
interface FSCN8001Connection {
    socket: Socket;
    lastActive: Date;
    clientIp: string;
    lastHeartbeat: number;
    loginTime: string;
    ip?: string;
    port?: number;
}
export declare class FSCN8001Server extends BaseProtocolServer<FSCN8001Connection> {
    protected readonly protocolName = "FSCN8001";
    constructor(port?: number, host?: string);
    start(): Promise<void>;
    stop(): Promise<void>;
    private onFrame;
    private handleHeartbeat;
    private handleData;
    private handleFireAlarm;
    private handleFault;
    private handleAck;
    private handleUnknown;
    private startHeartbeatMonitor;
    protected ensureTables(): Promise<void>;
    private upsertDevice;
    private updateDeviceOffline;
    private saveRawLog;
    private insertAlarm;
    protected createUnifiedAlarm(deviceSn: string, alarmType: string, alarmLevel: string, description: string | null, rawData: string | null, deviceType?: number | null): Promise<void>;
}
export declare const fscn8001Server: FSCN8001Server;
export default fscn8001Server;
//# sourceMappingURL=fscn8001.server.d.ts.map