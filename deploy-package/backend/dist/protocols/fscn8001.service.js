"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fscn8001Protocol = exports.DEVICE_TYPE_NAMES = exports.FrameParser = exports.MSG_TYPES = void 0;
exports.decodeBcdTimestamp = decodeBcdTimestamp;
exports.encodeBcdTimestamp = encodeBcdTimestamp;
exports.calcChecksum = calcChecksum;
exports.buildAckFrame = buildAckFrame;
exports.parseDeviceStatus = parseDeviceStatus;
/**
 * ═══════════════════════════════════════════════════════════════════
 * FSCN8001 协议解析服务
 * 移植自旧版 JS 后端 fscn8001Server.js
 * ═══════════════════════════════════════════════════════════════════
 */
const logger_1 = __importDefault(require("@/config/logger"));
const events_1 = require("events");
/* ───── 消息类型定义 ───── */
exports.MSG_TYPES = {
    0x01: '心跳',
    0x02: '数据上报',
    0x03: '火警',
    0x04: '故障',
    0x05: '监管/设备应答',
};
/* ───── BCD 时间戳编解码 ───── */
function decodeBcdTimestamp(buf) {
    if (!buf || buf.length < 6)
        return '??';
    const s = ((buf[0] >> 4) * 10 + (buf[0] & 0x0F)).toString().padStart(2, '0');
    const m = ((buf[1] >> 4) * 10 + (buf[1] & 0x0F)).toString().padStart(2, '0');
    const h = ((buf[2] >> 4) * 10 + (buf[2] & 0x0F)).toString().padStart(2, '0');
    const d = ((buf[3] >> 4) * 10 + (buf[3] & 0x0F)).toString().padStart(2, '0');
    const M = ((buf[4] >> 4) * 10 + (buf[4] & 0x0F)).toString().padStart(2, '0');
    let y = ((buf[5] >> 4) * 10 + (buf[5] & 0x0F));
    // 校正年份：如果设备年份明显错误（如2020），使用当前年份
    const currentYear = new Date().getFullYear();
    if (y < currentYear - 2000 - 1 || y > currentYear - 2000 + 1) {
        y = currentYear - 2000;
    }
    return `20${y.toString().padStart(2, '0')}-${M}-${d} ${h}:${m}:${s}`;
}
function encodeBcdTimestamp(date) {
    const s = Math.floor(date.getSeconds() / 10) * 16 + (date.getSeconds() % 10);
    const m = Math.floor(date.getMinutes() / 10) * 16 + (date.getMinutes() % 10);
    const h = Math.floor(date.getHours() / 10) * 16 + (date.getHours() % 10);
    const d = Math.floor(date.getDate() / 10) * 16 + (date.getDate() % 10);
    const M = Math.floor((date.getMonth() + 1) / 10) * 16 + ((date.getMonth() + 1) % 10);
    const y = Math.floor((date.getFullYear() % 100) / 10) * 16 + ((date.getFullYear() % 100) % 10);
    return Buffer.from([s, m, h, d, M, y]);
}
/* ───── 校验和计算 ───── */
function calcChecksum(buf, start, end) {
    let sum = 0;
    for (let i = start; i < end; i++)
        sum += buf[i];
    return sum & 0xFF;
}
/* ───── 构建确认帧（关键：防止 2 分钟掉线）──── */
function buildAckFrame(reqFrame) {
    const respCmd = reqFrame.cmd + 0x80;
    let respData;
    if (reqFrame.cmd === 0x01) {
        respData = Buffer.from([0x03, 0x00, 0x02, 0xBE, 0x00, 0x00]);
    }
    else if (reqFrame.cmd === 0x02) {
        respData = Buffer.from([0x03, 0x00, 0x02, 0xBE, 0x01, 0x00]);
    }
    else {
        respData = Buffer.alloc(0);
    }
    const respDataLen = respData.length;
    if (reqFrame.isFscnFormat) {
        const resp = Buffer.alloc(30 + respDataLen);
        let off = 0;
        resp.writeUInt16BE(0x4040, off);
        off += 2;
        resp.writeUInt16LE(reqFrame.seq, off);
        off += 2;
        reqFrame.version.copy(resp, off);
        off += 2;
        const nowTs = encodeBcdTimestamp(new Date());
        nowTs.copy(resp, off);
        off += 6;
        reqFrame.dstAddr.copy(resp, off);
        off += 6;
        reqFrame.srcAddr.copy(resp, off);
        off += 6;
        resp.writeUInt16LE(respDataLen, off);
        off += 2;
        resp.writeUInt8(respCmd, off);
        off += 1;
        respData.copy(resp, off);
        off += respDataLen;
        const cs = calcChecksum(resp, 2, off);
        resp.writeUInt8(cs, off);
        off += 1;
        resp.writeUInt16BE(0x2323, off);
        off += 2;
        logger_1.default.debug(`[FSCN8001] -> 确认帧[FSCN] cmd=0x${respCmd.toString(16).padStart(2, '0').toUpperCase()} seq=${reqFrame.seq}`);
        return resp;
    }
    else {
        const resp = Buffer.alloc(8 + respDataLen);
        let off = 0;
        resp.writeUInt16BE(0x4040, off);
        off += 2;
        resp.writeUInt8(reqFrame.raw[2], off);
        off += 1;
        resp.writeUInt8(reqFrame.raw[3], off);
        off += 1;
        resp.writeUInt8(respCmd, off);
        off += 1;
        respData.copy(resp, off);
        off += respDataLen;
        const cs = calcChecksum(resp, 2, off);
        resp.writeUInt8(cs, off);
        off += 1;
        resp.writeUInt16BE(0x2323, off);
        off += 2;
        logger_1.default.debug(`[FSCN8001] -> 确认帧[GB26875] cmd=0x${respCmd.toString(16).padStart(2, '0').toUpperCase()} seq=${reqFrame.seq}`);
        return resp;
    }
}
/* ───── 帧解析器 ───── */
class FrameParser {
    buffer = Buffer.alloc(0);
    MAX_BUFFER = 65536;
    push(chunk) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        if (this.buffer.length > this.MAX_BUFFER) {
            logger_1.default.warn(`[FSCN8001] 缓冲区超限 ${this.buffer.length} bytes，清空`);
            this.buffer = Buffer.alloc(0);
            return [];
        }
        const frames = [];
        while (true) {
            const frame = this.extractFrame();
            if (!frame)
                break;
            frames.push(frame);
        }
        return frames;
    }
    extractFrame() {
        const buf = this.buffer;
        const start = buf.indexOf(Buffer.from([0x40, 0x40]));
        if (start === -1) {
            this.buffer = Buffer.alloc(0);
            return null;
        }
        if (start > 0) {
            logger_1.default.warn(`[FSCN8001] 丢弃帧头前 ${start} 字节垃圾数据`);
            this.buffer = buf.subarray(start);
        }
        if (this.buffer.length < 8)
            return null;
        let end = -1;
        for (let i = 4; i < this.buffer.length - 1; i++) {
            if (this.buffer[i] === 0x23 && this.buffer[i + 1] === 0x23) {
                end = i + 1;
                break;
            }
        }
        if (end === -1)
            return null;
        const frameBuf = this.buffer.subarray(0, end + 1);
        this.buffer = this.buffer.subarray(end + 1);
        return this.parseFrame(frameBuf);
    }
    parseFrame(buf) {
        const header = buf.readUInt16BE(0);
        const footer = buf.readUInt16BE(buf.length - 2);
        if (header !== 0x4040) {
            logger_1.default.error(`[FSCN8001] 帧头错误: 期望=0x4040, 实际=0x${header.toString(16).padStart(4, '0')}`);
            return null;
        }
        if (footer !== 0x2323) {
            logger_1.default.error(`[FSCN8001] 帧尾错误: 期望=0x2323, 实际=0x${footer.toString(16).padStart(4, '0')}`);
            return null;
        }
        const isFscnFormat = buf.length >= 30 && buf[4] === 0x01;
        let cmd, seq, version, timestamp;
        let srcAddr, dstAddr, deviceIdBuf;
        let dataLen, data;
        if (isFscnFormat) {
            seq = buf.readUInt16LE(2);
            version = buf.subarray(4, 6);
            timestamp = buf.subarray(6, 12);
            srcAddr = buf.subarray(12, 18);
            dstAddr = buf.subarray(18, 24);
            deviceIdBuf = buf.subarray(12, 24);
            dataLen = buf.readUInt16LE(24);
            cmd = buf.readUInt8(26);
            data = buf.subarray(27, 27 + dataLen);
        }
        else {
            seq = buf.readUInt16BE(2);
            cmd = buf.readUInt8(4);
            version = Buffer.alloc(2);
            timestamp = Buffer.alloc(6);
            srcAddr = Buffer.alloc(6);
            dstAddr = Buffer.alloc(6);
            deviceIdBuf = Buffer.alloc(12);
            dataLen = Math.max(0, buf.length - 8);
            data = buf.subarray(5, buf.length - 3);
        }
        const checksum = buf.readUInt8(buf.length - 3);
        const expectedCs = calcChecksum(buf, 2, buf.length - 3);
        if (checksum !== expectedCs) {
            logger_1.default.error(`[FSCN8001] 校验和错误: 计算=0x${expectedCs.toString(16).padStart(2, '0').toUpperCase()}, 实际=0x${checksum.toString(16).padStart(2, '0').toUpperCase()}`);
            return null;
        }
        return {
            raw: buf,
            hex: buf.toString('hex').toUpperCase(),
            seq,
            cmd,
            isFscnFormat,
            version,
            timestamp,
            timestampStr: isFscnFormat ? decodeBcdTimestamp(timestamp) : 'N/A',
            srcAddr,
            dstAddr,
            deviceIdBuf,
            deviceId: deviceIdBuf.toString('hex').toUpperCase(),
            dataLen,
            data,
            checksum,
            valid: true,
        };
    }
}
exports.FrameParser = FrameParser;
/* ───── 解析部件运行状态（类型标志 = 0x02）──── */
exports.DEVICE_TYPE_NAMES = {
    0x00: '手动火灾报警按钮',
    0x01: '点型感烟火灾探测器',
    0x02: '点型感温火灾探测器',
    0x03: '火焰探测器',
    0x04: '线型感温火灾探测器',
    0x11: '手动火灾报警按钮',
    0x12: '消火栓按钮',
    0x17: '手动火灾报警按钮',
    0x21: '消防联动控制器',
    0x28: '输入输出模块',
};
function parseDeviceStatus(data) {
    if (data.length < 2)
        return [];
    const typeFlag = data[0];
    const count = data[1];
    const events = [];
    if (typeFlag !== 0x02) {
        return [{ typeFlag, count, raw: data.subarray(2).toString('hex').toUpperCase() }];
    }
    const OBJ_LEN = 14; // GB26875 标准格式：系统类型(1)+系统地址(1)+部件类型(1)+部件地址(4)+部件状态(1)+时间(6)=14字节
    for (let i = 0; i < count; i++) {
        const off = 2 + i * OBJ_LEN;
        if (off + OBJ_LEN > data.length)
            break;
        const sysType = data[off];
        const sysAddr = data[off + 1];
        const devType = data[off + 2];
        // GB26875 标准14字节格式，但厂商将回路/地址位置交换
        // data[5..6]=地址(2B), data[7..8]=回路(2B) → 匹配实际 01-002 编码
        const pointNo = data.readUInt16LE(off + 3); // 地址（先出现）
        const loopNo = data.readUInt16LE(off + 5); // 回路（后出现）
        const status = data[off + 7];
        const eventTime = decodeBcdTimestamp(data.subarray(off + 8, off + 14));
        // 兰灵协议/GB26875: bit0=火警, bit1=故障, bit2=屏蔽, bit3=延时, bit4=预警, bit5=监管, bit6=停止, bit7=反馈
        const isFire = !!(status & 0x01);
        const isFault = !!(status & 0x02);
        const isShield = !!(status & 0x04);
        const isDelay = !!(status & 0x08);
        const isPre = !!(status & 0x10);
        const isSupervisory = !!(status & 0x20);
        const isStop = !!(status & 0x40);
        const isFeedback = !!(status & 0x80);
        let alarmType = null;
        let alarmLevel = 'low';
        if (isFire) {
            alarmType = 'fire';
            alarmLevel = 'high';
        }
        else if (isFault) {
            alarmType = 'fault';
            alarmLevel = 'normal';
        }
        else if (isSupervisory) {
            alarmType = 'supervisory';
            alarmLevel = 'low';
        }
        else if (isFeedback) {
            alarmType = 'feedback';
            alarmLevel = 'low';
        }
        else if (isShield) {
            alarmType = 'shield';
            alarmLevel = 'low';
        }
        else if (isPre) {
            alarmType = 'pre';
            alarmLevel = 'normal';
        }
        else if (isDelay) {
            alarmType = 'delay';
            alarmLevel = 'low';
        }
        events.push({
            sysType, sysAddr, devType, devTypeName: exports.DEVICE_TYPE_NAMES[devType] || `未知类型(0x${devType.toString(16).padStart(2, '0').toUpperCase()})`,
            loopNo, pointNo,
            status, statusHex: `0x${status.toString(16).padStart(2, '0').toUpperCase()}`,
            isFire, isFault, isFeedback, isSupervisory, isShield, isDelay, isPre, isStop,
            alarmType, alarmLevel, eventTime,
        });
    }
    return events;
}
/* ───── 协议事件发射器 ───── */
exports.fscn8001Protocol = new events_1.EventEmitter();
//# sourceMappingURL=fscn8001.service.js.map