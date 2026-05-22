import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 6. 巡检管理 ── */
export const PatrolPlan = sequelize.define('patrol_plan', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  plan_name: { type: DataTypes.STRING(100), allowNull: false },
  unit_id: DataTypes.BIGINT,
  patrol_type: { type: DataTypes.SMALLINT, defaultValue: 1, comment: '1日检 2周检 3月检 4季检 5年检' },
  patrol_items: DataTypes.TEXT,
  responsible_id: DataTypes.BIGINT,
  responsible_name: DataTypes.STRING(50),
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY,
  cron_expr: DataTypes.STRING(50),
  status: { type: DataTypes.SMALLINT, defaultValue: 1 },
}, { tableName: 'fire_patrol_plan', comment: '巡检计划表' });

export const PatrolRecord = sequelize.define('patrol_record', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  plan_id: DataTypes.BIGINT,
  patrol_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  unit_id: DataTypes.BIGINT,
  unit_name: DataTypes.STRING(200),
  patrol_user_id: DataTypes.BIGINT,
  patrol_user_name: DataTypes.STRING(50),
  patrol_date: DataTypes.DATE,
  patrol_items: DataTypes.TEXT,
  result: { type: DataTypes.SMALLINT, defaultValue: 1, comment: '1正常 2异常' },
  abnormal_desc: DataTypes.TEXT,
  photos: DataTypes.TEXT,
  signature: DataTypes.STRING(255),
}, {
  tableName: 'fire_patrol_record',
  comment: '巡检记录表',
  indexes: [
    { fields: ['plan_id'] },
    { fields: ['unit_id'] },
  ],
});

export const Hazard = sequelize.define('hazard', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  hazard_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  unit_id: DataTypes.BIGINT,
  unit_name: DataTypes.STRING(200),
  hazard_type: { type: DataTypes.SMALLINT, comment: '1设备故障 2通道堵塞 3标识缺失 4其他' },
  description: DataTypes.TEXT,
  level: { type: DataTypes.SMALLINT, defaultValue: 1, comment: '1一般 2重大 3特大' },
  photos: DataTypes.TEXT,
  status: { type: DataTypes.SMALLINT, defaultValue: 0, comment: '0待整改 1整改中 2已整改 3延期' },
  rectification_measures: DataTypes.TEXT,
  deadline: DataTypes.DATEONLY,
  rectifier_id: DataTypes.BIGINT,
  rectifier_name: DataTypes.STRING(50),
  rectification_date: DataTypes.DATE,
  before_photo: DataTypes.STRING(255),
  after_photo: DataTypes.STRING(255),
}, {
  tableName: 'fire_hazard',
  comment: '隐患管理表',
  indexes: [
    { fields: ['unit_id'] },
    { fields: ['status'] },
  ],
});
