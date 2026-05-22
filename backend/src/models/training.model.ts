import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 16. 培训考核 ── */
export const TrainingCourse = sequelize.define('training_course', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  course_name: { type: DataTypes.STRING(200), allowNull: false },
  course_type: { type: DataTypes.SMALLINT, comment: '1安全培训 2操作培训 3法规培训' },
  content: DataTypes.TEXT,
  file_url: DataTypes.STRING(500),
  duration: DataTypes.INTEGER,
  status: { type: DataTypes.SMALLINT, defaultValue: 1 },
}, { tableName: 'fire_training_course', comment: '培训课程表' });

export const TrainingExam = sequelize.define('training_exam', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  exam_name: { type: DataTypes.STRING(200), allowNull: false },
  course_id: DataTypes.BIGINT,
  questions: DataTypes.TEXT,
  pass_score: { type: DataTypes.INTEGER, defaultValue: 60 },
  duration: DataTypes.INTEGER,
  status: { type: DataTypes.SMALLINT, defaultValue: 1 },
}, { tableName: 'fire_training_exam', comment: '考核试卷表' });

/** 考试成绩记录（P1 新增） */
export const TrainingRecord = sequelize.define('training_record', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  record_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  exam_id: { type: DataTypes.BIGINT, allowNull: false },
  exam_name: DataTypes.STRING(200),
  examinee_name: { type: DataTypes.STRING(50), allowNull: false },
  examinee_id: DataTypes.BIGINT,
  answers: DataTypes.TEXT,              // JSON: { questionId: answer }
  score: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_score: DataTypes.INTEGER,
  pass: { type: DataTypes.BOOLEAN, defaultValue: false },
  duration: DataTypes.INTEGER,          // 答题用时（秒）
  cert_no: DataTypes.STRING(50),        // 证书编号（通过后生成）
  status: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0未通过 1已通过 2作废' },
}, {
  tableName: 'fire_training_record',
  comment: '培训考核成绩记录表',
  indexes: [
    { fields: ['exam_id'] },
    { fields: ['examinee_id'] },
    { fields: ['cert_no'] },
  ],
});
