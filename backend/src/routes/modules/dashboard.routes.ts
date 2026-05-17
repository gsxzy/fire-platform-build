import { Router } from 'express';
import { DashboardController } from '@/controllers/dashboard.controller';
import { handleController } from '@/utils/handleController';

const router = Router();
const h = (name: keyof typeof DashboardController) =>
  handleController(`Dashboard.${name}`, DashboardController[name]);

router.get('/workbench', h('workbench'));
router.get('/monitor/overview', h('monitorOverview'));
router.get('/subsystem/water', h('deviceAnalysis'));
router.get('/subsystem/elec', h('deviceAnalysis'));
router.get('/subsystem/vent', h('deviceAnalysis'));
router.get('/gis/points', h('gisPoints'));
router.get('/gis/situation', h('gisSituation'));
router.get('/gis/alarm-points', h('gisAlarmPoints'));
router.get('/analysis/device', h('deviceAnalysis'));
router.get('/analysis/alarm', h('alarmAnalysis'));
router.get('/analysis/maintenance', h('maintenanceAnalysis'));
router.get('/analysis/hazard', h('hazardAnalysis'));
router.get('/analysis/patrol', h('patrolCompletion'));
router.get('/reports/daily', h('dailyReport'));
router.get('/reports/weekly', h('weeklyReport'));
router.get('/reports/monthly', h('monthlyReport'));
router.get('/reports/device', h('deviceReport'));
router.get('/reports/maintenance', h('maintenanceReport'));
router.get('/reports/patrol', h('patrolReport'));
router.get('/bigscreen/data', h('bigScreen'));

export default router;
