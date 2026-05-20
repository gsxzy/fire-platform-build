"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const alarm_controller_1 = require("@/controllers/alarm.controller");
const alarmConfig_controller_1 = require("@/controllers/alarmConfig.controller");
const handleController_1 = require("@/utils/handleController");
const permission_1 = require("@/middleware/permission");
const router = (0, express_1.Router)();
const h = (name) => (0, handleController_1.handleController)(`Alarm.${String(name)}`, alarm_controller_1.AlarmController[name]);
/* ── 告警主接口 ── */
router.get('/', (0, permission_1.requirePermission)('alarm:view'), h('list'));
router.get('/list', (0, permission_1.requirePermission)('alarm:view'), h('list'));
router.get('/stats', (0, permission_1.requirePermission)('alarm:view'), h('stats'));
router.get('/recent', (0, permission_1.requirePermission)('alarm:view'), h('recent'));
router.get('/trend', (0, permission_1.requirePermission)('alarm:view'), h('trend'));
router.get('/:id/detail', (0, permission_1.requirePermission)('alarm:view'), h('getDetail'));
router.post('/', (0, permission_1.requirePermission)('alarm:handle'), h('create'));
router.put('/:id/confirm', (0, permission_1.requirePermission)('alarm:handle'), h('confirm'));
router.put('/:id/handle', (0, permission_1.requirePermission)('alarm:handle'), h('handle'));
router.put('/:id/dismiss', (0, permission_1.requirePermission)('alarm:handle'), h('dismiss'));
router.put('/:id/silence', (0, permission_1.requirePermission)('alarm:handle'), h('silence'));
/* ── 告警配置（阈值 + 通知策略） ── */
const th = (name) => (0, handleController_1.handleController)(`AlarmThreshold.${String(name)}`, alarmConfig_controller_1.AlarmThresholdController[name]);
const nh = (name) => (0, handleController_1.handleController)(`AlarmNotifyPolicy.${String(name)}`, alarmConfig_controller_1.AlarmNotifyPolicyController[name]);
const cfgView = (0, permission_1.requirePermission)('alarm:config');
const cfgEdit = (0, permission_1.requirePermission)('alarm:config');
router.get('/config/thresholds', cfgView, th('list'));
router.get('/config/thresholds/:id', cfgView, th('byId'));
router.post('/config/thresholds', cfgEdit, th('create'));
router.put('/config/thresholds/:id', cfgEdit, th('update'));
router.delete('/config/thresholds/:id', cfgEdit, th('delete'));
router.get('/config/policies', cfgView, nh('list'));
router.get('/config/policies/:id', cfgView, nh('byId'));
router.post('/config/policies', cfgEdit, nh('create'));
router.put('/config/policies/:id', cfgEdit, nh('update'));
router.delete('/config/policies/:id', cfgEdit, nh('delete'));
exports.default = router;
//# sourceMappingURL=alarm.routes.js.map