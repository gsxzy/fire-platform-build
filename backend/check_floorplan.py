import paramiko
import sys

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

stdin, stdout, stderr = ssh.exec_command('head -n 20 /opt/my-fire-api/routes/floorPlan.js')
out = stdout.read().decode('utf-8', errors='replace')
sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')

stdin, stdout, stderr = ssh.exec_command('node -e "try { require(\"/opt/my-fire-api/routes/floorPlan.js\") } catch(e) { console.log(e.message) }"')
out = stdout.read().decode('utf-8', errors='replace')
sys.stdout.write('Error: ' + out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')

ssh.close()
