"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrillParticipant = exports.EmergencyDrill = exports.EmergencyPlan = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 9. 应急预案 ── */
exports.EmergencyPlan = database_1.default.define('emergency_plan', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    plan_name: { type: sequelize_1.DataTypes.STRING(200), allowNull: false },
    plan_type: { type: sequelize_1.DataTypes.TINYINT, comment: '1灭火 2疏散 3防汛 4停电' },
    plan_level: { type: sequelize_1.DataTypes.TINYINT, comment: '1一级 2二级 3三级' },
    version_no: sequelize_1.DataTypes.STRING(30),
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    applicable_scene: sequelize_1.DataTypes.TEXT,
    content: sequelize_1.DataTypes.TEXT('long'),
    file_url: sequelize_1.DataTypes.STRING(500),
    update_date: sequelize_1.DataTypes.DATEONLY,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1生效中 0已废止 2修订中' },
}, { tableName: 'fire_emergency_plan', comment: '应急预案表' });
exports.EmergencyDrill = database_1.default.define('emergency_drill', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    drill_no: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    drill_name: sequelize_1.DataTypes.STRING(200),
    plan_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    unit_name: sequelize_1.DataTypes.STRING(200),
    drill_date: sequelize_1.DataTypes.DATE,
    location: sequelize_1.DataTypes.STRING(200),
    duration: sequelize_1.DataTypes.STRING(50),
    drill_type: sequelize_1.DataTypes.STRING(30),
    participants: sequelize_1.DataTypes.INTEGER,
    drill_content: sequelize_1.DataTypes.TEXT,
    result: sequelize_1.DataTypes.TEXT,
    photos: sequelize_1.DataTypes.TEXT,
    video_url: sequelize_1.DataTypes.STRING(500),
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1计划中 2进行中 3已完成 0已取消' },
}, { tableName: 'fire_emergency_drill', comment: '演练记录表' });
exports.DrillParticipant = database_1.default.define('drill_participant', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    drill_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    name: { type: sequelize_1.DataTypes.STRING(64), allowNull: false },
    role: sequelize_1.DataTypes.STRING(64),
}, {
    tableName: 'drill_participants',
    comment: '演练参与人表',
    timestamps: true,
    underscored: true,
});
//# sourceMappingURL=plan.model.js.map