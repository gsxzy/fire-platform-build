"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const training_controller_1 = require("@/controllers/training.controller");
const handleController_1 = require("@/utils/handleController");
const permission_1 = require("@/middleware/permission");
const router = (0, express_1.Router)();
const h = (name) => (0, handleController_1.handleController)(`Training.${String(name)}`, training_controller_1.TrainingController[name]);
const view = (0, permission_1.requirePermission)('training:view');
const manage = (0, permission_1.requirePermission)('training:manage');
router.get('/courses', view, h('courseList'));
router.post('/courses', manage, h('courseCreate'));
router.put('/courses/:id', manage, h('courseUpdate'));
router.delete('/courses/:id', manage, h('courseDelete'));
router.get('/exams', view, h('examList'));
router.post('/exams', manage, h('examCreate'));
exports.default = router;
//# sourceMappingURL=training.routes.js.map