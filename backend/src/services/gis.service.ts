import { Op } from 'sequelize';
import { Unit, Device, Alarm } from '@/models';

export class GISService {
  // 获取地图点位数据
  static async getMapPoints() {
    const units = await Unit.findAll({
      attributes: ['id', 'unit_name', 'unit_type', 'address', 'lng', 'lat', 'status'],
      raw: true,
    });

    const devices = await Device.findAll({
      attributes: ['id', 'device_name', 'device_type', 'unit_id', 'install_location', 'lng', 'lat', 'status'],
      raw: true,
    });

    const activeAlarms = await Alarm.findAll({
      where: { status: 0 },
      attributes: ['id', 'alarm_type', 'alarm_level', 'device_name', 'unit_name', 'location'],
      raw: true,
    });

    return { units, devices, activeAlarms };
  }

  // 获取区域态势（优化：单次聚合查询替代 N+1）
  static async getRegionSituation() {
    const units = await Unit.findAll({ raw: true });
    if (units.length === 0) return [];

    const unitIds = (units as any[]).map(u => u.id);
    const [deviceCounts, onlineCounts, alarmCounts] = await Promise.all([
      Device.findAll({
        attributes: ['unit_id', [Device.sequelize!.fn('COUNT', '*'), 'count']],
        where: { unit_id: { [Op.in]: unitIds } },
        group: ['unit_id'],
        raw: true,
      }) as Promise<any[]>,
      Device.findAll({
        attributes: ['unit_id', [Device.sequelize!.fn('COUNT', '*'), 'count']],
        where: { unit_id: { [Op.in]: unitIds }, status: 1 },
        group: ['unit_id'],
        raw: true,
      }) as Promise<any[]>,
      Alarm.findAll({
        attributes: ['unit_id', [Alarm.sequelize!.fn('COUNT', '*'), 'count']],
        where: { unit_id: { [Op.in]: unitIds }, status: 0 },
        group: ['unit_id'],
        raw: true,
      }) as Promise<any[]>,
    ]);

    const deviceCountMap = new Map(deviceCounts.map(d => [String(d.unit_id), Number(d.count)]));
    const onlineCountMap = new Map(onlineCounts.map(d => [String(d.unit_id), Number(d.count)]));
    const alarmCountMap = new Map(alarmCounts.map(d => [String(d.unit_id), Number(d.count)]));

    return (units as any[]).map(unit => {
      const deviceCount = deviceCountMap.get(String(unit.id)) || 0;
      const onlineCount = onlineCountMap.get(String(unit.id)) || 0;
      const alarmCount = alarmCountMap.get(String(unit.id)) || 0;
      return {
        ...unit,
        deviceCount,
        onlineCount,
        alarmCount,
        onlineRate: deviceCount ? ((onlineCount / deviceCount) * 100).toFixed(1) : 0,
      };
    });
  }

  // 获取告警点位（地图弹窗用）
  static async getAlarmPoints() {
    return Alarm.findAll({
      where: { status: { [Op.in]: [0, 1] } },
      attributes: ['id', 'alarm_no', 'alarm_type', 'alarm_level', 'device_name', 'unit_name', 'location', 'alarm_desc', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 100, raw: true,
    });
  }

  // 获取告警热力图数据
  static async getAlarmHeatmap() {
    const alarms = await Alarm.findAll({
      where: { status: { [Op.in]: [0, 1] } },
      attributes: ['id', 'alarm_level', 'lng', 'lat'],
      raw: true,
    }) as any[];
    return alarms
      .filter(a => a.lng != null && a.lat != null && !Number.isNaN(Number(a.lng)) && !Number.isNaN(Number(a.lat)))
      .map(a => ({
        lng: Number(a.lng),
        lat: Number(a.lat),
        weight: a.alarm_level === 3 ? 1.0 : a.alarm_level === 2 ? 0.7 : 0.4,
      }));
  }

  // 更新设备坐标
  static async updateDeviceLocation(deviceId: number, lng: number, lat: number) {
    await Device.update({ lng, lat }, { where: { id: deviceId } });
    return { success: true };
  }
}
