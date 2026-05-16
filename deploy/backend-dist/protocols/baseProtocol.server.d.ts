/**
 * ═══════════════════════════════════════════════════════════════════
 * BaseProtocolServer - TCP 协议服务器抽象基类
 * 消除 GB26875 / FSCN8001 的重复代码（stop/getStatus/设备同步/告警创建）
 * ═══════════════════════════════════════════════════════════════════
 */
import net, { Socket } from 'net';
import { EventEmitter } from 'events';
import { DeviceHeartbeatService } from '@/services/deviceHeartbeat.service';
export interface BaseConnection {
    socket: Socket;
    lastActive: Date;
    clientIp: string;
}
export declare abstract class BaseProtocolServer<T extends BaseConnection> extends EventEmitter {
    protected server: net.Server | null;
    protected port: number;
    protected host: string;
    protected running: boolean;
    protected connections: Map<string, T>;
    protected heartbeatTimer: NodeJS.Timeout | null;
    protected deviceHeartbeatService: DeviceHeartbeatService;
    protected abstract readonly protocolName: string;
    constructor(port: number, host: string);
    start(): Promise<void>;
    stop(): Promise<void>;
    getStatus(): {
        running: boolean;
        port: number;
        host: string;
        onlineCount: number;
    };
    protected onBeforeStart(): void;
    protected abstract ensureTables(): Promise<void>;
    protected onSocketConnected(_socket: Socket, _clientAddress: string, _clientIp: string): void;
    protected syncUnifiedDevice(deviceSn: string, ip: string | null, state: 'online' | 'offline'): Promise<void>;
    protected createUnifiedAlarm(deviceSn: string, alarmType: string, alarmLevel: string, description: string | null, rawData: string | null): Promise<void>;
}
//# sourceMappingURL=baseProtocol.server.d.ts.map