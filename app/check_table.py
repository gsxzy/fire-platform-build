import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

try:
    cmd = "mysql -u root -N -B -D fire_platform -e 'DESCRIBE fire_alarm;'"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    print('fire_alarm columns:')
    print(out)
finally:
    client.close()
