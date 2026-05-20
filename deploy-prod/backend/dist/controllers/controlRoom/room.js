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
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
const respond_1 = require("@/utils/respond");
const response_1 = require("@/utils/response");
const models_1 = require("@/models");
const logger_1 = __importDefault(require("@/config/logger"));
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
async function videoList(req, res) {
    try {
        const roomId = req.query.roomId ? String(req.query.roomId) : undefined;
        const room = roomId ? await models_1.ControlRoom.findByPk(roomId) : null;
        if (!room)
            return res.json((0, response_1.fail)('消控室不存在'));
        const devices = await models_1.Device.findAll({
            where: { unit_id: room.unit_id, device_type: '摄像头' },
            attributes: ['id', 'device_name', 'install_location', 'device_sn', 'iot_id', 'protocol_config', 'status'],
            limit: 20,
        });
        const cameras = devices.map((d) => {
            let cfg = {};
            try {
                cfg = d.protocol_config ? JSON.parse(d.protocol_config) : {};
            }
            catch { /* ignore */ }
            const deviceId = d.device_sn || d.iot_id || String(d.id);
            return {
                id: Number(d.id),
                cameraName: d.device_name,
                cameraNo: deviceId,
                position: d.install_location || '',
                deviceId,
                channelId: cfg.channelId || deviceId,
                status: d.status === 1 ? 1 : 0,
                streamUrl: '',
            };
        });
        (0, respond_1.sendSuccess)(res, req, cameras);
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] videoList 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
//# sourceMappingURL=room.js.map