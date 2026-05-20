"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const smartAlert_controller_1 = require("@/controllers/smartAlert.controller");
const handleController_1 = require("@/utils/handleController");
const permission_1 = require("@/middleware/permission");
const router = (0, express_1.Router)();
const sa = (name) => (0, handleController_1.handleController)(`SmartAlert.${String(name)}`, smartAlert_controller_1.SmartAlertController[name]);
const view = (0, permission_1.requirePermission)('smart:view');
const manage = (0, permission_1.requirePermission)('smart:manage');
router.get('/alerts', view, sa('alertList'));
router.get('/alerts/count', view, sa('alertCount'));
router.post('/alerts', manage, sa('alertCreate'));
router.put('/alerts/:id', manage, sa('alertUpdate'));
router.delete('/alerts/:id', manage, sa('alertDelete'));
router.put('/alerts/:id/confirm', manage, sa('alertConfirm'));
router.put('/alerts/:id/handle', manage, sa('alertHandle'));
exports.default = router;
//# sourceMappingURL=smart.routes.js.map