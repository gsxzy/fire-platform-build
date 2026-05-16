import { DataTypes } from 'sequelize';
import sequelize from '@/config/database';

/* ── 5. 维保管理 ── */
export const MaintenanceCompany = sequelize.define('maintenance_company', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  company_name: { type: DataTypes.STRING(200), allowNull: false },
  credit_code: { type: DataTypes.STRING(50), unique: true },
  legal_person: DataTypes.STRING(50),
  contact_phone: DataTypes.STRING(20),
  address: DataTypes.STRING(300),
  qualification_level: DataTypes.STRING(20),
  status: { type: DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_maint_company', comment: '维保单位表' });

export const MaintenanceContract = sequelize.define('maintenance_contract', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  contract_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  company_id: DataTypes.BIGINT.UNSIGNED,
  unit_id: DataTypes.BIGINT.UNSIGNED,
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY,
  amount: DataTypes.DECIMAL(12, 2),
  service_content: DataTypes.TEXT,
  status: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1有效 2到期 3终止' },
}, { tableName: 'fire_maint_contract', comment: '维保合同表' });

export const MaintenanceWorkOrder = sequelize.define('maintenance_work_order', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  order_no: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  order_type: { type: DataTypes.TINYINT, allowNull: false, comment: '1巡检 2维修 3保养 4检测' },
  device_id: DataTypes.BIGINT.UNSIGNED,
  device_name: DataTypes.STRING(100),
  unit_id: DataTypes.BIGINT.UNSIGNED,
  unit_name: DataTypes.STRING(200),
  fault_desc: DataTypes.TEXT,
  priority: { type: DataTypes.TINYINT, defaultValue: 1, comment: '1低 2中 3高 4紧急' },
  status: { type: DataTypes.TINYINT, defaultValue: 0, comment: '0待派单 1处理中 2已完成 3已关闭' },
  assignee_id: DataTypes.BIGINT.UNSIGNED,
  assignee_name: DataTypes.STRING(50),
  plan_start: DataTypes.DATE,
  plan_end: DataTypes.DATE,
  actual_start: DataTypes.DATE,
  actual_end: DataTypes.DATE,
  handle_result: DataTypes.TEXT,
  material_cost: DataTypes.DECIMAL(10, 2),
  labor_cost: DataTypes.DECIMAL(10, 2),
  satisfaction: { type: DataTypes.TINYINT, comment: '1-5星' },
}, { tableName: 'fire_maint_work_order', comment: '维保工单表' });
