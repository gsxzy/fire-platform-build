const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'backend', 'src', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.ts'));

function removeIndexesBlock(content) {
  let result = '';
  let i = 0;
  while (i < content.length) {
    const idx = content.indexOf('indexes:', i);
    if (idx === -1) {
      result += content.slice(i);
      break;
    }
    result += content.slice(i, idx);
    // Find the matching closing bracket
    let j = idx + 'indexes:'.length;
    // Skip whitespace
    while (j < content.length && /\s/.test(content[j])) j++;
    if (content[j] !== '[') {
      // Not an array, just skip 'indexes:'
      result += content.slice(idx, j);
      i = j;
      continue;
    }
    j++; // skip '['
    let depth = 1;
    let inString = false;
    let stringChar = '';
    while (j < content.length && depth > 0) {
      const ch = content[j];
      if (inString) {
        if (ch === '\\') {
          j += 2;
          continue;
        }
        if (ch === stringChar) {
          inString = false;
        }
      } else {
        if (ch === '"' || ch === "'" || ch === '`') {
          inString = true;
          stringChar = ch;
        } else if (ch === '[') {
          depth++;
        } else if (ch === ']') {
          depth--;
        }
      }
      j++;
    }
    // Skip trailing comma and whitespace/newline
    while (j < content.length && /[,\s]/.test(content[j])) j++;
    i = j;
  }
  return result;
}

for (const file of files) {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. BIGINT.UNSIGNED -> BIGINT
  content = content.replace(/DataTypes\.BIGINT\.UNSIGNED/g, 'DataTypes.BIGINT');

  // 2. TEXT('long') -> TEXT
  content = content.replace(/DataTypes\.TEXT\('long'\)/g, 'DataTypes.TEXT');

  // 3. JSON -> JSONB ONLY in DataTypes.JSON context
  content = content.replace(/DataTypes\.JSON(?!B)/g, 'DataTypes.JSONB');

  // 4. Table name fixes
  content = content.replace(/tableName: 'todos'/g, "tableName: 'sys_todo'");
  content = content.replace(/tableName: 'cameras'/g, "tableName: 'sys_camera'");
  content = content.replace(/tableName: 'notices'/g, "tableName: 'sys_notice'");
  content = content.replace(/tableName: 'dev_heartbeat'/g, "tableName: 'fire_heartbeat'");

  // 5. TINYINT -> SMALLINT
  content = content.replace(/DataTypes\.TINYINT/g, 'DataTypes.SMALLINT');

  // 6. Remove indexes blocks safely
  content = removeIndexesBlock(content);

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Fixed: ${file}`);
}

console.log('All model files fixed successfully.');
