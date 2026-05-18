"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlRoomController = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
const respond_1 = require("@/utils/respond");
const response_1 = require("@/utils/response");
const models_1 = require("@/models");
const controlRoom_service_1 = require("@/services/controlRoom.service");
const logger_1 = __importDefault(require("@/config/logger"));
exports.ControlRoomController = {
    /* ── 消控室 ── */
    async list(req, res) {
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
            // 批量查询所有主机信息，避免 N+1
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
    },
    async create(req, res) {
        const t = await database_1.default.transaction();
        try {
            const room = await models_1.ControlRoom.create(req.body, { transaction: t });
            const roomId = room.id;
            // 若请求包含主机信息，同步创建默认报警主机
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
    },
    async update(req, res) {
        try {
            const roomId = req.params.id;
            await models_1.ControlRoom.update(req.body, { where: { id: roomId } });
            // 同步更新关联的报警主机
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
                // 若之前没有主机，现在请求包含主机信息则创建
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
    },
    async delete(req, res) {
        try {
            await models_1.ControlRoom.destroy({ where: { id: req.params.id } });
            (0, respond_1.sendSuccess)(res, req, null, '删除成功');
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] delete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async detail(req, res) {
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
    },
    /* ── 关联摄像头 ── */
    async videoList(req, res) {
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
    },
    /* ── 报警主机 ── */
    async hostList(req, res) {
        try {
            const { roomId } = req.query;
            const where = {};
            if (roomId)
                where.room_id = roomId;
            const hosts = await models_1.ControlRoomHost.findAll({ where, order: [['id', 'ASC']] });
            (0, respond_1.sendSuccess)(res, req, hosts);
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] hostList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async hostCreate(req, res) {
        try {
            const host = await models_1.ControlRoomHost.create(req.body);
            (0, respond_1.sendSuccess)(res, req, { id: host.id }, '主机添加成功');
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] hostCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async hostUpdate(req, res) {
        try {
            await models_1.ControlRoomHost.update(req.body, { where: { id: req.params.id } });
            (0, respond_1.sendSuccess)(res, req, null, '更新成功');
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] hostUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async hostDelete(req, res) {
        try {
            await models_1.ControlRoomHost.destroy({ where: { id: req.params.id } });
            (0, respond_1.sendSuccess)(res, req, null, '删除成功');
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] hostDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async hostDetail(req, res) {
        try {
            const data = await controlRoom_service_1.ControlRoomService.getHostDetail(+req.params.id);
            if (!data)
                return res.json((0, response_1.fail)('主机不存在'));
            (0, respond_1.sendSuccess)(res, req, data);
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] hostDetail 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 消音（通过报警主机） ── */
    async silence(req, res) {
        try {
            const { hostId } = req.body;
            const result = await controlRoom_service_1.ControlRoomService.silenceHost(+hostId, req.user.userId, req.user.username);
            (0, respond_1.sendSuccess)(res, req, result, result.msg);
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] silence 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 复位（通过报警主机） ── */
    async reset(req, res) {
        try {
            const { hostId } = req.body;
            const result = await controlRoom_service_1.ControlRoomService.resetHost(+hostId, req.user.userId, req.user.username);
            (0, respond_1.sendSuccess)(res, req, result, result.msg);
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] reset 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 手自动切换（通过报警主机） ── */
    async switchMode(req, res) {
        try {
            const { hostId, mode } = req.body;
            const result = await controlRoom_service_1.ControlRoomService.switchMode(+hostId, mode, req.user.userId, req.user.username);
            (0, respond_1.sendSuccess)(res, req, result, result.msg);
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] switchMode 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 多线盘控制（通过报警主机） ── */
    async controlMultiline(req, res) {
        try {
            const { hostId, pointId, action } = req.body;
            const result = await controlRoom_service_1.ControlRoomService.controlMultiline(+hostId, +pointId, action, req.user.userId, req.user.username);
            (0, respond_1.sendSuccess)(res, req, result, result.msg);
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] controlMultiline 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 多线盘点位 ── */
    async multilineList(req, res) {
        try {
            const { hostId } = req.query;
            const where = {};
            if (hostId)
                where.host_id = hostId;
            const list = await models_1.MultilinePanel.findAll({ where, order: [['point_no', 'ASC']] });
            (0, respond_1.sendSuccess)(res, req, list);
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] multilineList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async multilineCreate(req, res) {
        try {
            const p = await models_1.MultilinePanel.create(req.body);
            (0, respond_1.sendSuccess)(res, req, { id: p.id }, '创建成功');
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] multilineCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async multilineUpdate(req, res) {
        try {
            await models_1.MultilinePanel.update(req.body, { where: { id: req.params.id } });
            (0, respond_1.sendSuccess)(res, req, null, '更新成功');
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] multilineUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 总线点位 ── */
    async busPointList(req, res) {
        try {
            const { hostId, loopNo, status } = req.query;
            const where = {};
            if (hostId)
                where.host_id = hostId;
            if (loopNo)
                where.loop_no = loopNo;
            if (status !== undefined)
                where.status = status;
            const list = await models_1.BusPoint.findAll({ where, order: [['loop_no', 'ASC'], ['point_no', 'ASC']] });
            (0, respond_1.sendSuccess)(res, req, list);
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] busPointList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async busPointCreate(req, res) {
        try {
            const p = await models_1.BusPoint.create(req.body);
            (0, respond_1.sendSuccess)(res, req, { id: p.id }, '创建成功');
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] busPointCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async busPointUpdate(req, res) {
        try {
            await models_1.BusPoint.update(req.body, { where: { id: req.params.id } });
            (0, respond_1.sendSuccess)(res, req, null, '更新成功');
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] busPointUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 控制日志 ── */
    async commandLogs(req, res) {
        try {
            const { hostId, pageNum = 1, pageSize = 20 } = req.query;
            const data = await controlRoom_service_1.ControlRoomService.getCommandLogs(hostId ? +hostId : undefined, +pageNum, +pageSize);
            (0, respond_1.sendPage)(res, req, data.list, data.total, data.pageNum, data.pageSize);
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] commandLogs 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 报警主机编码表 ── */
    async hostDeviceCodeList(req, res) {
        try {
            const pageNum = Math.max(1, parseInt(String(req.query.pageNum ?? req.query.page ?? 1), 10) || 1);
            const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? 10), 10) || 10));
            const { hostId, roomId, keyword, status } = req.query;
            const where = {};
            if (hostId)
                where.host_id = hostId;
            if (status !== undefined && status !== '')
                where.status = status;
            if (keyword) {
                where[sequelize_1.Op.or] = [
                    { device_name: { [sequelize_1.Op.like]: `%${keyword}%` } },
                    { install_location: { [sequelize_1.Op.like]: `%${keyword}%` } },
                    { device_type: { [sequelize_1.Op.like]: `%${keyword}%` } },
                    { parent_device: { [sequelize_1.Op.like]: `%${keyword}%` } },
                ];
            }
            // 如果传了 roomId，先查该 room 下的所有 hostId，再 IN 查询
            if (roomId && !hostId) {
                const hosts = await models_1.ControlRoomHost.findAll({
                    where: { room_id: roomId },
                    attributes: ['id'],
                    raw: true,
                });
                const hostIds = hosts.map((h) => h.id);
                if (hostIds.length)
                    where.host_id = { [sequelize_1.Op.in]: hostIds };
                else
                    where.host_id = -1; // 无数据
            }
            const { count, rows } = await models_1.HostDeviceCode.findAndCountAll({
                where,
                limit: pageSize,
                offset: (pageNum - 1) * pageSize,
                order: [['loop_no', 'ASC'], ['point_no', 'ASC']],
            });
            (0, respond_1.sendPage)(res, req, rows, count, pageNum, pageSize);
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] hostDeviceCodeList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async hostDeviceCodeCreate(req, res) {
        try {
            const item = await models_1.HostDeviceCode.create(req.body);
            (0, respond_1.sendSuccess)(res, req, { id: item.id }, '创建成功');
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] hostDeviceCodeCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async hostDeviceCodeUpdate(req, res) {
        try {
            await models_1.HostDeviceCode.update(req.body, { where: { id: req.params.id } });
            (0, respond_1.sendSuccess)(res, req, null, '更新成功');
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] hostDeviceCodeUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async hostDeviceCodeDelete(req, res) {
        try {
            await models_1.HostDeviceCode.destroy({ where: { id: req.params.id } });
            (0, respond_1.sendSuccess)(res, req, null, '删除成功');
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] hostDeviceCodeDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async hostDeviceCodeImport(req, res) {
        try {
            const { hostId } = req.body;
            if (!hostId)
                return res.status(400).json((0, response_1.fail)('hostId 不能为空', 400));
            const file = req.file;
            if (!file)
                return res.status(400).json((0, response_1.fail)('请上传 Excel 文件', 400));
            const xlsx = await Promise.resolve().then(() => __importStar(require('xlsx')));
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            let rows = [];
            try {
                const workbook = xlsx.readFile(file.path);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            }
            finally {
                try {
                    fs.unlinkSync(file.path);
                }
                catch { /* ignore */ }
            }
            if (!rows.length)
                return res.status(400).json((0, response_1.fail)('Excel 为空', 400));
            // 智能识别表头行（前5行内匹配）
            const headerVariants = {
                loop_no: ['回路号', '回路', 'loop_no', 'loop no', 'loop', '回路编号'],
                point_no: ['点位号', '点位', 'point_no', 'point no', 'point', '地址', '设备地址', 'addr'],
                device_type: ['设备类型', '类型', 'device_type', 'device type', 'type'],
                device_name: ['设备名称', '名称', 'device_name', 'device name', 'name'],
                install_location: ['安装位置', '位置', 'install_location', 'location', '安装地点'],
                floor: ['楼层', 'floor', '层'],
                parent_device: ['父设备', 'parent_device', 'parent', '上级设备', '关联设备'],
                status: ['状态', 'status', '设备状态'],
            };
            let headerIdx = 0;
            for (let i = 0; i < Math.min(rows.length, 5); i++) {
                const row = (rows[i] || []).map(c => String(c).trim().toLowerCase());
                if (headerVariants.loop_no.some(h => row.includes(h.toLowerCase()))) {
                    headerIdx = i;
                    break;
                }
            }
            const headers = (rows[headerIdx] || []).map(c => String(c).trim().toLowerCase());
            const colIdx = {};
            for (const [key, variants] of Object.entries(headerVariants)) {
                colIdx[key] = headers.findIndex(h => variants.some(v => h.includes(v.toLowerCase())));
            }
            if (colIdx.loop_no < 0 || colIdx.point_no < 0) {
                return res.status(400).json((0, response_1.fail)('未找到回路号或点位号列', 400));
            }
            const imports = [];
            for (let i = headerIdx + 1; i < rows.length; i++) {
                const row = rows[i] || [];
                const loopNo = Number(row[colIdx.loop_no]);
                const pointNo = Number(row[colIdx.point_no]);
                if (!Number.isFinite(loopNo) || !Number.isFinite(pointNo) || loopNo < 0 || pointNo < 0)
                    continue;
                const item = { host_id: hostId, loop_no: loopNo, point_no: pointNo };
                if (colIdx.device_type >= 0)
                    item.device_type = String(row[colIdx.device_type] || '').trim() || null;
                if (colIdx.device_name >= 0)
                    item.device_name = String(row[colIdx.device_name] || '').trim() || null;
                if (colIdx.install_location >= 0)
                    item.install_location = String(row[colIdx.install_location] || '').trim() || null;
                if (colIdx.floor >= 0)
                    item.floor = String(row[colIdx.floor] || '').trim() || null;
                if (colIdx.parent_device >= 0)
                    item.parent_device = String(row[colIdx.parent_device] || '').trim() || null;
                if (colIdx.status >= 0) {
                    const s = String(row[colIdx.status] || '').trim();
                    if (['正常', '1', 'normal'].includes(s))
                        item.status = 1;
                    else if (['故障', '2', 'fault'].includes(s))
                        item.status = 2;
                    else if (['停用', '3', 'disabled', '停用'].includes(s))
                        item.status = 3;
                    else
                        item.status = 1;
                }
                imports.push(item);
            }
            if (imports.length === 0)
                return res.status(400).json((0, response_1.fail)('未解析到有效数据', 400));
            let successCount = 0;
            let failCount = 0;
            for (const item of imports) {
                try {
                    await models_1.HostDeviceCode.upsert(item);
                    successCount++;
                }
                catch {
                    failCount++;
                }
            }
            (0, respond_1.sendSuccess)(res, req, { total: imports.length, success: successCount, failed: failCount }, `导入完成：成功 ${successCount} 条，失败 ${failCount} 条`);
        }
        catch (err) {
            logger_1.default.error(`[ControlRoom] hostDeviceCodeImport 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=controlRoom.controller.js.map