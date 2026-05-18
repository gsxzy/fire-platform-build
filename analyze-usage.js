const fs = require('fs');
const path = require('path');

// === Backend: check stub exports usage ===
const stubFile = fs.readFileSync('backend/src/services/stub.oldTable.service.ts', 'utf8');
const exportNames = [];

// export function xxx
let m;
const funcRe = /^export\s+(async\s+)?function\s+(\w+)/gm;
while ((m = funcRe.exec(stubFile)) !== null) exportNames.push(m[2]);

// export const xxx
const constRe = /^export\s+const\s+(\w+)/gm;
while ((m = constRe.exec(stubFile)) !== null) exportNames.push(m[1]);

// Collect all backend source files
const backendFiles = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory() && !f.includes('node_modules')) walk(p);
    else if (p.endsWith('.ts') && !p.includes('stub.oldTable.service.ts')) backendFiles.push(p);
  }
}
walk('backend/src');

const backendSrc = backendFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

console.log('=== BACKEND STUB OLD TABLE SERVICE — USAGE ANALYSIS ===\n');
const used = [];
const unused = [];
for (const name of exportNames) {
  const re = new RegExp('\\b' + name + '\\b');
  if (re.test(backendSrc)) used.push(name);
  else unused.push(name);
}

console.log(`【USED】(${used.length}):`);
for (const n of used) console.log('  - ' + n);

console.log(`\n【UNUSED】(${unused.length}):`);
for (const n of unused) console.log('  - ' + n);

// === Frontend: check UI components usage ===
const uiDir = 'app/src/components/ui';
const uiFiles = fs.readdirSync(uiDir).filter(f => f.endsWith('.tsx'));

const appFiles = [];
function walkApp(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory() && !f.includes('node_modules')) walkApp(p);
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) appFiles.push(p);
  }
}
walkApp('app/src');

const appSrc = appFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

console.log('\n\n=== FRONTEND UI COMPONENTS — USAGE ANALYSIS ===\n');
const uiUsed = [];
const uiUnused = [];
for (const f of uiFiles) {
  const base = path.basename(f, '.tsx');
  const re = new RegExp('from\s+[\'"][^\'"]*' + base + '[\'"]');
  if (re.test(appSrc)) uiUsed.push(base);
  else uiUnused.push(base);
}

console.log(`【USED】(${uiUsed.length}):`);
for (const n of uiUsed) console.log('  - ' + n);

console.log(`\n【UNUSED】(${uiUnused.length}):`);
for (const n of uiUnused) console.log('  - ' + n);
