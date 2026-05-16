require('dotenv/config');
require('module-alias/register');
const { Unit } = require('./dist/models');

Unit.create({
  unit_name: '测试单位Sequelize',
  unit_code: 'UN-TEST-007',
  unit_type: 1,
  address: '测试地址',
  contact_name: '测试联系人',
  contact_phone: '13800138000',
  fire_level: 1,
  status: 1
}).then(u => {
  console.log('SUCCESS id=', u.id);
  process.exit(0);
}).catch(e => {
  console.log('ERROR name=', e.name);
  console.log('ERROR msg=', e.message);
  console.log('ERROR parent=', e.parent ? e.parent.message : 'no parent');
  console.log('ERROR original=', e.original ? e.original.message : 'no original');
  console.log('ERROR errors=', e.errors ? e.errors.map(x => x.message) : 'no errors');
  process.exit(1);
});
