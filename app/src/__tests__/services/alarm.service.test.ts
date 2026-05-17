import { describe, it, expect } from 'vitest';
import { mapAlarmFromBackend } from '@/api/services/alarm.service';

describe('mapAlarmFromBackend', () => {
  it('应正确映射 snake_case 后端数据', () => {
    const raw = {
      id: 123,
      alarm_no: 'ALM-2024-001',
      alarm_type: 1,
      alarm_level: 3,
      device_id: 'DEV-01',
      device_name: '烟感01',
      unit_id: 'UNIT-01',
      unit_name: '测试单位',
      location: '1号楼大厅',
      alarm_desc: '烟雾浓度超标',
      status: 0,
      handler_name: '张三',
      created_at: '2024-01-01T00:00:00Z',
    };
    const alarm = mapAlarmFromBackend(raw);
    expect(alarm.id).toBe('123');
    expect(alarm.type).toBe('fire');
    expect(alarm.level).toBe('urgent');
    expect(alarm.status).toBe('new');
    expect(alarm.deviceName).toBe('烟感01');
    expect(alarm.unitName).toBe('测试单位');
  });

  it('应正确映射 camelCase 后端数据', () => {
    const raw = {
      id: '456',
      alarmNo: 'ALM-002',
      type: 'fault',
      level: 'high',
      deviceId: 'DEV-02',
      deviceName: '水压表01',
      unitId: 'UNIT-02',
      unitName: '维保单位',
      location: '地下泵房',
      message: '水压过低',
      status: 'confirmed',
    };
    const alarm = mapAlarmFromBackend(raw);
    expect(alarm.id).toBe('456');
    expect(alarm.type).toBe('fault');
    expect(alarm.level).toBe('high');
    expect(alarm.status).toBe('confirmed');
    expect(alarm.alarmNo).toBe('ALM-002');
  });

  it('未知 alarm_type 应回退到 warning', () => {
    const alarm = mapAlarmFromBackend({ alarm_type: 99 });
    expect(alarm.type).toBe('warning');
  });

  it('缺失字段应提供默认值', () => {
    const alarm = mapAlarmFromBackend({ id: 1 });
    expect(alarm.deviceName).toBe('未知设备');
    expect(alarm.unitName).toBe('未知单位');
    expect(alarm.location).toBe('未知位置');
    expect(alarm.status).toBe('new');
  });
});
