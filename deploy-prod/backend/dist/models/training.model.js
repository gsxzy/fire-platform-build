"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingRecord = exports.TrainingExam = exports.TrainingCourse = void 0;
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
/** 考试成绩记录（P1 新增） */
exports.TrainingRecord = database_1.default.define('training_record', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    record_no: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    exam_id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, allowNull: false },
    exam_name: sequelize_1.DataTypes.STRING(200),
    examinee_name: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    examinee_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    answers: sequelize_1.DataTypes.TEXT, // JSON: { questionId: answer }
    score: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    total_score: sequelize_1.DataTypes.INTEGER,
    pass: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
    duration: sequelize_1.DataTypes.INTEGER, // 答题用时（秒）
    cert_no: sequelize_1.DataTypes.STRING(50), // 证书编号（通过后生成）
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0未通过 1已通过 2作废' },
}, {
    tableName: 'fire_training_record',
    comment: '培训考核成绩记录表',
    indexes: [
        { name: 'idx_exam_id', fields: ['exam_id'] },
        { name: 'idx_examinee', fields: ['examinee_id'] },
        { name: 'idx_cert_no', fields: ['cert_no'] },
    ],
});
//# sourceMappingURL=training.model.js.map