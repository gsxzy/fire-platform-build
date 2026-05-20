"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GB28181Controller = void 0;
const database_1 = __importDefault(require("@/config/database"));
const respond_1 = require("@/utils/respond");
const response_1 = require("@/utils/response");
const httpError_1 = require("@/utils/httpError");
const validator_1 = require("@/utils/validator");
function toSnakeCase(k) {
    return k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
async function getTableColumns(tableName) {
    try {
        const [rows] = await database_1.default.query(`SELECT COLUMN_NAME as col FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, { replacements: [tableName], type: 'SELECT' });
        return rows.map((r) => r.col);
    }
    catch {
        return null;
    }
}
exports.GB28181Controller = {
    async list(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const offset = (pageNum - 1) * pageSize;
        const keyword = (req.query.keyword || req.query.search || '');
        let where = '1=1';
        const params = [];
        if (keyword && keyword.trim()) {
            where = '(`name` LIKE ? OR `device_id` LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`);
        }
        const [countRows] = await database_1.default.query(`SELECT COUNT(*) as total FROM \`gb28181_devices\` WHERE ${where}`, { replacements: params, type: 'SELECT' });
        const total = countRows?.total || 0;
        const [rows] = await database_1.default.query(`SELECT * FROM \`gb28181_devices\` WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, { replacements: [...params, pageSize, offset], type: 'SELECT' });
        const rowArray = Array.isArray(rows) ? rows : (rows ? [rows] : []);
        res.json((0, response_1.page)(rowArray, total, pageNum, pageSize, req.reqId));
    },
    async byId(req, res) {
        const [rows] = await database_1.default.query(`SELECT * FROM \`gb28181_devices\` WHERE id = ? LIMIT 1`, { replacements: [req.params.id], type: 'SELECT' });
        (0, respond_1.sendSuccess)(res, req, rows[0] || null);
    },
    async create(req, res) {
        const body = req.body || {};
        const cols = Object.keys(body).map(toSnakeCase);
        const vals = Object.values(body);
        const placeholders = cols.map(() => '?').join(',');
        const [result] = await database_1.default.query(`INSERT INTO \`gb28181_devices\` (\`${cols.join('`,`')}\`) VALUES (${placeholders})`, { replacements: vals });
        (0, respond_1.sendSuccess)(res, req, { id: result.insertId || body.id }, '创建成功');
    },
    async update(req, res) {
        const id = req.params.id;
        const body = req.body || {};
        const validFields = await getTableColumns('gb28181_devices');
        if (!validFields) {
            throw new httpError_1.HttpError('无法获取表结构，拒绝更新', 500);
        }
        const mappedBody = {};
        Object.keys(body).forEach((k) => {
            const sk = toSnakeCase(k);
            if (validFields.includes(sk))
                mappedBody[sk] = body[k];
        });
        const cols = Object.keys(mappedBody).filter((k) => k !== 'id');
        const vals = cols.map((k) => mappedBody[k]);
        if (!cols.length) {
            (0, respond_1.sendSuccess)(res, req, null, '暂无更新内容');
            return;
        }
        const [result1] = await database_1.default.query(`UPDATE \`gb28181_devices\` SET ${cols.map((c) => `\`${c}\`=?`).join(',')} WHERE id=?`, { replacements: [...vals, id] });
        if (result1.affectedRows === 0) {
            await database_1.default.query(`UPDATE \`gb28181_devices\` SET ${cols.map((c) => `\`${c}\`=?`).join(',')} WHERE device_id=?`, { replacements: [...vals, id] });
        }
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async delete(req, res) {
        await database_1.default.query(`DELETE FROM \`gb28181_devices\` WHERE id = ?`, { replacements: [req.params.id] });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
};
//# sourceMappingURL=gb28181.controller.js.map