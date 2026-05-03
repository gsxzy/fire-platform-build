import paramiko
import sys
import re

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

stdin, stdout, stderr = ssh.exec_command('grep -n "fire" /opt/my-fire-api/routes/floorPlan.js | head -n 20')
out = stdout.read().decode('utf-8', errors='replace')
sys.stdout.write('grep fire lines:\n')
sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')

stdin, stdout, stderr = ssh.exec_command('node -e "try { require(\"/opt/my-fire-api/routes/floorPlan.js\") } catch(e) { console.log(e.stack) }" 2>&1')
out = stdout.read().decode('utf-8', errors='replace')
sys.stdout.write('Stack trace:\n')
sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')

ssh.close()
