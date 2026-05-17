import { User, Role, Permission, UserRole, RolePermission } from './auth.model';
import { Unit } from './unit.model';
import { Device, DeviceMaintenance } from './device.model';
import { IoTDevice } from './iot.model';
import { Alarm } from './alarm.model';
import { initFloorPlanAssociations } from './floorPlan.model';

/* ═══════════════════════════════════════════════════════════════════
   模型关联关系定义
   ═══════════════════════════════════════════════════════════════════ */

User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id' });
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'perm_id' });

initFloorPlanAssociations({ Unit, Device });

Device.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unit' });
Unit.hasMany(Device, { foreignKey: 'unit_id', as: 'devices' });

DeviceMaintenance.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });

Alarm.belongsTo(Device, { foreignKey: 'device_id', as: 'device' });
Device.hasMany(Alarm, { foreignKey: 'device_id', as: 'alarms' });

IoTDevice.belongsTo(Device, { foreignKey: 'archive_device_id', as: 'archiveDevice' });
Device.hasOne(IoTDevice, { foreignKey: 'archive_device_id', as: 'iotDevice' });

IoTDevice.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unit' });
Unit.hasMany(IoTDevice, { foreignKey: 'unit_id', as: 'iotDevices' });

// associations loaded
