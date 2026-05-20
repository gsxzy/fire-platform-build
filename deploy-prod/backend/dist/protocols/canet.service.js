"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrameParser = void 0;
exports.parseFecbusFrame = parseFecbusFrame;
/**
 * ═══════════════════════════════════════════════════════════════════
 * 智嵌 CANET 网关 · CAN 帧解析服务
 * 职责：
 * - TCP 流式缓冲，按 13 字节 / 帧拆包
 * - 帧同步与滑动窗口校验（错位恢复）
 * - 赋安 FECbus 广播帧解析（FS5102 CAN2.0B 扩展帧）
 * ═══════════════════════════════════════════════════════════════════
 */
const logger_1 = __importDefault(require("@/config/logger"));
/* ───── 帧信息掩码 ───── */
const FI_FF = 0x80; // bit7: 1=扩展帧
const FI_RTR = 0x40; // bit6: 1=远程帧
const FI_LEN_MASK = 0x0F;
/* ───── 流式帧解析器 ───── */
class FrameParser {
    buffer = Buffer.alloc(0);
    MAX_BUFFER = 65536;
    FRAME_LEN = 13;
    synced = false;
    push(chunk) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        if (this.buffer.length > this.MAX_BUFFER) {
            logger_1.default.warn(`[CANET-Parser] 缓冲区超限 ${this.buffer.length} bytes，清空`);
            this.buffer = Buffer.alloc(0);
            this.synced = false;
            return [];
        }
        const frames = [];
        while (this.buffer.length >= this.FRAME_LEN) {
            if (!this.synced) {
                // 未同步：滑动找帧头（帧信息字节校验）
                const syncIdx = this.findSyncPoint();
                if (syncIdx === -1) {
                    // 找不到同步点，丢弃所有数据
                    this.buffer = Buffer.alloc(0);
                    break;
                }
                if (syncIdx > 0) {
                    logger_1.default.warn(`[CANET-Parser] 丢弃错位 ${syncIdx} 字节，重新同步`);
                    this.buffer = this.buffer.subarray(syncIdx);
                }
                this.synced = true;
            }
            // 同步后按固定 13 字节边界解析
            const frame = this.parseAlignedFrame();
            if (!frame) {
                // 对齐解析失败，需要重新找同步点
                this.synced = false;
                this.buffer = this.buffer.subarray(1);
                continue;
            }
            frames.push(frame);
        }
        return frames;
    }
    /**
     * 找同步点：找第一个看起来像有效帧信息的字节
     * 条件：FF=1(扩展帧) + dataLen <= 8 + (可选) RTR=0
     */
    findSyncPoint() {
        for (let i = 0; i < this.buffer.length; i++) {
            const fi = this.buffer[i];
            const ff = (fi >> 7) & 1;
            const rtr = (fi >> 6) & 1;
            const dataLen = fi & FI_LEN_MASK;
            // 扩展帧 + 非远程帧 + 数据长度合理(0~8)
            if (ff === 1 && rtr === 0 && dataLen <= 8 && dataLen > 0) {
                // 额外校验：如果能凑齐 13 字节，验证 FECbus 保留位是否为 0
                if (this.buffer.length >= i + this.FRAME_LEN) {
                    const id = this.buffer.readUInt32BE(i + 1);
                    const reserved = id & 0xFFF;
                    if (reserved === 0) {
                        return i;
                    }
                }
                else {
                    // 数据不够完整帧，先返回这个位置，等更多数据
                    return i;
                }
            }
        }
        return -1;
    }
    /**
     * 按 13 字节边界解析（要求已同步）
     */
    parseAlignedFrame() {
        if (this.buffer.length < this.FRAME_LEN)
            return null;
        const frameBuf = this.buffer.subarray(0, this.FRAME_LEN);
        const fi = frameBuf[0];
        const ff = (fi >> 7) & 1;
        const rtr = (fi >> 6) & 1;
        const dataLen = fi & FI_LEN_MASK;
        // 基本校验
        if (ff !== 1 || rtr !== 0 || dataLen > 8 || dataLen < 1) {
            return null;
        }
        // 帧 ID 校验：保留位必须为 0（FECbus 规范）
        const canId = frameBuf.readUInt32BE(1);
        const reserved = canId & 0xFFF;
        if (reserved !== 0) {
            return null;
        }
        const data = frameBuf.subarray(5, 5 + dataLen);
        this.buffer = this.buffer.subarray(this.FRAME_LEN);
        return {
            raw: frameBuf,
            hex: frameBuf.toString('hex').toUpperCase(),
            frameInfo: fi,
            isExtended: true,
            isRtr: false,
            dataLen,
            canId,
            canIdHex: frameBuf.subarray(1, 5).toString('hex').toUpperCase(),
            data,
            dataHex: data.toString('hex').toUpperCase(),
        };
    }
}
exports.FrameParser = FrameParser;
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
function parseFecbusFrame(frame) {
    if (!frame.isExtended || frame.isRtr || frame.dataLen !== 8)
        return null;
    const id = frame.canId;
    // 29位扩展ID解析
    const sourceAddr = (id >> 23) & 0x3F; // 6位
    const targetAddr = (id >> 17) & 0x3F; // 6位
    const functionCode = (id >> 12) & 0x1F; // 5位
    const reserved = id & 0xFFF; // 12位
    // FECbus 广播帧特征校验
    if (targetAddr !== 0x00 || functionCode !== 0x06 || reserved !== 0) {
        return null;
    }
    const d = frame.data;
    const loop = d[0];
    const point = (d[1] << 8) | d[2];
    const status = d[3];
    const deviceType = d[4];
    return {
        rawHex: frame.hex,
        sourceAddr,
        targetAddr,
        functionCode,
        reserved,
        loop,
        point,
        status,
        deviceType,
    };
}
//# sourceMappingURL=canet.service.js.map