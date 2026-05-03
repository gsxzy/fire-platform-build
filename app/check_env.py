import paramiko
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check .env
stdin, stdout, stderr = client.exec_command("cat /opt/my-fire-api/.env 2>/dev/null")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('=== .env ===')
print(out if out else '(not found)')

# Check .env.example
stdin, stdout, stderr = client.exec_command("cat /opt/my-fire-api/.env.example 2>/dev/null")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('\n=== .env.example ===')
print(out if out else '(not found)')

# Check mysql port
stdin, stdout, stderr = client.exec_command("ss -tln | grep 330")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('\n=== MySQL ports ===')
print(out if out else '(none)')

client.close()
