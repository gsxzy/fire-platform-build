import { Floor, FloorDevicePosition, Building } from '@/models';
import { Device } from '@/models'; // 需要从现有 models 引入
import logger from '@/config/logger';
import path from 'path';
import fs from 'fs';

/**
 * ═══════════════════════════════════════════════════════════════════
 * 建筑平面图服务
 * 平面图上传、设备点位查询、未标点设备查询
 * ═══════════════════════════════════════════════════════════════════
 */
export class FloorPlanService {

  /**
   * 上传平面图
   * 实际项目请替换为 OSS 上传逻辑
   */
  static async uploadPlan(floorId: number, file: Express.Multer.File): Promise<{ url: string; width: number; height: number }> {
    // 生成文件名
    const ext = path.extname(file.originalname) || '.png';
    const filename = `plans/floor_${floorId}_${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads');
    const fullPath = path.join(uploadDir, filename);

    // 确保目录存在
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    if (!fs.existsSync(path.dirname(fullPath))) fs.mkdirSync(path.dirname(fullPath), { recursive: true });

    // 写入文件（生产环境替换为OSS上传）
    fs.writeFileSync(fullPath, file.buffer);

    // 获取图片尺寸（sharp 为可选依赖）
    let width = 0;
    let height = 0;
    try {
      const sharpMod = await import('sharp');
      const meta = await sharpMod.default(file.buffer).metadata();
      width = meta.width || 0;
      height = meta.height || 0;
    } catch {
      logger.warn('[FloorPlan] sharp 不可用，宽高度置为 0');
    }

    // 更新数据库
    await Floor.update(
      { plan_image_url: `/uploads/${filename}`, plan_width: width, plan_height: height },
      { where: { id: floorId } }
    );

    logger.info(`[FloorPlan] 上传平面图: floorId=${floorId}, size=${width}x${height}`);

    return { url: `/uploads/${filename}`, width, height };
  }

  /**
   * 获取楼层已标点设备（带设备详情）
   */
  static async getFloorDevices(floorId: number) {
    const positions = await FloorDevicePosition.findAll({
      where: { floor_id: floorId },
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['id', 'device_name', 'device_no', 'device_type', 'status', 'unit_id'],
        },
      ],
      raw: false,
    });

    return positions.map((p: any) => ({
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
  static async getUnmarkedDevices(floorId: number) {
    const floor = await Floor.findByPk(floorId, {
      include: [{ model: Building, as: 'building', attributes: ['unit_id'] }],
    }) as any;

    if (!floor || !floor.building) return [];

    const unitId = floor.building.unit_id;

    // 已标点的设备ID
    const marked = await FloorDevicePosition.findAll({
      where: { floor_id: floorId },
      attributes: ['device_id'],
      raw: true,
    });
    const markedIds = marked.map((m: any) => m.device_id);

    // 该单位下所有未标点设备
    const where: any = { unit_id: unitId };
    if (markedIds.length > 0) {
      where.id = { [require('sequelize').Op.notIn]: markedIds };
    }

    const devices = await Device.findAll({
      where,
      attributes: ['id', 'device_name', 'device_no', 'device_type', 'status'],
      order: [['device_name', 'ASC']],
      raw: true,
    });

    return devices;
  }
}
