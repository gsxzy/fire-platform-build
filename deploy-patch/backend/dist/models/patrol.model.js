"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hazard = exports.PatrolRecord = exports.PatrolPlan = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 6. 巡检管理 ── */
exports.PatrolPlan = database_1.default.define('patrol_plan', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    plan_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    patrol_type: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1日检 2周检 3月检 4季检 5年检' },
    patrol_items: sequelize_1.DataTypes.TEXT,
    responsible_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    responsible_name: sequelize_1.DataTypes.STRING(50),
    start_date: sequelize_1.DataTypes.DATEONLY,
    end_date: sequelize_1.DataTypes.DATEONLY,
    cron_expr: sequelize_1.DataTypes.STRING(50),
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_patrol_plan', comment: '巡检计划表' });
exports.PatrolRecord = database_1.default.define('patrol_record', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    plan_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    patrol_no: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    unit_name: sequelize_1.DataTypes.STRING(200),
    patrol_user_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    patrol_user_name: sequelize_1.DataTypes.STRING(50),
    patrol_date: sequelize_1.DataTypes.DATE,
    patrol_items: sequelize_1.DataTypes.TEXT,
    result: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1正常 2异常' },
    abnormal_desc: sequelize_1.DataTypes.TEXT,
    photos: sequelize_1.DataTypes.TEXT,
    signature: sequelize_1.DataTypes.STRING(255),
}, {
    tableName: 'fire_patrol_record',
    comment: '巡检记录表',
    indexes: [
        { name: 'idx_plan_id', fields: ['plan_id'] },
        { name: 'idx_unit_id', fields: ['unit_id'] },
    ],
});
exports.Hazard = database_1.default.define('hazard', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    hazard_no: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    unit_name: sequelize_1.DataTypes.STRING(200),
    hazard_type: { type: sequelize_1.DataTypes.TINYINT, comment: '1设备故障 2通道堵塞 3标识缺失 4其他' },
    description: sequelize_1.DataTypes.TEXT,
    level: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1一般 2重大 3特大' },
    photos: sequelize_1.DataTypes.TEXT,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0待整改 1整改中 2已整改 3延期' },
    rectification_measures: sequelize_1.DataTypes.TEXT,
    deadline: sequelize_1.DataTypes.DATEONLY,
    rectifier_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    rectifier_name: sequelize_1.DataTypes.STRING(50),
    rectification_date: sequelize_1.DataTypes.DATE,
    before_photo: sequelize_1.DataTypes.STRING(255),
    after_photo: sequelize_1.DataTypes.STRING(255),
}, {
    tableName: 'fire_hazard',
    comment: '隐患管理表',
    indexes: [
        { name: 'idx_unit_id', fields: ['unit_id'] },
        { name: 'idx_status', fields: ['status'] },
    ],
});
//# sourceMappingURL=patrol.model.js.map