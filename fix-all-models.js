const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'backend', 'src', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.ts'));

// Extract table name from model file content
function getTableName(content) {
  const m = content.match(/tableName:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

// Generate a short prefix from table name
function getPrefix(tableName) {
  if (!tableName) return 'idx';
  // Remove fire_/sys_ prefix and take first 3-4 chars
  const short = tableName.replace(/^fire_/, '').replace(/^sys_/, '');
  return short.slice(0, 6);
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
  const tableName = getTableName(content);
  const prefix = getPrefix(tableName);
  if (prefix) {
    // Replace idx_name patterns inside this file
    // We need to be careful to only replace inside the indexes array
    // Simple approach: replace all name: 'idx_...' in the file
    content = content.replace(/name: 'idx_([a-z0-9_]+)'/g, (match, name) => {
      return `name: 'idx_${prefix}_${name}'`;
    });
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Fixed: ${file} (table: ${tableName}, prefix: ${prefix})`);
}

console.log('All model files fixed successfully.');
