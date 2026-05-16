"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Unit = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 2. 单位管理 ── */
exports.Unit = database_1.default.define('unit', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    unit_name: { type: sequelize_1.DataTypes.STRING(200), allowNull: false },
    unit_code: { type: sequelize_1.DataTypes.STRING(50), unique: true },
    unit_type: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1一般单位 2重点单位 3九小场所' },
    address: sequelize_1.DataTypes.STRING(300),
    lng: sequelize_1.DataTypes.DECIMAL(10, 7),
    lat: sequelize_1.DataTypes.DECIMAL(10, 7),
    contact_name: sequelize_1.DataTypes.STRING(50),
    contact_phone: sequelize_1.DataTypes.STRING(20),
    contact_email: sequelize_1.DataTypes.STRING(100),
    legal_person: sequelize_1.DataTypes.STRING(50),
    license_no: sequelize_1.DataTypes.STRING(64),
    building_area: sequelize_1.DataTypes.DECIMAL(10, 2),
    floor_count: sequelize_1.DataTypes.INTEGER,
    fire_level: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '消防等级 1-5' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
    remark: sequelize_1.DataTypes.TEXT,
}, {
    tableName: 'fire_unit',
    comment: '消防单位表',
    indexes: [
        { name: 'idx_unit_code', fields: ['unit_code'] },
        { name: 'idx_unit_type', fields: ['unit_type'] },
        { name: 'idx_status', fields: ['status'] },
        { name: 'idx_fire_level', fields: ['fire_level'] },
    ],
});
//# sourceMappingURL=unit.model.js.map