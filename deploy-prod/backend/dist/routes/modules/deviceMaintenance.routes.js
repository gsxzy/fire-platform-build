"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deviceMaintenance_controller_1 = require("@/controllers/deviceMaintenance.controller");
const handleController_1 = require("@/utils/handleController");
const permission_1 = require("@/middleware/permission");
const router = (0, express_1.Router)();
const h = (name) => (0, handleController_1.handleController)(`DeviceMaintenance.${String(name)}`, deviceMaintenance_controller_1.DeviceMaintenanceController[name]);
const view = (0, permission_1.requirePermission)('maintenance:view');
router.get('/stats', view, h('stats'));
router.get('/list', view, h('list'));
router.post('/', view, h('create'));
router.put('/:id', view, h('update'));
router.delete('/:id', view, h('delete'));
exports.default = router;
//# sourceMappingURL=deviceMaintenance.routes.js.map