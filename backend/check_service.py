import paramiko
import sys
import time

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

time.sleep(3)

stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5003/health')
status_code = stdout.read().decode('utf-8', errors='replace').strip()
sys.stdout.write('Health check HTTP code: ' + status_code + '\n')

stdin, stdout, stderr = ssh.exec_command('cat /opt/my-fire-api/logs/err.log | tail -n 10')
out = stdout.read().decode('utf-8', errors='replace')
sys.stdout.write('--- ERR LOG ---\n')
sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')

stdin, stdout, stderr = ssh.exec_command('cat /opt/my-fire-api/logs/out.log | tail -n 10')
out = stdout.read().decode('utf-8', errors='replace')
sys.stdout.write('--- OUT LOG ---\n')
sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')

ssh.close()
