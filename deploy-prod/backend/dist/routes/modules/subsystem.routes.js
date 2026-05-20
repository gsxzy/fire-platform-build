"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subsystem_controller_1 = require("@/controllers/subsystem.controller");
const handleController_1 = require("@/utils/handleController");
const permission_1 = require("@/middleware/permission");
const router = (0, express_1.Router)();
const h = (name) => (0, handleController_1.handleController)(`Subsystem.${String(name)}`, subsystem_controller_1.SubsystemController[name]);
router.get('/', (0, permission_1.requirePermission)('subsystem:view'), h('list'));
exports.default = router;
//# sourceMappingURL=subsystem.routes.js.map