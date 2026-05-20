"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const unit_controller_1 = require("@/controllers/unit.controller");
const handleController_1 = require("@/utils/handleController");
const permission_1 = require("@/middleware/permission");
const router = (0, express_1.Router)();
const h = (name) => (0, handleController_1.handleController)(`Unit.${String(name)}`, unit_controller_1.UnitController[name]);
router.get('/list', (0, permission_1.requirePermission)('unit:view'), h('list'));
router.get('/stats', (0, permission_1.requirePermission)('unit:view'), h('stats'));
router.get('/stats/overview', (0, permission_1.requirePermission)('unit:view'), h('overviewStats'));
router.post('/', (0, permission_1.requirePermission)('unit:create'), h('create'));
router.put('/:id', (0, permission_1.requirePermission)('unit:edit'), h('update'));
router.delete('/:id', (0, permission_1.requirePermission)('unit:delete'), h('delete'));
exports.default = router;
//# sourceMappingURL=unit.routes.js.map