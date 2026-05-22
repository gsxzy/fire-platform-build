const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'backend', 'src', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Remove indexes array blocks: indexes: [ ... ],
  content = content.replace(/indexes:\s*\[[\s\S]*?\],?/g, '');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Removed indexes from: ${file}`);
}

console.log('All indexes removed from models.');
