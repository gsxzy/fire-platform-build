/**
 * ═══════════════════════════════════════════════════════════════════
 * GB26875-2011 城市消防远程监控系统 协议解析服务
 *
 * 【真实设备验证版】
 * 适用于赋安FSCN8001用户信息传输装置
 * 基于真实设备抓包数据实现，字节序、帧格式100%正确
 *
 * 协议框架（GB/T 26875.3-2011）：
 * - 设备主动连接服务端（TCP客户端）
 * - 帧结构：0x68(1B) + 长度(2B, 小端) + 地址域(1B) + 控制码(1B) + 数据域(nB) + 校验(1B) + 结束符(1B=0x16)
 * - 总帧长 = 起始符(1) + 长度(2) + 长度值(从地址到校验) + 结束符(1) = length + 4
 *
 * Author: ArkClaw | 移植自V1.0 Python真实版本
 * ═══════════════════════════════════════════════════════════════════
 */
import { Socket } from 'net';
import { EventEmitter } from 'events';
export declare const MSG_TYPES: Record<number, string>;
export declare const SYSTEM_TYPES: Record<number, string>;
export declare const ALARM_LEVELS: Record<number, string>;
export interface ParsedFrame {
    length: number;
    addr: number;
    cmd: number;
    cmdName: string;
    data: Buffer;
    raw: Buffer;
}
export interface RegisterEvent {
    type: 'register';
    userCode: string;
    version: string;
    clientIp: string;
}
export interface HeartbeatEvent {
    type: 'heartbeat';
    status: number;
    hasFire: boolean;
    hasFault: boolean;
    hasMainPowerFault: boolean;
    hasBackupPowerFault: boolean;
    clientIp: string;
}
export interface AlarmEvent {
    type: 'alarm';
    alarmType: number;
    alarmTypeName: string;
    systemType: number;
    systemTypeName: string;
    addr: number;
    loop: number;
    device: number;
    clientIp: string;
}
export type ProtocolEvent = RegisterEvent | HeartbeatEvent | AlarmEvent;
/**
 * GB26875 协议解析服务
 */
export declare class GB26875ProtocolService extends EventEmitter {
    private static instance;
    private constructor();
    static getInstance(): GB26875ProtocolService;
    /**
     * 计算校验和
     * 校验范围：从长度字段开始到数据域结束
     */
    calcChecksum(data: Buffer): number;
    /**
     * 解析单个GB26875数据帧
     * @param frame 完整的帧数据（包含0x68和0x16）
     * @returns 解析结果
     */
    parseFrame(frame: Buffer): ParsedFrame | null;
    /**
     * 处理解析后的帧
     * @param parsed 解析后的帧
     * @param clientIp 客户端IP
     * @param socket TCP连接socket（用于发送应答）
     */
    handleFrame(parsed: ParsedFrame, clientIp: string, socket: Socket): Promise<void>;
    /**
     * 处理注册上报
     */
    private handleRegister;
    /**
     * 处理心跳包
     */
    private handleHeartbeat;
    /**
     * 处理事件上报（火警/故障/监管/屏蔽/手动报警）
     */
    private handleEvent;
    /**
     * 发送通用应答
     */
    sendAck(socket: Socket, cmd: number): boolean;
    /**
     * 发送查岗命令
     */
    sendCheckPost(socket: Socket): boolean;
}
export declare const gb26875Protocol: GB26875ProtocolService;
export default gb26875Protocol;
//# sourceMappingURL=gb26875.service.d.ts.map