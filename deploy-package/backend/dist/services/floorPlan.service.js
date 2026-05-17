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
exports.FloorPlanService = void 0;
const models_1 = require("@/models");
const models_2 = require("@/models"); // 需要从现有 models 引入
const logger_1 = __importDefault(require("@/config/logger"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * ═══════════════════════════════════════════════════════════════════
 * 建筑平面图服务
 * 平面图上传、设备点位查询、未标点设备查询
 * ═══════════════════════════════════════════════════════════════════
 */
class FloorPlanService {
    /**
     * 上传平面图
     * 实际项目请替换为 OSS 上传逻辑
     */
    static async uploadPlan(floorId, file) {
        // 生成文件名
        const ext = path_1.default.extname(file.originalname) || '.png';
        const filename = `plans/floor_${floorId}_${Date.now()}${ext}`;
        const uploadDir = path_1.default.join(process.cwd(), 'uploads');
        const fullPath = path_1.default.join(uploadDir, filename);
        // 确保目录存在
        if (!fs_1.default.existsSync(uploadDir))
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        if (!fs_1.default.existsSync(path_1.default.dirname(fullPath)))
            fs_1.default.mkdirSync(path_1.default.dirname(fullPath), { recursive: true });
        // 写入文件（生产环境替换为OSS上传）
        fs_1.default.writeFileSync(fullPath, file.buffer);
        // 获取图片尺寸（sharp 为可选依赖）
        let width = 0;
        let height = 0;
        try {
            const sharpMod = await Promise.resolve().then(() => __importStar(require('sharp')));
            const meta = await sharpMod.default(file.buffer).metadata();
            width = meta.width || 0;
            height = meta.height || 0;
        }
        catch {
            logger_1.default.warn('[FloorPlan] sharp 不可用，宽高度置为 0');
        }
        // 更新数据库
        await models_1.Floor.update({ plan_image_url: `/uploads/${filename}`, plan_width: width, plan_height: height }, { where: { id: floorId } });
        logger_1.default.info(`[FloorPlan] 上传平面图: floorId=${floorId}, size=${width}x${height}`);
        return { url: `/uploads/${filename}`, width, height };
    }
    /**
     * 获取楼层已标点设备（带设备详情）
     */
    static async getFloorDevices(floorId) {
        const positions = await models_1.FloorDevicePosition.findAll({
            where: { floor_id: floorId },
            include: [
                {
                    model: models_2.Device,
                    as: 'device',
                    attributes: ['id', 'device_name', 'device_no', 'device_type', 'status', 'unit_id'],
                },
            ],
            raw: false,
        });
        return positions.map((p) => ({
            position_id: p.id,
            device_id: p.device_id,
            x: p.x,
            y: p.y,
            device_name: p.device?.device_name || '未知设备',
            device_code: p.device?.device_no || '',
            device_type: p.device?.device_type || '',
            status: p.device?.status || 0,
        }));
    }
    /**
     * 获取未标点设备（该单位下还没在楼层上标注的设备）
     */
    static async getUnmarkedDevices(floorId) {
        const floor = await models_1.Floor.findByPk(floorId, {
            include: [{ model: models_1.Building, as: 'building', attributes: ['unit_id'] }],
        });
        if (!floor || !floor.building)
            return [];
        const unitId = floor.building.unit_id;
        // 已标点的设备ID
        const marked = await models_1.FloorDevicePosition.findAll({
            where: { floor_id: floorId },
            attributes: ['device_id'],
            raw: true,
        });
        const markedIds = marked.map((m) => m.device_id);
        // 该单位下所有未标点设备
        const where = { unit_id: unitId };
        if (markedIds.length > 0) {
            where.id = { [require('sequelize').Op.notIn]: markedIds };
        }
        const devices = await models_2.Device.findAll({
            where,
            attributes: ['id', 'device_name', 'device_no', 'device_type', 'status'],
            order: [['device_name', 'ASC']],
            raw: true,
        });
        return devices;
    }
}
exports.FloorPlanService = FloorPlanService;
//# sourceMappingURL=floorPlan.service.js.map