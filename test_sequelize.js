process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = require('fs').readFileSync('/opt/my-fire-api-new/.env', 'utf8').match(/DB_PASSWORD=(.+)/)[1].trim();
process.env.DB_NAME = 'fire_platform';

const sequelize = require('/opt/my-fire-api-new/dist/config/database').default;

async function test() {
  const result = await sequelize.query('SELECT 1 as a', { type: 'SELECT' });
  console.log('type:', typeof result);
  console.log('isArray:', Array.isArray(result));
  console.log('keys:', Object.keys(result));
  console.log('result:', JSON.stringify(result).slice(0, 200));
  process.exit(0);
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
