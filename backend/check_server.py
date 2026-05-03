import paramiko
import sys

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

stdin, stdout, stderr = ssh.exec_command('cd /opt/my-fire-api && node server.js 2>&1')
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
sys.stdout.write('STDOUT:\n')
sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')
sys.stdout.write('STDERR:\n')
sys.stdout.write(err.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')

ssh.close()
