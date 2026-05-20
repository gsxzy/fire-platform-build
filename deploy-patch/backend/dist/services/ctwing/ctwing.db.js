"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveRawLog = saveRawLog;
exports.ensureRawLogTable = ensureRawLogTable;
exports.ensureTelemetryTable = ensureTelemetryTable;
exports.saveIsnbTelemetry = saveIsnbTelemetry;
const database_1 = __importDefault(require("@/config/database"));
const logger_1 = __importDefault(require("@/config/logger"));
/** 保存 CTWing 原始推送日志 */
async function saveRawLog(deviceId, msgType, rawBody) {
    try {
        await database_1.default.query(`INSERT INTO ctwing_raw_log (device_id, msg_type, raw_json, created_at)
       VALUES (?, ?, ?, NOW())`, { replacements: [deviceId, msgType, JSON.stringify(rawBody)] });
    }
    catch (err) {
        if (!err.message?.includes('ER_NO_SUCH_TABLE')) {
            logger_1.default.error(`[CTWing] 保存原始日志失败: ${err.message}`);
        }
    }
}
/** 确保原始日志表存在 */
async function ensureRawLogTable() {
    try {
        await database_1.default.query(`
      CREATE TABLE IF NOT EXISTS ctwing_raw_log (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        device_id VARCHAR(100) NOT NULL,
        msg_type VARCHAR(32) DEFAULT NULL,
        raw_json JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_device_id (device_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CTWing原始推送日志'
    `);
    }
    catch (err) {
        logger_1.default.error(`[CTWing] 建表失败: ${err.message}`);
    }
}
ensureRawLogTable();
/** 确保遥测数据表存在 */
async function ensureTelemetryTable() {
    try {
        await database_1.default.query(`
      CREATE TABLE IF NOT EXISTS iot_telemetry (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        iot_device_id BIGINT NOT NULL,
        message_id INT DEFAULT NULL,
        message_type VARCHAR(32) DEFAULT NULL,
        dev_type INT DEFAULT NULL,
        dev_type_name VARCHAR(64) DEFAULT NULL,
        imei VARCHAR(32) DEFAULT NULL,
        device_model VARCHAR(64) DEFAULT NULL,
        rsrp INT DEFAULT NULL,
        snr INT DEFAULT NULL,
        shield INT DEFAULT NULL,
        channel_count INT DEFAULT NULL,
        pressure_kpa DECIMAL(10,2) DEFAULT NULL,
        level_m DECIMAL(10,2) DEFAULT NULL,
        temperature DECIMAL(10,1) DEFAULT NULL,
        battery_pct INT DEFAULT NULL,
        has_alarm TINYINT DEFAULT 0,
        has_fault TINYINT DEFAULT 0,
        raw_hex TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_iot_device_id (iot_device_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='IoT遥测数据'
    `);
    }
    catch (err) {
        logger_1.default.error(`[CTWing] 遥测表创建失败: ${err.message}`);
    }
}
ensureTelemetryTable();
/** 保存 ISNB 解析后的遥测数据 */
async function saveIsnbTelemetry(iotDeviceId, frame) {
    try {
        await database_1.default.query(`INSERT INTO iot_telemetry (
        iot_device_id, message_id, message_type, dev_type, dev_type_name,
        imei, device_model, rsrp, snr, shield, channel_count,
        pressure_kpa, level_m, temperature, battery_pct,
        has_alarm, has_fault, raw_hex, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, {
            replacements: [
                iotDeviceId,
                frame.messageId,
                frame.messageTypeName,
                frame.devType,
                frame.devTypeName,
                frame.imei,
                frame.deviceModel,
                frame.rsrp,
                frame.snr,
                frame.shield,
                frame.channelCount,
                (() => {
                    const ch23 = frame.channels.find(c => c.paramType === 0x23);
                    if (ch23) {
                        const vk = ch23.varData?.currentKpa;
                        if (vk != null)
                            return vk;
                        if (ch23.paramValue != null)
                            return ch23.paramValue;
                    }
                    const ch02 = frame.channels.find(c => c.paramType === 0x02);
                    if (ch02) {
                        const vk = ch02.varData?.currentMpa;
                        if (vk != null)
                            return vk * 1000;
                        if (ch02.paramValue != null)
                            return (ch02.rawParamValue ?? 0) * 100;
                    }
                    return null;
                })(),
                frame.channels.find(c => c.paramType === 0x03)?.paramValue ?? null,
                frame.channels.find(c => c.paramType === 0x04)?.paramValue ?? null,
                frame.channels.find(c => c.paramType === 0x15)?.paramValue ?? null,
                frame.hasAlarm ? 1 : 0,
                frame.hasFault ? 1 : 0,
                frame.rawHex.slice(0, 4000),
            ],
        });
    }
    catch (err) {
        if (!err.message?.includes('ER_NO_SUCH_TABLE')) {
            logger_1.default.error(`[CTWing] 保存遥测数据失败: ${err.message}`);
        }
    }
}
//# sourceMappingURL=ctwing.db.js.map