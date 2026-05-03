import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, page } from '@/utils/response';
import { Building, Floor, FloorDevicePosition, FloorCameraBinding } from '@/models';
import { FloorPlanService } from '@/services/floorPlan.service';

export const FloorPlanController = {
  /* ─────────── 建筑物 ─────────── */
  async buildingList(req: Request, res: Response) {
    const { unit_id, pageNum = 1, pageSize = 20, keyword } = req.query;
    const where: any = {};
    if (unit_id) where.unit_id = +unit_id;
    if (keyword) where.name = { [Op.like]: `%${keyword}%` };

    const { count, rows } = await Building.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
    });
    return res.json(page(rows, count, +pageNum, +pageSize));
  },

  async buildingCreate(req: Request, res: Response) {
    const b = await Building.create(req.body as any);
    return res.json(success({ id: (b as any).id }, '创建成功'));
  },

  async buildingUpdate(req: Request, res: Response) {
    await Building.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },

  async buildingDelete(req: Request, res: Response) {
    await Building.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },

  async buildingGet(req: Request, res: Response) {
    const b = await Building.findByPk(req.params.id, {
      include: [{ model: Floor, as: 'floors', order: [['floor_number', 'ASC']] }],
    });
    return res.json(success(b));
  },

  /* ─────────── 楼层 ─────────── */
  async floorList(req: Request, res: Response) {
    const { building_id } = req.query;
    const where: any = {};
    if (building_id) where.building_id = +building_id;

    const rows = await Floor.findAll({
      where,
      order: [['floor_number', 'ASC']],
    });
    return res.json(success(rows));
  },

  async floorCreate(req: Request, res: Response) {
    const f = await Floor.create(req.body as any);
    return res.json(success({ id: (f as any).id }, '创建成功'));
  },

  async floorUpdate(req: Request, res: Response) {
    await Floor.update(req.body, { where: { id: req.params.id } });
    return res.json(success(null, '更新成功'));
  },

  async floorDelete(req: Request, res: Response) {
    await Floor.destroy({ where: { id: req.params.id } });
    return res.json(success(null, '删除成功'));
  },

  async floorGet(req: Request, res: Response) {
    const f = await Floor.findByPk(req.params.id, {
      include: [
        { model: Building, as: 'building', attributes: ['id', 'name', 'unit_id'] },
      ],
    });
    return res.json(success(f));
  },

  /* ─────────── 平面图上传 ─────────── */
  async uploadPlan(req: Request, res: Response) {
    const { id } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ code: 400, message: '未上传文件' });

    const result = await FloorPlanService.uploadPlan(+id, file);
    return res.json(success(result, '上传成功'));
  },

  /* ─────────── 设备点位 ─────────── */
  async getFloorDevices(req: Request, res: Response) {
    const { id } = req.params;
    const devices = await FloorPlanService.getFloorDevices(+id);
    return res.json(success(devices));
  },

  async addDevicePosition(req: Request, res: Response) {
    const { id } = req.params;
    const { device_id, x, y } = req.body;

    const [pos, created] = await FloorDevicePosition.findOrCreate({
      where: { floor_id: +id, device_id: +device_id },
      defaults: { floor_id: +id, device_id: +device_id, x, y },
    });

    if (!created) {
      await pos.update({ x, y });
    }

    return res.json(success(null, '标点成功'));
  },

  async batchAddDevicePositions(req: Request, res: Response) {
    const { id } = req.params;
    const { positions } = req.body; // [{device_id, x, y}, ...]

    const records = positions.map((p: any) => ({
      floor_id: +id,
      device_id: +p.device_id,
      x: +p.x,
      y: +p.y,
    }));

    // 先删除该楼层已有标注
    await FloorDevicePosition.destroy({ where: { floor_id: +id } });
    await FloorDevicePosition.bulkCreate(records);

    return res.json(success(null, `批量标点成功：${records.length}个设备`));
  },

  async deleteDevicePosition(req: Request, res: Response) {
    const { id, device_id } = req.params;
    await FloorDevicePosition.destroy({ where: { floor_id: +id, device_id: +device_id } });
    return res.json(success(null, '删除点位成功'));
  },

  /* ─────────── 摄像头绑定 ─────────── */
  async getCameraBindings(req: Request, res: Response) {
    const { id } = req.params;
    const rows = await FloorCameraBinding.findAll({
      where: { floor_id: +id },
      include: [{ model: Floor, as: 'floor' }],
    });
    return res.json(success(rows));
  },

  async addCameraBinding(req: Request, res: Response) {
    const { id } = req.params;
    const { camera_device_id, bound_device_ids, x, y } = req.body;

    const [binding, created] = await FloorCameraBinding.findOrCreate({
      where: { floor_id: +id, camera_device_id: +camera_device_id },
      defaults: {
        floor_id: +id,
        camera_device_id: +camera_device_id,
        bound_device_ids: JSON.stringify(bound_device_ids || []),
        x, y,
      },
    });

    if (!created) {
      await binding.update({
        bound_device_ids: JSON.stringify(bound_device_ids || []),
        x, y,
      });
    }

    return res.json(success(null, '摄像头绑定成功'));
  },

  /* ─────────── 未标点设备列表 ─────────── */
  async getUnmarkedDevices(req: Request, res: Response) {
    const { id } = req.params;
    const devices = await FloorPlanService.getUnmarkedDevices(+id);
    return res.json(success(devices));
  },
};
