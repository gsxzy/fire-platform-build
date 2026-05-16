"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceWorkOrder = exports.MaintenanceContract = exports.MaintenanceCompany = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("@/config/database"));
/* ── 5. 维保管理 ── */
exports.MaintenanceCompany = database_1.default.define('maintenance_company', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    company_name: { type: sequelize_1.DataTypes.STRING(200), allowNull: false },
    credit_code: { type: sequelize_1.DataTypes.STRING(50), unique: true },
    legal_person: sequelize_1.DataTypes.STRING(50),
    contact_phone: sequelize_1.DataTypes.STRING(20),
    address: sequelize_1.DataTypes.STRING(300),
    qualification_level: sequelize_1.DataTypes.STRING(20),
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1 },
}, { tableName: 'fire_maint_company', comment: '维保单位表' });
exports.MaintenanceContract = database_1.default.define('maintenance_contract', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    contract_no: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    company_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    start_date: sequelize_1.DataTypes.DATEONLY,
    end_date: sequelize_1.DataTypes.DATEONLY,
    amount: sequelize_1.DataTypes.DECIMAL(12, 2),
    service_content: sequelize_1.DataTypes.TEXT,
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1有效 2到期 3终止' },
}, { tableName: 'fire_maint_contract', comment: '维保合同表' });
exports.MaintenanceWorkOrder = database_1.default.define('maintenance_work_order', {
    id: { type: sequelize_1.DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    order_no: { type: sequelize_1.DataTypes.STRING(50), allowNull: false, unique: true },
    order_type: { type: sequelize_1.DataTypes.TINYINT, allowNull: false, comment: '1巡检 2维修 3保养 4检测' },
    device_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    device_name: sequelize_1.DataTypes.STRING(100),
    unit_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    unit_name: sequelize_1.DataTypes.STRING(200),
    fault_desc: sequelize_1.DataTypes.TEXT,
    priority: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 1, comment: '1低 2中 3高 4紧急' },
    status: { type: sequelize_1.DataTypes.TINYINT, defaultValue: 0, comment: '0待派单 1处理中 2已完成 3已关闭' },
    assignee_id: sequelize_1.DataTypes.BIGINT.UNSIGNED,
    assignee_name: sequelize_1.DataTypes.STRING(50),
    plan_start: sequelize_1.DataTypes.DATE,
    plan_end: sequelize_1.DataTypes.DATE,
    actual_start: sequelize_1.DataTypes.DATE,
    actual_end: sequelize_1.DataTypes.DATE,
    handle_result: sequelize_1.DataTypes.TEXT,
    material_cost: sequelize_1.DataTypes.DECIMAL(10, 2),
    labor_cost: sequelize_1.DataTypes.DECIMAL(10, 2),
    satisfaction: { type: sequelize_1.DataTypes.TINYINT, comment: '1-5星' },
}, { tableName: 'fire_maint_work_order', comment: '维保工单表' });
//# sourceMappingURL=maintenance.model.js.map