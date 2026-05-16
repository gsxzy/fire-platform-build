import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 14. AI决策 ── */
export const AIDecision = sequelize.define('ai_decision', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  decision_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  scene: DataTypes.STRING(200),
  input_data: DataTypes.TEXT,
  analysis_result: DataTypes.TEXT,
  suggestion: DataTypes.TEXT,
  confidence: DataTypes.DECIMAL(5, 2),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_ai_decision', comment: 'AI决策记录表' });


/* ── 15. 智能预警 ── */
export const SmartAlert = sequelize.define('smart_alert', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  alert_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  alert_type: { type: DataTypes.TINYINT, comment: '1趋势预警 2寿命预警 3环境预警' },
  device_id: DataTypes.BIGINT.UNSIGNED,
  device_name: DataTypes.STRING(100),
  alert_desc: DataTypes.TEXT,
  predict_time: DataTypes.DATE,
  confidence: DataTypes.DECIMAL(5, 2),
  status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0未处理 1已确认 2已处理' },
}, { tableName: 'fire_smart_alert', comment: '智能预警表' });
