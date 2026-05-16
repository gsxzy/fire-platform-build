"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gb26875Server = exports.GB26875Server = void 0;
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
const net_1 = __importDefault(require("net"));
const gb26875_service_1 = require("./gb26875.service");
const logger_1 = __importDefault(require("@/config/logger"));
const database_1 = __importDefault(require("@/config/database"));
const baseProtocol_server_1 = require("./baseProtocol.server");
class GB26875Server extends baseProtocol_server_1.BaseProtocolServer {
    protocolName = 'GB26875';
    // 设备连接映射表：精准控制，禁止广播
    userCodeToConnection = new Map(); // userCode -> connection
    // 控制命令异步等待
    pendingCommands = new Map();
    querySeqCounter = 1;
    constructor(port = 5200, host = '0.0.0.0') {
        super(port, host);
        gb26875_service_1.gb26875Protocol.on('event', (event) => {
            this.emit('event', event);
        });
    }
    async start() {
        await this.ensureTables();
        this.startHeartbeatMonitor();
        this.startCommandCleanup();
        return new Promise((resolve, reject) => {
            this.server = net_1.default.createServer((socket) => {
                const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
                const clientIp = socket.remoteAddress || 'unknown';
                logger_1.default.info(`[GB26875] 新设备连接: ${clientAddress}`);
                const connection = {
                    socket,
                    clientIp,
                    connectedAt: new Date(),
                    lastActive: new Date(),
                };
                this.connections.set(clientAddress, connection);
                let buffer = Buffer.alloc(0);
                socket.on('data', async (data) => {
                    connection.lastActive = new Date();
                    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
                    buffer = Buffer.concat([buffer, chunk]);
                    if (buffer.length > 0 && buffer.length <= 32) {
                        logger_1.default.debug(`[GB26875] [${clientIp}] buffer: ${buffer.toString('hex').toUpperCase()}`);
                    }
                    while (buffer.length >= 4) {
                        if (buffer[0] !== 0x68) {
                            logger_1.default.debug(`[GB26875] [${clientIp}] 跳过非起始符字节: 0x${buffer[0].toString(16).toUpperCase()}`);
                            buffer = buffer.subarray(1);
                            continue;
                        }
                        let length = buffer.readUInt16LE(1);
                        if (length > 1000) {
                            length = buffer.readUInt16BE(1);
                        }
                        const totalLen = length + 4;
                        if (buffer.length < totalLen)
                            break;
                        const frame = buffer.subarray(0, totalLen);
                        buffer = buffer.subarray(totalLen);
                        const parsed = gb26875_service_1.gb26875Protocol.parseFrame(frame);
                        if (parsed) {
                            await this.handleFrame(parsed, clientIp, socket, connection);
                            if (parsed.cmd === 0x01 && parsed.data.length >= 6) {
                                const userCode = parsed.data.subarray(0, 6).toString('ascii').trim();
                                connection.userCode = userCode;
                                this.userCodeToConnection.set(userCode, connection);
                                logger_1.default.info(`[GB26875] 设备注册映射: ${userCode} -> ${clientAddress}`);
                            }
                        }
                    }
                });
                socket.on('error', (err) => {
                    logger_1.default.error(`[GB26875] Socket错误 [${clientAddress}]: ${err.message}`);
                });
                socket.on('close', () => {
                    logger_1.default.info(`[GB26875] 设备断开连接: ${clientAddress}`);
                    this.connections.delete(clientAddress);
                    if (connection.userCode) {
                        this.userCodeToConnection.delete(connection.userCode);
                        this.updateDeviceOffline(connection.userCode);
                        logger_1.default.info(`[GB26875] 注销设备: ${connection.userCode}`);
                    }
                });
                socket.on('timeout', () => {
                    logger_1.default.warn(`[GB26875] 连接超时: ${clientAddress}`);
                    socket.destroy();
                });
                socket.setTimeout(10 * 60 * 1000);
            });
            this.server.listen(this.port, this.host, () => {
                this.running = true;
                logger_1.default.info(`[GB26875] ✅ 服务器启动成功，监听 ${this.host}:${this.port}`);
                logger_1.default.info(`[GB26875] 等待赋安FSCN8001设备连接...`);
                resolve();
            });
            this.server.on('error', (err) => {
                logger_1.default.error(`[GB26875] ❌ 服务器启动失败: ${err.message}`);
                reject(err);
            });
        });
    }
    async stop() {
        await super.stop();
        this.userCodeToConnection.clear();
        this.pendingCommands.clear();
    }
    /* ───── 帧处理增强 ───── */
    async handleFrame(parsed, clientIp, socket, connection) {
        const userCode = connection.userCode || clientIp;
        // 保存原始日志
        await this.saveRawLog(userCode, 1, parsed.cmd.toString(16).padStart(2, '0').toUpperCase(), parsed.raw, {
            cmd: parsed.cmd, cmdName: parsed.cmdName, addr: parsed.addr, clientIp,
        });
        // 更新设备心跳
        if (connection.userCode) {
            await this.updateDeviceHeartbeat(connection.userCode, clientIp);
        }
        // 处理 0xD0 控制响应
        if (parsed.cmd === 0xD0) {
            this.handleControlResponse(parsed);
            return;
        }
        // 原有协议事件转发
        await gb26875_service_1.gb26875Protocol.handleFrame(parsed, clientIp, socket);
        // 登录成功后下发主动查询
        if (parsed.cmd === 0x01 && connection.userCode) {
            this.scheduleQueries(socket, connection.userCode);
        }
    }
    /* ───── 发送查岗命令 ───── */
    sendCheckPost(userCode) {
        const conn = this.userCodeToConnection.get(userCode);
        if (!conn) {
            logger_1.default.warn(`[GB26875] 发送查岗失败: 设备 ${userCode} 不在线`);
            return false;
        }
        return gb26875_service_1.gb26875Protocol.sendCheckPost(conn.socket);
    }
    /* ───── 发送控制命令（消音/复位/手自动切换）──── */
    async sendControlCommand(userCode, commandType, params = {}) {
        const conn = this.userCodeToConnection.get(userCode);
        if (!conn?.socket || conn.socket.destroyed) {
            logger_1.default.warn(`[GB26875] sendControlCommand: 设备 ${userCode} 不在线`);
            return false;
        }
        const hostNo = params.hostNo || 0;
        const loopNo = params.loopNo || 0;
        const address = params.address || 0;
        const subCmdMap = { mute: 0, reset: 1, manual: 2, auto: 3 };
        const subCmd = subCmdMap[commandType] ?? 0;
        const dataBuf = Buffer.from([hostNo, loopNo, address, subCmd]);
        const seq = this.nextQuerySeq();
        const frame = this.buildCommandFrame(0x50, dataBuf, seq);
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pendingCommands.delete(seq);
                reject(new Error('控制命令超时（30秒未收到设备回执）'));
            }, 30000);
            this.pendingCommands.set(seq, {
                resolve: (v) => { clearTimeout(timeoutId); resolve(v); },
                reject: (e) => { clearTimeout(timeoutId); reject(e); },
                timeoutId,
                commandId: `${userCode}-${commandType}-${Date.now()}`,
                deviceId: userCode,
                commandType,
                createdAt: Date.now(),
            });
            try {
                conn.socket.write(frame);
                logger_1.default.info(`[GB26875] CONTROL 下发控制命令 seq=${seq} device=${userCode} cmd=${commandType} sub=${subCmd}`);
            }
            catch (err) {
                this.pendingCommands.delete(seq);
                clearTimeout(timeoutId);
                reject(new Error(`下发失败: ${err.message}`));
            }
        });
    }
    /* ───── 处理 0xD0 控制响应 ───── */
    handleControlResponse(parsed) {
        // 简化：从 data 中提取 seq（假设前2字节是 seq）
        let seq = 0;
        if (parsed.data.length >= 2) {
            seq = parsed.data.readUInt16BE(0);
        }
        const pending = this.pendingCommands.get(seq);
        if (pending) {
            logger_1.default.info(`[GB26875] CONTROL 收到控制响应 seq=${seq} device=${pending.deviceId}`);
            pending.resolve(true);
            this.pendingCommands.delete(seq);
        }
    }
    /* ───── 主动查询下发 ───── */
    scheduleQueries(socket, userCode) {
        setTimeout(() => {
            if (!socket.destroyed) {
                logger_1.default.info(`[GB26875] QUERY 下发系统状态查询 device=${userCode}`);
                const seq = this.nextQuerySeq();
                socket.write(this.buildCommandFrame(0x42, Buffer.alloc(0), seq));
            }
        }, 1000);
        setTimeout(() => {
            if (!socket.destroyed) {
                logger_1.default.info(`[GB26875] QUERY 下发部件状态查询 device=${userCode}`);
                const seq = this.nextQuerySeq();
                socket.write(this.buildCommandFrame(0x43, Buffer.alloc(0), seq));
            }
        }, 2000);
        setTimeout(() => {
            if (!socket.destroyed) {
                logger_1.default.info(`[GB26875] QUERY 下发传输装置状态查询 device=${userCode}`);
                const seq = this.nextQuerySeq();
                socket.write(this.buildCommandFrame(0x41, Buffer.alloc(0), seq));
            }
        }, 3000);
    }
    /* ───── 构建控制/查询帧 ───── */
    buildCommandFrame(cmd, data, seq) {
        const len = 2 + 1 + data.length + 1; // seq(2) + cmd(1) + data(n) + cs(1)
        const frame = Buffer.allocUnsafe(2 + len);
        let off = 0;
        frame.writeUInt16BE(0x4040, off);
        off += 2; // @@
        frame.writeUInt16BE(seq, off);
        off += 2;
        frame.writeUInt8(cmd, off);
        off += 1;
        if (data.length > 0) {
            data.copy(frame, off);
            off += data.length;
        }
        let sum = 0;
        for (let i = 2; i < off; i++)
            sum += frame[i];
        frame.writeUInt8(sum & 0xFF, off);
        off += 1;
        frame.writeUInt16BE(0x2323, off);
        off += 2; // ##
        return frame;
    }
    nextQuerySeq() {
        const seq = this.querySeqCounter;
        this.querySeqCounter = (this.querySeqCounter + 1) & 0xFFFF;
        if (this.querySeqCounter === 0)
            this.querySeqCounter = 1;
        return seq;
    }
    /* ───── 心跳超时检测 ───── */
    startHeartbeatMonitor() {
        this.heartbeatTimer = setInterval(async () => {
            const now = Date.now();
            for (const [key, conn] of this.connections.entries()) {
                if (now - conn.lastActive.getTime() > 3 * 60 * 1000) {
                    logger_1.default.warn(`[GB26875] 心跳超时: ${key}，强制断开`);
                    conn.socket.destroy();
                    this.connections.delete(key);
                    if (conn.userCode) {
                        this.userCodeToConnection.delete(conn.userCode);
                        await this.updateDeviceOffline(conn.userCode);
                    }
                }
            }
        }, 30000);
    }
    /* ───── 清理超时控制命令 ───── */
    startCommandCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [seq, pending] of this.pendingCommands.entries()) {
                if (now - pending.createdAt > 35000) {
                    clearTimeout(pending.timeoutId);
                    pending.reject(new Error('控制命令清理：超时未处理'));
                    this.pendingCommands.delete(seq);
                }
            }
        }, 60000);
    }
    /* ───── 数据库操作 ───── */
    async ensureTables() {
        try {
            await database_1.default.query(`
        CREATE TABLE IF NOT EXISTS gb26875_raw_log (
          id BIGINT PRIMARY KEY AUTO_INCREMENT,
          device_id VARCHAR(32) DEFAULT NULL COMMENT '传输装置编号',
          direction TINYINT DEFAULT 1 COMMENT '1=上行 2=下行',
          cmd_type VARCHAR(8) DEFAULT NULL COMMENT '命令字',
          raw_data BLOB COMMENT '原始报文',
          hex_data TEXT COMMENT '报文HEX',
          parsed_json JSON DEFAULT NULL COMMENT '解析后的JSON',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_device_id (device_id),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='GB26875原始报文日志'
      `);
            await database_1.default.query(`
        CREATE TABLE IF NOT EXISTS gb26875_device (
          id BIGINT PRIMARY KEY AUTO_INCREMENT,
          device_id VARCHAR(32) NOT NULL COMMENT '传输装置编号',
          device_name VARCHAR(128) DEFAULT NULL COMMENT '装置名称',
          ip VARCHAR(32) DEFAULT NULL COMMENT 'IP地址',
          port INT DEFAULT 5200 COMMENT '端口',
          building_id VARCHAR(32) DEFAULT NULL COMMENT '建筑物编号',
          status TINYINT DEFAULT 1 COMMENT '0=离线 1=在线 2=故障',
          last_heartbeat TIMESTAMP DEFAULT NULL,
          login_time TIMESTAMP DEFAULT NULL,
          version VARCHAR(32) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_device_id (device_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='GB26875传输装置表'
      `);
            await database_1.default.query(`
        CREATE TABLE IF NOT EXISTS gb26875_alarm (
          id BIGINT PRIMARY KEY AUTO_INCREMENT,
          device_id VARCHAR(32) NOT NULL COMMENT '传输装置编号',
          host_code VARCHAR(32) DEFAULT NULL COMMENT '主机编号',
          loop_no INT DEFAULT NULL COMMENT '回路号',
          address INT DEFAULT NULL COMMENT '设备地址',
          device_type VARCHAR(64) DEFAULT NULL COMMENT '设备类型',
          alarm_type VARCHAR(64) DEFAULT NULL COMMENT '报警类型',
          alarm_level TINYINT DEFAULT 1 COMMENT '报警等级',
          location VARCHAR(128) DEFAULT NULL COMMENT '位置',
          status TINYINT DEFAULT 1 COMMENT '1=报警中 2=已恢复',
          alarm_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          recover_time TIMESTAMP DEFAULT NULL,
          raw_data TEXT DEFAULT NULL,
          INDEX idx_device_id (device_id),
          INDEX idx_alarm_time (alarm_time),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='GB26875报警记录表'
      `);
            logger_1.default.info('[GB26875] 数据表检查/创建完成');
        }
        catch (err) {
            logger_1.default.error(`[GB26875] 建表失败: ${err.message}`);
        }
    }
    async saveRawLog(deviceId, direction, cmdType, rawBuf, parsed) {
        try {
            await database_1.default.query(`INSERT INTO gb26875_raw_log (device_id, direction, cmd_type, raw_data, hex_data, parsed_json)
         VALUES (?, ?, ?, ?, ?, ?)`, { replacements: [deviceId, direction, cmdType, rawBuf, rawBuf.toString('hex').toUpperCase(), JSON.stringify(parsed)] });
        }
        catch (err) {
            logger_1.default.error(`[GB26875] 保存报文失败: ${err.message}`);
        }
    }
    async updateDeviceHeartbeat(deviceId, ip) {
        try {
            await database_1.default.query(`INSERT INTO gb26875_device (device_id, ip, status, last_heartbeat, updated_at)
         VALUES (?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE ip=VALUES(ip), status=VALUES(status), last_heartbeat=VALUES(last_heartbeat), updated_at=NOW()`, { replacements: [deviceId, ip] });
            // 同步更新统一设备模型
            await this.syncUnifiedDevice(deviceId, ip, 'online');
        }
        catch (err) {
            logger_1.default.error(`[GB26875] 更新设备心跳失败: ${err.message}`);
        }
    }
    async updateDeviceOffline(deviceId) {
        try {
            await database_1.default.query(`UPDATE gb26875_device SET status = 0, updated_at = NOW() WHERE device_id = ?`, { replacements: [deviceId] });
            logger_1.default.info(`[GB26875] 设备离线: ${deviceId}`);
            // 同步更新统一设备模型
            await this.syncUnifiedDevice(deviceId, null, 'offline');
        }
        catch (err) {
            logger_1.default.error(`[GB26875] 离线更新失败: ${err.message}`);
        }
    }
    getOnlineDevices() {
        return Array.from(this.connections.values()).map(conn => ({
            userCode: conn.userCode,
            clientIp: conn.clientIp,
            connectedAt: conn.connectedAt,
            lastActive: conn.lastActive,
        }));
    }
    sendCommand(systemId, _commandType, payload) {
        const conn = this.userCodeToConnection.get(systemId);
        if (!conn?.socket || conn.socket.destroyed) {
            logger_1.default.warn(`[GB26875] sendCommand: 设备 ${systemId} 不在线`);
            return false;
        }
        try {
            conn.socket.write(payload);
            return true;
        }
        catch (err) {
            logger_1.default.error(`[GB26875] sendCommand 失败: ${err.message}`);
            return false;
        }
    }
}
exports.GB26875Server = GB26875Server;
const GB26875_TCP_PORT = parseInt(process.env.GB26875_PORT || process.env.GB26875_TCP_PORT || '5200', 10);
const GB26875_HOST = process.env.GB26875_HOST || '0.0.0.0';
exports.gb26875Server = new GB26875Server(GB26875_TCP_PORT, GB26875_HOST);
exports.default = exports.gb26875Server;
//# sourceMappingURL=gb26875.server.js.map