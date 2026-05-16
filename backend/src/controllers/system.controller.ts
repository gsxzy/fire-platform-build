import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { success, fail, page } from '@/utils/response';
import logger from '@/config/logger';
import { SystemConfig, SystemLog, NotifyTemplate, ScreenConfig, Permission, Department, Alarm, Device, MaintenanceWorkOrder, Unit } from '@/models';
import redis from '@/config/redis';
import { sanitizePagination } from '@/utils/validator';

export const SystemController = {
  /* ── 系统配置 ── */
  async configList(req: Request, res: Response) {
    try {
      const list = await SystemConfig.findAll({ limit: 1000 });
      return res.json(success(list));
    } catch (err: any) {
      logger.error(`[SystemController] configList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async configSet(req: Request, res: Response) {
    try {
      const { configKey, configValue } = req.body;
      const [item] = await SystemConfig.findOrCreate({ where: { config_key: configKey }, defaults: { config_value: configValue } as any });
      if (item) await SystemConfig.update({ config_value: configValue }, { where: { config_key: configKey } });
      return res.json(success(null, '设置成功'));
    } catch (err: any) {
      logger.error(`[SystemController] configSet 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 日志管理 ── */
  async logList(req: Request, res: Response) {
    try {
      const { pageNum, pageSize } = sanitizePagination(req);
      const { count, rows } = await SystemLog.findAndCountAll({ limit: +pageSize, offset: (+pageNum - 1) * +pageSize, order: [['created_at', 'DESC']] });
      return res.json(page(rows, count, +pageNum, +pageSize));
    } catch (err: any) {
      logger.error(`[SystemController] logList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 通知模板 ── */
  async notifyTemplateList(req: Request, res: Response) {
    try {
      const list = await NotifyTemplate.findAll({ limit: 1000 });
      return res.json(success(list));
    } catch (err: any) {
      logger.error(`[SystemController] notifyTemplateList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async notifyTemplateCreate(req: Request, res: Response) {
    try {
      const t = await NotifyTemplate.create(req.body as any);
      return res.json(success({ id: (t as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[SystemController] notifyTemplateCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async notifyTemplateUpdate(req: Request, res: Response) {
    try {
      await NotifyTemplate.update(req.body, { where: { id: req.params.id } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[SystemController] notifyTemplateUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async notifyTemplateDelete(req: Request, res: Response) {
    try {
      await NotifyTemplate.destroy({ where: { id: req.params.id } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[SystemController] notifyTemplateDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 大屏配置 ── */
  async screenList(req: Request, res: Response) {
    try {
      const list = await ScreenConfig.findAll({ limit: 1000 });
      return res.json(success(list));
    } catch (err: any) {
      logger.error(`[SystemController] screenList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async screenSave(req: Request, res: Response) {
    try {
      const { id, screenName, layoutConfig, widgetConfig } = req.body;
      if (id) {
        await ScreenConfig.update({ screen_name: screenName, layout_config: layoutConfig, widget_config: widgetConfig }, { where: { id } });
        return res.json(success(null, '更新成功'));
      }
      const s = await ScreenConfig.create({ screen_name: screenName, layout_config: layoutConfig, widget_config: widgetConfig } as any);
      return res.json(success({ id: (s as any).id }, '保存成功'));
    } catch (err: any) {
      logger.error(`[SystemController] screenSave 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 组织架构 ── */
  async deptList(req: Request, res: Response) {
    try {
      const list = await Department.findAll({ order: [['sort', 'ASC']], limit: 1000 });
      return res.json(success(list));
    } catch (err: any) {
      logger.error(`[SystemController] deptList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async deptCreate(req: Request, res: Response) {
    try {
      const d = await Department.create(req.body as any);
      return res.json(success({ id: (d as any).id }, '创建成功'));
    } catch (err: any) {
      logger.error(`[SystemController] deptCreate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async deptUpdate(req: Request, res: Response) {
    try {
      await Department.update(req.body, { where: { id: req.params.id } });
      return res.json(success(null, '更新成功'));
    } catch (err: any) {
      logger.error(`[SystemController] deptUpdate 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
  async deptDelete(req: Request, res: Response) {
    try {
      await Department.destroy({ where: { id: req.params.id } });
      return res.json(success(null, '删除成功'));
    } catch (err: any) {
      logger.error(`[SystemController] deptDelete 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 权限列表 ── */
  async permList(req: Request, res: Response) {
    try {
      const list = await Permission.findAll({ order: [['sort', 'ASC']], limit: 1000 });
      return res.json(success(list));
    } catch (err: any) {
      logger.error(`[SystemController] permList 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 系统概览仪表盘 ── */
  async dashboard(req: Request, res: Response) {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [unitCount, deviceCount, alarmTotal, alarmToday, alarmPending, workOrderTotal, workOrderPending, onlineDevices] = await Promise.all([
        Unit.count(),
        Device.count(),
        Alarm.count(),
        Alarm.count({ where: { created_at: { [Op.gte]: todayStart } } }),
        Alarm.count({ where: { status: 0 } }),
        MaintenanceWorkOrder.count(),
        MaintenanceWorkOrder.count({ where: { status: { [Op.in]: [0, 1] } } }),
        Device.count({ where: { status: 1 } }),
      ]);

      return res.json(success({
        unitCount, deviceCount, alarmTotal, alarmToday, alarmPending,
        workOrderTotal, workOrderPending, onlineDevices,
        onlineRate: deviceCount ? ((onlineDevices / deviceCount) * 100).toFixed(1) : 0,
      }));
    } catch (err: any) {
      logger.error(`[SystemController] dashboard 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  /* ── 模块配置 ── */
  async modules(req: Request, res: Response) {
    try {
      const cached = await redis.get('platform_modules');
      if (cached) return res.json(success(JSON.parse(cached)));
      const defaultModules = [
        { id: 'workbench', name: '工作台', status: 'enabled', priority: 1 },
        { id: 'monitor', name: '监控中心', status: 'enabled', priority: 10 },
        { id: 'alarm', name: '告警中心', status: 'enabled', priority: 20 },
        { id: 'duty', name: '值守中心', status: 'enabled', priority: 30 },
        { id: 'bigscreen', name: '大屏模式', status: 'enabled', priority: 35 },
        { id: 'subsystem', name: '子系统监控', status: 'enabled', priority: 40 },
        { id: 'unit', name: '单位管理', status: 'enabled', priority: 50 },
        { id: 'device', name: '设备管理', status: 'enabled', priority: 60 },
        { id: 'maintenance', name: '消防维保', status: 'enabled', priority: 70 },
        { id: 'patrol', name: '巡检管理', status: 'enabled', priority: 80 },
        { id: 'plan', name: '应急预案', status: 'enabled', priority: 90 },
        { id: 'map', name: 'GIS地图', status: 'enabled', priority: 100 },
        { id: 'analysis', name: '数据分析', status: 'enabled', priority: 110 },
        { id: 'report', name: '报表管理', status: 'enabled', priority: 120 },
        { id: 'knowledge', name: '消防知识库', status: 'enabled', priority: 130 },
        { id: 'device-control', name: '设备反控', status: 'enabled', priority: 150 },
        { id: 'ai', name: 'AI决策中心', status: 'enabled', priority: 160 },
        { id: 'iot', name: 'IoT设备接入', status: 'enabled', priority: 170 },
        { id: 'smart', name: '智能预警', status: 'enabled', priority: 180 },
        { id: 'training', name: '培训考核', status: 'enabled', priority: 190 },
        { id: 'fire-check', name: '消防检查', status: 'enabled', priority: 200 },
        { id: 'system', name: '系统管理', status: 'enabled', priority: 1000 },
      ];
      await redis.set('platform_modules', JSON.stringify(defaultModules));
      return res.json(success(defaultModules));
    } catch (err: any) {
      logger.error(`[SystemController] modules 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },

  async toggleModule(req: Request, res: Response) {
    try {
      const { moduleId, status } = req.body;
      const cached = await redis.get('platform_modules');
      if (cached) {
        const modules = JSON.parse(cached);
        const idx = modules.findIndex((m: any) => m.id === moduleId);
        if (idx > -1) modules[idx].status = status;
        await redis.set('platform_modules', JSON.stringify(modules));
      }
      return res.json(success(null, '模块状态已更新'));
    } catch (err: any) {
      logger.error(`[SystemController] toggleModule 失败: ${err?.message || err}`);
      return res.status(500).json(fail(`操作失败: ${err?.message || '未知错误'}`, 500));
    }
  },
};
