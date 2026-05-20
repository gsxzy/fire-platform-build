import { Op } from 'sequelize';
import { DutyShiftDef } from '@/models';

export class DutyShiftService {
  static async create(data: any) {
    return DutyShiftDef.create(data as any);
  }

  static async list(keyword?: string, status?: number, pageNum = 1, pageSize = 20) {
    const where: any = {};
    if (status !== undefined) where.status = status;
    if (keyword) {
      where.shift_name = { [Op.like]: `%${keyword}%` };
    }
    const { count, rows } = await DutyShiftDef.findAndCountAll({
      where, limit: pageSize, offset: (pageNum - 1) * pageSize,
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    });
    return { list: rows, total: count, pageNum, pageSize };
  }

  static async byId(id: string) {
    return DutyShiftDef.findByPk(id);
  }

  static async update(id: string, data: any) {
    return DutyShiftDef.update(data, { where: { id } });
  }

  static async delete(id: string) {
    return DutyShiftDef.destroy({ where: { id } });
  }

  static async toggleStatus(id: string, status: number) {
    return DutyShiftDef.update({ status }, { where: { id } });
  }
}
