"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controlRoom_controller_1 = require("@/controllers/controlRoom.controller");
const upload_1 = require("@/middleware/upload");
const router = (0, express_1.Router)();
router.get('/', controlRoom_controller_1.ControlRoomController.list);
router.post('/', controlRoom_controller_1.ControlRoomController.create);
// 报警主机（必须放在 /:id 之前，避免 'hosts' 被匹配为 id）
router.get('/hosts', controlRoom_controller_1.ControlRoomController.hostList);
router.post('/hosts', controlRoom_controller_1.ControlRoomController.hostCreate);
router.put('/hosts/:id', controlRoom_controller_1.ControlRoomController.hostUpdate);
router.delete('/hosts/:id', controlRoom_controller_1.ControlRoomController.hostDelete);
router.get('/hosts/:id', controlRoom_controller_1.ControlRoomController.hostDetail);
// 主机控制指令（消音 / 复位 / 手自动 / 多线盘）
router.post('/silence', controlRoom_controller_1.ControlRoomController.silence);
router.post('/reset', controlRoom_controller_1.ControlRoomController.reset);
router.post('/mode', controlRoom_controller_1.ControlRoomController.switchMode);
router.post('/multiline/control', controlRoom_controller_1.ControlRoomController.controlMultiline);
// 多线盘、总线点位
router.get('/multiline', controlRoom_controller_1.ControlRoomController.multilineList);
router.post('/multiline', controlRoom_controller_1.ControlRoomController.multilineCreate);
router.put('/multiline/:id', controlRoom_controller_1.ControlRoomController.multilineUpdate);
router.get('/bus-points', controlRoom_controller_1.ControlRoomController.busPointList);
router.post('/bus-points', controlRoom_controller_1.ControlRoomController.busPointCreate);
router.put('/bus-points/:id', controlRoom_controller_1.ControlRoomController.busPointUpdate);
// 控制日志
router.get('/command-logs', controlRoom_controller_1.ControlRoomController.commandLogs);
// 实时物联状态（必须放在 /:id 之前）
router.get('/realtime', controlRoom_controller_1.ControlRoomController.getRealtimeStatus);
// 关联摄像头
router.get('/videos', controlRoom_controller_1.ControlRoomController.videoList);
// 报警主机编码表
router.get('/host-device-codes', controlRoom_controller_1.ControlRoomController.hostDeviceCodeList);
router.post('/host-device-codes', controlRoom_controller_1.ControlRoomController.hostDeviceCodeCreate);
router.put('/host-device-codes/:id', controlRoom_controller_1.ControlRoomController.hostDeviceCodeUpdate);
router.delete('/host-device-codes/:id', controlRoom_controller_1.ControlRoomController.hostDeviceCodeDelete);
router.post('/host-device-codes/import', upload_1.upload.single('file'), controlRoom_controller_1.ControlRoomController.hostDeviceCodeImport);
// 消控室更新、删除、详情（必须放在所有具体路由之后，避免通配匹配）
router.put('/:id', controlRoom_controller_1.ControlRoomController.update);
router.delete('/:id', controlRoom_controller_1.ControlRoomController.delete);
router.get('/:id', controlRoom_controller_1.ControlRoomController.detail);
exports.default = router;
//# sourceMappingURL=controlRoom.routes.js.map