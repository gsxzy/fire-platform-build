"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const floorPlan_controller_1 = require("@/controllers/floorPlan.controller");
const upload_1 = require("@/middleware/upload"); // 复用现有上传中间件
const router = (0, express_1.Router)();
/* ── 建筑物 ── */
router.get('/buildings', floorPlan_controller_1.FloorPlanController.buildingList);
router.post('/buildings', floorPlan_controller_1.FloorPlanController.buildingCreate);
router.get('/buildings/:id', floorPlan_controller_1.FloorPlanController.buildingGet);
router.put('/buildings/:id', floorPlan_controller_1.FloorPlanController.buildingUpdate);
router.delete('/buildings/:id', floorPlan_controller_1.FloorPlanController.buildingDelete);
/* ── 楼层 ── */
router.get('/floors', floorPlan_controller_1.FloorPlanController.floorList);
router.post('/floors', floorPlan_controller_1.FloorPlanController.floorCreate);
router.get('/floors/:id', floorPlan_controller_1.FloorPlanController.floorGet);
router.put('/floors/:id', floorPlan_controller_1.FloorPlanController.floorUpdate);
router.delete('/floors/:id', floorPlan_controller_1.FloorPlanController.floorDelete);
/* ── 平面图上传 ── */
router.post('/floors/:id/plan', upload_1.upload.single('file'), floorPlan_controller_1.FloorPlanController.uploadPlan);
/* ── 设备点位 ── */
router.get('/floors/:id/devices', floorPlan_controller_1.FloorPlanController.getFloorDevices);
router.get('/floors/:id/devices/unmarked', floorPlan_controller_1.FloorPlanController.getUnmarkedDevices);
router.post('/floors/:id/devices', floorPlan_controller_1.FloorPlanController.addDevicePosition);
router.post('/floors/:id/devices/batch', floorPlan_controller_1.FloorPlanController.batchAddDevicePositions);
router.delete('/floors/:id/devices/:device_id', floorPlan_controller_1.FloorPlanController.deleteDevicePosition);
/* ── 摄像头绑定 ── */
router.get('/floors/:id/cameras', floorPlan_controller_1.FloorPlanController.getCameraBindings);
router.post('/floors/:id/cameras', floorPlan_controller_1.FloorPlanController.addCameraBinding);
exports.default = router;
//# sourceMappingURL=floorPlan.routes.js.map