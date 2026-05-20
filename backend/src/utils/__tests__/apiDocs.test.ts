import { groupByModule } from '../apiDocs';

const test = (name: string, fn: () => void) => {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e: any) { console.log(`  ✗ ${name}: ${e.message}`); process.exitCode = 1; }
};

console.log('▶ ApiDocs');

test('groupByModule 应按第二级路径分组', () => {
  const endpoints = [
    { method: 'GET', path: '/api/users', middlewares: [] },
    { method: 'POST', path: '/api/users', middlewares: [] },
    { method: 'GET', path: '/api/devices', middlewares: [] },
    { method: 'GET', path: '/health', middlewares: [] },
  ];
  const groups = groupByModule(endpoints);
  if (!groups.users) throw new Error('users group missing');
  if (!groups.devices) throw new Error('devices group missing');
  if (groups.users.length !== 2) throw new Error('users count mismatch');
});
