import { Router } from 'express';
import { AIController } from '@/controllers/ai.controller';
import { AIDecisionController } from '@/controllers/aiDecision.controller';
import { AILearningController } from '@/controllers/aiLearning.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();

const ai = (name: keyof typeof AIController) =>
  handleController(`AI.${String(name)}`, AIController[name]);
const dec = (name: keyof typeof AIDecisionController) =>
  handleController(`AIDecision.${String(name)}`, AIDecisionController[name]);
const learn = (name: keyof typeof AILearningController) =>
  handleController(`AILearning.${String(name)}`, AILearningController[name]);

const view = requirePermission('ai:view');
const operate = requirePermission('ai:operate');

// ── AI 决策中心概览（P0 修复：供雷达图 + 决策卡片 + 统计）──
router.get('/decisions/overview', view, ai('overview'));
router.post('/decisions/:id/execute', operate, ai('executeDecision'));

router.get('/decisions', view, ai('decisionList'));
router.post('/decisions', view, ai('decisionCreate'));
router.post('/risk-analysis', view, dec('riskAnalysis'));
router.get('/false-alarm/:alarmId', view, dec('filterFalseAlarm'));
router.get('/situation', view, dec('situationAssessment'));
router.post('/smart-alert', view, dec('generateSmartAlert'));
router.get('/trend', view, dec('trendAnalysis'));
router.get('/alerts', view, ai('alertList'));
router.put('/alerts/:id/confirm', view, ai('alertConfirm'));
router.put('/alerts/:id/handle', view, ai('alertHandle'));

router.post('/learn', view, learn('record'));
router.get('/diagnose', view, learn('diagnose'));
router.get('/stats/type', view, learn('statsByType'));
router.get('/stats/device', view, learn('statsByDevice'));
router.get('/learn/list', view, learn('list'));
router.put('/learn/:id', view, learn('update'));

export default router;
