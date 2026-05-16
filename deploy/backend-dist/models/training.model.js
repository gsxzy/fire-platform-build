"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingExam = exports.TrainingCourse = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 16. 培训考核 ── */
exports.TrainingCourse = database_1.default.define('training_course', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    course_name: { type: sequelize_1.DataTypes.STRING(200), allowNull: false },
    course_type: { type: sequelize_1.DataTypes.TINYINT, comment: '1安全培训 2操作培训 3法规培训' },
    content: sequelize_1.DataTypes.TEXT,
    file_url: sequelize_1.DataTypes.STRING(500),
    duration: sequelize_1.DataTypes.INTEGER,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_training_course', comment: '培训课程表' });
exports.TrainingExam = database_1.default.define('training_exam', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    exam_name: { type: sequelize_1.DataTypes.STRING(200), allowNull: false },
    course_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    questions: sequelize_1.DataTypes.TEXT,
    pass_score: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 60 },
    duration: sequelize_1.DataTypes.INTEGER,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_training_exam', comment: '考核试卷表' });
//# sourceMappingURL=training.model.js.map