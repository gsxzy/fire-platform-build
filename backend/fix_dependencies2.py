import paramiko
import sys

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'
REMOTE_API = '/opt/my-fire-api'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

try:
    sys.stdout.write('Installing jsmodbus and mqtt...\n')
    stdin, stdout, stderr = ssh.exec_command('cd ' + REMOTE_API + ' && npm install jsmodbus mqtt 2>&1')
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    sys.stdout.write(out[-200:] if len(out) > 200 else out)
    if err.strip():
        sys.stdout.write('ERR: ' + err[-200:] + '\n')
    
    sys.stdout.write('Restarting PM2...\n')
    stdin, stdout, stderr = ssh.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api 2>&1')
    out = stdout.read().decode('utf-8', errors='replace')
    sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) if out else '(no output)\n')
    
    sys.stdout.write('\nDone!\n')
finally:
    ssh.close()
