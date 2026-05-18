import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/respond';
import { Subsystem } from '@/models';
import sequelize from '@/config/database';

/* 设备类型 → 子系统类型的模糊匹配关键词 */
const TYPE_KEYWORDS: Record<string, string[]> = {
  water: ['水压', '液位', '水泵', '给水', '消防水', '喷淋', '消火栓'],
  elec: ['电气', '电流', '电压', '漏电', '电弧', '温度', '电气火灾'],
  vent: ['排烟', '风机', '通风', '防烟', '正压', '送风'],
  light: ['应急照明', '疏散指示', '照明'],
  audio: ['广播', '声光', '警报器'],
  door: ['防火门', '卷帘门', '门禁'],
  gas: ['燃气', '可燃气体', '气体探测'],
};

export const SubsystemController = {
  async list(req: Request, res: Response) {
    const { type } = req.query;
    const where: any = { status: 1 };
    if (type) where.type = type;

    const subsystems = await Subsystem.findAll({
      where,
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
      raw: true,
    }) as any[];

    const now = new Date().toLocaleString('zh-CN', { hour12: false });

    const result = await Promise.all(subsystems.map(async (sub) => {
      const tags = (sub.device_type_tags as string[]) || TYPE_KEYWORDS[sub.type] || [];
      const likeConditions = tags.map((t: string) => `d.device_type LIKE '%${t}%'`).join(' OR ');

      let total = 0;
      let online = 0;
      let alarm = 0;

      if (likeConditions) {
        const [[stats]] = await sequelize.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(CASE WHEN d.online_status = 1 OR d.status = 1 THEN 1 END) AS online,
            COUNT(CASE WHEN d.status = 3 OR d.status = 4 THEN 1 END) AS alarm
          FROM fire_device d
          WHERE (${likeConditions}) AND d.device_type IS NOT NULL
        `) as any;
        total = Number(stats?.total) || 0;
        online = Number(stats?.online) || 0;
        alarm = Number(stats?.alarm) || 0;
      }

      let status: 'normal' | 'warning' | 'fault' = 'normal';
      if (alarm > 0) status = 'fault';
      else if (online < total) status = 'warning';

      return {
        id: `sub-${sub.type}`,
        name: sub.name,
        type: sub.type,
        unit: sub.description || '—',
        devices: total,
        online,
        status,
        lastUpdate: now,
      };
    }));

    sendSuccess(res, req, result);
  },
};
