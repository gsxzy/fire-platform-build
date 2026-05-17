"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const alarm_controller_1 = require("@/controllers/alarm.controller");
const router = (0, express_1.Router)();
router.get('/', alarm_controller_1.AlarmController.list);
router.get('/list', alarm_controller_1.AlarmController.list);
router.get('/:id/detail', alarm_controller_1.AlarmController.getDetail);
router.post('/', alarm_controller_1.AlarmController.create);
router.get('/stats', alarm_controller_1.AlarmController.stats);
router.get('/recent', alarm_controller_1.AlarmController.recent);
router.get('/trend', alarm_controller_1.AlarmController.trend);
router.put('/:id/confirm', alarm_controller_1.AlarmController.confirm);
router.put('/:id/handle', alarm_controller_1.AlarmController.handle);
router.put('/:id/dismiss', alarm_controller_1.AlarmController.dismiss);
router.put('/:id/silence', alarm_controller_1.AlarmController.silence);
exports.default = router;
//# sourceMappingURL=alarm.routes.js.map