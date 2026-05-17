import { EventEmitter } from 'events';
export declare const MSG_TYPES: Record<number, string>;
export interface ParsedFrame {
    raw: Buffer;
    hex: string;
    seq: number;
    cmd: number;
    isFscnFormat: boolean;
    version: Buffer;
    timestamp: Buffer;
    timestampStr: string;
    srcAddr: Buffer;
    dstAddr: Buffer;
    deviceIdBuf: Buffer;
    deviceId: string;
    dataLen: number;
    data: Buffer;
    checksum: number;
    valid: boolean;
}
export interface FscnEvent {
    type: 'heartbeat' | 'data' | 'alarm' | 'fault' | 'supervisory' | 'unknown';
    deviceId: string;
    cmd: number;
    seq: number;
    raw: string;
    details?: Record<string, unknown>;
}
export declare function decodeBcdTimestamp(buf: Buffer): string;
export declare function encodeBcdTimestamp(date: Date): Buffer;
export declare function calcChecksum(buf: Buffer, start: number, end: number): number;
export declare function buildAckFrame(reqFrame: ParsedFrame): Buffer;
export declare class FrameParser {
    private buffer;
    private readonly MAX_BUFFER;
    push(chunk: Buffer): ParsedFrame[];
    private extractFrame;
    private parseFrame;
}
export declare const DEVICE_TYPE_NAMES: Record<number, string>;
export interface DeviceStatusEvent {
    sysType: number;
    sysAddr: number;
    devType: number;
    devTypeName: string;
    loopNo: number;
    pointNo: number;
    status: number;
    statusHex: string;
    isFire: boolean;
    isFault: boolean;
    isFeedback: boolean;
    isSupervisory: boolean;
    isShield: boolean;
    isDelay: boolean;
    isPre: boolean;
    isStop: boolean;
    alarmType: string | null;
    alarmLevel: string;
    eventTime: string;
}
export declare function parseDeviceStatus(data: Buffer): DeviceStatusEvent[];
export declare const fscn8001Protocol: EventEmitter<any>;
//# sourceMappingURL=fscn8001.service.d.ts.map