const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'backend', 'src', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/DataTypes\.TINYINT/g, 'DataTypes.SMALLINT');
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Fixed TINYINT in: ${file}`);
}

console.log('All TINYINT -> SMALLINT replacements done.');
