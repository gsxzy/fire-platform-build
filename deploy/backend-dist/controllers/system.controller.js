"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemController = void 0;
const sequelize_1 = require("sequelize");
const response_1 = require("@/utils/response");
const logger_1 = __importDefault(require("@/config/logger"));
const models_1 = require("@/models");
const redis_1 = __importDefault(require("@/config/redis"));
const validator_1 = require("@/utils/validator");
exports.SystemController = {
    /* ── 系统配置 ── */
    async configList(req, res) {
        try {
            const list = await models_1.SystemConfig.findAll({ limit: 1000 });
            return res.json((0, response_1.success)(list));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] configList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async configSet(req, res) {
        try {
            const { configKey, configValue } = req.body;
            const [item] = await models_1.SystemConfig.findOrCreate({ where: { config_key: configKey }, defaults: { config_value: configValue } });
            if (item)
                await models_1.SystemConfig.update({ config_value: configValue }, { where: { config_key: configKey } });
            return res.json((0, response_1.success)(null, '设置成功'));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] configSet 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 日志管理 ── */
    async logList(req, res) {
        try {
            const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
            const { count, rows } = await models_1.SystemLog.findAndCountAll({ limit: +pageSize, offset: (+pageNum - 1) * +pageSize, order: [['created_at', 'DESC']] });
            return res.json((0, response_1.page)(rows, count, +pageNum, +pageSize));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] logList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 通知模板 ── */
    async notifyTemplateList(req, res) {
        try {
            const list = await models_1.NotifyTemplate.findAll({ limit: 1000 });
            return res.json((0, response_1.success)(list));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] notifyTemplateList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async notifyTemplateCreate(req, res) {
        try {
            const t = await models_1.NotifyTemplate.create(req.body);
            return res.json((0, response_1.success)({ id: t.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] notifyTemplateCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async notifyTemplateUpdate(req, res) {
        try {
            await models_1.NotifyTemplate.update(req.body, { where: { id: req.params.id } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] notifyTemplateUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async notifyTemplateDelete(req, res) {
        try {
            await models_1.NotifyTemplate.destroy({ where: { id: req.params.id } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] notifyTemplateDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 大屏配置 ── */
    async screenList(req, res) {
        try {
            const list = await models_1.ScreenConfig.findAll({ limit: 1000 });
            return res.json((0, response_1.success)(list));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] screenList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async screenSave(req, res) {
        try {
            const { id, screenName, layoutConfig, widgetConfig } = req.body;
            if (id) {
                await models_1.ScreenConfig.update({ screen_name: screenName, layout_config: layoutConfig, widget_config: widgetConfig }, { where: { id } });
                return res.json((0, response_1.success)(null, '更新成功'));
            }
            const s = await models_1.ScreenConfig.create({ screen_name: screenName, layout_config: layoutConfig, widget_config: widgetConfig });
            return res.json((0, response_1.success)({ id: s.id }, '保存成功'));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] screenSave 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 组织架构 ── */
    async deptList(req, res) {
        try {
            const list = await models_1.Department.findAll({ order: [['sort', 'ASC']], limit: 1000 });
            return res.json((0, response_1.success)(list));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] deptList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async deptCreate(req, res) {
        try {
            const d = await models_1.Department.create(req.body);
            return res.json((0, response_1.success)({ id: d.id }, '创建成功'));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] deptCreate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async deptUpdate(req, res) {
        try {
            await models_1.Department.update(req.body, { where: { id: req.params.id } });
            return res.json((0, response_1.success)(null, '更新成功'));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] deptUpdate 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async deptDelete(req, res) {
        try {
            await models_1.Department.destroy({ where: { id: req.params.id } });
            return res.json((0, response_1.success)(null, '删除成功'));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] deptDelete 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 权限列表 ── */
    async permList(req, res) {
        try {
            const list = await models_1.Permission.findAll({ order: [['sort', 'ASC']], limit: 1000 });
            return res.json((0, response_1.success)(list));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] permList 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 系统概览仪表盘 ── */
    async dashboard(req, res) {
        try {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
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
            return res.json((0, response_1.success)({
                unitCount, deviceCount, alarmTotal, alarmToday, alarmPending,
                workOrderTotal, workOrderPending, onlineDevices,
                onlineRate: deviceCount ? ((onlineDevices / deviceCount) * 100).toFixed(1) : 0,
            }));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] dashboard 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    /* ── 模块配置 ── */
    async modules(req, res) {
        try {
            const cached = await redis_1.default.get('platform_modules');
            if (cached)
                return res.json((0, response_1.success)(JSON.parse(cached)));
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
            return res.json((0, response_1.success)(defaultModules));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] modules 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
    async toggleModule(req, res) {
        try {
            const { moduleId, status } = req.body;
            const cached = await redis_1.default.get('platform_modules');
            if (cached) {
                const modules = JSON.parse(cached);
                const idx = modules.findIndex((m) => m.id === moduleId);
                if (idx > -1)
                    modules[idx].status = status;
                await redis_1.default.set('platform_modules', JSON.stringify(modules));
            }
            return res.json((0, response_1.success)(null, '模块状态已更新'));
        }
        catch (err) {
            logger_1.default.error(`[SystemController] toggleModule 失败: ${err?.message || err}`);
            return res.status(500).json((0, response_1.fail)(`操作失败: ${err?.message || '未知错误'}`, 500));
        }
    },
};
//# sourceMappingURL=system.controller.js.map