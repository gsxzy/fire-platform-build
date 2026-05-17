"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FloorPlanController = void 0;
const sequelize_1 = require("sequelize");
const response_1 = require("@/utils/response");
const models_1 = require("@/models");
const floorPlan_service_1 = require("@/services/floorPlan.service");
exports.FloorPlanController = {
    /* ─────────── 建筑物 ─────────── */
    async buildingList(req, res) {
        const { unit_id, pageNum = 1, pageSize = 20, keyword } = req.query;
        const where = {};
        if (unit_id)
            where.unit_id = +unit_id;
        if (keyword)
            where.name = { [sequelize_1.Op.like]: `%${keyword}%` };
        const { count, rows } = await models_1.Building.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
        });
        return res.json((0, response_1.page)(rows, count, +pageNum, +pageSize));
    },
    async buildingCreate(req, res) {
        const b = await models_1.Building.create(req.body);
        return res.json((0, response_1.success)({ id: b.id }, '创建成功'));
    },
    async buildingUpdate(req, res) {
        await models_1.Building.update(req.body, { where: { id: req.params.id } });
        return res.json((0, response_1.success)(null, '更新成功'));
    },
    async buildingDelete(req, res) {
        await models_1.Building.destroy({ where: { id: req.params.id } });
        return res.json((0, response_1.success)(null, '删除成功'));
    },
    async buildingGet(req, res) {
        const b = await models_1.Building.findByPk(req.params.id, {
            include: [{ model: models_1.Floor, as: 'floors', order: [['floor_number', 'ASC']] }],
        });
        return res.json((0, response_1.success)(b));
    },
    /* ─────────── 楼层 ─────────── */
    async floorList(req, res) {
        const { building_id } = req.query;
        const where = {};
        if (building_id)
            where.building_id = +building_id;
        const rows = await models_1.Floor.findAll({
            where,
            order: [['floor_number', 'ASC']],
        });
        return res.json((0, response_1.success)(rows));
    },
    async floorCreate(req, res) {
        const f = await models_1.Floor.create(req.body);
        return res.json((0, response_1.success)({ id: f.id }, '创建成功'));
    },
    async floorUpdate(req, res) {
        await models_1.Floor.update(req.body, { where: { id: req.params.id } });
        return res.json((0, response_1.success)(null, '更新成功'));
    },
    async floorDelete(req, res) {
        await models_1.Floor.destroy({ where: { id: req.params.id } });
        return res.json((0, response_1.success)(null, '删除成功'));
    },
    async floorGet(req, res) {
        const f = await models_1.Floor.findByPk(req.params.id, {
            include: [
                { model: models_1.Building, as: 'building', attributes: ['id', 'name', 'unit_id'] },
            ],
        });
        return res.json((0, response_1.success)(f));
    },
    /* ─────────── 平面图上传 ─────────── */
    async uploadPlan(req, res) {
        const { id } = req.params;
        const file = req.file;
        if (!file)
            return res.status(400).json({ code: 400, message: '未上传文件' });
        const result = await floorPlan_service_1.FloorPlanService.uploadPlan(+id, file);
        return res.json((0, response_1.success)(result, '上传成功'));
    },
    /* ─────────── 设备点位 ─────────── */
    async getFloorDevices(req, res) {
        const { id } = req.params;
        const devices = await floorPlan_service_1.FloorPlanService.getFloorDevices(+id);
        return res.json((0, response_1.success)(devices));
    },
    async addDevicePosition(req, res) {
        const { id } = req.params;
        const { device_id, x, y } = req.body;
        const [pos, created] = await models_1.FloorDevicePosition.findOrCreate({
            where: { floor_id: +id, device_id: +device_id },
            defaults: { floor_id: +id, device_id: +device_id, x, y },
        });
        if (!created) {
            await pos.update({ x, y });
        }
        return res.json((0, response_1.success)(null, '标点成功'));
    },
    async batchAddDevicePositions(req, res) {
        const { id } = req.params;
        const { positions } = req.body; // [{device_id, x, y}, ...]
        const records = positions.map((p) => ({
            floor_id: +id,
            device_id: +p.device_id,
            x: +p.x,
            y: +p.y,
        }));
        // 先删除该楼层已有标注
        await models_1.FloorDevicePosition.destroy({ where: { floor_id: +id } });
        await models_1.FloorDevicePosition.bulkCreate(records);
        return res.json((0, response_1.success)(null, `批量标点成功：${records.length}个设备`));
    },
    async deleteDevicePosition(req, res) {
        const { id, device_id } = req.params;
        await models_1.FloorDevicePosition.destroy({ where: { floor_id: +id, device_id: +device_id } });
        return res.json((0, response_1.success)(null, '删除点位成功'));
    },
    /* ─────────── 摄像头绑定 ─────────── */
    async getCameraBindings(req, res) {
        const { id } = req.params;
        const rows = await models_1.FloorCameraBinding.findAll({
            where: { floor_id: +id },
            include: [{ model: models_1.Floor, as: 'floor' }],
        });
        return res.json((0, response_1.success)(rows));
    },
    async addCameraBinding(req, res) {
        const { id } = req.params;
        const { camera_device_id, bound_device_ids, x, y } = req.body;
        const [binding, created] = await models_1.FloorCameraBinding.findOrCreate({
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
        return res.json((0, response_1.success)(null, '摄像头绑定成功'));
    },
    /* ─────────── 未标点设备列表 ─────────── */
    async getUnmarkedDevices(req, res) {
        const { id } = req.params;
        const devices = await floorPlan_service_1.FloorPlanService.getUnmarkedDevices(+id);
        return res.json((0, response_1.success)(devices));
    },
};
//# sourceMappingURL=floorPlan.controller.js.map