import paramiko
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

stdin, stdout, stderr = client.exec_command("ss -tln | grep -E ':5003|:5004|:5200|:5201'")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Listening ports:')
print(out if out else '(none)')

stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5004/api/alarms/list?page=1&pageSize=1 2>&1 | head -c 100")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('\nFSCN8001 HTTP API (5004):')
print(out if out else '(no response)')

client.close()
