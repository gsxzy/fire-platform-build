"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const duty_controller_1 = require("@/controllers/duty.controller");
const dutyShift_controller_1 = require("@/controllers/dutyShift.controller");
const dutyHandover_controller_1 = require("@/controllers/dutyHandover.controller");
const handleController_1 = require("@/utils/handleController");
const permission_1 = require("@/middleware/permission");
const router = (0, express_1.Router)();
const h = (name) => (0, handleController_1.handleController)(`Duty.${String(name)}`, duty_controller_1.DutyController[name]);
const sh = (name) => (0, handleController_1.handleController)(`DutyShift.${String(name)}`, dutyShift_controller_1.DutyShiftController[name]);
const hh = (name) => (0, handleController_1.handleController)(`DutyHandover.${String(name)}`, dutyHandover_controller_1.DutyHandoverController[name]);
const view = (0, permission_1.requirePermission)('duty:view');
const manage = (0, permission_1.requirePermission)('duty:manage');
// ── 排班 ──
router.get('/schedules', view, h('scheduleList'));
router.get('/schedules/:id', view, h('scheduleById'));
router.post('/schedules', manage, h('scheduleCreate'));
router.put('/schedules/:id', manage, h('scheduleUpdate'));
router.delete('/schedules/:id', manage, h('scheduleDelete'));
// ── 班次定义 ──
router.get('/shifts', view, sh('list'));
router.get('/shifts/:id', view, sh('byId'));
router.post('/shifts', manage, sh('create'));
router.put('/shifts/:id', manage, sh('update'));
router.delete('/shifts/:id', manage, sh('delete'));
router.patch('/shifts/:id/status', manage, sh('toggleStatus'));
// ── 签到/签退 ──
router.post('/check-in', manage, h('checkIn'));
router.post('/check-out', manage, h('checkOut'));
// ── 值班日志 ──
router.get('/logs', view, h('logList'));
router.post('/logs', manage, h('addLog'));
router.get('/logs/summary/:scheduleId', view, h('generateSummary'));
// ── 交接班 ──
router.get('/handovers', view, hh('list'));
router.get('/handovers/:id', view, hh('byId'));
router.post('/handovers', manage, hh('create'));
router.post('/handovers/:id/accept', manage, hh('accept'));
router.get('/handovers/summary', view, hh('summary'));
// ── 当前值班/缺勤 ──
router.get('/current', view, h('currentDuty'));
router.get('/absence-alert', view, h('absenceAlert'));
exports.default = router;
//# sourceMappingURL=duty.routes.js.map