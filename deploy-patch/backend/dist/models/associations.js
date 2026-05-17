"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_model_1 = require("./auth.model");
const unit_model_1 = require("./unit.model");
const device_model_1 = require("./device.model");
const iot_model_1 = require("./iot.model");
const alarm_model_1 = require("./alarm.model");
const floorPlan_model_1 = require("./floorPlan.model");
/* ═══════════════════════════════════════════════════════════════════
   模型关联关系定义
   ═══════════════════════════════════════════════════════════════════ */
auth_model_1.User.belongsToMany(auth_model_1.Role, { through: auth_model_1.UserRole, foreignKey: 'user_id' });
auth_model_1.Role.belongsToMany(auth_model_1.User, { through: auth_model_1.UserRole, foreignKey: 'role_id' });
auth_model_1.Role.belongsToMany(auth_model_1.Permission, { through: auth_model_1.RolePermission, foreignKey: 'role_id' });
auth_model_1.Permission.belongsToMany(auth_model_1.Role, { through: auth_model_1.RolePermission, foreignKey: 'perm_id' });
(0, floorPlan_model_1.initFloorPlanAssociations)({ Unit: unit_model_1.Unit, Device: device_model_1.Device });
device_model_1.Device.belongsTo(unit_model_1.Unit, { foreignKey: 'unit_id', as: 'unit' });
unit_model_1.Unit.hasMany(device_model_1.Device, { foreignKey: 'unit_id', as: 'devices' });
device_model_1.DeviceMaintenance.belongsTo(device_model_1.Device, { foreignKey: 'device_id', as: 'device' });
alarm_model_1.Alarm.belongsTo(device_model_1.Device, { foreignKey: 'device_id', as: 'device' });
device_model_1.Device.hasMany(alarm_model_1.Alarm, { foreignKey: 'device_id', as: 'alarms' });
iot_model_1.IoTDevice.belongsTo(device_model_1.Device, { foreignKey: 'archive_device_id', as: 'archiveDevice' });
device_model_1.Device.hasOne(iot_model_1.IoTDevice, { foreignKey: 'archive_device_id', as: 'iotDevice' });
iot_model_1.IoTDevice.belongsTo(unit_model_1.Unit, { foreignKey: 'unit_id', as: 'unit' });
unit_model_1.Unit.hasMany(iot_model_1.IoTDevice, { foreignKey: 'unit_id', as: 'iotDevices' });
console.log('[Model] All associations loaded');
//# sourceMappingURL=associations.js.map