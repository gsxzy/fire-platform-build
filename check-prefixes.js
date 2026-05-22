const fs = require('fs');
const path = require('path');
const modelsDir = path.join(__dirname, 'backend', 'src', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.ts'));
const prefixes = {};
for (const file of files) {
  const content = fs.readFileSync(path.join(modelsDir, file), 'utf-8');
  const m = content.match(/tableName:\s*['"]([^'"]+)['"]/);
  const tableName = m ? m[1] : null;
  const prefix = tableName ? tableName.replace(/^fire_/, '').replace(/^sys_/, '').slice(0, 6) : 'idx';
  if (prefixes[prefix]) {
    console.log('DUPLICATE PREFIX:', prefix, '-', prefixes[prefix], 'vs', file);
  } else {
    prefixes[prefix] = file;
  }
}
