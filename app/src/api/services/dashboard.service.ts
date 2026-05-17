/**
 * 工作台 / 大屏 / 分析 / 报表
 */
import { raw } from '../client';
export const dashboardService = {
  workbench: () => raw.get<Record<string, unknown>>('/workbench'),
  bigScreen: () => raw.get<Record<string, unknown>>('/bigscreen/data'),
  monitorOverview: () => raw.get<Record<string, unknown>>('/monitor/overview'),

  deviceAnalysis: (days?: number) => raw.get<Record<string, unknown>>('/analysis/device', { days }),
  alarmAnalysis: (days?: number) => raw.get<Record<string, unknown>>('/analysis/alarm', { days }),
  maintenanceAnalysis: () => raw.get<Record<string, unknown>>('/analysis/maintenance'),
  hazardAnalysis: () => raw.get<Record<string, unknown>>('/analysis/hazard'),
  patrolCompletion: (days?: number) => raw.get<Record<string, unknown>>('/analysis/patrol', { days }),

  alarmTrend: (days?: number) => raw.get<unknown>('/alarms/trend', { days }),

  dailyReport: (date?: string) => raw.get<Record<string, unknown>>('/reports/daily', { date }),
  weeklyReport: (endDate?: string) => raw.get<Record<string, unknown>>('/reports/weekly', { endDate }),
  monthlyReport: (year?: number, month?: number) =>
    raw.get<Record<string, unknown>>('/reports/monthly', { year, month }),
  deviceReport: (unitId?: number) => raw.get<Record<string, unknown>>('/reports/device', { unitId }),
  maintenanceReport: (startDate?: string, endDate?: string) =>
    raw.get<Record<string, unknown>>('/reports/maintenance', { startDate, endDate }),
  patrolReport: (startDate?: string, endDate?: string) =>
    raw.get<Record<string, unknown>>('/reports/patrol', { startDate, endDate }),

  gisPoints: () => raw.get<unknown>('/gis/points'),
  gisSituation: () => raw.get<unknown>('/gis/situation'),
  gisAlarmPoints: () => raw.get<unknown>('/gis/alarm-points'),
};

/** @deprecated 使用 dashboardService */
export const reportService = {
  daily: dashboardService.dailyReport,
  weekly: dashboardService.weeklyReport,
  monthly: dashboardService.monthlyReport,
  device: dashboardService.deviceReport,
  maintenance: dashboardService.maintenanceReport,
  patrol: dashboardService.patrolReport,
};
