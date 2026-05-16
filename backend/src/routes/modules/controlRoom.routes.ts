import { Router } from 'express';
import { ControlRoomController } from '@/controllers/controlRoom.controller';
import { upload } from '@/middleware/upload';

const router = Router();

router.get('/', ControlRoomController.list);
router.post('/', ControlRoomController.create);

// 报警主机（必须放在 /:id 之前，避免 'hosts' 被匹配为 id）
router.get('/hosts', ControlRoomController.hostList);
router.post('/hosts', ControlRoomController.hostCreate);
router.put('/hosts/:id', ControlRoomController.hostUpdate);
router.delete('/hosts/:id', ControlRoomController.hostDelete);
router.get('/hosts/:id', ControlRoomController.hostDetail);

// 主机控制指令（消音 / 复位 / 手自动 / 多线盘）
router.post('/silence', ControlRoomController.silence);
router.post('/reset', ControlRoomController.reset);
router.post('/mode', ControlRoomController.switchMode);
router.post('/multiline/control', ControlRoomController.controlMultiline);

// 多线盘、总线点位
router.get('/multiline', ControlRoomController.multilineList);
router.post('/multiline', ControlRoomController.multilineCreate);
router.put('/multiline/:id', ControlRoomController.multilineUpdate);
router.get('/bus-points', ControlRoomController.busPointList);
router.post('/bus-points', ControlRoomController.busPointCreate);
router.put('/bus-points/:id', ControlRoomController.busPointUpdate);

// 控制日志
router.get('/command-logs', ControlRoomController.commandLogs);

// 关联摄像头
router.get('/videos', ControlRoomController.videoList);

// 报警主机编码表
router.get('/host-device-codes', ControlRoomController.hostDeviceCodeList);
router.post('/host-device-codes', ControlRoomController.hostDeviceCodeCreate);
router.put('/host-device-codes/:id', ControlRoomController.hostDeviceCodeUpdate);
router.delete('/host-device-codes/:id', ControlRoomController.hostDeviceCodeDelete);
router.post('/host-device-codes/import', upload.single('file'), ControlRoomController.hostDeviceCodeImport);

// 消控室更新、删除、详情（必须放在所有具体路由之后，避免通配匹配）
router.put('/:id', ControlRoomController.update);
router.delete('/:id', ControlRoomController.delete);
router.get('/:id', ControlRoomController.detail);

export default router;
