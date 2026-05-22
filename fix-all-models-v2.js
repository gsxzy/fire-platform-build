const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'backend', 'src', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.ts'));

// Special prefix mappings for files that would otherwise collide
const specialPrefixes = {
  'control.model.ts': 'ctrlcmd',
  'controlRoom.model.ts': 'ctrlroom',
  'controlRoomVideo.model.ts': 'ctrlrvid',
  'duty.model.ts': 'dutysched',
  'dutyShift.model.ts': 'dutyshift',
  'associations.ts': 'assoc',
  'index.ts': 'idxexp',
};

function getPrefix(file, tableName) {
  if (specialPrefixes[file]) return specialPrefixes[file];
  if (!tableName) return 'idx';
  const short = tableName.replace(/^fire_/, '').replace(/^sys_/, '');
  return short.slice(0, 8);
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

  // 6. Fix index names to be globally unique in PostgreSQL
  const tableNameMatch = content.match(/tableName:\s*['"]([^'"]+)['"]/);
  const tableName = tableNameMatch ? tableNameMatch[1] : null;
  const prefix = getPrefix(file, tableName);
  content = content.replace(/name: 'idx_([a-z0-9_]+)'/g, (match, name) => {
    return `name: 'idx_${prefix}_${name}'`;
  });

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Fixed: ${file} (prefix: ${prefix})`);
}

console.log('All model files fixed successfully.');
