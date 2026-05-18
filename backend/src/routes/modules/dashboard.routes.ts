import { Router } from 'express';
import { DashboardController } from '@/controllers/dashboard.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof DashboardController) =>
  handleController(`Dashboard.${name}`, DashboardController[name]);

const workbenchView = requirePermission('workbench:view');
const monitorView = requirePermission('monitor:view');
const mapView = requirePermission('map:view');
const analysisView = requirePermission('analysis:view');
const analysisExport = requirePermission('analysis:export');
const reportView = requirePermission('report:view');
const bigscreenView = requirePermission('bigscreen:view');

router.get('/workbench', workbenchView, h('workbench'));
router.get('/monitor/overview', monitorView, h('monitorOverview'));
router.get('/gis/points', mapView, h('gisPoints'));
router.get('/gis/situation', mapView, h('gisSituation'));
router.get('/gis/alarm-points', mapView, h('gisAlarmPoints'));
router.get('/gis/alarm-heatmap', mapView, h('gisAlarmHeatmap'));
router.get('/analysis/device', analysisView, h('deviceAnalysis'));
router.get('/analysis/alarm', analysisView, h('alarmAnalysis'));
router.get('/analysis/maintenance', analysisView, h('maintenanceAnalysis'));
router.get('/analysis/hazard', analysisView, h('hazardAnalysis'));
router.get('/analysis/patrol', analysisView, h('patrolCompletion'));
router.get('/reports/daily', reportView, h('dailyReport'));
router.get('/reports/weekly', reportView, h('weeklyReport'));
router.get('/reports/monthly', reportView, h('monthlyReport'));
router.get('/reports/device', reportView, h('deviceReport'));
router.get('/reports/maintenance', reportView, h('maintenanceReport'));
router.get('/reports/patrol', reportView, h('patrolReport'));
router.get('/reports/export', analysisExport, h('exportReport'));
router.get('/bigscreen/data', bigscreenView, h('bigScreen'));
router.get('/bigscreen/config', bigscreenView, h('bigScreenConfig'));

export default router;
