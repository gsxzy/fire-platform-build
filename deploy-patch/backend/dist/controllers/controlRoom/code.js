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
exports.hostDeviceCodeList = hostDeviceCodeList;
exports.hostDeviceCodeCreate = hostDeviceCodeCreate;
exports.hostDeviceCodeUpdate = hostDeviceCodeUpdate;
exports.hostDeviceCodeDelete = hostDeviceCodeDelete;
exports.hostDeviceCodeImport = hostDeviceCodeImport;
const sequelize_1 = require("sequelize");
const respond_1 = require("@/utils/respond");
const response_1 = require("@/utils/response");
const models_1 = require("@/models");
const logger_1 = __importDefault(require("@/config/logger"));
async function hostDeviceCodeList(req, res) {
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
                where.host_id = -1;
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
}
async function hostDeviceCodeCreate(req, res) {
    try {
        const item = await models_1.HostDeviceCode.create(req.body);
        (0, respond_1.sendSuccess)(res, req, { id: item.id }, '创建成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] hostDeviceCodeCreate 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function hostDeviceCodeUpdate(req, res) {
    try {
        await models_1.HostDeviceCode.update(req.body, { where: { id: req.params.id } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] hostDeviceCodeUpdate 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function hostDeviceCodeDelete(req, res) {
    try {
        await models_1.HostDeviceCode.destroy({ where: { id: req.params.id } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    }
    catch (err) {
        logger_1.default.error(`[ControlRoom] hostDeviceCodeDelete 失败: ${err?.message || err}`);
        return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
}
async function hostDeviceCodeImport(req, res) {
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
}
//# sourceMappingURL=code.js.map