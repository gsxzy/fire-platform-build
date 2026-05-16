"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CTWingController = void 0;
const response_1 = require("@/utils/response");
const database_1 = __importDefault(require("@/config/database"));
const logger_1 = __importDefault(require("@/config/logger"));
const models_1 = require("@/models");
const sequelize_1 = require("sequelize");
const alarmNo_1 = require("@/utils/alarmNo");
const websocket_service_1 = require("@/websocket/websocket.service");
const crypto_1 = __importDefault(require("crypto"));
const isnb_parser_1 = require("@/utils/isnb.parser");
const CTWING_API_KEY = process.env.CTWING_API_KEY || '';
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
/** 解析设备标识 */
function resolveDeviceId(body) {
    return String(body.deviceId ?? body.device_id ?? body.devId ?? body.dev_id ??
        body.imei ?? body.IMEI ?? body.sn ?? body.SN ?? 'unknown').trim();
}
/** 解析 CTWing 数据 */
function parseCtwingBody(body) {
    const deviceId = resolveDeviceId(body);
    const msgType = String(body.msgType ?? body.msg_type ?? body.type ?? 'deviceUpload').toLowerCase();
    const productId = String(body.productId ?? body.product_id ?? '');
    const tenantId = String(body.tenantId ?? body.tenant_id ?? '');
    const imei = String(body.imei ?? body.IMEI ?? '');
    const deviceName = String(body.deviceName ?? body.device_name ?? body.name ?? deviceId);
    const timestamp = Number(body.timestamp ?? body.time ?? body.createTime ?? Date.now());
    // CTWing 数据流通常在 data / values / payload / service 中
    let dataObj = (body.data ?? body.values ?? body.payload ?? body.service ?? body);
    // ─── ISNB 原始帧解析 ───
    // 海康消防4G设备通过CTWing透传的是ISNB私有协议二进制帧，
    // CTWing平台不会自动解析，需要本平台自行解析。
    let isnbFrame = null;
    const isnbHex = (0, isnb_parser_1.extractIsnbHexFromCtwing)(body);
    if (isnbHex) {
        isnbFrame = (0, isnb_parser_1.parseIsnbFrame)(isnbHex);
        if (isnbFrame) {
            logger_1.default.info(`[CTWing] ISNB帧解析成功: msgId=0x${isnbFrame.messageId.toString(16).padStart(2, '0')} ${isnbFrame.messageTypeName} devType=0x${isnbFrame.devType.toString(16)} channels=${isnbFrame.channelCount}`);
            dataObj = (0, isnb_parser_1.isnbToPlatformData)(isnbFrame);
        }
    }
    // 如果 dataObj 仍是外层 body 且看起来像 ISNB 十六进制帧
    if (!isnbFrame && typeof body === 'object' && (0, isnb_parser_1.isIsnbHexFrame)(JSON.stringify(body))) {
        // 某些情况下整个 body 就是十六进制字符串
        const wholeHex = JSON.stringify(body).replace(/[^0-9a-fA-F]/g, '');
        isnbFrame = (0, isnb_parser_1.parseIsnbFrame)(wholeHex);
        if (isnbFrame)
            dataObj = (0, isnb_parser_1.isnbToPlatformData)(isnbFrame);
    }
    return {
        deviceId,
        msgType,
        productId,
        tenantId,
        imei,
        deviceName,
        timestamp,
        data: dataObj,
        raw: body,
        isnbFrame,
    };
}
/** 从 protocol_config 解析阈值 */
function parseThresholds(configStr) {
    try {
        const cfg = configStr ? JSON.parse(configStr) : {};
        const thr = cfg.thresholds || cfg.accessMeta?.thresholds || {};
        return typeof thr === 'object' && !Array.isArray(thr) ? thr : {};
    }
    catch {
        return {};
    }
}
/** 根据 data 内容和设备类型判断告警
 *  deviceType: hikvision-smoke | hikvision-pressure | hikvision-level
 */
