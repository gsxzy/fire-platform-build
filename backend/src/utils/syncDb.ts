import sequelize from '@/config/database';
import '@/models';

async function sync() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connected');
    await sequelize.sync({ force: process.argv.includes('--force') });
    console.log('[DB] All tables synchronized');
    process.exit(0);
  } catch (err: any) {
    console.error('[DB] Sync error:', err.message);
    process.exit(1);
  }
}
sync();
