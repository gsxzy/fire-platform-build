/**
 * ═══════════════════════════════════════════════════════════════════
 * 微型测试框架（零外部依赖，基于 tsx + Node.js 20+）
 * ═══════════════════════════════════════════════════════════════════
 */

export interface TestSuite {
  name: string;
  cases: Array<{ name: string; fn: () => void | Promise<void> }>;
}

const suites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;

export function describe(name: string, fn: () => void) {
  const suite: TestSuite = { name, cases: [] };
  currentSuite = suite;
  fn();
  currentSuite = null;
  suites.push(suite);
}

export function it(name: string, fn: () => void | Promise<void>) {
  if (!currentSuite) throw new Error('it() 必须在 describe() 内部调用');
  currentSuite.cases.push({ name, fn });
}

class ExpectationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpectationError';
  }
}

function toBe(actual: unknown, expected: unknown) {
  if (Object.is(actual, expected)) return;
  throw new ExpectationError(`期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
}

function toEqual(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  throw new ExpectationError(`期望深度相等 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
}

function toBeDefined(actual: unknown) {
  if (actual !== undefined) return;
  throw new ExpectationError(`期望已定义，实际 undefined`);
}

function toBeTruthy(actual: unknown) {
  if (actual) return;
  throw new ExpectationError(`期望 truthy，实际 ${JSON.stringify(actual)}`);
}

function toBeFalsy(actual: unknown) {
  if (!actual) return;
  throw new ExpectationError(`期望 falsy，实际 ${JSON.stringify(actual)}`);
}

function toThrow(fn: () => void, expectedMessage?: string) {
  try {
    fn();
  } catch (err: any) {
    if (!expectedMessage || err.message?.includes(expectedMessage)) return;
    throw new ExpectationError(`期望抛出包含 "${expectedMessage}" 的异常，实际 "${err.message}"`);
  }
  throw new ExpectationError(`期望抛出异常，但没有`);
}

export function expect(actual: unknown) {
  return {
    toBe: (expected: unknown) => toBe(actual, expected),
    toEqual: (expected: unknown) => toEqual(actual, expected),
    toBeDefined: () => toBeDefined(actual),
    toBeTruthy: () => toBeTruthy(actual),
    toBeFalsy: () => toBeFalsy(actual),
  };
}

export function expectFn(fn: () => void) {
  return {
    toThrow: (expectedMessage?: string) => toThrow(fn, expectedMessage),
  };
}

export async function runAll() {
  let totalPass = 0;
  let totalFail = 0;

  for (const suite of suites) {
    console.log(`\n▶ ${suite.name}`);
    for (const c of suite.cases) {
      try {
        await c.fn();
        totalPass++;
        console.log(`  ✓ ${c.name}`);
      } catch (err: any) {
        totalFail++;
        console.error(`  ✗ ${c.name}`);
        console.error(`    ${err.message || err}`);
      }
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  通过: ${totalPass}  失败: ${totalFail}  总计: ${totalPass + totalFail}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  if (totalFail > 0) {
    process.exit(1);
  }
}
