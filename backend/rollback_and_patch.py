import paramiko
import sys

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'
REMOTE_API = '/opt/my-fire-api'

OLD_PACKAGE_JSON = '''{\n  "name": "fire-platform-backend",\n  "version": "1.0.0",\n  "type": "commonjs",\n  "main": "server.js",\n  "dependencies": {\n    "axios": "^1.15.2",\n    "bcryptjs": "^2.4.3",\n    "dotenv": "^16.4.0",\n    "express": "^4.21.0",\n    "express-rate-limit": "^8.4.1",\n    "helmet": "^8.1.0",\n    "jsonwebtoken": "^9.0.0",\n    "mysql2": "^3.14.0",\n    "xlsx": "^0.18.5"\n  }\n}\n'''

ECOSYSTEM_JS = '''module.exports = {\n  apps: [{\n    name: 'fire-api',\n    script: './server.js',\n    cwd: '/opt/my-fire-api',\n    instances: 1,\n    exec_mode: 'fork',\n    env: {\n      NODE_ENV: 'production',\n      PORT: 5003\n    },\n    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',\n    error_file: '/opt/my-fire-api/logs/err.log',\n    out_file: '/opt/my-fire-api/logs/out.log',\n    merge_logs: true,\n    max_memory_restart: '512M',\n    restart_delay: 3000,\n    max_restarts: 5,\n    min_uptime: '10s',\n    watch: false,\n    autorestart: true\n  }]\n};\n'''

JWT_PATCH = """// JWT 密钥安全检查
const defaultJwtSecret = 'fire-platform-jwt-secret-dev-only';
if (process.env.JWT_SECRET === defaultJwtSecret && process.env.NODE_ENV === 'production') {
  console.error('[SECURITY] ❌ 错误：生产环境使用默认JWT密钥，请立即修改JWT_SECRET！');
  process.exit(1);
}

"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = client.open_sftp()

try:
    sys.stdout.write('[1/5] Restoring package.json...\n')
    with sftp.file(REMOTE_API + '/package.json', 'w') as f:
        f.write(OLD_PACKAGE_JSON.encode('utf-8'))
    sys.stdout.write('  OK\n')

    sys.stdout.write('[2/5] Restoring ecosystem.config.js...\n')
    with sftp.file(REMOTE_API + '/ecosystem.config.js', 'w') as f:
        f.write(ECOSYSTEM_JS.encode('utf-8'))
    sys.stdout.write('  OK\n')

    sys.stdout.write('[3/5] Patching server.js with JWT check...\n')
    with sftp.file(REMOTE_API + '/server.js', 'r') as f:
        content = f.read().decode('utf-8', errors='replace')
    
    # Insert JWT patch after 'require("dotenv").config();'
    marker = "require('dotenv').config();"
    if marker in content:
        content = content.replace(marker, marker + '\n' + JWT_PATCH)
    else:
        marker2 = 'require("dotenv").config();'
        if marker2 in content:
            content = content.replace(marker2, marker2 + '\n' + JWT_PATCH)
    
    with sftp.file(REMOTE_API + '/server.js', 'w') as f:
        f.write(content.encode('utf-8'))
    sys.stdout.write('  OK\n')

    sys.stdout.write('[4/5] Installing old dependencies...\n')
    stdin, stdout, stderr = client.exec_command('cd ' + REMOTE_API + ' && npm install 2>&1')
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    sys.stdout.write(out[-300:] if len(out) > 300 else out)
    if err.strip():
        sys.stdout.write('ERR: ' + err[-300:] + '\n')

    sys.stdout.write('[5/5] Restarting PM2 fire-api...\n')
    stdin, stdout, stderr = client.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 delete fire-api 2>&1')
    stdin, stdout, stderr = client.exec_command('cd ' + REMOTE_API + ' && /www/server/nodejs/v20.20.0/bin/pm2 start ecosystem.config.js 2>&1')
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) if out else '(no output)\n')
    if err.strip():
        sys.stdout.write('ERR: ' + err.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')

    sys.stdout.write('\nRollback and patch completed!\n')
finally:
    sftp.close()
    client.close()
