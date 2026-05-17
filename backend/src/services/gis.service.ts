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

  // 获取区域态势
  static async getRegionSituation() {
    const units = await Unit.findAll({ raw: true });
    const result = [];
    for (const unit of units as any[]) {
      const [deviceCount, onlineCount, alarmCount] = await Promise.all([
        Device.count({ where: { unit_id: unit.id } }),
        Device.count({ where: { unit_id: unit.id, status: 1 } }),
        Alarm.count({ where: { unit_id: unit.id, status: 0 } }),
      ]);
      result.push({
        ...unit, deviceCount, onlineCount, alarmCount,
        onlineRate: deviceCount ? ((onlineCount / deviceCount) * 100).toFixed(1) : 0,
      });
    }
    return result;
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

  // 更新设备坐标
  static async updateDeviceLocation(deviceId: number, lng: number, lat: number) {
    await Device.update({ lng, lat }, { where: { id: deviceId } });
    return { success: true };
  }
}
