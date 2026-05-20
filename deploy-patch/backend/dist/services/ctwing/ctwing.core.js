"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDeviceId = resolveDeviceId;
exports.parseCtwingBody = parseCtwingBody;
exports.parseThresholds = parseThresholds;
exports.detectAlarm = detectAlarm;
exports.createCtwingAlarm = createCtwingAlarm;
exports.resolveIsnbDeviceType = resolveIsnbDeviceType;
exports.processCtwingMessage = processCtwingMessage;
const database_1 = __importDefault(require("@/config/database"));
const logger_1 = __importDefault(require("@/config/logger"));
const models_1 = require("@/models");
const sequelize_1 = require("sequelize");
const alarmNo_1 = require("@/utils/alarmNo");
const websocket_service_1 = require("@/websocket/websocket.service");
const isnb_parser_1 = require("@/utils/isnb.parser");
const ctwing_db_1 = require("./ctwing.db");
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
    let dataObj = (body.data ?? body.values ?? body.payload ?? body.service ?? body);
    let isnbFrame = null;
    const isnbHex = (0, isnb_parser_1.extractIsnbHexFromCtwing)(body);
    if (isnbHex) {
        isnbFrame = (0, isnb_parser_1.parseIsnbFrame)(isnbHex);
        if (isnbFrame) {
            logger_1.default.info(`[CTWing] ISNB帧解析成功: msgId=0x${isnbFrame.messageId.toString(16).padStart(2, '0')} ${isnbFrame.messageTypeName} devType=0x${isnbFrame.devType.toString(16)} channels=${isnbFrame.channelCount}`);
            dataObj = (0, isnb_parser_1.isnbToPlatformData)(isnbFrame);
        }
    }
    if (!isnbFrame && typeof body === 'object' && (0, isnb_parser_1.isIsnbHexFrame)(JSON.stringify(body))) {
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
/** 根据 data 内容和设备类型判断告警 */
function detectAlarm(data, deviceType, thresholds) {
    const alarm = Number(data.alarm ?? data.alarmStatus ?? data.status ?? 0);
    if (data._isnbParsed === true) {
        if (alarm === 1 || data._messageId === 0x02) {
            const alarmBits = data.alarmBits;
            const alarmDesc = data.alarmDesc;
            if (alarmBits && alarmBits.length > 0) {
                return { alarm: true, alarmType: 1, alarmDesc: `CTWing${alarmDesc}` };
            }
            return { alarm: true, alarmType: 1, alarmDesc: 'CTWing设备告警' };
        }
        const fault = Number(data.fault ?? 0);
        if (fault === 1) {
            const faultBits = data.faultBits;
            const faultDesc = data.faultDesc;
            if (faultBits && faultBits.length > 0) {
                return { alarm: true, alarmType: 2, alarmDesc: `CTWing${faultDesc}` };
            }
            return { alarm: true, alarmType: 2, alarmDesc: 'CTWing设备故障' };
        }
        const battery = Number(data.battery ?? data.ch2_battery ?? 0);
        if (battery > 0 && battery < (thresholds.lowBattery ?? 20)) {
            return { alarm: true, alarmType: 2, alarmDesc: `CTWing设备低电量 ${battery}%` };
        }
    }
    if (Number(data.fault ?? data.faultStatus ?? 0) === 1) {
        return { alarm: true, alarmType: 2, alarmDesc: 'CTWing设备故障' };
    }
    if (Number(data.lowBattery ?? data.low_battery ?? 0) === 1) {
        return { alarm: true, alarmType: 2, alarmDesc: 'CTWing设备低电量' };
    }
    if (Number(data.tamper ?? data.dismantle ?? 0) === 1) {
        return { alarm: true, alarmType: 2, alarmDesc: 'CTWing设备防拆报警' };
    }
    if (deviceType === 'hikvision-smoke') {
        const smoke = Number(data.smoke ?? data.smokeDensity ?? 0);
        const temperature = Number(data.temperature ?? data.temp ?? 0);
        const smokeThr = thresholds.smoke ?? 50;
        const tempThr = thresholds.temperature ?? 60;
        if (alarm === 1 || smoke >= smokeThr) {
            return { alarm: true, alarmType: 1, alarmDesc: `CTWing烟感火警告警 (烟雾=${smoke}%)` };
        }
        if (temperature >= tempThr) {
            return { alarm: true, alarmType: 1, alarmDesc: `CTWing烟感高温告警 ${temperature}°C` };
        }
        return { alarm: false, alarmType: 0, alarmDesc: '' };
    }
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
        let archiveDevice = null;
        if (iotDevice?.archive_device_id) {
            archiveDevice = await models_1.Device.findByPk(iotDevice.archive_device_id);
        }
        if (!archiveDevice && iotDevice?.device_sn) {
            archiveDevice = await models_1.Device.findOne({
                where: { device_sn: iotDevice.device_sn },
            });
        }
        const finalUnitId = archiveDevice?.unit_id ?? null;
        let finalUnitName = '';
        if (finalUnitId) {
            try {
                const unitRow = await models_1.Unit.findByPk(finalUnitId, { raw: true });
                finalUnitName = unitRow?.unit_name || '';
            }
            catch { /* ignore */ }
        }
        const finalLocation = archiveDevice?.install_location ?? '';
        const alarmRecord = await models_1.Alarm.create({
            alarm_no: alarmNo,
            alarm_type: alarmType,
            alarm_level: alarmLevel,
            device_id: archiveDevice?.id ?? null,
            device_name: iotDevice.device_name ?? parsed.deviceName,
            unit_id: finalUnitId,
            unit_name: finalUnitName,
            alarm_desc: alarmDesc,
            location: finalLocation,
            status: 0,
            raw_data: JSON.stringify(parsed.raw).slice(0, 2000),
        });
        websocket_service_1.WebSocketService.broadcastSimple('new_alarm', {
            id: alarmRecord.id,
            alarm_no: alarmNo,
            alarm_type: alarmType,
            alarm_level: alarmLevel,
            device_id: archiveDevice?.id ?? null,
            device_name: iotDevice.device_name ?? parsed.deviceName,
            unit_id: finalUnitId,
            unit_name: finalUnitName,
            location: finalLocation,
            alarm_desc: alarmDesc,
            status: 0,
            created_at: alarmRecord.created_at || new Date().toISOString(),
        });
        logger_1.default.info(`[CTWing] 告警创建成功: ${alarmNo} - ${alarmDesc}`);
    }
    catch (err) {
        logger_1.default.error(`[CTWing] 创建告警失败: ${err.message}`);
    }
}
// ISNB 设备类型 → 平台 device_type 映射
function resolveIsnbDeviceType(devType) {
    if (devType === 0x02 || devType === 0x82)
        return 'hikvision-smoke';
    if (devType === 0x86 || devType === 0x88)
        return 'hikvision-pressure';
    if (devType === 0x03 || devType === 0x83)
        return 'hikvision-gas';
    if (devType === 0x8c)
        return 'hikvision-co';
    if (devType === 0x89)
        return 'hikvision-manual';
    if (devType === 0x8a)
        return 'hikvision-sound-light';
    return 'hikvision-iot';
}
/** 异步处理 CTWing 消息（设备查找、告警检测、遥测保存） */
async function processCtwingMessage(parsed) {
    const lockName = `ctwing_process:${parsed.deviceId}`;
    let transaction = null;
    try {
        const [[lockRes]] = await database_1.default.query(`SELECT GET_LOCK(?, 10) AS acquired`, { replacements: [lockName], type: 'SELECT' });
        if (!lockRes?.acquired) {
            logger_1.default.warn(`[CTWing] 获取处理锁失败: ${lockName}`);
            return;
        }
        transaction = await database_1.default.transaction();
        let iotDevice = (await models_1.IoTDevice.findOne({
            where: { device_sn: parsed.deviceId },
            transaction,
        }));
        if (!iotDevice) {
            iotDevice = (await models_1.IoTDevice.findOne({
                where: { ctwing_device_id: parsed.deviceId },
                transaction,
            }));
        }
        if (!iotDevice) {
            try {
                const [rows] = await database_1.default.query(`SELECT * FROM fire_iot_device
           WHERE protocol_type = 'CTWing'
             AND (JSON_UNQUOTE(JSON_EXTRACT(protocol_config, '$.accessMeta.ctwingDeviceId')) = ?
                  OR JSON_UNQUOTE(JSON_EXTRACT(protocol_config, '$.accessMeta.ctwing_device_id')) = ?
                  OR JSON_UNQUOTE(JSON_EXTRACT(protocol_config, '$.ctwing.ctwingDeviceId')) = ?)
           LIMIT 1`, { replacements: [parsed.deviceId, parsed.deviceId, parsed.deviceId], type: 'SELECT', transaction });
                iotDevice = rows?.[0] || null;
            }
            catch (err) {
                logger_1.default.warn(`[CTWing] protocol_config JSON 匹配失败: ${err.message}`);
            }
        }
        if (!iotDevice) {
            const archive = (await models_1.Device.findOne({
                where: {
                    [sequelize_1.Op.or]: [
                        { device_sn: parsed.deviceId },
                        { device_no: parsed.deviceId },
                    ],
                },
                transaction,
            }));
            if (archive?.id) {
                const isnbType = parsed.isnbFrame ? resolveIsnbDeviceType(parsed.isnbFrame.devType) : undefined;
                iotDevice = await models_1.IoTDevice.create({
                    archive_device_id: archive.id,
                    device_sn: parsed.deviceId,
                    device_name: parsed.deviceName || archive.device_name || parsed.deviceId,
                    device_type: archive.device_type || isnbType || 'hikvision-smoke',
                    protocol_type: 'CTWing',
                    unit_id: archive.unit_id || null,
                    status: 1,
                    last_online: new Date(),
                    ctwing_device_id: parsed.deviceId,
                    protocol_config: JSON.stringify({
                        ctwing: {
                            productId: parsed.productId,
                            tenantId: parsed.tenantId,
                            imei: parsed.imei,
                        },
                    }),
                }, { transaction });
                logger_1.default.info(`[CTWing] 已按档案自动建档接入: deviceId=${parsed.deviceId} archive_id=${archive.id} type=${isnbType || archive.device_type || 'hikvision-smoke'}`);
            }
            else if (process.env.CTWING_ALLOW_ORPHAN_IOT === '1') {
                iotDevice = await models_1.IoTDevice.create({
                    device_sn: parsed.deviceId,
                    device_name: parsed.deviceName,
                    protocol_type: 'CTWing',
                    status: 1,
                    last_online: new Date(),
                    ctwing_device_id: parsed.deviceId,
                    protocol_config: JSON.stringify({
                        ctwing: {
                            productId: parsed.productId,
                            tenantId: parsed.tenantId,
                            imei: parsed.imei,
                        },
                    }),
                }, { transaction });
                logger_1.default.warn(`[CTWing] 无匹配档案，已创建无 archive 的 IoT 行 deviceId=${parsed.deviceId}（不推荐）`);
            }
            else {
                logger_1.default.warn(`[CTWing] 无 fire_iot_device 且无匹配 fire_device（device_sn/device_no=${parsed.deviceId}），跳过。请在「入库管理」建档后补全接入配置。`);
            }
        }
        else {
            await models_1.IoTDevice.update({ status: 1, last_online: new Date() }, { where: { id: iotDevice.id }, transaction });
        }
        await transaction.commit();
        transaction = null;
        const msgTypeLower = parsed.msgType.toLowerCase();
        if (msgTypeLower.includes('status') || msgTypeLower.includes('online') || msgTypeLower.includes('offline')) {
            if (iotDevice) {
                const isOnline = !msgTypeLower.includes('offline');
                await models_1.IoTDevice.update({ status: isOnline ? 1 : 0, last_online: new Date() }, { where: { id: iotDevice.id } });
                logger_1.default.info(`[CTWing] 设备${isOnline ? '上线' : '离线'}: deviceId=${parsed.deviceId}`);
            }
            await database_1.default.query(`SELECT RELEASE_LOCK(?)`, { replacements: [lockName] }).catch(() => { });
            return;
        }
        if (msgTypeLower.includes('event') || msgTypeLower.includes('alarm')) {
            if (iotDevice)
                await createCtwingAlarm(parsed, iotDevice);
            await database_1.default.query(`SELECT RELEASE_LOCK(?)`, { replacements: [lockName] }).catch(() => { });
            return;
        }
        if (msgTypeLower.includes('upload') || msgTypeLower.includes('data') || msgTypeLower.includes('changed')) {
            if (iotDevice)
                await createCtwingAlarm(parsed, iotDevice);
            if (parsed.isnbFrame && iotDevice)
                await (0, ctwing_db_1.saveIsnbTelemetry)(iotDevice.id, parsed.isnbFrame);
            await database_1.default.query(`SELECT RELEASE_LOCK(?)`, { replacements: [lockName] }).catch(() => { });
            return;
        }
        if (msgTypeLower.includes('command') || msgTypeLower.includes('response')) {
            logger_1.default.info(`[CTWing] 指令响应: deviceId=${parsed.deviceId}`);
            await database_1.default.query(`SELECT RELEASE_LOCK(?)`, { replacements: [lockName] }).catch(() => { });
            return;
        }
        if (iotDevice)
            await createCtwingAlarm(parsed, iotDevice);
        await database_1.default.query(`SELECT RELEASE_LOCK(?)`, { replacements: [lockName] }).catch(() => { });
    }
    catch (err) {
        if (transaction) {
            try {
                await transaction.rollback();
            }
            catch { }
        }
        try {
            await database_1.default.query(`SELECT RELEASE_LOCK(?)`, { replacements: [lockName] }).catch(() => { });
        }
        catch { }
        logger_1.default.error(`[CTWing] processCtwingMessage 失败: ${err.message}`);
    }
}
//# sourceMappingURL=ctwing.core.js.map