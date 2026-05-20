const fs = require('fs');
const path = require('path');

const SRC_DIR = 'D:\\新致远智慧消防平台\\fire-platform-build\\backend\\src';

function getAllTsFiles(dir) {
  const files = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d)) {
      const full = path.join(d, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (full.endsWith('.ts')) files.push(full);
    }
  }
  walk(dir);
  return files;
}

const files = getAllTsFiles(SRC_DIR);

// === 1. 未使用的导入 ===
function analyzeUnusedImports(content, filePath) {
  const results = [];
  const lines = content.split('\n');
  
  const importRegex = /^import\s+(?:(\{[^}]*\})|(\*\s+as\s+\w+)|(\w+))\s+from\s+['"][^'"]+['"];?/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(importRegex);
    if (!match) continue;
    
    if (match[1]) {
      const namesStr = match[1].slice(1, -1);
      const names = namesStr.split(',').map(s => {
        const parts = s.trim().split(/\s+as\s+/);
        return { imported: parts[0].trim(), local: (parts[1] || parts[0]).trim() };
      });
      
      const restCode = lines.slice(i + 1).join('\n');
      const codeNoComments = restCode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      
      for (const { imported, local } of names) {
        const regex = new RegExp(`\\b${local.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (!regex.test(codeNoComments)) {
          results.push({ name: local, line: i + 1 });
        }
      }
    } else if (match[2]) {
      const alias = match[2].replace('* as ', '').trim();
      const restCode = lines.slice(i + 1).join('\n');
      const codeNoComments = restCode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      const regex = new RegExp(`\\b${alias}\\b`);
      if (!regex.test(codeNoComments)) {
        results.push({ name: alias, line: i + 1 });
      }
    } else if (match[3]) {
      const name = match[3].trim();
      const restCode = lines.slice(i + 1).join('\n');
      const codeNoComments = restCode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      const regex = new RegExp(`\\b${name}\\b`);
      if (!regex.test(codeNoComments)) {
        results.push({ name, line: i + 1 });
      }
    }
  }
  
  return results;
}

// === 2. 死代码 ===
function analyzeDeadCode(allFiles) {
  const exportsMap = {};
  const importsMap = {};
  
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const relPath = path.relative(SRC_DIR, file).replace(/\\/g, '/');
    
    const exportRegex = /^export\s+(?:(?:default\s+)|(?:const|let|var|function|class|interface|type|enum)\s+)?(\w+)/;
    const exportBraceRegex = /^export\s*\{\s*([^}]+)\s*\}/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      const m1 = line.match(exportBraceRegex);
      if (m1) {
        const names = m1[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean);
        for (const name of names) {
          if (!exportsMap[name]) exportsMap[name] = [];
          exportsMap[name].push({ file: relPath, line: i + 1, kind: 'named-brace' });
        }
        continue;
      }
      
      const m2 = line.match(exportRegex);
      if (m2) {
        const name = m2[1];
        if (!exportsMap[name]) exportsMap[name] = [];
        const kind = line.includes('class') ? 'class' : line.includes('function') ? 'function' : line.includes('interface') ? 'interface' : line.includes('type ') ? 'type' : line.includes('enum') ? 'enum' : 'variable';
        exportsMap[name].push({ file: relPath, line: i + 1, kind });
      }
    }
    
    const importRegex = /import\s+(?:(\{[^}]*\})|(\*\s+as\s+\w+)|(\w+))\s+from\s+['"][^'"]+['"];?/g;
    let m;
    while ((m = importRegex.exec(content)) !== null) {
      if (m[1]) {
        const namesStr = m[1].slice(1, -1);
        const names = namesStr.split(',').map(s => {
          const parts = s.trim().split(/\s+as\s+/);
          return (parts[1] || parts[0]).trim();
        });
        for (const name of names) {
          if (!importsMap[name]) importsMap[name] = [];
          const lineNum = content.substring(0, m.index).split('\n').length;
          importsMap[name].push({ file: relPath, line: lineNum });
        }
      }
      if (m[2]) {
        const alias = m[2].replace('* as ', '').trim();
        if (!importsMap[alias]) importsMap[alias] = [];
        const lineNum = content.substring(0, m.index).split('\n').length;
        importsMap[alias].push({ file: relPath, line: lineNum });
      }
      if (m[3]) {
        const name = m[3].trim();
        if (!importsMap[name]) importsMap[name] = [];
        const lineNum = content.substring(0, m.index).split('\n').length;
        importsMap[name].push({ file: relPath, line: lineNum });
      }
    }
  }
  
  return { exportsMap, importsMap };
}

// === 3. 注释掉的旧代码块 ===
function analyzeCommentedCode(content, filePath) {
  const results = [];
  const lines = content.split('\n');
  
  let inBlock = false;
  let blockStart = -1;
  let blockLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inBlock && line.includes('/*') && !line.includes('*/')) {
      inBlock = true;
      blockStart = i;
      blockLines = [line];
    } else if (inBlock) {
      blockLines.push(line);
      if (line.includes('*/')) {
        inBlock = false;
        if (blockLines.length > 3) {
          const summary = blockLines.slice(0, 2).join(' ').substring(0, 80).replace(/\s+/g, ' ');
          results.push({ start: blockStart + 1, end: i + 1, count: blockLines.length, summary });
        }
        blockLines = [];
      }
    } else if (!inBlock && line.trim().startsWith('//')) {
      let j = i;
      const commentLines = [];
      while (j < lines.length && lines[j].trim().startsWith('//')) {
        commentLines.push(lines[j]);
        j++;
      }
      if (commentLines.length > 3) {
        const summary = commentLines.slice(0, 2).join(' ').substring(0, 80).replace(/\s+/g, ' ');
        results.push({ start: i + 1, end: j, count: commentLines.length, summary });
      }
      i = j - 1;
    }
  }
  
  return results;
}

// === 4. 空/几乎空文件 ===
function analyzeEmptyFiles(content, filePath) {
  const nonEmptyLines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
  if (nonEmptyLines.length <= 5) {
    return { lineCount: nonEmptyLines.length };
  }
  return null;
}

// === 5. 重复导出名称 ===
function analyzeDuplicateExports(exportsMap) {
  const results = [];
  const names = Object.keys(exportsMap);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i];
      const b = names[j];
      if (a.toLowerCase() === b.toLowerCase() && a !== b) {
        results.push({ name1: a, name2: b, loc1: exportsMap[a].map(e => e.file).join(', '), loc2: exportsMap[b].map(e => e.file).join(', ') });
      }
    }
  }
  return results;
}

console.log('=== 开始分析 ===');

const unusedImports = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const res = analyzeUnusedImports(content, file);
  if (res.length) {
    unusedImports.push({ file: path.relative(SRC_DIR, file).replace(/\\/g, '/'), items: res });
  }
}

const { exportsMap, importsMap } = analyzeDeadCode(files);

const deadExports = [];
for (const [name, exportInfos] of Object.entries(exportsMap)) {
  if (importsMap[name]) continue;
  
  for (const info of exportInfos) {
    if (info.file.includes('controller')) {
      if (info.file.endsWith('.controller.ts')) {
        if (info.kind === 'class') continue;
      }
    }
    deadExports.push({ file: info.file, name, kind: info.kind, line: info.line });
  }
}

const commentedBlocks = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const res = analyzeCommentedCode(content, file);
  if (res.length) {
    commentedBlocks.push({ file: path.relative(SRC_DIR, file).replace(/\\/g, '/'), blocks: res });
  }
}

const emptyFiles = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const res = analyzeEmptyFiles(content, file);
  if (res) {
    emptyFiles.push({ file: path.relative(SRC_DIR, file).replace(/\\/g, '/'), ...res });
  }
}

const duplicateExports = analyzeDuplicateExports(exportsMap);

const output = {
  unusedImports,
  deadExports,
  commentedBlocks,
  emptyFiles,
  duplicateExports
};

fs.writeFileSync('D:\\新致远智慧消防平台\\fire-platform-build\\temp-scripts\\dead-code-report.json', JSON.stringify(output, null, 2));
console.log('Done. Written to dead-code-report.json');
