"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const knowledge_controller_1 = require("@/controllers/knowledge.controller");
const handleController_1 = require("@/utils/handleController");
const permission_1 = require("@/middleware/permission");
const router = (0, express_1.Router)();
const h = (name) => (0, handleController_1.handleController)(`Knowledge.${String(name)}`, knowledge_controller_1.KnowledgeController[name]);
const view = (0, permission_1.requirePermission)('knowledge:view');
const manage = (0, permission_1.requirePermission)('knowledge:manage');
router.get('/', view, h('list'));
router.post('/', manage, h('create'));
router.put('/:id', manage, h('update'));
router.delete('/:id', manage, h('delete'));
router.get('/categories', view, h('categories'));
exports.default = router;
//# sourceMappingURL=knowledge.routes.js.map