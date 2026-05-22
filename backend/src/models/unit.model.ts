import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 2. 单位管理 ── */
export const Unit = sequelize.define('unit', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  unit_name: { type: DataTypes.STRING(200), allowNull: false },
  unit_code: { type: DataTypes.STRING(50), unique: true },
  unit_type: { type: DataTypes.SMALLINT, defaultValue: 1, comment: '1一般单位 2重点单位 3九小场所' },
  address: DataTypes.STRING(300),
  lng: DataTypes.DECIMAL(10, 7),
  lat: DataTypes.DECIMAL(10, 7),
  contact_name: DataTypes.STRING(50),
  contact_phone: DataTypes.STRING(20),
  contact_email: DataTypes.STRING(100),
  legal_person: DataTypes.STRING(50),
  license_no: DataTypes.STRING(64),
  building_area: DataTypes.DECIMAL(10, 2),
  floor_count: DataTypes.INTEGER,
  fire_level: { type: DataTypes.SMALLINT, defaultValue: 1, comment: '消防等级 1-5' },
  status: { type: DataTypes.SMALLINT, defaultValue: 1 },
  remark: DataTypes.TEXT,
}, {
  tableName: 'fire_unit',
  comment: '消防单位表',
  indexes: [
    { fields: ['unit_code'] },
    { fields: ['unit_type'] },
    { fields: ['status'] },
    { fields: ['fire_level'] },
  ],
});
