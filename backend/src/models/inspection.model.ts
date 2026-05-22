import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 17. 消防检查 ── */
export const FireInspection = sequelize.define('fire_inspection', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  inspect_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  unit_id: DataTypes.BIGINT,
  unit_name: DataTypes.STRING(200),
  inspect_type: { type: DataTypes.SMALLINT, comment: '1日常检查 2专项检查 3联合检查' },
  inspector: DataTypes.STRING(50),
  inspect_date: DataTypes.DATE,
  items: DataTypes.TEXT,
  result: { type: DataTypes.SMALLINT, comment: '1合格 2不合格 3限期整改' },
  photos: DataTypes.TEXT,
  status: { type: DataTypes.SMALLINT, defaultValue: 1, comment: '1无需整改 2待整改 3整改中 4已完成' },
  template_id: DataTypes.BIGINT,
  patrol_record_id: DataTypes.BIGINT,
  hazard_id: DataTypes.BIGINT,
}, {
  tableName: 'fire_inspection',
  comment: '消防检查表',
  indexes: [
    { fields: ['unit_id'] },
    { fields: ['template_id'] },
    { fields: ['patrol_record_id'] },
    { fields: ['hazard_id'] },
  ],
});

/* ── 检查项模板（P2 新增）── */
export const InspectionTemplate = sequelize.define('inspection_template', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  template_name: { type: DataTypes.STRING(200), allowNull: false },
  inspect_type: { type: DataTypes.SMALLINT, comment: '1日常检查 2专项检查 3联合检查' },
  items: DataTypes.TEXT, // JSON: [{name, standard, required}, ...]
  status: { type: DataTypes.SMALLINT, defaultValue: 1 },
}, {
  tableName: 'fire_inspection_template',
  comment: '消防检查项模板表',
  indexes: [
    { fields: ['inspect_type'] },
  ],
});
