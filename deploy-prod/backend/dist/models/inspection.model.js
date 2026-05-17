"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FireInspection = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 17. 消防检查 ── */
exports.FireInspection = database_1.default.define('fire_inspection', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    inspect_no: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    unit_name: sequelize_1.DataTypes.STRING(200),
    inspect_type: { type: sequelize_1.DataTypes.TINYINT, comment: '1日常检查 2专项检查 3联合检查' },
    inspector: sequelize_1.DataTypes.STRING(50),
    inspect_date: sequelize_1.DataTypes.DATE,
    items: sequelize_1.DataTypes.TEXT,
    result: { type: sequelize_1.DataTypes.TINYINT, comment: '1合格 2不合格 3限期整改' },
    photos: sequelize_1.DataTypes.TEXT,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_inspection', comment: '消防检查表' });
//# sourceMappingURL=inspection.model.js.map