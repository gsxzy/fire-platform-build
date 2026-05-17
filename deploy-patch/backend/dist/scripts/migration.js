"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ══════════════════════════════════════════════════════════════════�? * 数据迁移脚本：旧�?JS 后端�?�?新版 TS 后端�? * 运行方式：npx tsx scripts/migration.ts
 * 注意：生产环境运行前请务必备份数据库�? * ══════════════════════════════════════════════════════════════════�? */
require("dotenv/config");
const database_1 = __importDefault(require("../../config/database"));
const logger_1 = __importDefault(require("../../config/logger"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/* ───── 工具函数 ───── */
function parseIntSafe(v, def = 0) {
    const n = parseInt(v);
    return isNaN(n) ? def : n;
}
function parseFloatSafe(v, def = 0) {
    const n = parseFloat(v);
    return isNaN(n) ? def : n;
}
function toDate(v) {
    if (!v)
        return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
}
function mapStatus(oldStatus, mapping) {
    if (oldStatus === null || oldStatus === undefined)
        return 1;
    const s = String(oldStatus).toLowerCase().trim();
    if (mapping[s] !== undefined)
        return mapping[s];
    const n = parseIntSafe(oldStatus);
    return isNaN(n) ? 1 : n;
}
function hashPassword(pwd) {
    if (!pwd)
        return bcryptjs_1.default.hashSync('default123', 10);
    // 如果已经�?bcrypt 格式，直接保�?  if (/^\$2[aby]\$\d+\$/.test(pwd)) return pwd;
    return bcryptjs_1.default.hashSync(pwd, 10);
}
let alarmCounter = 0;
function generateAlarmNo(row) {
    if (row.alarm_no)
        return row.alarm_no;
    return `ALM${Date.now()}_${alarmCounter++}_${Math.random().toString(36).slice(2, 8)}`;
}
let woCounter = 0;
function generateWorkOrderNo(row) {
    if (row.order_no)
        return row.order_no;
    return `WO${Date.now()}_${woCounter++}_${Math.random().toString(36).slice(2, 8)}`;
}
/* ───── 创建 ID 映射临时�?───── */
async function initMappingTable() {
    await database_1.default.query(`
    CREATE TABLE IF NOT EXISTS _migration_id_map (
      table_name VARCHAR(64) NOT NULL,
      old_id VARCHAR(64) NOT NULL,
      new_id BIGINT NOT NULL,
      PRIMARY KEY (table_name, old_id),
      INDEX idx_new_id (new_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
    logger_1.default.info('[Migration] ID 映射临时表已就绪');
}
async function saveMap(tableName, oldId, newId) {
    await database_1.default.query(`INSERT INTO _migration_id_map (table_name, old_id, new_id) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE new_id = VALUES(new_id)`, { replacements: [tableName, oldId, newId] });
}
async function getNewId(tableName, oldId) {
    const [rows] = await database_1.default.query(`SELECT new_id FROM _migration_id_map WHERE table_name = ? AND old_id = ?`, { replacements: [tableName, oldId], type: 'SELECT' });
    return rows[0]?.new_id || null;
}
async function clearMapping() {
    await database_1.default.query(`TRUNCATE TABLE _migration_id_map`);
}
/* ───── 迁移前：自动检测并重命名旧版同名表 ───── */
async function prepareLegacyTables() {
    logger_1.default.info('[Migration] 检查并准备旧版同名�?..');
    // fire_device：旧版是主机回路点位表，没有 device_no �?  const [deviceTables] = await sequelize.query(`SHOW TABLES LIKE 'fire_device'`);
    if (deviceTables.length > 0) {
        const [cols] = await database_1.default.query(`SHOW COLUMNS FROM fire_device`);
        const hasDeviceNo = cols.some((c) => c.Field === 'device_no');
        if (!hasDeviceNo) {
            await database_1.default.query(`RENAME TABLE fire_device TO fire_device_legacy`);
            logger_1.default.info('[Migration] �?fire_device 已重命名�?fire_device_legacy');
        }
        else {
            logger_1.default.info('[Migration] fire_device 已是新版 schema，跳过重命名');
        }
    }
    // fire_alarm：旧版没�?alarm_desc �?  const [alarmTables] = await sequelize.query(`SHOW TABLES LIKE 'fire_alarm'`);
    if (alarmTables.length > 0) {
        const [cols] = await database_1.default.query(`SHOW COLUMNS FROM fire_alarm`);
        const hasAlarmDesc = cols.some((c) => c.Field === 'alarm_desc');
        if (!hasAlarmDesc) {
            await database_1.default.query(`RENAME TABLE fire_alarm TO fire_alarm_legacy`);
            logger_1.default.info('[Migration] �?fire_alarm 已重命名�?fire_alarm_legacy');
        }
        else {
            logger_1.default.info('[Migration] fire_alarm 已是新版 schema，跳过重命名');
        }
    }
}
/* ══════════════════════════════════════════════════════════�?   1. sys_department �?departments
   ══════════════════════════════════════════════════════════�?*/
async function migrateDepartments() {
    logger_1.default.info('[Migration] 开始迁�?departments �?sys_department');
    const [oldRows] = await database_1.default.query('SELECT * FROM departments');
    let count = 0;
    for (const row of oldRows) {
        try {
            const [result] = await database_1.default.query(`INSERT INTO sys_department (dept_name, parent_id, leader, phone, sort, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`, { replacements: [
                    row.name, parseIntSafe(row.parent_id) || 0, row.leader || null,
                    row.phone || null, parseIntSafe(row.sort_order) || 0,
                    mapStatus(row.status, { active: 1, inactive: 0, '1': 1, '0': 0 }),
                ] });
            const newId = result.insertId;
            await saveMap('sys_department', String(row.id), newId);
            count++;
        }
        catch (err) {
            logger_1.default.error(`[Migration] departments 迁移失败 id=${row.id}: ${err.message}`);
        }
    }
    logger_1.default.info(`[Migration] departments �?sys_department 完成: ${count} 条`);
}
/* ══════════════════════════════════════════════════════════�?   2. fire_unit �?units
   ══════════════════════════════════════════════════════════�?*/
async function migrateUnits() {
    logger_1.default.info('[Migration] 开始迁�?units �?fire_unit');
    const [oldRows] = await database_1.default.query('SELECT * FROM units');
    let count = 0;
    for (const row of oldRows) {
        try {
            const unitTypeMap = { 'key': 1, 'general': 2, 'nine-small': 3, '重点单位': 1, '一般单�?: 2, ': 九小场所, ': 3 };: ,
                const: fireLevelMap }, { '一�?: 1, ': 二级, ': 2, ': 三级, ': 3, ': , 1: , ': 1, ': , 2: , ': 2, ': , 3: , ': 3 };: , const: [result] = await database_1.default.query(`INSERT INTO fire_unit
         (unit_name, unit_code, unit_type, address, lng, lat, contact_name, contact_phone,
          building_area, floor_count, fire_level, status, remark, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, { replacements: [
                    row.name, row.id, unitTypeMap[row.type] || 2,
                    row.address || null, parseFloatSafe(row.lng), parseFloatSafe(row.lat),
                    row.contact_name || null, row.contact_phone || null,
                    parseFloatSafe(row.area), parseIntSafe(row.total_floors),
                    fireLevelMap[String(row.risk_level)] || 1,
                    mapStatus(row.status, { active: 1, inactive: 0, '1': 1, '0': 0 }),
                    null,
                ] }) };
            const newId = result.insertId;
            await saveMap('fire_unit', String(row.id), newId);
            count++;
        }
        catch (err) {
            logger_1.default.error(`[Migration] units 迁移失败 id=${row.id}: ${err.message}`);
        }
    }
    logger_1.default.info(`[Migration] units �?fire_unit 完成: ${count} 条`);
}
/* ══════════════════════════════════════════════════════════�?   3. sys_user �?users
   ══════════════════════════════════════════════════════════�?*/
async function migrateUsers() {
    logger_1.default.info('[Migration] 开始迁�?users �?sys_user');
    const [oldRows] = await database_1.default.query('SELECT * FROM users');
    let count = 0;
    for (const row of oldRows) {
        try {
            const hashedPwd = hashPassword(row.password || row.password_hash);
            const [result] = await database_1.default.query(`INSERT INTO sys_user
         (username, password, real_name, phone, email, avatar, status, last_login, login_ip, dept_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, { replacements: [
                    row.username, hashedPwd,
                    row.real_name || null, row.phone || null, row.email || null,
                    row.avatar || null, mapStatus(row.status, { active: 1, inactive: 0, '1': 1, '0': 0 }),
                    toDate(row.last_login), null, 0,
                ] });
            const newId = result.insertId;
            await saveMap('sys_user', String(row.id), newId);
            count++;
        }
        catch (err) {
            logger_1.default.error(`[Migration] users 迁移失败 id=${row.id}: ${err.message}`);
        }
    }
    logger_1.default.info(`[Migration] users �?sys_user 完成: ${count} 条`);
}
/* ══════════════════════════════════════════════════════════�?   4. fire_device �?device_archive
   ══════════════════════════════════════════════════════════�?*/
async function migrateDevices() {
    logger_1.default.info('[Migration] 开始迁�?device_archive �?fire_device');
    const [oldRows] = await database_1.default.query('SELECT * FROM device_archive');
    let count = 0;
    for (const row of oldRows) {
        try {
            const unitNewId = await getNewId('fire_unit', String(row.unit_id));
            const statusMap = { normal: 1, fault: 2, offline: 3, scrapped: 4, '1': 1, '2': 2, '3': 3 };
            const [result] = await database_1.default.query(`INSERT INTO fire_device
         (device_no, device_name, device_type, device_model, manufacturer, unit_id,
          install_location, floor, room, lng, lat, install_date, warranty_expire,
          status, last_online, iot_id, protocol_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, { replacements: [
                    row.code || row.id, row.name, row.category || row.sub_category || 'unknown',
                    row.model || null, row.manufacturer || null, unitNewId || 0,
                    row.area || null, null, null,
                    parseFloatSafe(row.lng), parseFloatSafe(row.lat),
                    toDate(row.install_date), toDate(row.expire_date),
                    statusMap[String(row.status)] || 1, null,
                    row.protocol_device_id || null, row.protocol_type || null,
                ] });
            const newId = result.insertId;
            await saveMap('fire_device', String(row.id), newId);
            count++;
        }
        catch (err) {
            logger_1.default.error(`[Migration] device_archive 迁移失败 id=${row.id}: ${err.message}`);
        }
    }
    logger_1.default.info(`[Migration] device_archive �?fire_device 完成: ${count} 条`);
}
/* ══════════════════════════════════════════════════════════�?   5. fire_alarm �?fire_alarm_legacy（旧�?   ══════════════════════════════════════════════════════════�?*/
async function migrateAlarms() {
    logger_1.default.info('[Migration] 开始迁�?fire_alarm(�? �?fire_alarm(�?');
    const [legacyTables] = await database_1.default.query(`SHOW TABLES LIKE 'fire_alarm_legacy'`);
    if (legacyTables.length === 0) {
        logger_1.default.info('[Migration] fire_alarm_legacy 不存在，跳过告警迁移');
        return;
    }
    const [oldRows] = await database_1.default.query('SELECT * FROM fire_alarm_legacy');
    let count = 0;
    for (const row of oldRows) {
        try {
            const deviceNewId = row.device_id ? await getNewId('fire_device', String(row.device_id)) : null;
            const unitNewId = row.unit_id && row.unit_id !== 'PENDING'
                ? await getNewId('fire_unit', String(row.unit_id))
                : null;
            const alarmTypeMap = {
                '火警': 1, 'fire': 1, '1': 1,
                '故障': 2, 'fault': 2, '2': 2,
                '预警': 3, 'pre': 3, '3': 3,
                '屏蔽': 4, 'shield': 4, '4': 4,
                '监管': 5, 'supervisory': 5, '5': 5,
                '反馈': 5, 'feedback': 5,
                '手动报警': 1,
            };
            const statusMap = {
                '1': 0, '2': 1, '3': 2, '4': 3,
                'new': 0, 'confirmed': 1, 'handled': 2, 'false': 3,
            };
            const alarmNo = generateAlarmNo(row);
            const [result] = await database_1.default.query(`INSERT INTO fire_alarm
         (alarm_no, alarm_type, alarm_level, device_id, device_name, unit_id, unit_name,
          location, alarm_desc, status, handler_id, handler_name, handle_time, handle_result,
          confirm_time, push_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, { replacements: [
                    alarmNo, alarmTypeMap[String(row.alarm_type)] || 5, parseIntSafe(row.alarm_level) || 1,
                    deviceNewId, row.device_name || null, unitNewId,
                    row.unit_name && row.unit_name !== '待分配单�? ? row.unit_name : null,,
                    row.location || null, row.description || row.location || null,
                    statusMap[String(row.alarm_status)] || 0,
                    row.handler_id ? parseIntSafe(row.handler_id) : null,
                    row.handler_name || null, toDate(row.confirm_time), row.handle_remark || null,
                    toDate(row.confirm_time), 0,
                ] });
            const newId = result.insertId;
            await saveMap('fire_alarm', String(row.id), newId);
            count++;
        }
        catch (err) {
            logger_1.default.error(`[Migration] fire_alarm 迁移失败 id=${row.id}: ${err.message}`);
        }
    }
    logger_1.default.info(`[Migration] fire_alarm(�? �?fire_alarm(�? 完成: ${count} 条`);
}
/* ══════════════════════════════════════════════════════════�?   6. fire_maint_work_order �?work_orders
   ══════════════════════════════════════════════════════════�?*/
async function migrateWorkOrders() {
    logger_1.default.info('[Migration] 开始迁�?work_orders �?fire_maint_work_order');
    const [oldRows] = await database_1.default.query('SELECT * FROM work_orders');
    let count = 0;
    for (const row of oldRows) {
        try {
            const unitNewId = row.unit_id ? await getNewId('fire_unit', String(row.unit_id)) : null;
            const statusMap = { pending: 0, processing: 1, done: 2, closed: 3, '0': 0, '1': 1, '2': 2, '3': 3 };
            const orderTypeMap = { repair: 1, maintain: 2, inspect: 3, '1': 1, '2': 2, '3': 3 };
            const [result] = await database_1.default.query(`INSERT INTO fire_maint_work_order
         (order_no, order_type, device_id, unit_id, fault_desc, priority, status,
          assignee_id, plan_start, plan_end, actual_start, actual_end,
          material_cost, labor_cost, satisfaction, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, { replacements: [
                    generateWorkOrderNo(row), orderTypeMap[String(row.order_type)] || 1,
                    null, unitNewId, row.fault_desc || null,
                    parseIntSafe(row.priority) || 1, statusMap[String(row.status)] || 0,
                    null, toDate(row.plan_start), toDate(row.plan_end),
                    toDate(row.actual_start), toDate(row.actual_end),
                    parseFloatSafe(row.material_cost), parseFloatSafe(row.labor_cost),
                    parseIntSafe(row.satisfaction) || 5,
                ] });
            const newId = result.insertId;
            await saveMap('fire_maint_work_order', String(row.id), newId);
            count++;
        }
        catch (err) {
            logger_1.default.error(`[Migration] work_orders 迁移失败 id=${row.id}: ${err.message}`);
        }
    }
    logger_1.default.info(`[Migration] work_orders �?fire_maint_work_order 完成: ${count} 条`);
}
/* ══════════════════════════════════════════════════════════�?   7. fire_patrol_plan �?patrol_plans
   ══════════════════════════════════════════════════════════�?*/
async function migratePatrolPlans() {
    logger_1.default.info('[Migration] 开始迁�?patrol_plans �?fire_patrol_plan');
    const [oldRows] = await database_1.default.query('SELECT * FROM patrol_plans');
    let count = 0;
    for (const row of oldRows) {
        try {
            const unitNewId = row.unit_id ? await getNewId('fire_unit', String(row.unit_id)) : null;
            const [result] = await database_1.default.query(`INSERT INTO fire_patrol_plan
         (plan_name, unit_id, patrol_type, patrol_items, responsible_id,
          start_date, end_date, cron_expr, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, { replacements: [
                    row.plan_name || row.name || '未命�?, unitNewId,,
                    parseIntSafe(row.patrol_type) || 1, row.patrol_items || null,
                    parseIntSafe(row.responsible_id) || null,
                    toDate(row.start_date), toDate(row.end_date),
                    row.cron_expr || null, mapStatus(row.status, { active: 1, inactive: 0, '1': 1, '0': 0 }),
                ] });
            const newId = result.insertId;
            await saveMap('fire_patrol_plan', String(row.id), newId);
            count++;
        }
        catch (err) {
            logger_1.default.error(`[Migration] patrol_plans 迁移失败 id=${row.id}: ${err.message}`);
        }
    }
    logger_1.default.info(`[Migration] patrol_plans �?fire_patrol_plan 完成: ${count} 条`);
}
/* ══════════════════════════════════════════════════════════�?   8. fire_patrol_record �?patrol_records
   ══════════════════════════════════════════════════════════�?*/
async function migratePatrolRecords() {
    logger_1.default.info('[Migration] 开始迁�?patrol_records �?fire_patrol_record');
    const [oldRows] = await database_1.default.query('SELECT * FROM patrol_records');
    let count = 0;
    for (const row of oldRows) {
        try {
            const planNewId = row.plan_id ? await getNewId('fire_patrol_plan', String(row.plan_id)) : null;
            const unitNewId = row.unit_id ? await getNewId('fire_unit', String(row.unit_id)) : null;
            const [result] = await database_1.default.query(`INSERT INTO fire_patrol_record
         (plan_id, patrol_no, unit_id, patrol_user_id, patrol_date, result,
          abnormal_desc, photos, signature, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, { replacements: [
                    planNewId, row.patrol_no || `PR${Date.now()}_${count}_${Math.random().toString(36).slice(2, 6)}`, unitNewId,
                    parseIntSafe(row.patrol_user_id) || null, toDate(row.patrol_date),
                    mapStatus(row.result, { normal: 1, abnormal: 0, '1': 1, '0': 0 }),
                    row.abnormal_desc || null, row.photos || null, row.signature || null,
                ] });
            const newId = result.insertId;
            await saveMap('fire_patrol_record', String(row.id), newId);
            count++;
        }
        catch (err) {
            logger_1.default.error(`[Migration] patrol_records 迁移失败 id=${row.id}: ${err.message}`);
        }
    }
    logger_1.default.info(`[Migration] patrol_records �?fire_patrol_record 完成: ${count} 条`);
}
/* ══════════════════════════════════════════════════════════�?   9. fire_hazard �?hazards
   ══════════════════════════════════════════════════════════�?*/
async function migrateHazards() {
    logger_1.default.info('[Migration] 开始迁�?hazards �?fire_hazard');
    const [oldRows] = await database_1.default.query('SELECT * FROM hazards');
    let count = 0;
    for (const row of oldRows) {
        try {
            const unitNewId = row.unit_id ? await getNewId('fire_unit', String(row.unit_id)) : null;
            const [result] = await database_1.default.query(`INSERT INTO fire_hazard
         (hazard_no, unit_id, hazard_type, description, level, photos,
          status, deadline, rectifier_id, rectification_date,
          before_photo, after_photo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, { replacements: [
                    row.hazard_no || `HZ${Date.now()}_${count}_${Math.random().toString(36).slice(2, 6)}`, unitNewId,
                    parseIntSafe(row.hazard_type) || 1, row.description || null,
                    parseIntSafe(row.level) || 1, row.photos || null,
                    mapStatus(row.status, { pending: 0, processing: 1, done: 2, closed: 3, '0': 0, '1': 1, '2': 2, '3': 3 }),
                    toDate(row.deadline), parseIntSafe(row.rectifier_id) || null,
                    toDate(row.rectification_date), row.before_photo || null, row.after_photo || null,
                ] });
            const newId = result.insertId;
            await saveMap('fire_hazard', String(row.id), newId);
            count++;
        }
        catch (err) {
            logger_1.default.error(`[Migration] hazards 迁移失败 id=${row.id}: ${err.message}`);
        }
    }
    logger_1.default.info(`[Migration] hazards �?fire_hazard 完成: ${count} 条`);
}
/* ══════════════════════════════════════════════════════════�?   10. fire_emergency_plan �?plans
   ══════════════════════════════════════════════════════════�?*/
async function migratePlans() {
    logger_1.default.info('[Migration] 开始迁�?plans �?fire_emergency_plan');
    const [oldRows] = await database_1.default.query('SELECT * FROM plans');
    let count = 0;
    for (const row of oldRows) {
        try {
            const unitNewId = row.unit_id ? await getNewId('fire_unit', String(row.unit_id)) : null;
            const [result] = await database_1.default.query(`INSERT INTO fire_emergency_plan
         (plan_name, unit_id, plan_type, content, responsible_id,
          status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`, { replacements: [
                    row.name || '未命�?, unitNewId, parseIntSafe(row.plan_type) || 1,,
                    row.content || null, parseIntSafe(row.responsible_id) || null,
                    mapStatus(row.status, { active: 1, inactive: 0, '1': 1, '0': 0 }),
                ] });
            const newId = result.insertId;
            await saveMap('fire_emergency_plan', String(row.id), newId);
            count++;
        }
        catch (err) {
            logger_1.default.error(`[Migration] plans 迁移失败 id=${row.id}: ${err.message}`);
        }
    }
    logger_1.default.info(`[Migration] plans �?fire_emergency_plan 完成: ${count} 条`);
}
/* ══════════════════════════════════════════════════════════�?   11. fire_emergency_drill �?drills
   ══════════════════════════════════════════════════════════�?*/
async function migrateDrills() {
    logger_1.default.info('[Migration] 开始迁�?drills �?fire_emergency_drill');
    const [oldRows] = await database_1.default.query('SELECT * FROM drills');
    let count = 0;
    for (const row of oldRows) {
        try {
            const unitNewId = row.unit_id ? await getNewId('fire_unit', String(row.unit_id)) : null;
            const planNewId = row.plan_id ? await getNewId('fire_emergency_plan', String(row.plan_id)) : null;
            const [result] = await database_1.default.query(`INSERT INTO fire_emergency_drill
         (plan_id, unit_id, drill_name, drill_type, drill_date,
          location, participant_count, summary, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, { replacements: [
                    planNewId, unitNewId, row.name || '未命�?,,
                    parseIntSafe(row.drill_type) || 1, toDate(row.drill_date),
                    row.location || null, parseIntSafe(row.participant_count) || 0,
                    row.summary || null, mapStatus(row.status, { active: 1, inactive: 0, '1': 1, '0': 0 }),
                ] });
            const newId = result.insertId;
            await saveMap('fire_emergency_drill', String(row.id), newId);
            count++;
        }
        catch (err) {
            logger_1.default.error(`[Migration] drills 迁移失败 id=${row.id}: ${err.message}`);
        }
    }
    logger_1.default.info(`[Migration] drills �?fire_emergency_drill 完成: ${count} 条`);
}
/* ══════════════════════════════════════════════════════════�?   12. fire_inspection �?inspections
   ══════════════════════════════════════════════════════════�?*/
async function migrateInspections() {
    logger_1.default.info('[Migration] 开始迁�?inspections �?fire_inspection');
    const [oldRows] = await database_1.default.query('SELECT * FROM inspections');
    let count = 0;
    for (const row of oldRows) {
        try {
            const unitNewId = row.unit_id ? await getNewId('fire_unit', String(row.unit_id)) : null;
            const [result] = await database_1.default.query(`INSERT INTO fire_inspection
         (inspect_no, unit_id, inspect_type, inspector, inspect_date,
          items, result, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, { replacements: [
                    row.inspect_no || `INSP${Date.now()}_${count}_${Math.random().toString(36).slice(2, 6)}`, unitNewId,
                    parseIntSafe(row.inspect_type) || 1, row.inspector || null,
                    toDate(row.inspect_date), row.items || null,
                    mapStatus(row.result, { pass: 1, fail: 0, '1': 1, '0': 0 }),
                    mapStatus(row.status, { active: 1, inactive: 0, '1': 1, '0': 0 }),
                ] });
            const newId = result.insertId;
            await saveMap('fire_inspection', String(row.id), newId);
            count++;
        }
        catch (err) {
            logger_1.default.error(`[Migration] inspections 迁移失败 id=${row.id}: ${err.message}`);
        }
    }
    logger_1.default.info(`[Migration] inspections �?fire_inspection 完成: ${count} 条`);
}
/* ══════════════════════════════════════════════════════════�?   13. fire_knowledge_doc �?documents
   ══════════════════════════════════════════════════════════�?*/
async function migrateDocuments() {
    logger_1.default.info('[Migration] 开始迁�?documents �?fire_knowledge_doc');
    const [oldRows] = await database_1.default.query('SELECT * FROM documents');
    let count = 0;
    for (const row of oldRows) {
        try {
            const [result] = await database_1.default.query(`INSERT INTO fire_knowledge_doc
         (doc_title, doc_type, category, content, file_url,
          status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`, { replacements: [
                    row.title || row.name || '未命�?, parseIntSafe(row.doc_type) || 1,,
                    row.category || null, row.content || null, row.file_url || null,
                    mapStatus(row.status, { active: 1, inactive: 0, '1': 1, '0': 0 }),
                ] });
            const newId = result.insertId;
            await saveMap('fire_knowledge_doc', String(row.id), newId);
            count++;
        }
        catch (err) {
            logger_1.default.error(`[Migration] documents 迁移失败 id=${row.id}: ${err.message}`);
        }
    }
    logger_1.default.info(`[Migration] documents �?fire_knowledge_doc 完成: ${count} 条`);
}
/* ══════════════════════════════════════════════════════════�?   主入�?   ══════════════════════════════════════════════════════════�?*/
async function runMigration() {
    logger_1.default.info('══════════════════════════════════════════════════════�?);, logger_1.default.info('  数据迁移开始：旧版�?�?新版�?);, logger_1.default.info('  ⚠️  生产环境运行前请务必备份数据库！')));
    logger_1.default.info('══════════════════════════════════════════════════════�?););
    try {
        await database_1.default.authenticate();
        logger_1.default.info('[Migration] 数据库连接成�?);, await prepareLegacyTables());
        await initMappingTable();
        await clearMapping();
        // 按依赖顺序迁�?    await migrateDepartments();   // 无依�?    await migrateUnits();         // 无依�?    await migrateUsers();         // 依赖 department（简化处理为 0�?    await migrateDevices();       // 依赖 unit
        await migrateAlarms(); // 依赖 device, unit
        await migrateWorkOrders(); // 依赖 unit
        await migratePatrolPlans(); // 依赖 unit
        await migratePatrolRecords(); // 依赖 plan, unit
        await migrateHazards(); // 依赖 unit
        await migratePlans(); // 依赖 unit
        await migrateDrills(); // 依赖 plan, unit
        await migrateInspections(); // 依赖 unit
        await migrateDocuments(); // 无依�?
        logger_1.default.info('══════════════════════════════════════════════════════�?);, logger_1.default.info('  �?数据迁移全部完成'));
        logger_1.default.info('══════════════════════════════════════════════════════�?););
    }
    catch (err) {
        logger_1.default.error(`[Migration] 迁移失败: ${err.message}`);
        throw err;
    }
    finally {
        await database_1.default.close();
    }
}
runMigration().catch(() => process.exit(1));
//# sourceMappingURL=migration.js.map