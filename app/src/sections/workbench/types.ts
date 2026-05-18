export interface StatItem {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend: string;
  up: boolean;
}

export const DEFAULT_ALARM_TREND: { day: string; fire: number; fault: number; warn: number }[] = [];
export const DEFAULT_DEVICE_ONLINE: { name: string; total: number; online: number }[] = [];
export const DEFAULT_UNIT_STATUS: { name: string; value: number; color: string }[] = [];
export const DEFAULT_WEEKLY_STATS: { week: string; alarms: number; handled: number }[] = [];
export const DEFAULT_SHORTCUTS: any[] = [];
export const DEFAULT_TODOS: any[] = [];
