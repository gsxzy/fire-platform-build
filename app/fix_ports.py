import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', 22, 'root', 'Zhangcong2255')

# Kill all node processes on 5003 except PM2 managed ones
_,o,_ = ssh.exec_command('ps aux | grep "node server.js" | grep -v grep | grep -v pm2 | awk "{print \$2}" | xargs -r kill -9 2>/dev/null; echo done')

# Restart PM2
_,o,e = ssh.exec_command('cd /opt/my-fire-api && pm2 restart fire-api && pm2 save')
out = o.read().decode('utf-8','ignore')
with open('pm2_restart.txt','w',encoding='utf-8') as f:
    f.write(out)

# Verify only one process
_,o,_ = ssh.exec_command('sleep 2; ss -tlnp | grep 5003; echo SEP; curl -s http://127.0.0.1:5003/api/health')
out = o.read().decode('utf-8','ignore')
with open('pm2_verify.txt','w',encoding='utf-8') as f:
    f.write(out)

ssh.close()
print('done')
