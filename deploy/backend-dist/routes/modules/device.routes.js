"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const device_controller_1 = require("@/controllers/device.controller");
const router = (0, express_1.Router)();
router.get('/', device_controller_1.DeviceController.list);
router.get('/list', device_controller_1.DeviceController.list);
router.post('/', device_controller_1.DeviceController.create);
router.put('/:id', device_controller_1.DeviceController.update);
router.delete('/:id', device_controller_1.DeviceController.delete);
router.post('/:id/scrap', device_controller_1.DeviceController.scrap);
router.get('/stats', device_controller_1.DeviceController.stats);
router.get('/stats/overview', device_controller_1.DeviceController.stats);
router.get('/:id/config', device_controller_1.DeviceController.getConfig);
router.put('/:id/config', device_controller_1.DeviceController.saveConfig);
router.get('/types', device_controller_1.DeviceController.types);
exports.default = router;
//# sourceMappingURL=device.routes.js.map