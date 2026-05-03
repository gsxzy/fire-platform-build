import paramiko
import sys

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

stdin, stdout, stderr = ssh.exec_command('wc -l /opt/my-fire-api/routes/floorPlan.js')
out = stdout.read().decode('utf-8', errors='replace')
sys.stdout.write('Line count: ' + out + '\n')

stdin, stdout, stderr = ssh.exec_command('tail -n 20 /opt/my-fire-api/routes/floorPlan.js')
out = stdout.read().decode('utf-8', errors='replace')
sys.stdout.write('Tail:\n')
sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')

ssh.close()
