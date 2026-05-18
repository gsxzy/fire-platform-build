/**
 * 业务域常量 — 与 ModuleRegistry、后端路由前缀对齐
 */
export const API_DOMAINS = {
  auth: '/auth',
  alarm: '/alarms',
  device: '/devices',
  deviceAllocation: '/device-allocations',
  deviceMaintenance: '/device-maintenances',
  deviceControl: '/device-control',
  unit: '/units',
  controlRoom: '/control-rooms',
  maintenance: '/maintenance',
  patrol: '/patrol',
  plan: '/plans',
  duty: '/duty',
  knowledge: '/knowledge',
  iot: '/iot',
  video: '/video',
  ai: '/ai',
  smart: '/smart',
  linkage: '/linkage',
  system: '/system',
  dashboard: '',
} as const;

export type ApiDomainKey = keyof typeof API_DOMAINS;
