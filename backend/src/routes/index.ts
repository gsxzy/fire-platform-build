import { Router } from 'express';
import { success } from '@/utils/response';
import { authMiddleware } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimit';
import { AuthController } from '@/controllers/auth.controller';
import { handleController } from '@/utils/handleController';
import { SystemController } from '@/controllers/system.controller';
import { Hikvision4GController } from '@/controllers/hikvision4g.controller';
import { CTWingController } from '@/controllers/ctwing.controller';
import { IoTController } from '@/controllers/iot.controller';

/* ── 模块级子路由 ── */
import alarmRoutes from './modules/alarm.routes';
import controlRoomRoutes from './modules/controlRoom.routes';
import deviceRoutes from './modules/device.routes';
import deviceAllocationRoutes from './modules/deviceAllocation.routes';
import deviceMaintenanceRoutes from './modules/deviceMaintenance.routes';
import maintenanceRoutes from './modules/maintenance.routes';
import videoRoutes from './modules/video.routes';
import dutyRoutes from './modules/duty.routes';
import dispatchRoutes from './modules/dispatch.routes';
import subsystemRoutes from './modules/subsystem.routes';
import patrolRoutes from './modules/patrol.routes';
import planRoutes from './modules/plan.routes';
import knowledgeRoutes from './modules/knowledge.routes';
import iotRoutes from './modules/iot.routes';
import trainingRoutes from './modules/training.routes';
import inspectionRoutes from './modules/inspection.routes';
import systemRoutes from './modules/system.routes';
import linkageRoutes from './modules/linkage.routes';
import aiRoutes from './modules/ai.routes';
import smartRoutes from './modules/smart.routes';
import dashboardRoutes from './modules/dashboard.routes';
import workbenchRoutes from './modules/workbench.routes';
import deviceControlRoutes from './modules/deviceControl.routes';
import unitRoutes from './modules/unit.routes';

import floorPlanAppRouter from '@/routes/floorPlanApp.routes';
import stubRouter from '@/routes/stub.routes';

const router = Router();

/* ═══════════════════════════════════════════════════════════════════════════
 * 公开接口
 * ═══════════════════════════════════════════════════════════════════════════ */
const authHandler = (name: keyof typeof AuthController) =>
  handleController(`Auth.${String(name)}`, AuthController[name]);

router.post('/auth/login', authRateLimiter, authHandler('login'));
router.post('/auth/register', authRateLimiter, authHandler('register'));
router.post('/auth/refresh', authHandler('refresh'));
router.post('/auth/logout', authHandler('logout'));
router.get('/health', (req, res) =>
  res.json(success({ status: 'ok', version: '2.0.0', timestamp: Date.now() }, 'ok', req.reqId))
);
router.get('/public/stats', SystemController.dashboard);

/* ═══════════════════════════════════════════════════════════════════════════
 * 海康4G / CTWing 设备接入（无需JWT，设备/平台直接上报）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.post('/iot/hikvision/report', Hikvision4GController.report);
router.post('/iot/hikvision/heartbeat', Hikvision4GController.heartbeat);
router.post('/iot/ctwing/report', CTWingController.report);
router.post('/iot/ctwing/status', CTWingController.status);

/* ═══════════════════════════════════════════════════════════════════════════
 * 认证中间件（此后所有接口需登录）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use(authMiddleware);

/* ═══════════════════════════════════════════════════════════════════════════
 * 模块子路由
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use(floorPlanAppRouter);
router.use(dashboardRoutes);
router.use('/workbench', workbenchRoutes);
router.use('/alarms', alarmRoutes);
router.use('/control-rooms', controlRoomRoutes);
router.use('/units', unitRoutes);
router.use('/devices', deviceRoutes);
router.use('/device-allocations', deviceAllocationRoutes);
router.use('/device-maintenances', deviceMaintenanceRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/patrol', patrolRoutes);
router.use('/plans', planRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/iot', iotRoutes);
/* 旧路径兼容：/iot-devices 重定向到 /iot（保留1个版本） */
router.get('/iot-devices/list', IoTController.deviceList);
router.post('/iot-devices', IoTController.deviceCreate);
router.put('/iot-devices/:id', IoTController.deviceUpdate);
router.delete('/iot-devices/:id', IoTController.deviceDelete);
router.use('/training', trainingRoutes);
router.use('/inspections', inspectionRoutes);
router.use('/system', systemRoutes);
router.use('/linkage', linkageRoutes);
router.use('/ai', aiRoutes);
router.use('/smart', smartRoutes);
router.use('/video', videoRoutes);
router.use('/device-control', deviceControlRoutes);
router.use('/duty', dutyRoutes);
router.use('/dispatches', dispatchRoutes);
router.use('/subsystems', subsystemRoutes);

/* ═══════════════════════════════════════════════════════════════════════════
 * 兼容旧版路径：Stub 兜底路由（须挂在所有显式路由之后）
 * ═══════════════════════════════════════════════════════════════════════════ */
router.use(stubRouter);

export default router;
