"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DutyShiftService = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
class DutyShiftService {
    static async create(data) {
        return models_1.DutyShiftDef.create(data);
    }
    static async list(keyword, status, pageNum = 1, pageSize = 20) {
        const where = {};
        if (status !== undefined)
            where.status = status;
        if (keyword) {
            where.shift_name = { [sequelize_1.Op.like]: `%${keyword}%` };
        }
        const { count, rows } = await models_1.DutyShiftDef.findAndCountAll({
            where, limit: pageSize, offset: (pageNum - 1) * pageSize,
            order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
        });
        return { list: rows, total: count, pageNum, pageSize };
    }
    static async byId(id) {
        return models_1.DutyShiftDef.findByPk(id);
    }
    static async update(id, data) {
        return models_1.DutyShiftDef.update(data, { where: { id } });
    }
    static async delete(id) {
        return models_1.DutyShiftDef.destroy({ where: { id } });
    }
    static async toggleStatus(id, status) {
        return models_1.DutyShiftDef.update({ status }, { where: { id } });
    }
}
exports.DutyShiftService = DutyShiftService;
//# sourceMappingURL=dutyShift.service.js.map