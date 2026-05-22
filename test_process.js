const fs = require('fs');
const env = fs.readFileSync('/opt/my-fire-api-new/.env', 'utf8');
env.split('\n').forEach(line => {
  const eq = line.indexOf('=');
  if (eq > 0 && !line.startsWith('#')) {
    process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
});

const { processCtwingMessage } = require('/opt/my-fire-api-new/dist/services/ctwing/ctwing.core');

async function test() {
  try {
    const parsed = {
      deviceId: '99013914869646085145332',
      msgType: 'deviceUpload',
      productId: '99013914',
      tenantId: '',
      imei: '869646085145332',
      deviceName: 'test-device',
      timestamp: Date.now(),
      data: {},
      raw: {},
      isnbFrame: null,
    };
    await processCtwingMessage(parsed);
    console.log('SUCCESS: processCtwingMessage completed without error');
  } catch (e) {
    console.error('FAILED:', e.message);
    console.error(e.stack);
  }
}

test();
