import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '@/config/database';
import { sendSuccess, sendDeleted, sendPage } from '@/utils/response';
import { SystemConfig, SystemLog, NotifyTemplate, ScreenConfig, Permission, Department, Alarm, Device, MaintenanceWorkOrder, Unit, Personnel } from '@/models';
import redis from '@/config/redis';
import { sanitizePagination } from '@/utils/validator';

export const SystemController = {
  async configList(req: Request, res: Response) {
    const list = await SystemConfig.findAll({ limit: 1000 });
    sendSuccess(res, req, list);
  },

  async configSet(req: Request, res: Response) {
    const { configKey, configValue } = req.body;
    const [item] = await SystemConfig.findOrCreate({
      where: { config_key: configKey },
      defaults: { config_value: configValue } as any,
    });
    if (item) await SystemConfig.update({ config_value: configValue }, { where: { config_key: configKey } });
    sendSuccess(res, req, null, '设置成功');
  },

  async logList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { count, rows } = await SystemLog.findAndCountAll({
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async notifyTemplateList(req: Request, res: Response) {
    const list = await NotifyTemplate.findAll({ limit: 1000 });
    sendSuccess(res, req, list);
  },

  async notifyTemplateCreate(req: Request, res: Response) {
    const t = await NotifyTemplate.create(req.body as any);
    sendSuccess(res, req, { id: (t as any).id }, '创建成功');
  },

  async notifyTemplateUpdate(req: Request, res: Response) {
    await NotifyTemplate.update(req.body, { where: { id: req.params.id } });
    sendSuccess(res, req, null, '更新成功');
  },

  async notifyTemplateDelete(req: Request, res: Response) {
    await NotifyTemplate.destroy({ where: { id: req.params.id } });
    sendDeleted(res, req);
  },

  async screenList(req: Request, res: Response) {
    const list = await ScreenConfig.findAll({ limit: 1000 });
    sendSuccess(res, req, list);
  },

  async screenSave(req: Request, res: Response) {
    const { id, screenName, layoutConfig, widgetConfig } = req.body;
    if (id) {
      await ScreenConfig.update(
        { screen_name: screenName, layout_config: layoutConfig, widget_config: widgetConfig },
        { where: { id } }
      );
      sendSuccess(res, req, null, '更新成功');
      return;
    }
    const s = await ScreenConfig.create({
      screen_name: screenName,
      layout_config: layoutConfig,
      widget_config: widgetConfig,
    } as Parameters<typeof ScreenConfig.create>[0]);
    sendSuccess(res, req, { id: (s as any).id }, '保存成功');
  },

  async deptList(req: Request, res: Response) {
    const list = await Department.findAll({ order: [['sort', 'ASC']], limit: 1000 });
    sendSuccess(res, req, list);
  },

  async deptCreate(req: Request, res: Response) {
    const d = await Department.create(req.body as any);
    sendSuccess(res, req, { id: (d as any).id }, '创建成功');
  },

  async deptUpdate(req: Request, res: Response) {
    await Department.update(req.body, { where: { id: req.params.id } });
    sendSuccess(res, req, null, '更新成功');
  },

  async deptDelete(req: Request, res: Response) {
    await Department.destroy({ where: { id: req.params.id } });
    sendDeleted(res, req);
  },

  async permList(req: Request, res: Response) {
    const list = await Permission.findAll({ order: [['sort', 'ASC']], limit: 1000 });
    sendSuccess(res, req, list);
  },

  async dashboard(req: Request, res: Response) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [unitCount, deviceCount, alarmTotal, alarmToday, alarmPending, workOrderTotal, workOrderPending, onlineDevices] =
      await Promise.all([
        Unit.count(),
        Device.count(),
        Alarm.count(),
        Alarm.count({ where: { created_at: { [Op.gte]: todayStart } } }),
        Alarm.count({ where: { status: 0 } }),
        MaintenanceWorkOrder.count(),
        MaintenanceWorkOrder.count({ where: { status: { [Op.in]: [0, 1] } } }),
        Device.count({ where: { status: 1 } }),
      ]);

    sendSuccess(res, req, {
      unitCount,
      deviceCount,
      alarmTotal,
      alarmToday,
      alarmPending,
      workOrderTotal,
      workOrderPending,
      onlineDevices,
      onlineRate: deviceCount ? ((onlineDevices / deviceCount) * 100).toFixed(1) : 0,
    });
  },

  async modules(req: Request, res: Response) {
    const cached = await redis.get('platform_modules');
    if (cached) {
      sendSuccess(res, req, JSON.parse(cached));
      return;
    }
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
    sendSuccess(res, req, defaultModules);
  },

  async toggleModule(req: Request, res: Response) {
    const { moduleId, status } = req.body;
    const cached = await redis.get('platform_modules');
    if (cached) {
      const modules = JSON.parse(cached) as { id: string; status: string }[];
      const idx = modules.findIndex((m) => m.id === moduleId);
      if (idx > -1) modules[idx].status = status;
      await redis.set('platform_modules', JSON.stringify(modules));
    }
    sendSuccess(res, req, null, '模块状态已更新');
  },

  /* ── Personnel ── */
  async personnelList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { keyword, role, status } = req.query as Record<string, string>;
    const where: any = {};
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { phone: { [Op.like]: `%${keyword}%` } },
        { unit_name: { [Op.like]: `%${keyword}%` } },
      ];
    }
    if (role) where.role = role;
    if (status !== undefined) where.status = +status;
    const { count, rows } = await Personnel.findAndCountAll({
      where,
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async personnelCreate(req: Request, res: Response) {
    const p = await Personnel.create(req.body as any);
    sendSuccess(res, req, { id: (p as any).id }, '创建成功');
  },

  async personnelUpdate(req: Request, res: Response) {
    await Personnel.update(req.body, { where: { id: req.params.id } });
    sendSuccess(res, req, null, '更新成功');
  },

  async personnelDelete(req: Request, res: Response) {
    await Personnel.destroy({ where: { id: req.params.id } });
    sendDeleted(res, req);
  },

  /* ── Monitor ── */
  async monitor(req: Request, res: Response) {
    const os = await import('os');
    const process = await import('process');
    const uptimeSec = process.uptime();
    const uptimeStr = uptimeSec > 86400
      ? `${Math.floor(uptimeSec / 86400)}天${Math.floor((uptimeSec % 86400) / 3600)}小时`
      : uptimeSec > 3600
        ? `${Math.floor(uptimeSec / 3600)}小时${Math.floor((uptimeSec % 3600) / 60)}分钟`
        : `${Math.floor(uptimeSec / 60)}分钟`;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);

    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const cpuPercent = cpus.length > 0 ? Math.min(100, Math.round((loadAvg[0] / cpus.length) * 100)) : 0;

    const [devRows] = await sequelize.query(`SELECT COUNT(*) as c FROM device_archive`) as any;
    const dev = devRows?.[0];
    const [onlineRows] = await sequelize.query(`SELECT COUNT(*) as c FROM device_archive WHERE status='normal'`) as any;
    const online = onlineRows?.[0];

    const metrics = [
      { name: 'CPU使用率', value: cpuPercent, unit: '%', status: cpuPercent > 80 ? 'critical' : cpuPercent > 60 ? 'warning' : 'normal', trend: 'stable', history: [cpuPercent] },
      { name: '内存使用率', value: memPercent, unit: '%', status: memPercent > 85 ? 'critical' : memPercent > 70 ? 'warning' : 'normal', trend: 'stable', history: [memPercent] },
      { name: '磁盘使用', value: 0, unit: '%', status: 'normal', trend: 'stable', history: [0] },
      { name: '网络延迟', value: 0, unit: 'ms', status: 'normal', trend: 'stable', history: [0] },
    ];

    const services = [
      {
        name: 'fire-platform (Node.js)',
        status: 'running' as const,
        uptime: uptimeStr,
        version: process.version,
        pid: process.pid,
        memory: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      },
    ];

    sendSuccess(res, req, {
      metrics,
      services,
      overview: {
        uptime: uptimeStr,
        dbConnections: '--',
        deviceOnlineRate: dev?.c ? `${Math.round((online?.c || 0) / dev.c * 100)}%` : '0%',
        qps: '--',
      },
    });
  },
};
