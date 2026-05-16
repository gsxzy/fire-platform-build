const fs = require('fs');
const path = require('path');

function walk(dir, exts) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') files = files.concat(walk(full, exts));
    else if (entry.isFile() && exts.some(e => full.endsWith(e))) files.push(full);
  }
  return files;
}

function read(f) { return fs.readFileSync(f, 'utf8'); }

const appFiles = walk('app/src', ['.tsx','.ts']);
const backendFiles = walk('backend/src', ['.ts']);

function getExports(content, file) {
  const exports = [];
  const defMatch = content.match(/export\s+default\s+(\w+)/);
  if (defMatch) exports.push({ name: defMatch[1], type: 'default', file });
  const matches = content.matchAll(/export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g);
  for (const m of matches) exports.push({ name: m[1], type: 'named', file });
  const blockMatches = content.matchAll(/export\s*\{([^}]+)\}/g);
  for (const m of blockMatches) {
    m[1].split(',').forEach(p => {
      const name = p.trim().split(/\s+as\s+/)[0].trim();
      if (name) exports.push({ name, type: 'named', file });
    });
  }
  return exports;
}

function getImports(content) {
  const imports = [];
  const matches = content.matchAll(/import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s+['\"']([^'\"]+)['\"']/g);
  for (const m of matches) {
    if (m[1]) imports.push(m[1]);
    if (m[2]) {
      m[2].split(',').forEach(p => {
        const name = p.trim().split(/\s+as\s+/)[0].trim();
        if (name) imports.push(name);
      });
    }
  }
  return imports;
}

const allAppContent = {};
appFiles.forEach(f => allAppContent[f] = read(f));
const allAppImports = new Set();
Object.values(allAppContent).forEach(c => getImports(c).forEach(i => allAppImports.add(i)));

const appExports = [];
appFiles.forEach(f => appExports.push(...getExports(allAppContent[f], f)));

const unusedAppExports = appExports.filter(e => !allAppImports.has(e.name) && e.type !== 'default');
console.log('=== APP UNUSED NAMED EXPORTS ===');
unusedAppExports.forEach(e => console.log(e.file.replace(/\\/g,'/') + ' -> ' + e.name));

const allBackendContent = {};
backendFiles.forEach(f => allBackendContent[f] = read(f));
const allBackendImports = new Set();
Object.values(allBackendContent).forEach(c => getImports(c).forEach(i => allBackendImports.add(i)));

const backendExports = [];
backendFiles.forEach(f => backendExports.push(...getExports(allBackendContent[f], f)));

const unusedBackendExports = backendExports.filter(e => !allBackendImports.has(e.name) && e.type !== 'default');
console.log('=== BACKEND UNUSED NAMED EXPORTS ===');
unusedBackendExports.forEach(e => console.log(e.file.replace(/\\/g,'/') + ' -> ' + e.name));

const uiFiles = appFiles.filter(f => f.includes('components/ui'));
console.log('=== UI COMPONENTS ===');
uiFiles.forEach(f => {
  const base = path.basename(f, path.extname(f));
  if (!allAppImports.has(base)) console.log('UNUSED UI: ' + f.replace(/\\/g,'/'));
});

const hookFiles = appFiles.filter(f => f.includes('hooks/'));
console.log('=== HOOKS ===');
hookFiles.forEach(f => {
  const base = path.basename(f, path.extname(f));
  if (!allAppImports.has(base)) console.log('UNUSED HOOK: ' + f.replace(/\\/g,'/'));
});

const sectionFiles = appFiles.filter(f => f.includes('sections/'));
console.log('=== SECTIONS ===');
sectionFiles.forEach(f => {
  const base = path.basename(f, path.extname(f));
  if (!allAppImports.has(base)) console.log('UNUSED SECTION: ' + f.replace(/\\/g,'/'));
});

const svcFiles = backendFiles.filter(f => f.includes('services/'));
console.log('=== BACKEND SERVICES ===');
svcFiles.forEach(f => {
  getExports(allBackendContent[f], f).forEach(e => {
    if (!allBackendImports.has(e.name)) console.log('UNUSED SVC: ' + f.replace(/\\/g,'/') + ' -> ' + e.name);
  });
});

const protoFiles = backendFiles.filter(f => f.includes('protocols/') || f.includes('iot/'));
console.log('=== PROTOCOLS/IOT ===');
protoFiles.forEach(f => {
  const base = path.basename(f, path.extname(f));
  if (!allBackendImports.has(base)) console.log('UNUSED PROTO: ' + f.replace(/\\/g,'/'));
});

console.log('=== COMMENT BLOCKS APP ===');
appFiles.forEach(f => {
  const lines = allAppContent[f].split('\n');
  let blockStart = -1, count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('//')) { if (count === 0) blockStart = i; count++; }
    else { if (count > 3) console.log('BLOCK: ' + f.replace(/\\/g,'/') + ' lines ' + (blockStart+1) + '-' + i); count = 0; blockStart = -1; }
  }
});
