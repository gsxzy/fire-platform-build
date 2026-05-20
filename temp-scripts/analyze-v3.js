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
  
  // Handle both regular and type imports
  const importRegex = /^import\s+(?:type\s+)?(?:(\{[^}]*\})|(\*\s+as\s+\w+)|(\w+))\s+from\s+['"][^'"]+['"];?/;
  
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
  const reexportsMap = {}; // file -> [{name, sourceFile}]
  
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const relPath = path.relative(SRC_DIR, file).replace(/\\/g, '/');
    
    // Track re-exports: export * from './something'
    const reexportStarRegex = /^export\s+\*\s+from\s+['"]([^'"]+)['"];?/;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const rem = line.match(reexportStarRegex);
      if (rem) {
        let sourceFile = rem[1];
        if (!sourceFile.endsWith('.ts')) sourceFile += '.ts';
        if (!reexportsMap[relPath]) reexportsMap[relPath] = [];
        reexportsMap[relPath].push({ sourceFile, line: i + 1 });
      }
    }
    
    // Better export regex - avoid matching async/abstract as names
    const exportRegex = /^export\s+(?:(?:default\s+)|(?:const|let|var|function|class|interface|type|enum)\s+)(\w+)/;
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
    
    // Also check default exports
    const defaultExportRegex = /^export\s+default\s+(\w+)/;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dm = line.match(defaultExportRegex);
      if (dm) {
        const name = dm[1];
        if (!exportsMap[name]) exportsMap[name] = [];
        exportsMap[name].push({ file: relPath, line: i + 1, kind: 'default-export' });
      }
    }
    
    // Imports (handle type imports)
    const importRegex = /import\s+(?:type\s+)?(?:(\{[^}]*\})|(\*\s+as\s+\w+)|(\w+))\s+from\s+['"][^'"]+['"];?/g;
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
  
  // Resolve re-exports transitively
  function isImported(name) {
    if (importsMap[name]) return true;
    return false;
  }
  
  // For names exported via export * from './x', check if any file imports from the re-exporting file
  function isReexported(name, exportFile) {
    for (const [file, reexports] of Object.entries(reexportsMap)) {
      for (const reexport of reexports) {
        // Check if the re-exporting file is the one that exports name
        if (reexport.sourceFile === exportFile || reexport.sourceFile === './' + path.basename(exportFile)) {
          // Check if anyone imports this name from the re-exporting file
          if (importsMap[name]) {
            for (const imp of importsMap[name]) {
              if (imp.file === file || imp.file.startsWith(path.dirname(file))) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }
  
  return { exportsMap, importsMap, reexportsMap };
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
          const isFirstBlock = blockStart === 0 || (blockStart <= 2 && !lines.slice(0, blockStart).some(l => l.trim()));
          const looksLikeHeader = blockLines[0].includes('═') || blockLines[0].includes('══') || blockLines[0].includes('====');
          if (isFirstBlock && looksLikeHeader) {
            blockLines = [];
            continue;
          }
          
          const nextLine = lines[i + 1];
          if (nextLine && (nextLine.trim().startsWith('export') || nextLine.trim().startsWith('async') || nextLine.trim().startsWith('function') || nextLine.trim().startsWith('const') || nextLine.trim().startsWith('class') || nextLine.trim().startsWith('interface'))) {
            blockLines = [];
            continue;
          }
          
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
        const nextLine = lines[j];
        if (nextLine && (nextLine.trim().startsWith('export') || nextLine.trim().startsWith('async') || nextLine.trim().startsWith('function') || nextLine.trim().startsWith('const') || nextLine.trim().startsWith('class') || nextLine.trim().startsWith('interface'))) {
          i = j - 1;
          continue;
        }
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

console.log('=== 开始精确分析 ===');

const unusedImports = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const res = analyzeUnusedImports(content, file);
  if (res.length) {
    unusedImports.push({ file: path.relative(SRC_DIR, file).replace(/\\/g, '/'), items: res });
  }
}

const { exportsMap, importsMap, reexportsMap } = analyzeDeadCode(files);

// Build a map of which files re-export from which
const reexportChains = {}; // sourceFile -> [reexportingFiles]
for (const [file, reexports] of Object.entries(reexportsMap)) {
  for (const reexport of reexports) {
    const source = reexport.sourceFile;
    if (!reexportChains[source]) reexportChains[source] = [];
    reexportChains[source].push(file);
  }
}

const deadExports = [];
for (const [name, exportInfos] of Object.entries(exportsMap)) {
  if (importsMap[name]) continue;
  
  for (const info of exportInfos) {
    // Skip controller files entirely
    if (info.file.includes('controllers/')) continue;
    
    // Skip route files - router is used via default export
    if (info.file.includes('routes/')) {
      if (info.name === 'router') continue;
    }
    
    // Skip app.ts default export
    if (info.file === 'app.ts' && info.kind === 'default-export') continue;
    
    // Skip abstract keyword
    if (info.name === 'abstract') continue;
    
    // Check if this name is re-exported by another file and that file is imported
    let isReexported = false;
    const exportFileName = path.basename(info.file);
    if (reexportChains[exportFileName] || reexportChains['./' + exportFileName]) {
      const reexporters = [...(reexportChains[exportFileName] || []), ...(reexportChains['./' + exportFileName] || [])];
      for (const reexporter of reexporters) {
        // Check if anyone imports this name from the reexporter
        if (importsMap[name]) {
          for (const imp of importsMap[name]) {
            // Check if import path matches reexporter
            const impBase = path.basename(imp.file);
            const rexBase = path.basename(reexporter);
            if (impBase === rexBase || imp.file.includes(rexBase.replace('.ts', ''))) {
              isReexported = true;
              break;
            }
          }
        }
      }
    }
    if (isReexported) continue;
    
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

fs.writeFileSync('D:\\新致远智慧消防平台\\fire-platform-build\\temp-scripts\\dead-code-report-v3.json', JSON.stringify(output, null, 2));
console.log('Done. Written to dead-code-report-v3.json');
