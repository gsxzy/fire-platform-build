import { StartupLog } from '../startupLog';

const test = (name: string, fn: () => void) => {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e: any) { console.log(`  ✗ ${name}: ${e.message}`); process.exitCode = 1; }
};

console.log('▶ StartupLog');

test('begin 应记录步骤并标记为 running', () => {
  const log = new StartupLog();
  log.begin('测试步骤');
  // @ts-ignore
  const step = log.steps[0];
  if (step.name !== '测试步骤') throw new Error('name mismatch');
  if (step.status !== 'running') throw new Error('status not running');
});

test('success 应标记步骤完成并记录耗时', () => {
  const log = new StartupLog();
  log.begin('测试步骤');
  // 模拟微小延迟确保 durationMs > 0
  const start = Date.now(); while (Date.now() - start < 2) { /* spin */ }
  log.success('测试步骤');
  // @ts-ignore
  const step = log.steps.find((s: any) => s.name === '测试步骤');
  if (step.status !== 'success') throw new Error('status not success');
  if (typeof step.durationMs !== 'number' || step.durationMs < 0) throw new Error('duration not set');
});

test('fail 应标记步骤失败并记录错误', () => {
  const log = new StartupLog();
  log.begin('测试步骤');
  log.fail('测试步骤', '测试错误');
  // @ts-ignore
  const step = log.steps.find((s: any) => s.name === '测试步骤');
  if (step.status !== 'failed') throw new Error('status not failed');
  if (step.error !== '测试错误') throw new Error('error not recorded');
});

test('finish 应汇总所有步骤状态', () => {
  const log = new StartupLog();
  log.begin('步骤1');
  log.success('步骤1');
  log.begin('步骤2');
  log.fail('步骤2', '失败');
  const summary = log.finish();
  if (summary.totalSteps !== 2) throw new Error('totalSteps mismatch');
  if (summary.successSteps !== 1) throw new Error('successSteps mismatch');
  if (summary.failedSteps !== 1) throw new Error('failedSteps mismatch');
});