function detectAlarm(data, deviceType, thresholds) {
    const alarm = Number(data.alarm ?? data.alarmStatus ?? data.status ?? 0);
    // ─── ISNB 解析后的专用告警检测 ───
    if (data._isnbParsed === true) {
        // ISNB 告警事件 (messageId=0x02 或 eventType=0x64)
        if (alarm === 1 || data._messageId === 0x02) {
            const alarmBits = data.alarmBits;
            const alarmDesc = data.alarmDesc;
            if (alarmBits && alarmBits.length > 0) {
                return { alarm: true, alarmType: 1, alarmDesc: `CTWing${alarmDesc}` };
            }
            return { alarm: true, alarmType: 1, alarmDesc: 'CTWing设备告警' };
        }
        // ISNB 故障事件 (eventType=0x63)
        const fault = Number(data.fault ?? 0);
        if (fault === 1) {
            const faultBits = data.faultBits;
            const faultDesc = data.faultDesc;
            if (faultBits && faultBits.length > 0) {
                return { alarm: true, alarmType: 2, alarmDesc: `CTWing${faultDesc}` };
            }
            return { alarm: true, alarmType: 2, alarmDesc: 'CTWing设备故障' };
        }
        // ISNB 低电量检测
        const battery = Number(data.battery ?? data.ch2_battery ?? 0);
        if (battery > 0 && battery < (thresholds.lowBattery ?? 20)) {
            return { alarm: true, alarmType: 2, alarmDesc: `CTWing设备低电量 ${battery}%` };
        }
    }
    // 通用故障/低电量/防拆
    if (Number(data.fault ?? data.faultStatus ?? 0) === 1) {
        return { alarm: true, alarmType: 2, alarmDesc: 'CTWing设备故障' };
    }
    if (Number(data.lowBattery ?? data.low_battery ?? 0) === 1) {
        return { alarm: true, alarmType: 2, alarmDesc: 'CTWing设备低电量' };
    }
    if (Number(data.tamper ?? data.dismantle ?? 0) === 1) {
        return { alarm: true, alarmType: 2, alarmDesc: 'CTWing设备防拆报警' };
    }
    // 烟感设备 NP-FY300-4G
    if (deviceType === 'hikvision-smoke') {
        const smoke = Number(data.smoke ?? data.smokeDensity ?? 0);
        const temperature = Number(data.temperature ?? data.temp ?? 0);
        const smokeThr = thresholds.smoke ?? 1;
        const tempThr = thresholds.temperature ?? 60;
        if (alarm === 1 || smoke >= smokeThr) {
            return { alarm: true, alarmType: 1, alarmDesc: `CTWing烟感火警告警 (烟雾=${smoke})` };
        }
        if (temperature >= tempThr) {
            return { alarm: true, alarmType: 1, alarmDesc: `CTWing烟感高温告警 ${temperature}°C` };
        }
        return { alarm: false, alarmType: 0, alarmDesc: '' };
    }
    // 压力设备 NP-FSC200-4G
    if (deviceType === 'hikvision-pressure') {
        const pressure = Number(data.pressure ?? data.value ?? 0);
        const pressThr = thresholds.pressure ?? thresholds.high ?? 1.6;
        const pressLow = thresholds.pressureLow ?? thresholds.low ?? 0.1;
        if (pressure >= pressThr) {
            return { alarm: true, alarmType: 1, alarmDesc: `CTWing压力超高告警 ${pressure}MPa` };
        }
        if (pressure <= pressLow) {
            return { alarm: true, alarmType: 1, alarmDesc: `CTWing压力过低告警 ${pressure}MPa` };
        }
        return { alarm: false, alarmType: 0, alarmDesc: '' };
    }
    // 液位设备 NP-FSC210-4G
    if (deviceType === 'hikvision-level') {
        const level = Number(data.level ?? data.value ?? data.liquidLevel ?? 0);
        const levelHigh = thresholds.levelHigh ?? thresholds.high ?? 4.5;
        const levelLow = thresholds.levelLow ?? thresholds.low ?? 0.5;
        if (level >= levelHigh) {
            return { alarm: true, alarmType: 1, alarmDesc: `CTWing液位超高告警 ${level}m` };
        }
        if (level <= levelLow) {
            return { alarm: true, alarmType: 1, alarmDesc: `CTWing液位过低告警 ${level}m` };
        }
        return { alarm: false, alarmType: 0, alarmDesc: '' };
    }
    // 默认通用烟感逻辑
    const smoke = Number(data.smoke ?? data.smokeDensity ?? 0);
    const temperature = Number(data.temperature ?? data.temp ?? 0);
    if (alarm === 1 || smoke > (thresholds.smoke ?? 50)) {
        return { alarm: true, alarmType: 1, alarmDesc: 'CTWing设备火警告警' };
    }
    if (temperature > (thresholds.temperature ?? 60)) {
        return { alarm: true, alarmType: 1, alarmDesc: `CTWing设备高温告警 ${temperature}°C` };
    }
    return { alarm: false, alarmType: 0, alarmDesc: '' };
}
/** 创建告警 */
async function createCtwingAlarm(parsed, iotDevice) {
    const deviceType = String(iotDevice?.device_type ?? '');
    const thresholds = parseThresholds(iotDevice?.protocol_config);
    const { alarm, alarmType, alarmDesc } = detectAlarm(parsed.data, deviceType, thresholds);
    if (!alarm)
        return;
    try {
        const alarmNo = (0, alarmNo_1.generateAlarmNo)();
        const alarmLevel = alarmType === 1 ? 3 : 2;
        const archiveDevice = await models_1.Device.findOne({
            where: { device_sn: iotDevice.device_sn },
        });
        await models_1.Alarm.create({
            alarm_no: alarmNo,
            alarm_type: alarmType,
            alarm_level: alarmLevel,
            device_id: archiveDevice?.id ?? null,
            device_name: iotDevice.device_name ?? parsed.deviceName,
            unit_id: archiveDevice?.unit_id ?? null,
            unit_name: archiveDevice?.unit_name ?? '',
            alarm_desc: alarmDesc,
            location: archiveDevice?.install_location ?? '',
            status: 0,
            raw_data: JSON.stringify(parsed.raw).slice(0, 2000),
        });
        // WebSocket 推送
        websocket_service_1.WebSocketService.broadcastSimple('alarm', {
            type: 'new',
            alarmNo,
            alarmType,
            deviceName: iotDevice.device_name ?? parsed.deviceName,
            desc: alarmDesc,
            time: new Date().toISOString(),
        });
        logger_1.default.info(`[CTWing] 告警创建成功: ${alarmNo} - ${alarmDesc}`);
    }
    catch (err) {
        logger_1.default.error(`[CTWing] 创建告警失败: ${err.message}`);
    }
}
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
                // 提取各通道数值（注意单位：0x23=kPa, 0x02=0.1MPa→转为kPa, 0x03=m, 0x04=0.1°C, 0x15=%）
                (() => {
                    const ch23 = frame.channels.find(c => c.paramType === 0x23);
                    if (ch23) {
                        // 优先用变长数据中的 currentKpa，其次用 paramValue
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
                            return vk * 1000; // MPa → kPa
                        if (ch02.paramValue != null)
                            return (ch02.rawParamValue ?? 0) * 100; // 0.1MPa → kPa
                    }
                    return null;
                })(),
                frame.channels.find(c => c.paramType === 0x03)?.paramValue ?? null, // m
                frame.channels.find(c => c.paramType === 0x04)?.paramValue ?? null, // °C
                frame.channels.find(c => c.paramType === 0x15)?.paramValue ?? null, // %
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
/** 签名验证（CTWing 消息加密） */
function verifySignature(req) {
    if (!CTWING_API_KEY)
        return true; // 未配置Token则跳过验证
    const signature = req.headers['ctwing-signature']
        ?? req.headers['x-ctwing-signature']
        ?? req.headers['signature']
        ?? '';
    if (!signature)
        return false;
    // CTWing 签名算法：MD5(Token + Body字符串)
    const bodyStr = JSON.stringify(req.body);
    const expected = crypto_1.default.createHash('md5').update(CTWING_API_KEY + bodyStr).digest('hex');
    return signature.toLowerCase() === expected.toLowerCase();
}
/** IoT 接口 IP 白名单校验 */
function checkIotWhitelist(req, res) {
    const whitelist = process.env.IOT_IP_WHITELIST;
    if (!whitelist)
        return true; // 未配置则放行
    const allowed = whitelist.split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.length === 0)
        return true;
    const clientIp = (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '');
    if (!allowed.includes(clientIp)) {
        res.status(403).json((0, response_1.fail)('来源IP不在白名单中', 403));
        return false;
    }
    return true;
}
/** 异步处理 CTWing 消息（设备查找、告警检测、遥测保存） */
async function processCtwingMessage(parsed) {
    // 查找或绑定 IoT 设备
    let iotDevice = (await models_1.IoTDevice.findOne({
        where: { device_sn: parsed.deviceId },
    }));
    // 按 CTWing 设备ID二次匹配
    if (!iotDevice) {
        iotDevice = (await models_1.IoTDevice.findOne({
            where: database_1.default.literal(`protocol_config LIKE '%"ctwingDeviceId":"${parsed.deviceId}"%'`),
        }));
    }
    // 自动建档：按档案 device_sn / device_no 匹配
    if (!iotDevice) {
        const archive = (await models_1.Device.findOne({
            where: {
                [sequelize_1.Op.or]: [
                    { device_sn: parsed.deviceId },
                    { device_no: parsed.deviceId },
                ],
            },
        }));
        if (archive?.id) {
            iotDevice = await models_1.IoTDevice.create({
                archive_device_id: archive.id,
                device_sn: parsed.deviceId,
                device_name: parsed.deviceName || archive.device_name || parsed.deviceId,
                device_type: archive.device_type || 'hikvision-smoke',
                protocol_type: 'CTWing',
                unit_id: archive.unit_id || null,
                status: 1,
                last_online: new Date(),
                protocol_config: JSON.stringify({
                    ctwing: {
                        productId: parsed.productId,
                        tenantId: parsed.tenantId,
                        imei: parsed.imei,
                    },
                }),
            });
            logger_1.default.info(`[CTWing] 已按档案自动建档接入: deviceId=${parsed.deviceId} archive_id=${archive.id}`);
        }
        else if (process.env.CTWING_ALLOW_ORPHAN_IOT === '1') {
            iotDevice = await models_1.IoTDevice.create({
                device_sn: parsed.deviceId,
                device_name: parsed.deviceName,
                protocol_type: 'CTWing',
                status: 1,
                last_online: new Date(),
                protocol_config: JSON.stringify({
                    ctwing: {
                        productId: parsed.productId,
                        tenantId: parsed.tenantId,
                        imei: parsed.imei,
                    },
                }),
            });
            logger_1.default.warn(`[CTWing] 无匹配档案，已创建无 archive 的 IoT 行 deviceId=${parsed.deviceId}（不推荐）`);
        }
        else {
            logger_1.default.warn(`[CTWing] 无 fire_iot_device 且无匹配 fire_device（device_sn/device_no=${parsed.deviceId}），跳过。请在「入库管理」建档后补全接入配置。`);
        }
    }
    else {
        // 更新心跳时间
        await models_1.IoTDevice.update({ last_online: new Date() }, { where: { id: iotDevice.id } });
    }
    // ═══ 按消息类型分发处理 ═══
    const msgTypeLower = parsed.msgType.toLowerCase();
    // 1. 设备上下线通知
    if (msgTypeLower.includes('status') || msgTypeLower.includes('online') || msgTypeLower.includes('offline')) {
        if (iotDevice) {
            const isOnline = !msgTypeLower.includes('offline');
            await models_1.IoTDevice.update({ status: isOnline ? 1 : 0, last_online: new Date() }, { where: { id: iotDevice.id } });
            logger_1.default.info(`[CTWing] 设备${isOnline ? '上线' : '离线'}: deviceId=${parsed.deviceId}`);
        }
        return;
    }
    // 2. 设备事件上报通知 → 触发告警
    if (msgTypeLower.includes('event') || msgTypeLower.includes('alarm')) {
        if (iotDevice) {
            await createCtwingAlarm(parsed, iotDevice);
        }
        return;
    }
    // 3. 设备数据变化通知 → 检测告警 + 保存遥测
    if (msgTypeLower.includes('upload') || msgTypeLower.includes('data') || msgTypeLower.includes('changed')) {
        if (iotDevice) {
            await createCtwingAlarm(parsed, iotDevice);
        }
        if (parsed.isnbFrame && iotDevice) {
            await saveIsnbTelemetry(iotDevice.id, parsed.isnbFrame);
        }
        return;
    }
    // 4. 设备指令响应通知 → 记录日志
    if (msgTypeLower.includes('command') || msgTypeLower.includes('response')) {
        logger_1.default.info(`[CTWing] 指令响应: deviceId=${parsed.deviceId}`);
        return;
    }
    // 兜底：其他消息类型也尝试检测告警
    if (iotDevice) {
        await createCtwingAlarm(parsed, iotDevice);
    }
}
exports.CTWingController = {
    /** 接收 CTWing 设备数据推送 */
    async report(req, res) {
        try {
            if (!checkIotWhitelist(req, res))
                return;
            // 签名验证（如果启用了消息加密）
            if (!verifySignature(req)) {
                logger_1.default.warn('[CTWing] 签名验证失败');
                return res.status(403).json((0, response_1.fail)('签名验证失败', 403));
            }
            const body = req.body;
            const parsed = parseCtwingBody(body);
            logger_1.default.info(`[CTWing] 收到推送: deviceId=${parsed.deviceId}, msgType=${parsed.msgType}`);
            // 保存原始日志（异步，不阻塞响应）
            saveRawLog(parsed.deviceId, parsed.msgType, body).catch(() => { });
            // ═══ CTWing 要求回调快速返回（< 3秒），后续数据库操作异步处理 ═══
            // 先立即返回 200，避免 CTWing 因超时重试
            res.json((0, response_1.success)({ received: true, deviceId: parsed.deviceId }));
            // 异步处理：设备查找、告警检测、遥测保存
            setImmediate(async () => {
                try {
                    await processCtwingMessage(parsed);
                }
                catch (err) {
                    logger_1.default.error(`[CTWing] 异步处理失败: ${err.message}`);
                }
            });
        }
        catch (err) {
            logger_1.default.error(`[CTWing] 处理推送失败: ${err.message}`);
            return res.status(500).json((0, response_1.fail)('处理失败: ' + err.message, 500));
        }
    },
    /** 接收 CTWing 设备状态/生命周期变更 */
    async status(req, res) {
        try {
            if (!checkIotWhitelist(req, res))
                return;
            const body = req.body;
            const deviceId = resolveDeviceId(body);
            const status = String(body.status ?? body.deviceStatus ?? 'online');
            logger_1.default.info(`[CTWing] 状态变更: deviceId=${deviceId}, status=${status}`);
            const iotDevice = await models_1.IoTDevice.findOne({ where: { device_sn: deviceId } });
            if (iotDevice) {
                const newStatus = status === 'online' || status === '1' ? 1 : 0;
                await models_1.IoTDevice.update({ status: newStatus, last_online: new Date() }, { where: { id: iotDevice.id } });
            }
            return res.json((0, response_1.success)({ received: true, deviceId, status }));
        }
        catch (err) {
            logger_1.default.error(`[CTWing] 状态处理失败: ${err.message}`);
            return res.status(500).json((0, response_1.fail)('处理失败: ' + err.message, 500));
        }
    },
};
//# sourceMappingURL=ctwing.controller.js.map