import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 16. 培训考核 ── */
export const TrainingCourse = sequelize.define('training_course', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  course_name: { type: DataTypes.STRING(200), allowNull: false },
  course_type: { type: DataTypes.TINYINT, comment: '1安全培训 2操作培训 3法规培训' },
  content: DataTypes.TEXT,
  file_url: DataTypes.STRING(500),
  duration: DataTypes.INTEGER,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_training_course', comment: '培训课程表' });

export const TrainingExam = sequelize.define('training_exam', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  exam_name: { type: DataTypes.STRING(200), allowNull: false },
  course_id: DataTypes.BIGINT.UNSIGNED,
  questions: DataTypes.TEXT,
  pass_score: { type: DataTypes.INTEGER, defaultValue: 60 },
  duration: DataTypes.INTEGER,
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_training_exam', comment: '考核试卷表' });
