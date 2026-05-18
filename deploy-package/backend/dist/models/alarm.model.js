"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alarm = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 4. 告警中心 ── */
exports.Alarm = database_1.default.define('alarm', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    alarm_no: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    alarm_type: { type: sequelize_1.DataTypes.TINYINT, allowNull: false, comment: '1火警 2故障 3预警 4屏蔽 5其他' },
    alarm_level: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1一般 2严重 3紧急' },
    device_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    device_name: sequelize_1.DataTypes.STRING(100),
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    unit_name: sequelize_1.DataTypes.STRING(200),
    location: sequelize_1.DataTypes.STRING(200),
    alarm_desc: sequelize_1.DataTypes.TEXT,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0未处理 1确认中 2已处理 3误报' },
    handler_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    handler_name: sequelize_1.DataTypes.STRING(50),
    handle_time: sequelize_1.DataTypes.DATE,
    handle_result: sequelize_1.DataTypes.TEXT,
    confirm_time: sequelize_1.DataTypes.DATE,
    push_status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0未推送 1已推送 2推送失败' },
    // ── 协议层原始数据字段 ──
    protocol: sequelize_1.DataTypes.STRING(20),
    loop_no: sequelize_1.DataTypes.INTEGER,
    address: sequelize_1.DataTypes.INTEGER,
    host_code: sequelize_1.DataTypes.STRING(32),
    raw_data: sequelize_1.DataTypes.TEXT,
}, {
    tableName: 'fire_alarm',
    comment: '告警记录表',
    indexes: [
        { name: 'idx_device_id', fields: ['device_id'] },
        { name: 'idx_unit_id', fields: ['unit_id'] },
        { name: 'idx_status', fields: ['status'] },
        { name: 'idx_alarm_type', fields: ['alarm_type'] },
        { name: 'idx_alarm_level', fields: ['alarm_level'] },
        { name: 'idx_created_at', fields: ['created_at'] },
        /* 复合索引：告警中心列表高频筛选（类型+状态+时间倒序） */
        { name: 'idx_alarm_type_status_time', fields: ['alarm_type', 'status', 'created_at'] },
        /* 复合索引：按设备查询告警历史 */
        { name: 'idx_device_created', fields: ['device_id', 'created_at'] },
        /* 复合索引：单位告警统计 */
        { name: 'idx_unit_created', fields: ['unit_id', 'created_at'] },
    ],
});
//# sourceMappingURL=alarm.model.js.map