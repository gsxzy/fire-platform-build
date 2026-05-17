/**
 * 测试运行入口：自动发现并执行 src/__tests__ 下所有 *.test.ts
 */
import { readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';

const TEST_DIR = resolve(process.cwd(), 'src/__tests__');

function findTests(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...findTests(full));
    } else if (st.isFile() && full.endsWith('.test.ts')) {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  const files = findTests(TEST_DIR);
  if (files.length === 0) {
    console.log('未找到测试文件');
    process.exit(0);
  }
  console.log(`发现 ${files.length} 个测试文件:`);
  for (const f of files) console.log('  -', f.replace(TEST_DIR, ''));
  for (const f of files) {
    await import(pathToFileURL(f).href);
  }
  const { runAll } = await import('./index');
  await runAll();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
