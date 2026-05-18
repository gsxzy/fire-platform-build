"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deviceAllocation_controller_1 = require("@/controllers/deviceAllocation.controller");
const handleController_1 = require("@/utils/handleController");
const permission_1 = require("@/middleware/permission");
const router = (0, express_1.Router)();
const h = (name) => (0, handleController_1.handleController)(`DeviceAllocation.${String(name)}`, deviceAllocation_controller_1.DeviceAllocationController[name]);
const view = (0, permission_1.requirePermission)('device:view');
const edit = (0, permission_1.requirePermission)('device:edit');
router.get('/pending', view, h('listPending'));
router.post('/allocate', edit, h('allocate'));
router.post('/unallocate', edit, h('unallocate'));
router.post('/reallocate', edit, h('reallocate'));
router.get('/list', view, h('listLogs'));
exports.default = router;
//# sourceMappingURL=deviceAllocation.routes.js.map