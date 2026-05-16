// src/types/map.ts
/** 地图单位数据类型 */
export interface MapUnit {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'key' | 'general' | 'nine-small';
  unitType: string;
  address: string;
  online: boolean;
  alarm: number;
  fault: number;
  devices: number;
  controlRoom: boolean;
  manager?: string;
  managerPhone?: string;
  maintenanceStatus?: string;
  lastAlarm?: string;
}

/** 类型配置 */
export const typeConfig = (type: string) => {
  switch (type) {
    case 'key': return { color: '#ef4444', label: '重点单位', pulse: true };
    case 'general': return { color: '#3b82f6', label: '一般单位', pulse: false };
    case 'nine-small': return { color: '#f59e0b', label: '九小场所', pulse: false };
    default: return { color: '#64748b', label: '未知', pulse: false };
  }
};

/** 告警闪烁颜色 */
export const alarmBlinkColor = '#22c55e';