/**
 * ═══════════════════════════════════════════════════════════════════
 * API 服务层 — 按领域模块化拆分
 *
 * 约定：
 * - `api` / `raw`：HTTP 客户端（来自 client.ts）
 * ═══════════════════════════════════════════════════════════════════
 */
export { api, raw, legacyRaw, paginatedQuery, buildUrl, API_BASE, TOKEN_KEY, REFRESH_KEY } from '../client';
export { createService } from './core';
export type { QueryParams } from '@/types/db';

export { unitService } from './unit.service';

export {
  deviceService,
  deviceConfigService,
  deviceMaintenanceService,
  deviceAllocationService,
  cameraService,
} from './device.service';

export { alarmService, mapAlarmFromBackend } from './alarm.service';

export {
  workOrderService,
  maintRecordService,
  maintContractService,
  maintenanceStatsService,
} from './maintenance.service';

export { dashboardService, reportService } from './dashboard.service';
export { workbenchService } from './workbench.service';
export { linkageService } from './linkage.service';
export { authService } from './auth.service';
export type { LoginResult } from './auth.service';
export { controlRoomService } from './controlRoom.service';
export { aiService } from './ai.service';
export { smartAlertService } from './smartAlert.service';
export { trainingService } from './training.service';
export { floorPlanService } from './floorPlan.service';
export { departmentService, systemConfigService, moduleService, personnelService, monitorService } from './system.service';

export {
  patrolPlanService,
  patrolRecordService,
  hazardService,
} from './patrol.service';

export { planService, drillService, drillParticipantService } from './plan.service';

export { inspectionService } from './inspection.service';

export { dutyService, dutyShiftService, dutyHandoverService } from './duty.service';

export { userService, roleService, logService } from './system.service';

export { gb28181Service, sipServerService } from './gb28181.service';

export { iotService } from './iot.service';

export { knowledgeService, type KnowledgeDocRow } from './knowledge.service';

export { hostDeviceCodeService, controlRoomConfigService } from './control-room.service';

export { deviceControlService, DEVICE_CONTROL_CMD_MAP } from './deviceControl.service';
export type { DeviceControlCmdType, DeviceControlCommandBody } from './deviceControl.service';


