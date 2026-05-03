import { Router } from 'express';
import { FloorPlanController } from '@/controllers/floorPlan.controller';
import { upload } from '@/middleware/upload'; // 复用现有上传中间件

const router = Router();

/* ── 建筑物 ── */
router.get('/buildings', FloorPlanController.buildingList);
router.post('/buildings', FloorPlanController.buildingCreate);
router.get('/buildings/:id', FloorPlanController.buildingGet);
router.put('/buildings/:id', FloorPlanController.buildingUpdate);
router.delete('/buildings/:id', FloorPlanController.buildingDelete);

/* ── 楼层 ── */
router.get('/floors', FloorPlanController.floorList);
router.post('/floors', FloorPlanController.floorCreate);
router.get('/floors/:id', FloorPlanController.floorGet);
router.put('/floors/:id', FloorPlanController.floorUpdate);
router.delete('/floors/:id', FloorPlanController.floorDelete);

/* ── 平面图上传 ── */
router.post('/floors/:id/plan', upload.single('file'), FloorPlanController.uploadPlan);

/* ── 设备点位 ── */
router.get('/floors/:id/devices', FloorPlanController.getFloorDevices);
router.get('/floors/:id/devices/unmarked', FloorPlanController.getUnmarkedDevices);
router.post('/floors/:id/devices', FloorPlanController.addDevicePosition);
router.post('/floors/:id/devices/batch', FloorPlanController.batchAddDevicePositions);
router.delete('/floors/:id/devices/:device_id', FloorPlanController.deleteDevicePosition);

/* ── 摄像头绑定 ── */
router.get('/floors/:id/cameras', FloorPlanController.getCameraBindings);
router.post('/floors/:id/cameras', FloorPlanController.addCameraBinding);

export default router;
