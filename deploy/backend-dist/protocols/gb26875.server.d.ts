/**
 * ═══════════════════════════════════════════════════════════════════
 * GB26875协议TCP服务器 - 增强版
 * 功能：
 * - 设备连接自动注册，断开自动注销
 * - 精准发送控制指令到指定设备（不再广播）
 * - 原始报文日志持久化（gb26875_raw_log）
 * - 主动查询下发（0x41/0x42/0x43）
 * - 控制命令异步等待响应（0xD0）
 * - 心跳超时检测（3分钟无心跳自动标记离线）
 * ═══════════════════════════════════════════════════════════════════
 */
import { Socket } from 'net';
import { BaseProtocolServer } from './baseProtocol.server';
interface GB26875Connection {
    socket: Socket;
    clientIp: string;
    userCode?: string;
    connectedAt: Date;
    lastActive: Date;
}
export declare class GB26875Server extends BaseProtocolServer<GB26875Connection> {
    protected readonly protocolName = "GB26875";
    private userCodeToConnection;
    private pendingCommands;
    private querySeqCounter;
    constructor(port?: number, host?: string);
    start(): Promise<void>;
    stop(): Promise<void>;
    private handleFrame;
    sendCheckPost(userCode: string): boolean;
    sendControlCommand(userCode: string, commandType: string, params?: {
        hostNo?: number;
        loopNo?: number;
        address?: number;
    }): Promise<boolean>;
    private handleControlResponse;
    private scheduleQueries;
    private buildCommandFrame;
    private nextQuerySeq;
    private startHeartbeatMonitor;
    private startCommandCleanup;
    protected ensureTables(): Promise<void>;
    private saveRawLog;
    private updateDeviceHeartbeat;
    private updateDeviceOffline;
    getOnlineDevices(): Array<{
        userCode?: string;
        clientIp: string;
        connectedAt: Date;
        lastActive: Date;
    }>;
    sendCommand(systemId: string, _commandType: number, payload: Buffer): boolean;
}
export declare const gb26875Server: GB26875Server;
export default gb26875Server;
//# sourceMappingURL=gb26875.server.d.ts.map