export interface LinkageRule {
  id: string;
  name: string;
  type: string;
  trigger: string;
  triggerDesc: string;
  actions: string[];
  targets: string[];
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
  timeRange: string;
  units: string[];
  deviceTypes: string[];
  lastTriggered: string;
  triggerCount: number;
  description: string;
  /** 指定触发设备时仅该设备告警匹配；留空表示任意设备 */
  triggerDeviceId?: string;
  /** 限制的告警类型（与 fire_alarm.alarm_type 一致），空表示不按类型额外过滤 */
  alarmTypes?: number[];
}

export interface LinkageLog {
  id: string;
  time: string;
  ruleName: string;
  ruleId: string;
  trigger: string;
  actions: string[];
  result: 'success' | 'partial' | 'fail';
  duration: string;
  operator: string;
}
