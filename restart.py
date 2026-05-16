import paramiko, sys
host = '124.223.35.58'
user = 'root'
password = 'Zhangcong2255'
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=15)
cmd = "cd /opt/my-fire-api-new && pm2 restart fire-platform && sleep 3 && pm2 status fire-platform && curl -s http://127.0.0.1:5003/health"
stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
print(out)
if err.strip():
    print('STDERR:', err)
client.close()
