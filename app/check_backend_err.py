import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Check recent error logs
stdin, stdout, stderr = client.exec_command('tail -n 30 /opt/my-fire-api/logs/err.log')
logs = stdout.read().decode('utf-8', errors='replace')

client.close()

with open('backend_err_latest.txt', 'w', encoding='utf-8') as f:
    f.write(logs)
print('Latest backend errors written to backend_err_latest.txt')
