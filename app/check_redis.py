import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

stdin, stdout, stderr = client.exec_command(
    "redis-cli HGET VMP_DEVICE_INFO '34020000001300000001' 2>/dev/null"
)
body = stdout.read().decode('utf-8', errors='replace')
try:
    d = json.loads(body)
    print(f"online={d.get('onLine')}, keepalive={d.get('keepaliveTime')}, host={d.get('hostAddress')}")
except:
    print("Parse error:", body[:200])

client.close()
