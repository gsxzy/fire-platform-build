import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', 22, 'root', 'Zhangcong2255')

# Create PM2 ecosystem config
ecosystem = """module.exports = {
  apps: [{
    name: 'fire-api',
    script: './server.js',
    cwd: '/opt/my-fire-api',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5003
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/opt/my-fire-api/logs/err.log',
    out_file: '/opt/my-fire-api/logs/out.log',
    merge_logs: true,
    max_memory_restart: '512M',
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: '10s',
    watch: false,
    autorestart: true
  }]
};"""

sftp = ssh.open_sftp()
with sftp.file('/opt/my-fire-api/ecosystem.config.js', 'w') as f:
    f.write(ecosystem.encode('utf-8'))

# Create logs directory
ssh.exec_command('mkdir -p /opt/my-fire-api/logs')

# Stop old process and start with PM2
ssh.exec_command('pkill -f "node /opt/my-fire-api/server.js"; sleep 1')
_,o,e = ssh.exec_command('cd /opt/my-fire-api && pm2 start ecosystem.config.js && pm2 save')
out = o.read().decode('utf-8','ignore')
with open('pm2_start.txt','w',encoding='utf-8') as f:
    f.write(out)

# Setup PM2 startup
_,o,_ = ssh.exec_command('pm2 startup systemd 2>/dev/null || true')

# Verify
_,o,_ = ssh.exec_command('sleep 1; pm2 list; echo SEP; ss -tlnp | grep 5003')
out = o.read().decode('utf-8','ignore')
with open('pm2_status.txt','w',encoding='utf-8') as f:
    f.write(out)

sftp.close()
ssh.close()
print('PM2 configured')
