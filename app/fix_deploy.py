import paramiko, os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', 22, 'root', 'Zhangcong2255')
sftp = ssh.open_sftp()

# 1. 上传最新的 server.js
print('Uploading latest server.js...')
sftp.put('backend/server.js', '/opt/my-fire-api/server.js')

# 2. 更新 package.json 添加 dotenv
print('Updating package.json with dotenv...')
remote_pkg = '/opt/my-fire-api/package.json'
with sftp.file(remote_pkg, 'r') as f:
    content = f.read().decode('utf-8')

import json
pkg = json.loads(content)
if 'dotenv' not in pkg.get('dependencies', {}):
    pkg.setdefault('dependencies', {})['dotenv'] = '^16.4.7'

with sftp.file(remote_pkg, 'w') as f:
    f.write(json.dumps(pkg, indent=2).encode('utf-8'))

# 3. 安装依赖
print('Installing dependencies...')
_, o, e = ssh.exec_command('cd /opt/my-fire-api && npm install 2>&1')
out = o.read().decode('utf-8', 'ignore')
err = e.read().decode('utf-8', 'ignore')
with open('npm_install.txt', 'w', encoding='utf-8') as f:
    f.write(out)
    f.write('\nERR:\n')
    f.write(err)

# 4. 重启 PM2 服务并更新环境变量
print('Restarting PM2 service with update-env...')
_, o, e = ssh.exec_command('cd /opt/my-fire-api && pm2 restart fire-api --update-env 2>&1')
out = o.read().decode('utf-8', 'ignore')
with open('pm2_restart2.txt', 'w', encoding='utf-8') as f:
    f.write(out)

# 5. 验证服务
print('Verifying service...')
_, o, _ = ssh.exec_command('sleep 3 && curl -s http://127.0.0.1:5003/api/health')
health = o.read().decode('utf-8', 'ignore')
with open('health_check.txt', 'w', encoding='utf-8') as f:
    f.write(health)

sftp.close()
ssh.close()
print('All done!')
print('Health check:', health)
