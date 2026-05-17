"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartAlert = exports.AIDecision = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 14. AI决策 ── */
exports.AIDecision = database_1.default.define('ai_decision', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    decision_no: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    scene: sequelize_1.DataTypes.STRING(200),
    input_data: sequelize_1.DataTypes.TEXT,
    analysis_result: sequelize_1.DataTypes.TEXT,
    suggestion: sequelize_1.DataTypes.TEXT,
    confidence: sequelize_1.DataTypes.DECIMAL(5, 2),
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_ai_decision', comment: 'AI决策记录表' });
/* ── 15. 智能预警 ── */
exports.SmartAlert = database_1.default.define('smart_alert', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    alert_no: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    alert_type: { type: sequelize_1.DataTypes.TINYINT, comment: '1趋势预警 2寿命预警 3环境预警' },
    device_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    device_name: sequelize_1.DataTypes.STRING(100),
    alert_desc: sequelize_1.DataTypes.TEXT,
    predict_time: sequelize_1.DataTypes.DATE,
    confidence: sequelize_1.DataTypes.DECIMAL(5, 2),
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0未处理 1已确认 2已处理' },
}, { tableName: 'fire_smart_alert', comment: '智能预警表' });
//# sourceMappingURL=ai.model.js.map