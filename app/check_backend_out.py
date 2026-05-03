import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Check recent out logs
stdin, stdout, stderr = client.exec_command('tail -n 20 /opt/my-fire-api/logs/out.log')
logs = stdout.read().decode('utf-8', errors='replace')

client.close()

with open('backend_out_latest.txt', 'w', encoding='utf-8') as f:
    f.write(logs)
print('Latest backend out logs written to backend_out_latest.txt')
