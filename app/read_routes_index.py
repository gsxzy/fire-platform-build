import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)
stdin, stdout, stderr = client.exec_command('cat /opt/my-fire-api/routes/index.js')
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
