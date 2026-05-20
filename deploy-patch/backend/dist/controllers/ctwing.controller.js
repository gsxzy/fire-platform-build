"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CTWingController = void 0;
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const database_1 = __importDefault(require("@/config/database"));
const models_1 = require("@/models");
const ctwing_db_1 = require("@/services/ctwing/ctwing.db");
const ctwing_core_1 = require("@/services/ctwing/ctwing.core");
const ctwing_security_1 = require("@/utils/ctwing.security");
exports.CTWingController = {
    /** 接收 CTWing 设备数据推送 */
    async report(req, res) {
        try {
            if (!(0, ctwing_security_1.checkIotWhitelist)(req, res))
                return;
            if (!(0, ctwing_security_1.verifySignature)(req)) {
                logger_1.default.warn('[CTWing] 签名验证失败');
                return res.status(403).json((0, response_1.fail)('签名验证失败', 403));
            }
            const body = req.body;
            const parsed = (0, ctwing_core_1.parseCtwingBody)(body);
            logger_1.default.info(`[CTWing] 收到推送: deviceId=${parsed.deviceId}, msgType=${parsed.msgType}`);
            (0, ctwing_db_1.saveRawLog)(parsed.deviceId, parsed.msgType, body).catch(() => { });
            res.json((0, response_1.success)({ received: true, deviceId: parsed.deviceId }));
            setImmediate(async () => {
                try {
                    await (0, ctwing_core_1.processCtwingMessage)(parsed);
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
            if (!(0, ctwing_security_1.checkIotWhitelist)(req, res))
                return;
            const body = req.body;
            const deviceId = (0, ctwing_core_1.resolveDeviceId)(body);
            const status = String(body.status ?? body.deviceStatus ?? 'online');
            logger_1.default.info(`[CTWing] 状态变更: deviceId=${deviceId}, status=${status}`);
            // 多级查找：device_sn → ctwing_device_id → protocol_config JSON
            let iotDevice = await models_1.IoTDevice.findOne({ where: { device_sn: deviceId } });
            if (!iotDevice) {
                iotDevice = await models_1.IoTDevice.findOne({ where: { ctwing_device_id: deviceId } });
            }
            if (!iotDevice) {
                const [rows] = await database_1.default.query(`SELECT * FROM fire_iot_device
           WHERE protocol_type = 'CTWing'
             AND (JSON_UNQUOTE(JSON_EXTRACT(protocol_config, '$.accessMeta.ctwingDeviceId')) = ?
                  OR JSON_UNQUOTE(JSON_EXTRACT(protocol_config, '$.accessMeta.ctwing_device_id')) = ?
                  OR JSON_UNQUOTE(JSON_EXTRACT(protocol_config, '$.ctwing.ctwingDeviceId')) = ?)
           LIMIT 1`, { replacements: [deviceId, deviceId, deviceId] });
                iotDevice = rows?.[0] || null;
            }
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