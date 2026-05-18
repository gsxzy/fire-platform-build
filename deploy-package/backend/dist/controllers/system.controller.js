"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemController = void 0;
const sequelize_1 = require("sequelize");
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
const redis_1 = __importDefault(require("@/config/redis"));
const validator_1 = require("@/utils/validator");
exports.SystemController = {
    async configList(req, res) {
        const list = await models_1.SystemConfig.findAll({ limit: 1000 });
        (0, respond_1.sendSuccess)(res, req, list);
    },
    async configSet(req, res) {
        const { configKey, configValue } = req.body;
        const [item] = await models_1.SystemConfig.findOrCreate({
            where: { config_key: configKey },
            defaults: { config_value: configValue },
        });
        if (item)
            await models_1.SystemConfig.update({ config_value: configValue }, { where: { config_key: configKey } });
        (0, respond_1.sendSuccess)(res, req, null, '设置成功');
    },
    async logList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { count, rows } = await models_1.SystemLog.findAndCountAll({
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, +pageNum, +pageSize);
    },
    async notifyTemplateList(req, res) {
        const list = await models_1.NotifyTemplate.findAll({ limit: 1000 });
        (0, respond_1.sendSuccess)(res, req, list);
    },
    async notifyTemplateCreate(req, res) {
        const t = await models_1.NotifyTemplate.create(req.body);
        (0, respond_1.sendSuccess)(res, req, { id: t.id }, '创建成功');
    },
    async notifyTemplateUpdate(req, res) {
        await models_1.NotifyTemplate.update(req.body, { where: { id: req.params.id } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async notifyTemplateDelete(req, res) {
        await models_1.NotifyTemplate.destroy({ where: { id: req.params.id } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async screenList(req, res) {
        const list = await models_1.ScreenConfig.findAll({ limit: 1000 });
        (0, respond_1.sendSuccess)(res, req, list);
    },
    async screenSave(req, res) {
        const { id, screenName, layoutConfig, widgetConfig } = req.body;
        if (id) {
            await models_1.ScreenConfig.update({ screen_name: screenName, layout_config: layoutConfig, widget_config: widgetConfig }, { where: { id } });
            (0, respond_1.sendSuccess)(res, req, null, '更新成功');
            return;
        }
        const s = await models_1.ScreenConfig.create({
            screen_name: screenName,
            layout_config: layoutConfig,
            widget_config: widgetConfig,
        });
        (0, respond_1.sendSuccess)(res, req, { id: s.id }, '保存成功');
    },
    async deptList(req, res) {
        const list = await models_1.Department.findAll({ order: [['sort', 'ASC']], limit: 1000 });
        (0, respond_1.sendSuccess)(res, req, list);
    },
    async deptCreate(req, res) {
        const d = await models_1.Department.create(req.body);
        (0, respond_1.sendSuccess)(res, req, { id: d.id }, '创建成功');
    },
    async deptUpdate(req, res) {
        await models_1.Department.update(req.body, { where: { id: req.params.id } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async deptDelete(req, res) {
        await models_1.Department.destroy({ where: { id: req.params.id } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    async permList(req, res) {
        const list = await models_1.Permission.findAll({ order: [['sort', 'ASC']], limit: 1000 });
        (0, respond_1.sendSuccess)(res, req, list);
    },
    async dashboard(req, res) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [unitCount, deviceCount, alarmTotal, alarmToday, alarmPending, workOrderTotal, workOrderPending, onlineDevices] = await Promise.all([
            models_1.Unit.count(),
            models_1.Device.count(),
            models_1.Alarm.count(),
            models_1.Alarm.count({ where: { created_at: { [sequelize_1.Op.gte]: todayStart } } }),
            models_1.Alarm.count({ where: { status: 0 } }),
            models_1.MaintenanceWorkOrder.count(),
            models_1.MaintenanceWorkOrder.count({ where: { status: { [sequelize_1.Op.in]: [0, 1] } } }),
            models_1.Device.count({ where: { status: 1 } }),
        ]);
        (0, respond_1.sendSuccess)(res, req, {
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
    async modules(req, res) {
        const cached = await redis_1.default.get('platform_modules');
        if (cached) {
            (0, respond_1.sendSuccess)(res, req, JSON.parse(cached));
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
        await redis_1.default.set('platform_modules', JSON.stringify(defaultModules));
        (0, respond_1.sendSuccess)(res, req, defaultModules);
    },
    async toggleModule(req, res) {
        const { moduleId, status } = req.body;
        const cached = await redis_1.default.get('platform_modules');
        if (cached) {
            const modules = JSON.parse(cached);
            const idx = modules.findIndex((m) => m.id === moduleId);
            if (idx > -1)
                modules[idx].status = status;
            await redis_1.default.set('platform_modules', JSON.stringify(modules));
        }
        (0, respond_1.sendSuccess)(res, req, null, '模块状态已更新');
    },
};
//# sourceMappingURL=system.controller.js.map