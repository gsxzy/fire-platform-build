export interface ParsedCanFrame {
    raw: Buffer;
    hex: string;
    frameInfo: number;
    isExtended: boolean;
    isRtr: boolean;
    dataLen: number;
    canId: number;
    canIdHex: string;
    data: Buffer;
    dataHex: string;
}
export interface FecbusFrame {
    rawHex: string;
    sourceAddr: number;
    targetAddr: number;
    functionCode: number;
    reserved: number;
    loop: number;
    point: number;
    status: number;
    deviceType: number;
}
export interface CanfdnetPacket {
    header: number;
    type: number;
    param: number;
    reserved: number;
    dataLen: number;
    data: Buffer;
    checksum: number;
    actualChecksum: number;
}
export interface CanfdnetCanMessage {
    timestamp: bigint;
    id: number;
    info: number;
    channel: number;
    dataLen: number;
    data: Buffer;
}
export interface CanfdnetCanfdMessage {
    timestamp: bigint;
    id: number;
    info: number;
    channel: number;
    dataLen: number;
    data: Buffer;
}
export declare class CanfdnetParser {
    private buffer;
    private readonly MAX_BUFFER;
    push(chunk: Buffer): ParsedCanFrame[];
    private findSyncPoint;
    private parsePacket;
    private extractFrames;
    private parseCanMessage;
    private parseCanfdMessage;
    private canMessageToParsedFrame;
    private lastErrorLog;
    private canfdMessageToParsedFrame;
    private buildParsedFrame;
}
export declare class FrameParser {
    private buffer;
    private readonly MAX_BUFFER;
    private readonly FRAME_LEN;
    private synced;
    push(chunk: Buffer): ParsedCanFrame[];
    private findSyncPoint;
    private parseAlignedFrame;
}
/**
 * 解析赋安 FECbus 广播帧（FS5102 CAN2.0B 扩展帧）
 *
 * 29 位扩展 ID 布局：
 *   bits 28-23 : 源地址 (6位)
 *   bits 22-17 : 目标地址 (6位)  广播=0x00
 *   bits 16-12 : 功能码 (5位)   0x06=状态广播
 *   bits 11-0  : 保留 (12位)    固定为 0
 *
 * 数据段 8 字节：
 *   D0 : 回路号 (1或2)
 *   D1 : 点位号高字节
 *   D2 : 点位号低字节 (大端: point = D1<<8 | D2)
 *   D3 : 状态 (0x00正常 0x01火警 0x02故障 0x04屏蔽 0x08启动 0x10反馈)
 *   D4 : 设备类型
 *   D5~D7 : 保留
 */
export declare function parseFecbusFrame(frame: ParsedCanFrame): FecbusFrame | null;
//# sourceMappingURL=canet.service.d.ts.map