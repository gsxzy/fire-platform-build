"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deviceControl_controller_1 = require("@/controllers/deviceControl.controller");
const handleController_1 = require("@/utils/handleController");
const permission_1 = require("@/middleware/permission");
const router = (0, express_1.Router)();
const h = (name) => (0, handleController_1.handleController)(`DeviceControl.${String(name)}`, deviceControl_controller_1.DeviceControlController[name]);
const view = (0, permission_1.requirePermission)('device-control:view');
const operate = (0, permission_1.requirePermission)('device-control:operate');
router.post('/command', operate, h('sendCommand'));
router.post('/start-stop', operate, h('remoteStartStop'));
router.post('/reset', operate, h('remoteReset'));
router.post('/silence', operate, h('silence'));
router.post('/batch', operate, h('batchCommand'));
router.get('/history', view, h('commandHistory'));
exports.default = router;
//# sourceMappingURL=deviceControl.routes.js.map