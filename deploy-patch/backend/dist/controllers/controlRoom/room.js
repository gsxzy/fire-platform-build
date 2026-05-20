"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.detail = detail;
exports.videoList = videoList;
exports.videoCandidates = videoCandidates;
exports.videoLink = videoLink;
exports.videoUnlink = videoUnlink;
exports.realtime = realtime;
exports.shields = shields;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
const respond_1 = require("@/utils/respond");
const response_1 = require("@/utils/response");
const models_1 = require("@/models");
const logger_1 = __importDefault(require("@/config/logger"));
const video_service_1 = require("@/services/video.service");
async function list(req, res) {
    try {
        const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
        const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
        const { keyword } = req.query;
        const where = {};
        if (keyword)
            where[sequelize_1.Op.or] = [{ room_name: { [sequelize_1.Op.like]: `%${keyword}%` } }, { unit_name: { [sequelize_1.Op.like]: `%${keyword}%` } }];
        const { count, rows } = await models_1.ControlRoom.findAndCountAll({
            where, limit: pageSize, offset: (pageNum - 1) * pageSize,
            order: [['id', 'DESC']],
        });
        const roomIds = rows.map((r) => r.id);
        const hosts = await models_1.ControlRoomHost.findAll({
            where: { room_id: { [sequelize_1.Op.in]: roomIds } },
            order: [['id', 'ASC']],
            raw: true,
        });
        const hostMap = new Map();
        for (const h of hosts) {
            if (!hostMap.has(h.room_id))
                hostMap.set(h.room_id, h);
        }
        const enriched = rows.map((room) => {
            const host = hostMap.get(room.id);
            return {
                ...room.toJSON(),
                host_model: host?.host_model || '',
                host_no: host?.host_no || '',
                host_name: host?.host_name || '',
                device_count: host?.device_count || 0,
                loop_count: host?.loop_count || 0,
            };
        });
        (0, respond_1.sendPage)(res, req, enriched, count, pageNum, pageSize);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] list 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function create(req, res) {
    const t = await database_1.default.transaction();
    try {
        const room = await models_1.ControlRoom.create(req.body, { transaction: t });
        const roomId = room.id;
        if (req.body.host_model || req.body.host_no || req.body.controllerModel || req.body.hostNo) {
            await models_1.ControlRoomHost.create({
                room_id: roomId,
                host_name: req.body.host_name || req.body.hostNo || '报警主机1号',
                host_model: req.body.host_model || req.body.controllerModel || '',
                host_no: req.body.host_no || req.body.hostNo || '',
                status: 1,
            }, { transaction: t });
        }
        await t.commit();
        (0, respond_1.sendSuccess)(res, req, { id: roomId }, '创建成功');
    }
    catch (err) {
        await t.rollback();
        logger_1.default.error(`[ControlRoom] create 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function update(req, res) {
    try {
        const roomId = req.params.id;
        await models_1.ControlRoom.update(req.body, { where: { id: roomId } });
        const host = await models_1.ControlRoomHost.findOne({ where: { room_id: roomId } });
        if (host) {
            const hostUpdate = {};
            if (req.body.host_model !== undefined || req.body.controllerModel !== undefined) {
                hostUpdate.host_model = req.body.host_model || req.body.controllerModel || '';
            }
            if (req.body.host_no !== undefined || req.body.hostNo !== undefined) {
                hostUpdate.host_no = req.body.host_no || req.body.hostNo || '';
            }
            if (req.body.host_name !== undefined || req.body.hostNo !== undefined) {
                hostUpdate.host_name = req.body.host_name || req.body.hostNo || '报警主机1号';
            }
            if (Object.keys(hostUpdate).length > 0) {
                await models_1.ControlRoomHost.update(hostUpdate, { where: { id: host.id } });
            }
        }
        else if (req.body.host_model || req.body.host_no || req.body.controllerModel || req.body.hostNo) {
            await models_1.ControlRoomHost.create({
                room_id: roomId,
                host_name: req.body.host_name || req.body.hostNo || '报警主机1号',
                host_model: req.body.host_model || req.body.controllerModel || '',
                host_no: req.body.host_no || req.body.hostNo || '',
                status: 1,
            });
        }
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] update 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function remove(req, res) {
    try {
        await models_1.ControlRoom.destroy({ where: { id: req.params.id } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] delete 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function detail(req, res) {
    try {
        const room = await models_1.ControlRoom.findByPk(req.params.id);
        if (!room)
            return res.json((0, response_1.fail)('消控室不存在'));
        const [hosts, devices] = await Promise.all([
            models_1.ControlRoomHost.findAll({ where: { room_id: room.id } }),
            models_1.Device.findAll({ where: { unit_id: room.unit_id }, limit: 20 }),
        ]);
        (0, respond_1.sendSuccess)(res, req, { room, hosts, devices });
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] detail 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
// GB28181 通道 ID 映射（WVP 数据库中 deviceId → channelId 的修正映射）
const CHANNEL_ID_MAP = {
    '34020000001300000002': '34020000001320000002',
};
async function videoList(req, res) {
    try {
        const roomId = req.query.roomId ? String(req.query.roomId) : undefined;
        const room = roomId ? await models_1.ControlRoom.findByPk(roomId) : null;
        if (!room)
            return res.json((0, response_1.fail)('消控室不存在'));
        // 优先从关联表查询已关联的摄像头
        const linked = await models_1.ControlRoomVideo.findAll({
            where: { room_id: room.id },
            order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
        });
        if (linked.length > 0) {
            const cameras = await Promise.all(linked.map(async (d) => {
                const deviceId = d.device_id ? String(d.device_id) : d.camera_no;
                const channelId = CHANNEL_ID_MAP[d.camera_no] || d.camera_no;
                let streamUrl = d.stream_url || '';
                // 若 stream_url 为空，尝试从 WVP/ZLM 获取播放地址
                if (!streamUrl && deviceId) {
                    try {
                        const streamInfo = await video_service_1.VideoService.getUnifiedStream(deviceId, channelId);
                        if (streamInfo) {
                            streamUrl = streamInfo.streamUrl || streamInfo.hls || streamInfo.flv || '';
                        }
                    }
                    catch (err) {
                        logger_1.default.warn(`[ControlRoom] videoList 取流失败 ${deviceId}/${channelId}: ${err.message}`);
                    }
                }
                return {
                    id: Number(d.id),
                    cameraName: d.camera_name,
                    cameraNo: d.camera_no,
                    position: d.position || '',
                    deviceId,
                    channelId,
                    status: d.status === 1 ? 1 : 0,
                    streamUrl,
                    protocol: d.protocol || 'HLS',
                };
            }));
            return (0, respond_1.sendSuccess)(res, req, cameras);
        }
        // 回退：从 gb28181_devices 查询该单位下已分配的摄像头作为默认展示
        const unitId = room.unit_id;
        const [gbRows] = await database_1.default.query(`SELECT id, device_id, name, location, status FROM fire_platform.gb28181_devices WHERE unit_id = ? LIMIT 20`, { replacements: [unitId] });
        const cameras = await Promise.all((gbRows || []).map(async (d) => {
            const deviceId = d.device_id || d.id;
            const channelId = CHANNEL_ID_MAP[deviceId] || deviceId;
            let streamUrl = '';
            try {
                const streamInfo = await video_service_1.VideoService.getUnifiedStream(deviceId, channelId);
                if (streamInfo) {
                    streamUrl = streamInfo.streamUrl || streamInfo.hls || streamInfo.flv || '';
                }
            }
            catch (err) {
                logger_1.default.warn(`[ControlRoom] videoList 回退取流失败 ${deviceId}/${channelId}: ${err.message}`);
            }
            return {
                id: d.id,
                cameraName: d.name || '未命名摄像头',
                cameraNo: deviceId,
                position: d.location || '',
                deviceId,
                channelId,
                status: d.status === 'online' ? 1 : 0,
                streamUrl,
                protocol: 'GB28181',
            };
        }));
        (0, respond_1.sendSuccess)(res, req, cameras);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] videoList 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
/** 查询可关联的视频设备候选列表 */
async function videoCandidates(req, res) {
    try {
        const roomId = req.query.roomId ? String(req.query.roomId) : undefined;
        const room = roomId ? await models_1.ControlRoom.findByPk(roomId) : null;
        if (!room)
            return res.json((0, response_1.fail)('消控室不存在'));
        const unitId = room.unit_id;
        // 1. 从 fire_device 查视频相关设备（扩展匹配范围）
        const devices = await models_1.Device.findAll({
            where: {
                unit_id: unitId,
                [sequelize_1.Op.or]: [
                    { device_type: { [sequelize_1.Op.like]: '%摄像%' } },
                    { device_type: { [sequelize_1.Op.like]: '%视频%' } },
                    { protocol_type: 'GB28181' },
                ],
            },
            attributes: ['id', 'device_name', 'install_location', 'device_sn', 'iot_id', 'protocol_config', 'status', 'device_type'],
            limit: 50,
        });
        // 2. 从 fire_iot_device 查有视频配置的设备
        const iotDevices = await models_1.IoTDevice.findAll({
            where: {
                unit_id: unitId,
                [sequelize_1.Op.or]: [
                    { protocol_type: 'GB28181' },
                    { protocol_config: { [sequelize_1.Op.like]: '%channelId%' } },
                    { protocol_config: { [sequelize_1.Op.like]: '%gb28181%' } },
                ],
            },
            attributes: ['id', 'device_name', 'device_sn', 'protocol_config', 'status'],
            limit: 50,
        });
        // 3. 查已关联的设备编号，用于过滤
        const linked = await models_1.ControlRoomVideo.findAll({
            where: { room_id: room.id },
            attributes: ['camera_no'],
            raw: true,
        });
        const linkedNos = new Set(linked.map(l => l.camera_no));
        const candidates = [];
        for (const d of devices) {
            const no = d.device_sn || d.iot_id || String(d.id);
            if (linkedNos.has(no))
                continue;
            let cfg = {};
            try {
                cfg = d.protocol_config ? JSON.parse(d.protocol_config) : {};
            }
            catch { /* ignore */ }
            candidates.push({
                id: Number(d.id),
                source: 'device',
                cameraName: d.device_name,
                cameraNo: no,
                position: d.install_location || '',
                deviceId: no,
                channelId: cfg.channelId || no,
                status: d.status === 1 ? 1 : 0,
                deviceType: d.device_type,
            });
        }
        for (const d of iotDevices) {
            const no = d.device_sn || String(d.id);
            if (linkedNos.has(no))
                continue;
            let cfg = {};
            try {
                cfg = d.protocol_config ? JSON.parse(d.protocol_config) : {};
            }
            catch { /* ignore */ }
            candidates.push({
                id: Number(d.id),
                source: 'iot',
                cameraName: d.device_name,
                cameraNo: no,
                position: '',
                deviceId: no,
                channelId: cfg.channelId || cfg.gb28181?.channelId || no,
                status: d.status === 1 ? 1 : 0,
                deviceType: 'IoT视频',
            });
        }
        // 4. 从 gb28181_devices 查已分配到该单位的国标摄像头
        const [gbRows] = await database_1.default.query(`SELECT id, device_id, name, location, status FROM fire_platform.gb28181_devices WHERE unit_id = ? LIMIT 20`, { replacements: [unitId] });
        for (const d of (gbRows || [])) {
            const deviceId = d.device_id || d.id;
            if (linkedNos.has(deviceId))
                continue;
            candidates.push({
                id: d.id,
                source: 'gb28181',
                cameraName: d.name || '未命名摄像头',
                cameraNo: deviceId,
                position: d.location || '',
                deviceId,
                channelId: CHANNEL_ID_MAP[deviceId] || deviceId,
                status: d.status === 'online' ? 1 : 0,
                deviceType: 'GB28181摄像头',
            });
        }
        (0, respond_1.sendSuccess)(res, req, candidates);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] videoCandidates 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
/** 关联摄像头到消控室 */
async function videoLink(req, res) {
    try {
        const { roomId, cameraNo, cameraName, deviceId, streamUrl, protocol, position } = req.body;
        if (!roomId || !cameraNo)
            return res.status(400).json((0, response_1.fail)('缺少必要参数'));
        await models_1.ControlRoomVideo.create({
            room_id: roomId,
            camera_no: cameraNo,
            camera_name: cameraName || cameraNo,
            stream_url: streamUrl || '',
            protocol: protocol || 'HLS',
            position: position || '',
            status: 1,
        });
        (0, respond_1.sendSuccess)(res, req, null, '关联成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] videoLink 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
/** 解关联摄像头 */
async function videoUnlink(req, res) {
    try {
        const { roomId, cameraNo } = req.body;
        if (!roomId || !cameraNo)
            return res.status(400).json((0, response_1.fail)('缺少必要参数'));
        await models_1.ControlRoomVideo.destroy({
            where: { room_id: roomId, camera_no: cameraNo },
        });
        (0, respond_1.sendSuccess)(res, req, null, '解关联成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] videoUnlink 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
/** 消控室物联实时数据 */
async function realtime(req, res) {
    try {
        const roomId = req.query.roomId ? String(req.query.roomId) : undefined;
        const hostId = req.query.hostId ? String(req.query.hostId) : undefined;
        // 查询该消控室/主机关联的 IoT 设备最新遥测数据
        const room = roomId ? await models_1.ControlRoom.findByPk(roomId) : null;
        const host = hostId ? await models_1.ControlRoomHost.findByPk(hostId) : null;
        // 默认返回结构（兼容前端）
        const result = {
            pressure_1: 0, pressure_2: 0,
            liquid_level_1: 0, liquid_level_2: 0,
            video_status: 1, host_status: host ? 1 : 0,
            current_mode: 2, silenced: 0,
            fire_count: 0, fault_count: 0, shield_count: 0, feedback_count: 0,
            iotDevices: [],
        };
        if (room) {
            const unitId = room.unit_id;
            // 查询该单位下 IoT 设备的最新遥测数据
            const [rows] = await database_1.default.query(`
        SELECT t.*, d.device_name, d.device_type, d.status AS dev_status FROM iot_telemetry t
        INNER JOIN (
          SELECT iot_device_id, MAX(created_at) AS max_at
          FROM iot_telemetry
          GROUP BY iot_device_id
        ) latest ON t.iot_device_id = latest.iot_device_id AND t.created_at = latest.max_at
        INNER JOIN fire_iot_device d ON d.id = t.iot_device_id
        WHERE d.unit_id = ?
        ORDER BY t.created_at DESC
        LIMIT 20
      `, { replacements: [unitId] });
            for (const row of rows || []) {
                if (row.pressure_kpa !== null && row.pressure_kpa !== undefined) {
                    // kPa → MPa
                    const mpa = Number(row.pressure_kpa) / 1000;
                    if (result.pressure_1 === 0)
                        result.pressure_1 = mpa;
                    else if (result.pressure_2 === 0)
                        result.pressure_2 = mpa;
                }
                if (row.level_m !== null && row.level_m !== undefined) {
                    const m = Number(row.level_m);
                    if (result.liquid_level_1 === 0)
                        result.liquid_level_1 = m;
                    else if (result.liquid_level_2 === 0)
                        result.liquid_level_2 = m;
                }
                // 构建动态 IoT 设备列表
                const devType = String(row.device_type || '');
                const isPressure = devType.includes('压') || row.pressure_kpa !== null;
                const isLevel = devType.includes('液') || row.level_m !== null;
                const isTemp = row.temperature !== null && row.temperature !== undefined;
                const isBattery = row.battery_pct !== null && row.battery_pct !== undefined;
                if (isPressure) {
                    result.iotDevices.push({
                        id: row.iot_device_id,
                        name: row.device_name || '压力设备',
                        deviceType: devType || '压力表',
                        value: row.pressure_kpa !== null ? Number(row.pressure_kpa) / 1000 : 0,
                        unit: 'MPa',
                        max: 1,
                        status: row.dev_status === 1 ? 1 : 0,
                    });
                }
                if (isLevel) {
                    result.iotDevices.push({
                        id: `${row.iot_device_id}_level`,
                        name: row.device_name || '液位设备',
                        deviceType: devType || '液位表',
                        value: row.level_m !== null ? Number(row.level_m) : 0,
                        unit: 'm',
                        max: 5,
                        status: row.dev_status === 1 ? 1 : 0,
                    });
                }
                if (isTemp && !isPressure && !isLevel) {
                    result.iotDevices.push({
                        id: `${row.iot_device_id}_temp`,
                        name: row.device_name || '温度设备',
                        deviceType: devType || '温度传感器',
                        value: Number(row.temperature) / 10,
                        unit: '°C',
                        max: 100,
                        status: row.dev_status === 1 ? 1 : 0,
                    });
                }
                if (isBattery) {
                    result.iotDevices.push({
                        id: `${row.iot_device_id}_bat`,
                        name: `${row.device_name || '设备'} 电量`,
                        deviceType: '电量',
                        value: Number(row.battery_pct),
                        unit: '%',
                        max: 100,
                        status: row.dev_status === 1 ? 1 : 0,
                    });
                }
            }
        }
        (0, respond_1.sendSuccess)(res, req, result);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] realtime 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
/** 消控室屏蔽记录 */
async function shields(req, res) {
    try {
        const roomId = req.query.roomId ? String(req.query.roomId) : undefined;
        const hostId = req.query.hostId ? String(req.query.hostId) : undefined;
        // 暂无独立屏蔽记录表，返回空数组占位；前端自行兼容
        (0, respond_1.sendSuccess)(res, req, []);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] shields 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
//# sourceMappingURL=room.js.map