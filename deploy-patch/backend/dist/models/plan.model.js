"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyDrill = exports.EmergencyPlan = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 9. 应急预案 ── */
exports.EmergencyPlan = database_1.default.define('emergency_plan', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    plan_name: { type: sequelize_1.DataTypes.STRING(200), allowNull: false },
    plan_type: { type: sequelize_1.DataTypes.TINYINT, comment: '1灭火 2疏散 3防汛 4停电' },
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    applicable_scene: sequelize_1.DataTypes.TEXT,
    content: sequelize_1.DataTypes.TEXT('long'),
    file_url: sequelize_1.DataTypes.STRING(500),
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_emergency_plan', comment: '应急预案表' });
exports.EmergencyDrill = database_1.default.define('emergency_drill', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    drill_no: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    plan_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    unit_name: sequelize_1.DataTypes.STRING(200),
    drill_date: sequelize_1.DataTypes.DATE,
    drill_type: sequelize_1.DataTypes.STRING(30),
    participants: sequelize_1.DataTypes.INTEGER,
    drill_content: sequelize_1.DataTypes.TEXT,
    result: sequelize_1.DataTypes.TEXT,
    photos: sequelize_1.DataTypes.TEXT,
    video_url: sequelize_1.DataTypes.STRING(500),
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_emergency_drill', comment: '演练记录表' });
//# sourceMappingURL=plan.model.js.map