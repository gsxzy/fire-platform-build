import paramiko
import sys

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

stdin, stdout, stderr = ssh.exec_command('cd /opt/my-fire-api && node -e "try { require(\"./server.js\") } catch(e) { console.log(e.message) }" 2>&1')
out = stdout.read().decode('utf-8', errors='replace')
sys.stdout.write('Error: ' + out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')

stdin, stdout, stderr = ssh.exec_command('head -n 15 /opt/my-fire-api/services/deviceControl.service.js')
out = stdout.read().decode('utf-8', errors='replace')
sys.stdout.write('Head:\n')
sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')

ssh.close()
