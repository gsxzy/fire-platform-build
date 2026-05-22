const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'backend', 'src', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.ts'));

// Map: old generic index name -> prefix based on common table naming
const prefixMap = {
  'alarm.model.ts': 'alm',
  'alarmConfig.model.ts': 'acfg',
  'auth.model.ts': 'usr',
  'controlRoom.model.ts': 'cr',
  'controlRoomVideo.model.ts': 'crv',
  'device.model.ts': 'dev',
  'dispatchRecord.model.ts': 'dsp',
  'dutyHandover.model.ts': 'dtyh',
  'duty.model.ts': 'dty',
  'dutyShift.model.ts': 'dtys',
  'floorPlan.model.ts': 'fp',
  'inspection.model.ts': 'insp',
  'iot.model.ts': 'iot',
  'knowledge.model.ts': 'knl',
  'linkage.model.ts': 'lnk',
  'maintenance.model.ts': 'mnt',
  'notice.model.ts': 'ntc',
  'patrol.model.ts': 'ptr',
  'plan.model.ts': 'pln',
  'subsystem.model.ts': 'sub',
  'system.model.ts': 'sys',
  'todo.model.ts': 'tdo',
  'training.model.ts': 'trn',
  'unit.model.ts': 'unt',
};

for (const file of files) {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const prefix = prefixMap[file];
  if (!prefix) continue;

  // Replace idx_status with prefixed version, but only if it's a name field in indexes
  content = content.replace(
    /name: 'idx_status'/g,
    `name: 'idx_${prefix}_status'`
  );
  // Also fix other common duplicates if needed
  content = content.replace(
    /name: 'idx_created_at'/g,
    `name: 'idx_${prefix}_created_at'`
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Fixed indexes in: ${file}`);
}

console.log('Index renaming complete.');
