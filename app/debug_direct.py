import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 找到 PM2 日志文件
stdin, stdout, stderr = ssh.exec_command('pm2 info fire-api 2>/dev/null | grep -i log')
out = stdout.read().decode('utf-8', errors='replace')
print('=== PM2 LOG PATHS ===')
print(out)

# 直接在服务器上测试 alarms/list 并打印详细错误
script = '''
const http = require('http');
const options = {
  hostname: '127.0.0.1',
  port: 5003,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
};
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    const token = data.data.accessToken;
    const req2 = http.request({
      hostname: '127.0.0.1', port: 5003, path: '/api/alarms/list?pageSize=1',
      method: 'GET', headers: { 'Authorization': 'Bearer ' + token }
    }, (res2) => {
      let body2 = '';
      res2.on('data', chunk => body2 += chunk);
      res2.on('end', () => {
        console.log('STATUS:', res2.statusCode);
        console.log('BODY:', body2);
      });
    });
    req2.on('error', e => console.error('REQ2 ERROR:', e));
    req2.end();
  });
});
req.on('error', e => console.error('REQ ERROR:', e));
req.write(JSON.stringify({username:"admin",password:"admin123"}));
req.end();
'''
stdin, stdout, stderr = ssh.exec_command(f'node -e "{script}"')
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print('\n=== DIRECT NODE TEST ===')
print(out)
if err:
    print('STDERR:', err)

ssh.close()
