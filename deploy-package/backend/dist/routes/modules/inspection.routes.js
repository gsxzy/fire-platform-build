"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inspection_controller_1 = require("@/controllers/inspection.controller");
const handleController_1 = require("@/utils/handleController");
const permission_1 = require("@/middleware/permission");
const router = (0, express_1.Router)();
const h = (name) => (0, handleController_1.handleController)(`Inspection.${String(name)}`, inspection_controller_1.InspectionController[name]);
const view = (0, permission_1.requirePermission)('fire-check:view');
const manage = (0, permission_1.requirePermission)('fire-check:manage');
router.get('/', view, h('list'));
router.post('/', manage, h('create'));
router.put('/:id', manage, h('update'));
router.delete('/:id', manage, h('delete'));
exports.default = router;
//# sourceMappingURL=inspection.routes.js.map