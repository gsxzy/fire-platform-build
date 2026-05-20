"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subsystem = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 子系统配置表 ── */
exports.Subsystem = database_1.default.define('Subsystem', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false, comment: '子系统名称' },
    type: { type: sequelize_1.DataTypes.STRING(32), allowNull: false, comment: '类型标识：water/elec/vent/light/audio/door/gas' },
    device_type_tags: { type: sequelize_1.DataTypes.JSON, comment: '关联设备类型关键词 ["水压","液位"]' },
    description: sequelize_1.DataTypes.TEXT,
    sort_order: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '0禁用 1启用' },
}, {
    tableName: 'subsystems',
    timestamps: true,
    underscored: true,
    comment: '子系统配置表',
    indexes: [
        { name: 'idx_type', fields: ['type'] },
        { name: 'idx_status', fields: ['status'] },
    ],
});
//# sourceMappingURL=subsystem.model.js.map