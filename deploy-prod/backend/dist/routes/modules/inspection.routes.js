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
/* ── 检查记录 ── */
router.get('/', view, h('list'));
router.post('/', manage, h('create'));
router.put('/:id', manage, h('update'));
router.delete('/:id', manage, h('delete'));
/* ── 检查项模板（P2 新增）── */
router.get('/templates', view, h('templateList'));
router.post('/templates', manage, h('templateCreate'));
router.put('/templates/:id', manage, h('templateUpdate'));
router.delete('/templates/:id', manage, h('templateDelete'));
exports.default = router;
//# sourceMappingURL=inspection.routes.js.map